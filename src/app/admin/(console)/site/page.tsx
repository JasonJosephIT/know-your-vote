import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata = { title: "Site — Operator Console" };

export default async function SitePage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Site</h1>
        <p className="text-body-sm text-on-surface-muted">
          Deployment health and recent errors, pulled from Vercel and Sentry —
          with analytics linked out until those products are enabled.
        </p>
      </div>
      <Card>
        <p className="text-body-sm text-on-surface-muted">
          Deployment and error panels arrive in Phase A5. Each will name its
          missing token (VERCEL_API_TOKEN, SENTRY_AUTH_TOKEN) rather than show a
          blank when unconfigured.
        </p>
      </Card>
    </div>
  );
}
