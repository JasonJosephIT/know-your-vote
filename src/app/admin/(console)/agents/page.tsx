import { DegradedBanner } from "@/components/admin/DegradedBanner";
import {
  AgentsConsole,
  type AgentRequest,
  type AgentRun,
} from "@/components/admin/AgentsConsole";
import { requireAdmin } from "@/lib/admin/guard";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata = { title: "Agents — Operator Console" };

/* The ops plane is server-side only, so the page reads the current request/run
   state with the service role and hands a plain snapshot to the client console.
   Two founder gates are still open (roadmap A00a/A00c), so this degrades
   honestly: no service key → name the var; migration 0006 absent → name the
   migration. Neither is faked. */

const REQUEST_COLS =
  "id, agent, note, status, requested_at, claimed_at, resolved_at, failure_reason";
const RUN_COLS =
  "id, agent, status, items_written, summary, report_path, started_at, finished_at, run_request_id";

const isMissingRelation = (code: string | undefined) =>
  code === "42P01" || code === "PGRST205";

type RequestRow = {
  id: string;
  agent: string;
  note: string | null;
  status: AgentRequest["status"];
  requested_at: string;
  claimed_at: string | null;
  resolved_at: string | null;
  failure_reason: string | null;
};
type RunRow = {
  id: string;
  agent: string;
  status: AgentRun["status"];
  items_written: number | null;
  summary: string | null;
  report_path: string | null;
  started_at: string;
  finished_at: string | null;
  run_request_id: string | null;
};

const toRequest = (r: RequestRow): AgentRequest => ({
  id: r.id,
  agent: r.agent,
  note: r.note,
  status: r.status,
  requestedAt: r.requested_at,
  claimedAt: r.claimed_at,
  resolvedAt: r.resolved_at,
  failureReason: r.failure_reason,
});
const toRun = (r: RunRow): AgentRun => ({
  id: r.id,
  agent: r.agent,
  status: r.status,
  itemsWritten: r.items_written,
  summary: r.summary,
  reportPath: r.report_path,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  runRequestId: r.run_request_id,
});

function Header() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-h2">Agents</h1>
      <p className="text-body-sm text-on-surface-muted">
        Request a run of R1–R4 and read recent run history.
      </p>
    </div>
  );
}

export default async function AgentsPage() {
  await requireAdmin();

  let service;
  try {
    service = createServiceClient();
  } catch {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <DegradedBanner missing="SUPABASE_SERVICE_ROLE_KEY">
          The ops plane is service-role only; set this to reach it (roadmap
          TASK-A00c).
        </DegradedBanner>
      </div>
    );
  }

  /* Live requests (≤ one per agent by uq_run_request_live) are read separately
     so a long-pending request always shows regardless of age; recent rows cover
     the transient done/failed/cancelled chips. */
  const [liveRes, recentRes, runsRes] = await Promise.all([
    service.from("agent_run_request").select(REQUEST_COLS).in("status", ["pending", "claimed"]),
    service
      .from("agent_run_request")
      .select(REQUEST_COLS)
      .order("requested_at", { ascending: false })
      .limit(8),
    service
      .from("agent_run")
      .select(RUN_COLS)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const firstError = liveRes.error ?? recentRes.error ?? runsRes.error;
  if (firstError) {
    if (isMissingRelation(firstError.code)) {
      return (
        <div className="flex flex-col gap-6">
          <Header />
          <DegradedBanner missing="migration 0006 (ops tables)">
            The agent registry and request queue live in migration 0006, which
            isn&apos;t applied yet (roadmap TASK-A00a).
          </DegradedBanner>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div
          role="alert"
          className="rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-body-sm text-error"
        >
          Couldn&apos;t reach the ops plane — try again.
        </div>
      </div>
    );
  }

  /* De-dupe by id: a live row also appears in the recent slice. */
  const requestsById = new Map<string, AgentRequest>();
  for (const row of [...(liveRes.data ?? []), ...(recentRes.data ?? [])] as RequestRow[]) {
    if (!requestsById.has(row.id)) requestsById.set(row.id, toRequest(row));
  }

  return (
    <div className="flex flex-col gap-6">
      <Header />
      <AgentsConsole
        requests={[...requestsById.values()]}
        runs={((runsRes.data ?? []) as RunRow[]).map(toRun)}
      />
    </div>
  );
}
