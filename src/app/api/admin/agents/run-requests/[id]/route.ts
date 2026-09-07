import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

/* Cancel a queued run request (design.md § 4; handoff §B). Only a `pending`
   request is cancellable — a `claimed` one is already in flight on the
   operator's machine, so cancelling it would desync the dispatcher. The
   status-guarded UPDATE (WHERE status='pending') is the concurrency guard;
   anything else 409s with the reason. Ops-plane writes are service-role only. */

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

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set — the ops plane is unreachable." },
      { status: 503 }
    );
  }

  /* Status-guarded transition: only pending → cancelled. Returns the row when
     it fired, nothing when the guard rejected it. */
  const { data, error } = await service
    .from("agent_run_request")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select(ROW)
    .maybeSingle<RequestRow>();

  if (error) {
    if (isMissingRelation(error.code)) {
      return NextResponse.json(
        { error: "Ops tables absent — migration 0006 is not applied yet." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't cancel the request — try again." },
      { status: 500 }
    );
  }

  if (!data) {
    /* The guard rejected it: either the id doesn't exist (404) or it's no longer
       pending — already claimed/fulfilled/failed/cancelled (409). Distinguish so
       the UI can say which honestly. */
    const { data: current } = await service
      .from("agent_run_request")
      .select(ROW)
      .eq("id", id)
      .maybeSingle<RequestRow>();
    if (!current) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        error:
          current.status === "claimed"
            ? "Already running — a claimed request can't be cancelled."
            : `Request is ${current.status} — nothing to cancel.`,
        existing: toRequest(current),
      },
      { status: 409 }
    );
  }

  const { error: auditError } = await service.from("admin_action").insert({
    actor: gate.email,
    action: "cancel",
    subject_kind: "agent_run_request",
    subject_id: id,
    detail: { agent: data.agent },
  });
  if (auditError) {
    console.error("admin_action(cancel) insert failed:", auditError.message);
  }

  return NextResponse.json({ request: toRequest(data) });
}
