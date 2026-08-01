import type { PanelState, RiskItem } from "@/lib/admin/monitor";
import { PanelCard, PanelStates } from "./PanelCard";

/* Panel 6 — Open risks. Failed runs + review items with apply errors + stale
   claimed run requests. Zero risks is a real, measured "none" (handoff A2 §C.6). */
export function RisksPanel({
  state,
}: {
  state: PanelState<{ items: RiskItem[]; total: number }>;
}) {
  return (
    <PanelCard title="Open risks" id="panel-risks">
      <PanelStates state={state}>
        {(d) =>
          d.items.length === 0 ? (
            <p className="text-body-sm text-on-surface-muted">
              No risks surfaced yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {d.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-baseline justify-between gap-2 text-body-sm"
                >
                  <span className="text-error">▪ {item.label}</span>
                  <span className="font-mono text-caption text-on-surface-muted">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </PanelStates>
    </PanelCard>
  );
}
