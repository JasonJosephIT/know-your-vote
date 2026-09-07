import { requireAdmin } from "@/lib/admin/guard";
import { getAdminLog } from "@/lib/admin/log";
import { relativeTime } from "@/lib/admin/format";
import { Card } from "@/components/ui/Card";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import type { AdminActionName } from "@/types/admin";

export const metadata = { title: "Log — Operator Console" };
export const dynamic = "force-dynamic";

const ACTION_CHIP: Record<AdminActionName, string> = {
  trigger: "bg-accent-muted text-accent-strong",
  submit: "bg-info/15 text-info",
  approve: "bg-primary-muted text-success",
  reject: "bg-surface-muted text-on-surface-muted",
  cancel: "bg-warning/15 text-warning",
};

export default async function LogPage() {
  await requireAdmin();
  const result = await getAdminLog();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Activity log</h1>
        <p className="text-body-sm text-on-surface-muted">
          An append-only record of every privileged action — who did what, and
          when — read newest first.
        </p>
      </div>

      {result.status === "degraded" ? (
        <DegradedBanner missing={result.missing} />
      ) : result.status === "error" ? (
        <Card>
          <p role="alert" className="text-body-sm text-error">
            Couldn’t load the log: {result.message}
          </p>
        </Card>
      ) : result.rows.length === 0 ? (
        <Card>
          <p className="text-body-sm text-on-surface-muted">
            No actions recorded yet.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col">
          {result.rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2 py-[2px] text-caption ${
                    ACTION_CHIP[row.action] ?? "bg-surface-muted text-on-surface-muted"
                  }`}
                >
                  {row.action}
                </span>
                <span className="text-caption text-on-surface-muted">{row.actor}</span>
                <span className="font-mono text-caption text-on-surface-muted">
                  {row.subject_kind}:{row.subject_id.slice(0, 8)}
                </span>
                <span className="ml-auto text-caption text-on-surface-muted">
                  {relativeTime(row.created_at)}
                </span>
              </div>
              {row.detail != null ? (
                <details className="text-caption">
                  <summary className="cursor-pointer text-on-surface-muted">
                    detail
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-surface-muted p-3 font-mono text-caption text-on-surface-muted">
                    {JSON.stringify(row.detail, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
