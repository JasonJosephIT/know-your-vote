import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

/* Run history for the Agents page (design.md § 4; handoff §C). Reads the
   `agent_run` registry the agents write into (prompts v1.1, TASK-A15) — newest
   first, optional per-agent filter. Until A14/A15 wire the agents up this is
   honestly empty, and pre-0006 it reports the migration is absent rather than
   500-ing. Ops-plane read: service-role only, allowlist-gated. */

const query = z.object({
  agent: z.enum(["R1", "R2", "R3", "R4", "dispatcher"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const isMissingRelation = (code: string | undefined) =>
  code === "42P01" || code === "PGRST205";

type RunRow = {
  id: string;
  agent: string;
  status: string;
  items_written: number | null;
  summary: string | null;
  report_path: string | null;
  started_at: string;
  finished_at: string | null;
  run_request_id: string | null;
};

export async function GET(request: NextRequest) {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = query.safeParse({
    agent: request.nextUrl.searchParams.get("agent") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { agent, limit } = parsed.data;

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set — the ops plane is unreachable." },
      { status: 503 }
    );
  }

  let q = service
    .from("agent_run")
    .select(
      "id, agent, status, items_written, summary, report_path, started_at, finished_at, run_request_id"
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (agent) q = q.eq("agent", agent);

  const { data, error } = await q.returns<RunRow[]>();

  if (error) {
    if (isMissingRelation(error.code)) {
      return NextResponse.json(
        { error: "Ops tables absent — migration 0006 is not applied yet.", runs: [] },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't load run history — try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    runs: (data ?? []).map((r) => ({
      id: r.id,
      agent: r.agent,
      status: r.status,
      itemsWritten: r.items_written,
      summary: r.summary,
      reportPath: r.report_path,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      runRequestId: r.run_request_id,
    })),
  });
}
