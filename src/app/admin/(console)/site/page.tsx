import { requireAdmin } from "@/lib/admin/guard";
import { DeploymentsPanel } from "@/components/admin/panels/DeploymentsPanel";
import { ErrorsPanel } from "@/components/admin/panels/ErrorsPanel";
import { AnalyticsLinksCard } from "@/components/admin/panels/AnalyticsLinksCard";

export const metadata = { title: "Site — Operator Console" };

/* Phase A5 assembly (AFR-040…042). requireAdmin() is the per-page boundary;
   the two data panels sit side-by-side on wide screens and each names its own
   missing token rather than showing a blank, with analytics linked out below. */
export default async function SitePage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Site</h1>
        <p className="text-body-sm text-on-surface-muted">
          Deployment health and recent errors, pulled from Vercel and Sentry —
          analytics linked out until those products are enabled.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DeploymentsPanel />
        <ErrorsPanel />
      </div>

      <AnalyticsLinksCard />
    </div>
  );
}
