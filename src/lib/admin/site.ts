import "server-only";

import { unstable_cache } from "next/cache";

/* Site-metrics data layer (design.md § 4, § 6; PRD AFR-040…041). Both the
   `/api/admin/site/*` route handlers and the RSC panels call these — one
   source of truth for the Vercel/Sentry contracts, the ~60s cache, and the
   honest-degradation rules. Auth is enforced by the caller (requireAdmin in
   the page, checkAdmin in the routes); these functions are pure data and
   `server-only` so the tokens never reach the client.

   Every external fetch is wrapped in `unstable_cache` with a 60s revalidate:
   the route runs per-request (it reads the session cookie, so it is dynamic),
   but the upstream response is shared for ~60s and carries a `fetchedAt` the
   panels surface as an "as of" caption — honest about the built-in staleness.
   Missing tokens short-circuit BEFORE any fetch, so today's tokenless state is
   a named DegradedBanner, never a blank or a fake. */

const REVALIDATE_SECONDS = 60;

/* A non-OK upstream status, thrown from inside the cached function so it is NOT
   cached (a transient 5xx clears on the next refresh instead of sticking for a
   full minute); a caught throw becomes the panel's `error` state. */
class UpstreamError extends Error {
  constructor(readonly status: number) {
    super(`upstream responded ${status}`);
  }
}

function upstreamStatus(err: unknown): number {
  return err instanceof UpstreamError ? err.status : 0;
}

/* ── Deployments — Vercel REST v6 (AFR-040) ──────────────────────────────── */

export type DeploymentState =
  | "READY"
  | "BUILDING"
  | "ERROR"
  | "QUEUED"
  | "CANCELED"
  | "INITIALIZING"
  | "UNKNOWN";

export type Deployment = {
  uid: string;
  state: DeploymentState;
  target: "production" | "preview";
  createdAt: string; // ISO
  commitSha: string | null; // short (7)
  commitMessage: string | null;
  inspectorUrl: string | null;
};

export type DeploymentsResult =
  | { kind: "unavailable"; missing: string }
  | {
      kind: "ok";
      production: Deployment | null;
      previews: Deployment[];
      fetchedAt: string;
    }
  | { kind: "error"; status: number };

const KNOWN_STATES: readonly DeploymentState[] = [
  "READY",
  "BUILDING",
  "ERROR",
  "QUEUED",
  "CANCELED",
  "INITIALIZING",
];

type RawVercelDeployment = {
  uid?: string;
  state?: string;
  readyState?: string;
  created?: number;
  createdAt?: number;
  target?: string | null;
  inspectorUrl?: string | null;
  meta?: Record<string, string | undefined>;
};

function normalizeDeployment(d: RawVercelDeployment): Deployment {
  const raw = (d.state ?? d.readyState ?? "UNKNOWN").toUpperCase();
  const state = (KNOWN_STATES as readonly string[]).includes(raw)
    ? (raw as DeploymentState)
    : "UNKNOWN";
  const createdMs = d.created ?? d.createdAt ?? Date.now();
  const meta = d.meta ?? {};
  const sha =
    meta.githubCommitSha ??
    meta.gitlabCommitSha ??
    meta.bitbucketCommitSha ??
    null;
  const message =
    meta.githubCommitMessage ??
    meta.gitlabCommitMessage ??
    meta.bitbucketCommitMessage ??
    null;
  return {
    uid: d.uid ?? "",
    state,
    target: d.target === "production" ? "production" : "preview",
    createdAt: new Date(createdMs).toISOString(),
    commitSha: sha ? sha.slice(0, 7) : null,
    commitMessage: message ?? null,
    inspectorUrl: d.inspectorUrl ?? null,
  };
}

/* Env is read INSIDE the cached functions (it is stable per process), so the
   secret tokens never become part of the cache key. The `!` assertions are
   safe: the exported getters below check presence and return `unavailable`
   before these ever run, and neither cached fn is exported. */
const cachedDeployments = unstable_cache(
  async (): Promise<{
    production: Deployment | null;
    previews: Deployment[];
    fetchedAt: string;
  }> => {
    const token = process.env.VERCEL_API_TOKEN!;
    const projectId = process.env.VERCEL_PROJECT_ID!;
    const teamId = process.env.VERCEL_TEAM_ID || undefined;

    /* One page, newest-first, split by target below. 20 comfortably spans the
       latest production deploy at this app's scale (design.md § 1: a handful of
       deploys); if heavy preview churn ever pushed it off the page the panel
       would honestly read "No production deployment in range" rather than fake
       one — v1.1 can add a targeted production query if that ever happens. */
    const params = new URLSearchParams({ projectId, limit: "20" });
    if (teamId) params.set("teamId", teamId);

    const res = await fetch(
      `https://api.vercel.com/v6/deployments?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new UpstreamError(res.status);

    const json = (await res.json()) as { deployments?: RawVercelDeployment[] };
    /* Vercel returns newest-first: the first production entry is the live one;
       the rest of the previews are the recent preview builds. */
    const all = (json.deployments ?? []).map(normalizeDeployment);
    return {
      production: all.find((d) => d.target === "production") ?? null,
      previews: all.filter((d) => d.target === "preview").slice(0, 6),
      fetchedAt: new Date().toISOString(),
    };
  },
  ["admin", "site", "deployments"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-site-deployments"] }
);

export async function getDeployments(): Promise<DeploymentsResult> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { kind: "unavailable", missing: "VERCEL_API_TOKEN" };
  if (!process.env.VERCEL_PROJECT_ID) {
    return { kind: "unavailable", missing: "VERCEL_PROJECT_ID" };
  }

  try {
    return { kind: "ok", ...(await cachedDeployments()) };
  } catch (err) {
    return { kind: "error", status: upstreamStatus(err) };
  }
}

/* ── Errors — Sentry Issues API (AFR-041) ────────────────────────────────── */

export type IssueLevel =
  | "fatal"
  | "error"
  | "warning"
  | "info"
  | "debug"
  | "sample";

export type SentryIssue = {
  id: string;
  title: string;
  level: IssueLevel;
  count: number;
  lastSeen: string; // ISO
  permalink: string | null;
};

export type ErrorsResult =
  | { kind: "unavailable"; missing: string }
  | { kind: "idle"; fetchedAt: string } // configured, but no events yet
  | { kind: "ok"; issues: SentryIssue[]; fetchedAt: string }
  | { kind: "error"; status: number };

const KNOWN_LEVELS: readonly IssueLevel[] = [
  "fatal",
  "error",
  "warning",
  "info",
  "debug",
  "sample",
];

type RawSentryIssue = {
  id?: string;
  title?: string;
  culprit?: string;
  level?: string;
  count?: string | number;
  lastSeen?: string;
  permalink?: string;
  metadata?: { value?: string; type?: string };
};

function normalizeIssue(i: RawSentryIssue): SentryIssue {
  const lvl = (i.level ?? "error").toLowerCase();
  const level = (KNOWN_LEVELS as readonly string[]).includes(lvl)
    ? (lvl as IssueLevel)
    : "error";
  return {
    id: i.id ?? "",
    title: i.title || i.metadata?.value || i.culprit || "(untitled issue)",
    level,
    count: Number(i.count ?? 0) || 0,
    lastSeen: i.lastSeen ?? new Date().toISOString(),
    permalink: i.permalink ?? null,
  };
}

const cachedSentryIssues = unstable_cache(
  async (): Promise<{ issues: SentryIssue[]; fetchedAt: string }> => {
    const token = process.env.SENTRY_AUTH_TOKEN!;
    const org = process.env.SENTRY_ORG!;
    const project = process.env.SENTRY_PROJECT!;
    const host = process.env.SENTRY_URL || "https://sentry.io";

    const params = new URLSearchParams({
      query: "is:unresolved",
      sort: "date", // last-seen desc → newest-first (handoff § B)
      statsPeriod: "14d",
      limit: "10",
    });
    const res = await fetch(
      `${host}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(
        project
      )}/issues/?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new UpstreamError(res.status);

    const json = (await res.json()) as RawSentryIssue[];
    return {
      issues: (Array.isArray(json) ? json : []).map(normalizeIssue),
      fetchedAt: new Date().toISOString(),
    };
  },
  ["admin", "site", "errors"],
  { revalidate: REVALIDATE_SECONDS, tags: ["admin-site-errors"] }
);

export async function getSentryIssues(): Promise<ErrorsResult> {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return { kind: "unavailable", missing: "SENTRY_AUTH_TOKEN" };
  }
  if (!process.env.SENTRY_ORG) {
    return { kind: "unavailable", missing: "SENTRY_ORG" };
  }
  if (!process.env.SENTRY_PROJECT) {
    return { kind: "unavailable", missing: "SENTRY_PROJECT" };
  }

  try {
    const { issues, fetchedAt } = await cachedSentryIssues();
    /* Token wired but the DSN is silent — "configured but idle" is a distinct,
       honest state from "not configured" (design.md § 6). */
    return issues.length === 0
      ? { kind: "idle", fetchedAt }
      : { kind: "ok", issues, fetchedAt };
  } catch (err) {
    return { kind: "error", status: upstreamStatus(err) };
  }
}
