import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import type { PanelState } from "@/lib/admin/monitor";

/* The shared shell every Overview panel uses (handoff A2 §B): a Card with an
   overline header, wired for a11y (`aria-labelledby` → the header id). Keeps all
   six panels visually and structurally identical so only their bodies differ. */
export function PanelCard({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <Card aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-overline text-on-surface-muted">
        {title}
      </h2>
      {children}
    </Card>
  );
}

/* The four-state matrix (handoff Foundations §3 / A2 §B), rendered once so no
   panel re-implements it. Degraded → the honest DegradedBanner naming the
   dependency; Error → a role="alert" line; Empty → a measured-zero note; Ok →
   the panel's own body via the render prop. Never collapses these states. */
export function PanelStates<T>({
  state,
  children,
}: {
  state: PanelState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "degraded") {
    return <DegradedBanner missing={state.missing} />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-body-sm text-error">
        Couldn’t load: {state.message}
      </p>
    );
  }
  if (state.status === "empty") {
    return <p className="text-body-sm text-on-surface-muted">{state.note}</p>;
  }
  return <>{children(state.data)}</>;
}
