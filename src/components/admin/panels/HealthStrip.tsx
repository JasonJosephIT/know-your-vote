import type { HealthReport } from "@/lib/admin/monitor";
import { relativeTime } from "@/lib/admin/format";

/* The health strip atop the Overview (handoff A2 §A). One row consuming
   /api/health: a status dot + a plain-language summary. Color is never the only
   signal — the dot carries an aria-label and the text says the same thing. */

const CRON_STALE_HOURS = 30;

function migrationLabel(v: boolean | null): {
  text: string;
  warn: boolean;
} {
  if (v === true) return { text: "applied", warn: false };
  if (v === false) return { text: "pending", warn: true };
  return { text: "unknown", warn: true };
}

export function HealthStrip({ health }: { health: HealthReport }) {
  const supabaseDown = health.supabase !== "ok";
  const m5 = migrationLabel(health.migrations["0005"]);
  const m6 = migrationLabel(health.migrations["0006"]);
  const cronAge = health.cron_heartbeat.age_hours;
  const cronStale = cronAge !== null && cronAge > CRON_STALE_HOURS;

  const degraded = m5.warn || m6.warn || cronStale || !health.service_role;

  const status: "ok" | "warn" | "down" = supabaseDown
    ? "down"
    : degraded
      ? "warn"
      : "ok";

  const dotClass =
    status === "down"
      ? "bg-error"
      : status === "warn"
        ? "bg-warning"
        : "bg-success";
  const dotLabel =
    status === "down"
      ? "System status: down"
      : status === "warn"
        ? "System status: degraded"
        : "System status: healthy";

  const cronText =
    cronAge === null
      ? "cron never"
      : `cron ${relativeTime(health.cron_heartbeat.newest_at)}`;

  return (
    <div
      role={supabaseDown ? "alert" : "status"}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${dotClass}`}
        role="img"
        aria-label={dotLabel}
      />
      <span className="text-caption text-on-surface-muted">
        {supabaseDown ? "Supabase unreachable" : "Supabase OK"}
        {" · "}
        <span className={m5.warn ? "text-warning" : undefined}>
          0005 {m5.text}
        </span>
        {" · "}
        <span className={m6.warn ? "text-warning" : undefined}>
          0006 {m6.text}
        </span>
        {" · "}
        <span className={cronStale ? "text-warning" : undefined}>{cronText}</span>
        {!health.service_role ? (
          <>
            {" · "}
            <span className="text-warning">service key unset</span>
          </>
        ) : null}
      </span>
    </div>
  );
}
