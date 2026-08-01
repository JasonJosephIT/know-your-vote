import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import { AsOf } from "@/components/admin/panels/AsOf";
import { safeHttpUrl } from "@/lib/format";
import { formatRelativeTime } from "@/lib/admin/datetime";
import {
  getSentryIssues,
  type SentryIssue,
  type IssueLevel,
} from "@/lib/admin/site";

/* Errors panel (AFR-041). Two-way honest degradation the operator must be able
   to tell apart: token MISSING → DegradedBanner naming the var; token present
   but the DSN is SILENT → "not receiving events yet" (design.md § 6). Today
   the token is unset (A00c), so the DegradedBanner is the proven state. */

const LEVEL_CLASS: Record<IssueLevel, string> = {
  fatal: "border-error text-error",
  error: "border-error text-error",
  warning: "border-warning text-warning",
  info: "border-info text-info",
  debug: "border-border text-on-surface-muted",
  sample: "border-border text-on-surface-muted",
};

function LevelChip({ level }: { level: IssueLevel }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-[2px] text-caption font-medium ${LEVEL_CLASS[level]}`}
    >
      {level}
    </span>
  );
}

function IssueRow({ i }: { i: SentryIssue }) {
  const url = safeHttpUrl(i.permalink);
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <LevelChip level={i.level} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm text-on-surface" title={i.title}>
          {i.title}
        </p>
        <p className="text-caption text-on-surface-muted">
          {i.count.toLocaleString()} event{i.count === 1 ? "" : "s"}
          {" · "}
          <time dateTime={i.lastSeen}>{formatRelativeTime(i.lastSeen)}</time>
        </p>
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open issue in Sentry"
          className="shrink-0 text-caption text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          Open ↗
        </a>
      ) : null}
    </div>
  );
}

export async function ErrorsPanel() {
  const result = await getSentryIssues();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-overline">Errors</h2>
        {result.kind === "ok" || result.kind === "idle" ? (
          <AsOf iso={result.fetchedAt} />
        ) : null}
      </div>

      {result.kind === "unavailable" ? (
        <DegradedBanner missing={result.missing}>
          Set it to pull recent issues from the Sentry Issues API.
        </DegradedBanner>
      ) : null}

      {result.kind === "idle" ? (
        <p role="status" className="text-body-sm text-on-surface-muted">
          Sentry not receiving events yet — the token is wired but no issues
          have arrived. This lights up once the DSN is set and an error is
          captured.
        </p>
      ) : null}

      {result.kind === "error" ? (
        <p role="alert" className="text-body-sm text-error">
          Sentry API error ({result.status || "unreachable"}). Refresh to retry.
        </p>
      ) : null}

      {result.kind === "ok" ? (
        <div>
          {result.issues.map((i) => (
            <IssueRow key={i.id} i={i} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
