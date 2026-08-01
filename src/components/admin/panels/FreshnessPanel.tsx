import type { FreshnessData, PanelState } from "@/lib/admin/monitor";
import { relativeTime } from "@/lib/admin/format";
import { PanelCard, PanelStates } from "./PanelCard";

/* Panel 2 — Freshness (logistics stamps). Newest verified-at across races,
   candidate sites, and candidate_contact. Degrades on 0005 (handoff A2 §C.2). */

function Row({ label, at }: { label: string; at: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-body-sm text-on-surface-muted">{label}</span>
      <span className="text-body-sm">
        {at ? relativeTime(at) : "—"}
      </span>
    </div>
  );
}

export function FreshnessPanel({
  state,
}: {
  state: PanelState<FreshnessData>;
}) {
  return (
    <PanelCard title="Freshness" id="panel-freshness">
      <PanelStates state={state}>
        {(d) => (
          <div className="flex flex-col gap-1">
            <Row label="Race info" at={d.race_verified_at} />
            <Row label="Candidate sites" at={d.candidate_verified_at} />
            <Row label="Contact info" at={d.contact_verified_at} />
          </div>
        )}
      </PanelStates>
    </PanelCard>
  );
}
