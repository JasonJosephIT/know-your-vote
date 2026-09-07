import { requireAdmin } from "@/lib/admin/guard";
import { getHealth, getOverview } from "@/lib/admin/monitor";
import { HealthStrip } from "@/components/admin/panels/HealthStrip";
import { AgentRunsPanel } from "@/components/admin/panels/AgentRunsPanel";
import { FreshnessPanel } from "@/components/admin/panels/FreshnessPanel";
import { FeedHealthPanel } from "@/components/admin/panels/FeedHealthPanel";
import { PipelinePanel } from "@/components/admin/panels/PipelinePanel";
import { WaitingPanel } from "@/components/admin/panels/WaitingPanel";
import { RisksPanel } from "@/components/admin/panels/RisksPanel";

export const metadata = { title: "Overview — Operator Console" };

/* Always live: the monitor's whole value is a current answer (design.md § 5). */
export const dynamic = "force-dynamic";

/* The six live R4 sections (PRD AFR-001…004). requireAdmin() is the boundary;
   the health + overview snapshots come from the shared monitor lib (the same
   code /api/health and /api/admin/overview serve), so the page reads live data
   without an HTTP self-call. Each panel names its own missing dependency rather
   than faking a number — R4's rule: measured, never estimated. */
export default async function OverviewPage() {
  await requireAdmin();

  const [health, overview] = await Promise.all([getHealth(), getOverview()]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Overview</h1>
        <p className="text-body-sm text-on-surface-muted">
          System health at a glance — every panel reports measured numbers, or
          names the dependency it’s missing.
        </p>
      </div>

      <HealthStrip health={health} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AgentRunsPanel state={overview.agent_runs} />
        <FreshnessPanel state={overview.freshness} />
        <FeedHealthPanel state={overview.feed_health} />
        <PipelinePanel state={overview.pipeline} />
        <WaitingPanel state={overview.waiting} />
        <RisksPanel state={overview.risks} />
      </div>
    </div>
  );
}
