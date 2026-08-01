import type { PanelState, PipelineData } from "@/lib/admin/monitor";
import { relativeTime } from "@/lib/admin/format";
import { PanelCard, PanelStates } from "./PanelCard";

/* Panel 4 — Pipeline state. Published race count (the headline number) plus
   draft/in_review counts and the newest pipeline_event heartbeat. */
export function PipelinePanel({
  state,
}: {
  state: PanelState<PipelineData>;
}) {
  return (
    <PanelCard title="Pipeline state" id="panel-pipeline">
      <PanelStates state={state}>
        {(d) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-h2">
                {new Intl.NumberFormat("en-US").format(d.published)}
              </span>
              <span className="text-body-sm text-on-surface-muted">
                races published
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-on-surface-muted">
              <span>{d.draft ?? "—"} draft</span>
              <span>{d.in_review ?? "—"} in review</span>
              <span>
                last event{" "}
                {d.newest_event_at ? relativeTime(d.newest_event_at) : "—"}
              </span>
            </div>
          </div>
        )}
      </PanelStates>
    </PanelCard>
  );
}
