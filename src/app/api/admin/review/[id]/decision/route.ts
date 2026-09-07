import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { adminApiGuard } from "@/lib/admin/api";
import { MISSING_0006, MISSING_SERVICE } from "@/lib/admin/monitor";
import { planEffect } from "@/lib/admin/effects";
import { createServiceClient } from "@/lib/supabase/service";
import { findAllBannedTermMatches } from "@/lib/neutrality";
import {
  DecisionBodySchema,
  ReviewItemContentSchema,
  type AdminActionName,
} from "@/types/admin";

/* POST /api/admin/review/:id/decision (design.md § 5 "Approve-effect
   transaction"; PRD AFR-032/033). Approve applies exactly one fixed effect and
   marks the item approved+applied; reject records the decision. Every decision
   — success OR fail-closed — writes an admin_action audit row (AFR-050).

   No true multi-statement transaction is available over PostgREST, so this
   emulates one the way design.md § 5 sanctions at n=1 operator: the initial
   `status='pending'` read rejects an already-decided item (→ 409), and each
   terminal write is guarded `WHERE status='pending'`. On ANY effect failure the
   item stays pending with apply_error recorded and is retryable (fail closed,
   § 6). */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await adminApiGuard();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = DecisionBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid decision.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { action, note } = parsed.data;

  let service: SupabaseClient;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Server credentials missing.", missing: MISSING_SERVICE },
      { status: 503 }
    );
  }

  // Load the item. 404 if absent; 409 if not pending (already decided).
  const { data: item, error: loadError } = await service
    .from("review_item")
    .select("id, kind, payload, status")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    if (loadError.code === "42P01") {
      return NextResponse.json(
        { error: "Ops tables not migrated.", missing: MISSING_0006 },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!item) {
    return NextResponse.json({ error: "Review item not found." }, { status: 404 });
  }
  if (item.status !== "pending") {
    return NextResponse.json(
      { error: "Already decided.", status: item.status },
      { status: 409 }
    );
  }

  if (action === "reject") {
    const { data: updated, error } = await service
      .from("review_item")
      .update({ status: "rejected", decided_at: nowIso(), decision_note: note ?? null })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Already decided." }, { status: 409 });
    }
    await audit(service, gate.email, "reject", id, { note: note ?? null });
    return NextResponse.json({ status: "rejected" });
  }

  // ---- approve ----------------------------------------------------------
  // Re-validate the stored payload against its schema (defense in depth).
  const content = ReviewItemContentSchema.safeParse({
    kind: item.kind,
    payload: item.payload,
  });
  if (!content.success) {
    return failClosed(
      service,
      gate.email,
      id,
      note,
      "Stored payload no longer matches its schema — not applied."
    );
  }

  // manual_news: authoritative neutrality re-lint (submit-time was advisory).
  if (content.data.kind === "manual_news") {
    const p = content.data.payload;
    const flags = findAllBannedTermMatches(`${p.title} ${p.summary ?? ""}`);
    if (flags.length > 0) {
      return failClosed(
        service,
        gate.email,
        id,
        note,
        `Neutrality check failed on approval: ${flags.join(", ")} — not published.`
      );
    }
  }

  const plan = planEffect(content.data);
  if (plan.type === "refuse") {
    return failClosed(service, gate.email, id, note, plan.reason);
  }

  // Apply the one planned content-plane effect.
  let effectSummary: string;
  if (plan.type === "insert_news") {
    const { error } = await service.from("news_item").insert(plan.row);
    if (error) {
      return failClosed(service, gate.email, id, note, describeNewsInsertError(error));
    }
    effectSummary = "news_item inserted (verified_by=operator)";
  } else if (plan.type === "update_field") {
    const { data: rows, error } = await service
      .from(plan.table)
      .update({ [plan.field]: plan.value })
      .eq(plan.pkColumn, plan.pkValue)
      .select(plan.pkColumn);
    if (error) {
      return failClosed(service, gate.email, id, note, describeUpdateError(error, plan.field));
    }
    if (!rows || rows.length === 0) {
      return failClosed(
        service,
        gate.email,
        id,
        note,
        `No ${plan.table} row matched ${plan.pkColumn}=${plan.pkValue}.`
      );
    }
    effectSummary = `${plan.table}.${plan.field} updated`;
  } else {
    effectSummary = plan.note; // record_disposition
  }

  // Finalize: mark approved + applied, guarded on still-pending.
  const appliedAt = nowIso();
  const { data: finalized, error: finalizeError } = await service
    .from("review_item")
    .update({
      status: "approved",
      decided_at: appliedAt,
      applied_at: appliedAt,
      decision_note: note ?? null,
      apply_error: null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (finalizeError) {
    return NextResponse.json({ error: finalizeError.message }, { status: 500 });
  }
  if (!finalized || finalized.length === 0) {
    // A concurrent decision won the race after we applied the effect. At n=1
    // this is the accepted last-write-wins case (design.md § 5).
    return NextResponse.json({ error: "Already decided." }, { status: 409 });
  }

  await audit(service, gate.email, "approve", id, {
    applied: true,
    effect: effectSummary,
    verified_by: content.data.kind === "manual_news" ? "operator" : undefined,
    note: note ?? null,
  });

  return NextResponse.json({
    status: "approved",
    applied_at: appliedAt,
    effect: effectSummary,
  });
}

/* ---- helpers ------------------------------------------------------------ */

function nowIso(): string {
  return new Date().toISOString();
}

/* Effect failed → record apply_error, keep the item PENDING (retryable), and
   still write the audit row for the attempt (AFR-050). Returns 200 so the UI
   can render the exact reason inline (handoff A3 §C). */
async function failClosed(
  service: SupabaseClient,
  actor: string,
  id: string,
  note: string | null | undefined,
  applyError: string
): Promise<NextResponse> {
  await service
    .from("review_item")
    .update({ apply_error: applyError, decision_note: note ?? null })
    .eq("id", id)
    .eq("status", "pending");
  await audit(service, actor, "approve", id, { applied: false, apply_error: applyError });
  return NextResponse.json({ status: "pending", apply_error: applyError });
}

async function audit(
  service: SupabaseClient,
  actor: string,
  action: AdminActionName,
  subjectId: string,
  detail: Record<string, unknown>
): Promise<void> {
  await service.from("admin_action").insert({
    actor,
    action,
    subject_kind: "review_item",
    subject_id: subjectId,
    detail,
  });
}

/* AFR-033: the manual_news insert fails closed with the exact reason when 0005
   hasn't made candidate_news/election_news legal item_types yet. */
function describeNewsInsertError(error: PostgrestError): string {
  if (error.code === "23514") {
    return "candidate_news/election_news is not a legal item_type yet — migration 0005 (candidate_contact) not applied.";
  }
  if (error.code === "42703" || error.code === "PGRST204") {
    return "news_item is missing columns from migration 0005 (candidate_contact).";
  }
  if (error.code === "23505") {
    return "This news item already exists (duplicate url for this candidate).";
  }
  return `Could not insert news_item: ${error.message}`;
}

function describeUpdateError(error: PostgrestError, field: string): string {
  if (error.code === "23514") {
    return `The new value for ${field} violates a database check constraint.`;
  }
  return `Could not update ${field}: ${error.message}`;
}
