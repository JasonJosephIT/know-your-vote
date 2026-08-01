import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

/* Console → dispatcher trigger (design.md § 2 flow 1, § 4; PRD AFR-010…012).
   A trigger is a QUEUE WRITE, not an RPC: it inserts one `agent_run_request`
   the local `cap-r0-dispatcher` consumes when the Claude app is open (ADR-001).
   The partial unique index `uq_run_request_live` is the duplicate backstop —
   at most one pending|claimed request per agent — so a double click 409s with
   the existing request surfaced (AFR-012). Ops-plane writes are service-role
   only; auth is the in-handler allowlist check (proxy is UX, not the boundary).

   Parallel rule (run-3 spec): zod lives inline here, not in src/types/admin.ts
   (Run 2 owns that file). */

const body = z.object({
  agent: z.enum(["R1", "R2", "R3", "R4"]),
  note: z.string().trim().max(500).optional(),
});

/* PostgREST/Postgres codes for "the ops tables don't exist yet" — 0006 is
   founder-gated (roadmap TASK-A00a), so until it lands this route degrades
   honestly instead of 500-ing opaquely. */
const isMissingRelation = (code: string | undefined) =>
  code === "42P01" || code === "PGRST205";

type RequestRow = {
  id: string;
  agent: string;
  note: string | null;
  status: string;
  requested_at: string;
  claimed_at: string | null;
  resolved_at: string | null;
  failure_reason: string | null;
};

const toRequest = (r: RequestRow) => ({
  id: r.id,
  agent: r.agent,
  note: r.note,
  status: r.status,
  requestedAt: r.requested_at,
  claimedAt: r.claimed_at,
  resolvedAt: r.resolved_at,
  failureReason: r.failure_reason,
});

const ROW = "id, agent, note, status, requested_at, claimed_at, resolved_at, failure_reason";

export async function POST(request: NextRequest) {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let parsed;
  try {
    parsed = body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: first }, { status: 400 });
  }
  const { agent } = parsed.data;
  const note = parsed.data.note ? parsed.data.note : null;

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set — the ops plane is unreachable." },
      { status: 503 }
    );
  }

  const { data, error } = await service
    .from("agent_run_request")
    .insert({ agent, note })
    .select(ROW)
    .single<RequestRow>();

  if (error) {
    /* Duplicate live request (partial unique index) → surface the existing one
       instead of silently swallowing (handoff §B duplicate path). */
    if (error.code === "23505") {
      const { data: existing } = await service
        .from("agent_run_request")
        .select(ROW)
        .eq("agent", agent)
        .in("status", ["pending", "claimed"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle<RequestRow>();
      return NextResponse.json(
        {
          error: `${agent} already has a live request.`,
          existing: existing ? toRequest(existing) : null,
        },
        { status: 409 }
      );
    }
    if (isMissingRelation(error.code)) {
      return NextResponse.json(
        { error: "Ops tables absent — migration 0006 is not applied yet." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't queue the request — try again." },
      { status: 500 }
    );
  }

  /* Audit every privileged action (PRD § 5). Best-effort: the request already
     succeeded, so an audit hiccup doesn't fail the trigger — but it must not be
     silent, so we note it server-side. */
  const { error: auditError } = await service.from("admin_action").insert({
    actor: gate.email,
    action: "trigger",
    subject_kind: "agent_run_request",
    subject_id: data.id,
    detail: { agent, note },
  });
  if (auditError) {
    console.error("admin_action(trigger) insert failed:", auditError.message);
  }

  return NextResponse.json({ request: toRequest(data) }, { status: 202 });
}
