import type { AgentRunRow, PanelState } from "@/lib/admin/monitor";
import { relativeTime } from "@/lib/admin/format";
import { PanelCard, PanelStates } from "./PanelCard";

/* Panel 1 — Agent runs (AFR-002). Newest run per R1–R4 + dispatcher. An agent
   with no run is shown as "has not run yet", never hidden. Status chip color is
   paired with the status word so color is never the only signal. */

const CHIP: Record<string, string> = {
  running: "bg-info/15 text-info",
  ok: "bg-primary-muted text-success",
  ok_empty: "bg-surface-muted text-on-surface-muted",
  failed: "bg-error/10 text-error",
  dry_run: "bg-accent-muted text-accent-strong",
};

function StatusChip({ status }: { status: string }) {
  const cls = CHIP[status] ?? "bg-surface-muted text-on-surface-muted";
  return (
    <span className={`rounded-full px-2 py-[2px] text-caption ${cls}`}>
      {status}
    </span>
  );
}

export function AgentRunsPanel({ state }: { state: PanelState<AgentRunRow[]> }) {
  return (
    <PanelCard title="Agent runs" id="panel-agent-runs">
      <PanelStates state={state}>
        {(rows) => (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.agent} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label">{row.agent}</span>
                  {row.status ? <StatusChip status={row.status} /> : null}
                  {row.started_at ? (
                    <span className="text-caption text-on-surface-muted">
                      {relativeTime(row.started_at)}
                    </span>
                  ) : null}
                  {row.items_written != null ? (
                    <span className="text-caption text-on-surface-muted">
                      · {row.items_written} written
                    </span>
                  ) : null}
                </div>
                {row.started_at === null ? (
                  <span className="text-body-sm text-on-surface-muted">
                    has not run yet
                  </span>
                ) : (
                  <>
                    {row.summary ? (
                      <p className="line-clamp-2 text-body-sm">{row.summary}</p>
                    ) : null}
                    {row.report_path ? (
                      <span className="block truncate font-mono text-caption text-on-surface-muted">
                        {row.report_path}
                      </span>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelStates>
    </PanelCard>
  );
}
