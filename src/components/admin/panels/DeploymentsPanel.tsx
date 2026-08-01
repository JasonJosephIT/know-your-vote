import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import { AsOf } from "@/components/admin/panels/AsOf";
import { safeHttpUrl } from "@/lib/format";
import { formatRelativeTime } from "@/lib/admin/datetime";
import {
  getDeployments,
  type Deployment,
  type DeploymentState,
} from "@/lib/admin/site";

/* Deployments panel (AFR-040). Async RSC — reads the shared, ~60s-cached
   site-metrics layer directly (the page already ran requireAdmin). Today's
   proven state is the tokenless DegradedBanner; the deploy-list states light
   up once the founder sets VERCEL_API_TOKEN + VERCEL_PROJECT_ID (A00c). */

const STATE_CLASS: Record<DeploymentState, string> = {
  READY: "border-success text-success",
  BUILDING: "border-info text-info",
  INITIALIZING: "border-info text-info",
  ERROR: "border-error text-error",
  QUEUED: "border-border text-on-surface-muted",
  CANCELED: "border-border text-on-surface-muted",
  UNKNOWN: "border-border text-on-surface-muted",
};

function StateChip({ state }: { state: DeploymentState }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-[2px] text-caption font-medium ${STATE_CLASS[state]}`}
    >
      {state}
    </span>
  );
}

function DeployRow({ d }: { d: Deployment }) {
  const url = safeHttpUrl(d.inspectorUrl);
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <StateChip state={d.state} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-body-sm text-on-surface"
          title={d.commitMessage ?? undefined}
        >
          {d.commitMessage ?? "(no commit message)"}
        </p>
        <p className="text-caption text-on-surface-muted">
          {d.commitSha ? (
            <code className="font-mono">{d.commitSha}</code>
          ) : (
            "no commit"
          )}
          {" · "}
          <time dateTime={d.createdAt}>{formatRelativeTime(d.createdAt)}</time>
        </p>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open deployment in Vercel"
          className="shrink-0 text-caption text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          Open ↗
        </a>
      ) : null}
    </div>
  );
}

export async function DeploymentsPanel() {
  const result = await getDeployments();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-overline">Deployments</h2>
        {result.kind === "ok" ? <AsOf iso={result.fetchedAt} /> : null}
      </div>

      {result.kind === "unavailable" ? (
        <DegradedBanner missing={result.missing}>
          Set it in the environment to show production and preview deploys.
        </DegradedBanner>
      ) : null}

      {result.kind === "error" ? (
        <p role="alert" className="text-body-sm text-error">
          Vercel API error ({result.status || "unreachable"}). Refresh to retry.
        </p>
      ) : null}

      {result.kind === "ok" ? (
        result.production || result.previews.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-caption text-on-surface-muted">Production</p>
              {result.production ? (
                <DeployRow d={result.production} />
              ) : (
                <p className="text-body-sm text-on-surface-muted">
                  No production deployment in range.
                </p>
              )}
            </div>
            {result.previews.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-caption text-on-surface-muted">
                  Recent previews
                </p>
                <div>
                  {result.previews.map((d) => (
                    <DeployRow key={d.uid} d={d} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-muted">
            No deployments in range.
          </p>
        )
      ) : null}
    </Card>
  );
}
