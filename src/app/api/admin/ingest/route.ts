import { NextResponse, type NextRequest } from "next/server";
import { adminApiGuard } from "@/lib/admin/api";
import { MISSING_0006, MISSING_SERVICE } from "@/lib/admin/monitor";
import { createServiceClient } from "@/lib/supabase/service";
import { findAllBannedTermMatches } from "@/lib/neutrality";
import { IngestBodySchema } from "@/types/admin";

/* POST /api/admin/ingest (design.md § 4; PRD AFR-020…022). The operator hand-adds
   a news story / unclear statement / unverified fact. NOTHING publishes here:
   every submission becomes a review_item(pending, source='operator') and waits
   for a deliberate approve step (AFR-021). manual_news gets an ADVISORY
   neutrality lint in the response (approval re-lints authoritatively, AFR-032).
   Every submission writes an admin_action audit row (AFR-050). */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await adminApiGuard();
  if (gate instanceof NextResponse) return gate;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = IngestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { kind, payload } = parsed.data;

  // Advisory lint (news only): surfaced, never blocking. Approval re-lints.
  let lint: { verdict: "pass" | "flagged"; terms: string[] } | undefined;
  if (kind === "manual_news") {
    const terms = findAllBannedTermMatches(
      [payload.title, payload.summary ?? ""].join(" ")
    );
    lint = { verdict: terms.length > 0 ? "flagged" : "pass", terms };
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Server credentials missing.", missing: MISSING_SERVICE },
      { status: 503 }
    );
  }

  const { data, error } = await service
    .from("review_item")
    .insert({ kind, source: "operator", payload, status: "pending" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Ops tables not migrated.", missing: MISSING_0006 },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit (append-only). The submission is the primary effect; if the audit
  // insert fails we still report success but flag it, rather than losing the
  // already-committed review_item.
  const { error: auditError } = await service.from("admin_action").insert({
    actor: gate.email,
    action: "submit",
    subject_kind: "review_item",
    subject_id: data.id,
    detail: { kind },
  });

  return NextResponse.json(
    { id: data.id, lint, audited: !auditError },
    { status: 201 }
  );
}
