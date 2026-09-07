"use client";

import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";

/* Queue filter bar (handoff A3 §B). Three selects drive the URL query; the
   server re-renders the filtered list (no client-side filtering, always live).
   A pending-count chip sits on the right. */

const selectClass =
  "rounded-md border border-border-strong bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none";

const STATUSES = ["pending", "approved", "rejected", "all"];
const KINDS = [
  "all",
  "manual_news",
  "gated_diff",
  "date_mismatch",
  "fact_flag",
  "unclear_statement",
  "unverified_fact",
];
const SOURCES = ["all", "operator", "agent:R1", "agent:R2", "agent:R3"];

export function QueueFilters({
  status,
  kind,
  source,
  pendingCount,
}: {
  status: string;
  kind: string;
  source: string;
  pendingCount: number | null;
}) {
  const router = useRouter();

  function update(next: Partial<{ status: string; kind: string; source: string }>) {
    const params = new URLSearchParams();
    const merged = { status, kind, source, ...next };
    if (merged.status !== "pending") params.set("status", merged.status);
    if (merged.kind !== "all") params.set("kind", merged.kind);
    if (merged.source !== "all") params.set("source", merged.source);
    const qs = params.toString();
    router.push(qs ? `/admin/queue?${qs}` : "/admin/queue");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="f-status">
        Status
      </label>
      <select
        id="f-status"
        className={selectClass}
        value={status}
        onChange={(e) => update({ status: e.target.value })}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="f-kind">
        Kind
      </label>
      <select
        id="f-kind"
        className={selectClass}
        value={kind}
        onChange={(e) => update({ kind: e.target.value })}
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {k === "all" ? "all kinds" : k}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="f-source">
        Source
      </label>
      <select
        id="f-source"
        className={selectClass}
        value={source}
        onChange={(e) => update({ source: e.target.value })}
      >
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "all sources" : s}
          </option>
        ))}
      </select>

      {pendingCount !== null ? (
        <Chip className="ml-auto">{pendingCount} pending</Chip>
      ) : null}
    </div>
  );
}
