import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Overview — Operator Console" };

/* The six live R4 sections (PRD AFR-001). In Phase A1 the shell exists but the
   queries don't — each panel states that plainly rather than showing a zero it
   hasn't measured. Real numbers arrive with /api/admin/overview in Phase A2. */
const panels = [
  { title: "Agent runs", note: "No runs recorded yet." },
  { title: "Freshness", note: "No freshness data yet." },
  { title: "Feed health", note: "No feed metrics yet." },
  { title: "Pipeline state", note: "No pipeline snapshot yet." },
  { title: "Waiting on Jason", note: "Nothing awaiting review." },
  { title: "Open risks", note: "No risks surfaced yet." },
];

export default async function OverviewPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Overview</h1>
        <p className="text-body-sm text-on-surface-muted">
          System health at a glance. Live queries wire up in the next phase; for
          now every panel reports its own emptiness honestly.
        </p>
      </div>

      <DegradedBanner missing="live monitoring (Phase A2)">
        These panels read the ops registry and content plane once the monitor
        endpoints land. Migrations 0005/0006 must also be applied for real
        counts — until then the numbers here stay empty, never estimated.
      </DegradedBanner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {panels.map((p) => (
          <Card key={p.title} className="flex flex-col gap-2">
            <h2 className="text-overline text-on-surface-muted">{p.title}</h2>
            <p className="text-body-sm text-on-surface-muted">{p.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
