import Link from "next/link";
import type { PanelState } from "@/lib/admin/monitor";
import { PanelCard, PanelStates } from "./PanelCard";

/* Panel 5 — Waiting on Jason. The pending review_item count (same source as the
   nav Queue badge). Links to the queue. Degrades on 0006 (handoff A2 §C.5). */
export function WaitingPanel({
  state,
}: {
  state: PanelState<{ pending: number }>;
}) {
  return (
    <PanelCard title="Waiting on Jason" id="panel-waiting">
      <PanelStates state={state}>
        {(d) =>
          d.pending === 0 ? (
            <p className="text-body-sm text-on-surface-muted">
              Nothing awaiting review.
            </p>
          ) : (
            <Link
              href="/admin/queue"
              className="flex items-baseline gap-2 text-primary-hover hover:underline"
            >
              <span className="font-heading text-h2">
                {new Intl.NumberFormat("en-US").format(d.pending)}
              </span>
              <span className="text-body-sm">
                {d.pending === 1 ? "item awaiting review" : "items awaiting review"}
              </span>
            </Link>
          )
        }
      </PanelStates>
    </PanelCard>
  );
}
