import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { adminApiGuard } from "@/lib/admin/api";
import { MISSING_0006, MISSING_SERVICE } from "@/lib/admin/monitor";
import { planEffect, type NewsInsertRow } from "@/lib/admin/effects";
import { urlNorm } from "@/lib/brief-rows";
import {
  givenPageRowProblem,
  listedRowProblem,
  planSourceAttribution,
  type ListedSourceRow,
} from "@/lib/news-enqueue";
import { OUTLETS, outletForUrl } from "@/lib/news-sources";
import { officialForUrl } from "@/lib/official-sources";
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
  let attributedSource: { source_id: string; via: string } | undefined;
  if (plan.type === "insert_news") {
    /* Source BEFORE insert (migration 0014, news-fairness.md N1 "no source, no
       card"). Every manual_news row is candidate_news or election_news, and
       0014's CHECK requires those to carry a source_id. Resolving it here
       means that CHECK can never be the thing that rejects an approval, and a
       story with no source is refused with its own reason and stays pending.
       This holds whether or not 0014 is applied yet: the rule is the product's,
       and the CHECK is only its backstop. */
    const source = await resolveSource(service, plan.row);
    if (!source.ok) {
      return failClosed(service, gate.email, id, note, source.reason);
    }
    attributedSource = { source_id: source.sourceId, via: source.via };
    const { error } = await service
      .from("news_item")
      .insert({ ...plan.row, source_id: source.sourceId });
    if (error) {
      return failClosed(service, gate.email, id, note, describeNewsInsertError(error));
    }
    effectSummary = `news_item inserted (verified_by=operator, source=${source.sourceId})`;
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
    /* Which source the row was attributed to, and how it was found. */
    source: attributedSource,
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

/* Find the source a news row is attributed to, writing a listed body's source
   row if it has none yet. The order, the checks on a given id and their
   reasons live in planSourceAttribution (src/lib/news-enqueue.ts, pure, pinned
   by scripts/verify-news-enqueue.ts); this function only does the I/O.

   The one write here is to `source`, and only a row built from a list in code
   (outletSourceRow, or officialSourceRow for a checked `official:` id). The
   payload picks nothing but which listed body, and its URL must be on that
   body's host, so the effects-map boundary holds: a review_item still cannot
   name a table or a field to write.

   Insert-if-absent, then read back by url_norm. The id used is whichever row
   owns that url_norm, never the id we hoped to write, so a pre-existing row
   under another id cannot leave news_item pointing at nothing. */
type SourceResolution =
  | { ok: true; sourceId: string; via: "given" | "outlet" | "page" }
  | { ok: false; reason: string };

type SourceRowRead = { source_id: string; url_norm: string; type: string; lean_tag: string };

const NO_SOURCE_RULE =
  "Migration 0014 requires a source on every candidate_news and election_news row (\"no source, no card\").";

async function resolveSource(
  service: SupabaseClient,
  row: NewsInsertRow
): Promise<SourceResolution> {
  const plan = planSourceAttribution(row, {
    outletFor: (u) => outletForUrl(u, OUTLETS),
    officialFor: (u) => officialForUrl(u),
    norm: urlNorm,
  });

  const sourceRowWhere = async (column: "source_id" | "url_norm", value: string) => {
    const { data, error } = await service
      .from("source")
      .select("source_id, url_norm, type, lean_tag")
      .eq(column, value)
      .maybeSingle();
    return { row: (data as SourceRowRead | null) ?? null, error };
  };

  const ensureListedRow = async (
    listed: ListedSourceRow,
    via: "given" | "outlet"
  ): Promise<SourceResolution> => {
    const { error } = await service
      .from("source")
      .upsert(listed, { onConflict: "url_norm", ignoreDuplicates: true });
    if (error) {
      return { ok: false, reason: `Could not write the source row for ${listed.url_norm}: ${error.message}` };
    }
    const found = await sourceRowWhere("url_norm", listed.url_norm);
    if (found.error || !found.row) {
      return {
        ok: false,
        reason: `The source row for ${listed.url_norm} could not be read back${found.error ? `: ${found.error.message}` : ""}.`,
      };
    }
    const problem = listedRowProblem(listed, found.row);
    if (problem) return { ok: false, reason: problem };
    return { ok: true, sourceId: found.row.source_id, via };
  };

  switch (plan.kind) {
    case "refused":
      return { ok: false, reason: plan.reason };
    case "given": {
      if (plan.listedRow) return ensureListedRow(plan.listedRow, "given");
      const found = await sourceRowWhere("source_id", plan.sourceId);
      if (found.error) {
        return { ok: false, reason: `Could not check source ${plan.sourceId}: ${found.error.message}` };
      }
      if (!found.row) {
        return {
          ok: false,
          reason: `This story names source "${plan.sourceId}", and no source row has that id. Add the source row, or reject the story. ${NO_SOURCE_RULE}`,
        };
      }
      const problem = givenPageRowProblem(plan, found.row.url_norm);
      if (problem) return { ok: false, reason: problem };
      return { ok: true, sourceId: found.row.source_id, via: "given" };
    }
    case "outlet":
      return ensureListedRow(plan.listedRow, "outlet");
    case "unsigned":
      return {
        ok: false,
        reason: `${plan.domain} is on the outlet list, but its lean has not been signed off in src/lib/news-sources.ts, so it has no source row yet. Sign the lean off first. ${NO_SOURCE_RULE}`,
      };
    case "page": {
      const found = await sourceRowWhere("url_norm", plan.urlNorm);
      if (found.error) {
        return { ok: false, reason: `Could not look up a source for ${plan.urlNorm}: ${found.error.message}` };
      }
      if (found.row) return { ok: true, sourceId: found.row.source_id, via: "page" };
      return {
        ok: false,
        reason: `No source found for this story. Its site is not on the outlet list, and no source row has url_norm "${plan.urlNorm}". Add a source row for this page (publisher, type, lean), then approve again. ${NO_SOURCE_RULE}`,
      };
    }
    case "none":
      return {
        ok: false,
        reason: `This story's URL could not be normalised, so no source can be found for it. ${NO_SOURCE_RULE}`,
      };
  }
}

/* The manual_news insert fails closed with the exact reason, naming the right
   migration. Until 2026-10-04 every 23514 was reported as "0005 not applied",
   which was true when 0005 was the only CHECK on news_item. 0014 (source
   required) and 0017 (relation) added two more, and blaming 0005 for either
   would send an operator to the wrong migration (0014's own header asked for
   this split before it is applied). Postgres names the constraint in the
   message, so the split reads it there. */
function describeNewsInsertError(error: PostgrestError): string {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23514") {
    if (text.includes("news_item_agent_source_check")) {
      return `This story has no source. ${NO_SOURCE_RULE} The approve path resolves a source before inserting, so this means that step was skipped. Report it rather than retrying.`;
    }
    if (text.includes("news_item_relation_check")) {
      return "The relation tier must be 'named', 'related' or empty (migration 0017's check refused this row).";
    }
    if (text.includes("news_item_item_type_check")) {
      return "candidate_news/election_news is not a legal item_type yet — migration 0005 (candidate_contact) not applied.";
    }
    return `news_item refused the row on a check constraint: ${error.message}`;
  }
  if (error.code === "23503") {
    return text.includes("source")
      ? "The source this story is attributed to does not exist (news_item.source_id → source)."
      : `news_item refused the row on a foreign key: ${error.message}`;
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
