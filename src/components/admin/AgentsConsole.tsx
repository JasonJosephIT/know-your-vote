"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

/* Agents page interactivity (handoff phase-a4-agents §A–E). The page RSC reads
   the current request/run state server-side and hands it here; this layer owns
   the triggers, cancels, the request-state machine, and honest age display.

   The ONE truth this UI tells (ADR-001): a trigger is a QUEUE WRITE, not an
   RPC. It executes only when the Claude desktop app is open on the operator's
   machine, so a request may sit `pending` — the caveat banner and the always-
   visible age say so. State transitions (pending → claimed → fulfilled) are the
   dispatcher's doing; we reconcile by re-reading the server via router.refresh()
   on a ≥30s cadence while anything is live, never faster (design.md § 5). */

export type AgentRequest = {
  id: string;
  agent: string;
  note: string | null;
  status: "pending" | "claimed" | "fulfilled" | "failed" | "cancelled";
  requestedAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  failureReason: string | null;
};

export type AgentRun = {
  id: string;
  agent: string;
  status: "running" | "ok" | "ok_empty" | "failed" | "dry_run";
  itemsWritten: number | null;
  summary: string | null;
  reportPath: string | null;
  startedAt: string;
  finishedAt: string | null;
  runRequestId: string | null;
};

const AGENTS = [
  { id: "R1", role: "Fact-check" },
  { id: "R2", role: "Candidate contact & gated fields" },
  { id: "R3", role: "Key dates" },
  { id: "R4", role: "Ops digest" },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

const STALE_CLAIM_MS = 6 * 60 * 60 * 1000;
const TERMINAL_TTL_MS = 10 * 60 * 1000;
const REFRESH_MS = 30 * 1000;

function isLive(status: string): boolean {
  return status === "pending" || status === "claimed";
}

/* Compact relative age; null `now` means "not yet mounted" (SSR + first client
   render), where we render nothing time-dependent to avoid a hydration
   mismatch. */
function relativeAge(iso: string, now: number | null): string {
  if (now === null) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function absolute(iso: string): string {
  return new Date(iso).toLocaleString();
}

function Age({ iso, now }: { iso: string; now: number | null }) {
  /* Before mount (now === null on both server and first client render) the
     label is the raw ISO — `toLocaleString()` is locale/timezone-dependent and
     would hydrate-mismatch. After mount we swap to the friendly localized form. */
  const label = now === null ? iso : absolute(iso);
  return (
    <time dateTime={iso} aria-label={label} title={label}>
      {relativeAge(iso, now)}
    </time>
  );
}

export function AgentsConsole({
  requests,
  runs,
}: {
  requests: AgentRequest[];
  runs: AgentRun[];
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  const anyLive = requests.some((r) => isLive(r.status));

  /* `now` starts null so SSR and the first client render agree (no time-based
     hydration mismatch); it's seeded on the next tick and re-stamped every
     REFRESH_MS to tick the ages. All sets happen in timer callbacks, never
     synchronously in the effect body. */
  useEffect(() => {
    const seed = setTimeout(() => setNow(Date.now()), 0);
    const tick = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => {
      clearTimeout(seed);
      clearInterval(tick);
    };
  }, []);

  /* Reconcile poll: only re-read the server while something is live — no point
     polling an idle page — and never faster than REFRESH_MS (design.md caching
     rule). Transitions (pending → claimed → fulfilled) are the dispatcher's. */
  useEffect(() => {
    if (!anyLive) return;
    const t = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [anyLive, router]);

  const byAgent = new Map<string, AgentRequest>();
  for (const r of requests) {
    /* keep the newest request per agent */
    const prev = byAgent.get(r.agent);
    if (!prev || new Date(r.requestedAt) > new Date(prev.requestedAt)) {
      byAgent.set(r.agent, r);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-caption text-on-surface-muted"
      >
        Requests execute when the Claude desktop app is open on the operator&apos;s
        machine. A request may sit <span className="font-semibold">pending</span>{" "}
        until then.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AGENTS.map((agent) => (
          <TriggerCard
            key={agent.id}
            agent={agent}
            request={byAgent.get(agent.id) ?? null}
            now={now}
          />
        ))}
      </div>

      <RunHistory initialRuns={runs} now={now} />
    </div>
  );
}

function statusChip(request: AgentRequest, now: number | null) {
  const age = <Age iso={request.resolvedAt ?? request.claimedAt ?? request.requestedAt} now={now} />;
  switch (request.status) {
    case "pending":
      return (
        <span role="status" className="text-caption text-info">
          Queued <Age iso={request.requestedAt} now={now} />
        </span>
      );
    case "claimed": {
      const stale =
        now !== null &&
        request.claimedAt !== null &&
        now - new Date(request.claimedAt).getTime() > STALE_CLAIM_MS;
      return (
        <span className="text-caption text-accent">
          Running (claimed{" "}
          <Age iso={request.claimedAt ?? request.requestedAt} now={now} />)
          {stale ? (
            <span className="text-on-surface-muted">
              {" "}
              — app likely closed, will fail next pass
            </span>
          ) : null}
        </span>
      );
    }
    case "fulfilled":
      return (
        <span className="text-caption text-success">Done {age}</span>
      );
    case "failed":
      return (
        <span role="alert" className="text-caption text-error">
          Failed{request.failureReason ? ` — ${request.failureReason}` : ""}
        </span>
      );
    case "cancelled":
      return (
        <span className="text-caption text-on-surface-muted">Cancelled</span>
      );
    default:
      return null;
  }
}

function TriggerCard({
  agent,
  request,
  now,
}: {
  agent: { id: AgentId; role: string };
  request: AgentRequest | null;
  now: number | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "status";
    text: string;
  } | null>(null);
  const wantFocusCancel = useRef(false);
  const cancelId = `cancel-${agent.id}`;

  /* A terminal request older than the TTL collapses back to a clean "Run now"
     (handoff: fulfilled/cancelled are transient). Live requests never collapse.
     The collapse clock uses the best timestamp we have — resolved_at is set by
     the dispatcher (A14, out of this scope), so we fall back to claimed/
     requested rather than showing a terminal row forever if it's absent. */
  const terminalAt = request
    ? new Date(
        request.resolvedAt ?? request.claimedAt ?? request.requestedAt
      ).getTime()
    : 0;
  const visibleRequest =
    request &&
    (isLive(request.status) ||
      now === null ||
      now - terminalAt < TERMINAL_TTL_MS)
      ? request
      : null;

  const live = visibleRequest ? isLive(visibleRequest.status) : false;
  const cancellable = visibleRequest?.status === "pending";

  /* After a duplicate (409) surfaces the existing request via refresh, move
     focus to its Cancel so the operator can act without hunting for it. The
     intent is a ref (not state) so satisfying it doesn't itself re-render; the
     effect fires when `cancellable` flips true as the refreshed data lands. */
  useEffect(() => {
    if (wantFocusCancel.current && cancellable) {
      wantFocusCancel.current = false;
      document.getElementById(cancelId)?.focus();
    }
  }, [cancellable, cancelId]);

  const trigger = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/agents/run-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agent: agent.id,
          note: note.trim() || undefined,
        }),
      });
      if (res.status === 202) {
        setNote("");
        router.refresh();
      } else if (res.status === 409) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({
          tone: "status",
          text: b.error ?? `${agent.id} already has a live request.`,
        });
        wantFocusCancel.current = true;
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({
          tone: "error",
          text: b.error ?? "Couldn't queue the request — try again.",
        });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  }, [agent.id, note, router]);

  const cancel = useCallback(async () => {
    if (!visibleRequest) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/agents/run-requests/${visibleRequest.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({
          tone: "error",
          text: b.error ?? "Couldn't cancel — try again.",
        });
        router.refresh();
      }
    } catch {
      setMessage({ tone: "error", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  }, [visibleRequest, router]);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-[2px]">
        <span className="font-heading text-h3">{agent.id}</span>
        <span className="text-caption text-on-surface-muted">{agent.role}</span>
      </div>

      {visibleRequest ? (
        <div className="min-h-[1.25rem]">{statusChip(visibleRequest, now)}</div>
      ) : null}

      {visibleRequest?.note ? (
        <p className="text-caption text-on-surface-muted">
          Note: {visibleRequest.note}
        </p>
      ) : null}

      {!live ? (
        <label className="flex flex-col gap-1">
          <span className="sr-only">Optional note for {agent.id}</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            maxLength={500}
            disabled={busy}
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={trigger}
          disabled={busy || live}
          aria-disabled={busy || live}
        >
          {busy ? "Working…" : "Run now"}
        </Button>
        {cancellable ? (
          <Button
            id={cancelId}
            type="button"
            variant="secondary"
            onClick={cancel}
            disabled={busy}
          >
            Cancel
          </Button>
        ) : null}
        {live ? (
          <span className="text-caption text-on-surface-muted">
            A live request is queued.
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-caption ${
            message.tone === "error" ? "text-error" : "text-on-surface-muted"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </Card>
  );
}

const RUN_STATUS_STYLE: Record<AgentRun["status"], string> = {
  running: "text-info",
  ok: "text-success",
  ok_empty: "text-on-surface-muted",
  failed: "text-error",
  dry_run: "text-accent",
};

function duration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function RunHistory({
  initialRuns,
  now,
}: {
  initialRuns: AgentRun[];
  now: number | null;
}) {
  const [filter, setFilter] = useState<"" | AgentRun["agent"]>("");
  const [fetched, setFetched] = useState<AgentRun[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqToken = useRef(0);

  /* Unfiltered view derives straight from the server snapshot (kept fresh by
     the parent's router.refresh()); picking an agent fetches that slice from the
     runs API — the contract's own consumer (design.md § 4) — in the change
     handler, not an effect (fetch on an event, per React guidance). A request
     token drops any response a newer selection has superseded. */
  async function selectAgent(value: "" | AgentRun["agent"]) {
    setFilter(value);
    setError(null);
    if (value === "") {
      setFetched(null);
      setLoading(false);
      return;
    }
    const token = ++reqToken.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/runs?agent=${value}&limit=20`);
      const b = (await res.json().catch(() => ({}))) as {
        runs?: AgentRun[];
        error?: string;
      };
      if (token !== reqToken.current) return;
      if (!res.ok) {
        setError(b.error ?? "Couldn't load run history.");
        setFetched([]);
      } else {
        setFetched(b.runs ?? []);
      }
    } catch {
      if (token === reqToken.current) setError("Couldn't load run history.");
    } finally {
      if (token === reqToken.current) setLoading(false);
    }
  }

  const runs = filter === "" ? initialRuns : (fetched ?? []);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 font-heading">Run history</h2>
        <label className="flex items-center gap-2 text-caption text-on-surface-muted">
          <span>Agent</span>
          <select
            value={filter}
            onChange={(e) =>
              void selectAgent(e.target.value as "" | AgentRun["agent"])
            }
            className="rounded-md border border-border-strong bg-surface px-2 py-1 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">All</option>
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
            <option value="dispatcher">dispatcher</option>
          </select>
        </label>
      </div>

      <Card>
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : loading ? (
          <p className="text-body-sm text-on-surface-muted">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="text-body-sm text-on-surface-muted">
            No runs recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0"
              >
                <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-[2px] text-caption text-on-surface-muted">
                  {run.agent}
                </span>
                <span
                  className={`text-caption font-semibold ${RUN_STATUS_STYLE[run.status]}`}
                >
                  {run.status}
                </span>
                {run.itemsWritten !== null ? (
                  <span className="text-caption text-on-surface-muted">
                    {run.itemsWritten} written
                  </span>
                ) : null}
                <span className="text-caption text-on-surface-muted">
                  <Age iso={run.startedAt} now={now} />
                </span>
                {duration(run.startedAt, run.finishedAt) ? (
                  <span className="text-caption text-on-surface-muted">
                    {duration(run.startedAt, run.finishedAt)}
                  </span>
                ) : null}
                <span className="text-caption text-on-surface-muted">
                  {run.runRequestId ? "triggered" : "scheduled"}
                </span>
                {run.summary ? (
                  <span className="w-full truncate text-caption text-on-surface">
                    {run.summary}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
