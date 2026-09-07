import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnonServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  AGENT_ITEM_TYPES,
  RECENT_WINDOW_DAYS,
  findBannedTermMatch,
  isMissingRequiredUrl,
} from "@/lib/neutrality";
import { ageHours } from "./format";

/* The monitor data layer (design.md § 2 flow 4, § 4; PRD AFR-001…004). Both
   the /api/health + /api/admin/overview route handlers AND the Overview RSC
   import these functions directly — a shared server function, not an HTTP
   self-call, so the page never re-authenticates against its own API. Reads are
   never cached (design.md § 5 Caching): always live.

   First principle (R4's rule): numbers come from queries, never estimates. When
   a value cannot be measured because a dependency is absent, the panel says so
   (Degraded) and names the missing thing — it never shows a fake zero. That is
   why every panel carries a discriminated PanelState rather than a bare
   number. */

export type AgentName = "R1" | "R2" | "R3" | "R4" | "dispatcher";
export const AGENTS: readonly AgentName[] = [
  "R1",
  "R2",
  "R3",
  "R4",
  "dispatcher",
];

/* The DegradedBanner `missing=` strings, verbatim from the handoff §6 table so
   every degraded panel names the dependency identically. */
export const MISSING_0005 = "migration 0005 (candidate_contact)";
export const MISSING_0006 = "migration 0006 (ops tables)";
export const MISSING_SERVICE = "SUPABASE_SERVICE_ROLE_KEY";

const STALE_CLAIM_HOURS = 6; // design.md § 5 Dispatcher stale-claim recovery

/* ---- shared clients + schema probes ------------------------------------- */

function serviceOrNull(): SupabaseClient | null {
  try {
    return createServiceClient();
  } catch {
    return null; // SUPABASE_SERVICE_ROLE_KEY not set — honest degradation upstream
  }
}

/* Is the DB answering at all? Any Postgres/PostgREST error CODE means the
   database replied (reachable, even if it denied us); only a transport failure
   (no code / thrown) counts as unreachable (design.md § 6). */
async function probeReachable(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client
      .from("news_item")
      .select("id", { head: true, count: "exact" });
    if (!error) return true;
    return Boolean(error.code);
  } catch {
    return false;
  }
}

/* Has the migration that creates `table` been applied? true = present,
   false = definitely absent (undefined_table 42P01), null = can't tell (e.g.
   an anon caller lacks privilege to probe an ops table — not the same as
   "absent"). */
async function probeApplied(
  client: SupabaseClient,
  table: string
): Promise<boolean | null> {
  try {
    const { error } = await client
      .from(table)
      .select("*", { head: true, count: "exact" });
    if (!error) return true;
    if (error.code === "42P01") return false;
    return null;
  } catch {
    return null;
  }
}

/* ---- /api/health -------------------------------------------------------- */

export interface AgentHealth {
  last: string | null;
  status: string | null;
}

export interface HealthReport {
  supabase: "ok" | "unreachable";
  service_role: boolean;
  migrations: { "0005": boolean | null; "0006": boolean | null };
  agents: Record<AgentName, AgentHealth>;
  cron_heartbeat: { newest_at: string | null; age_hours: number | null };
  checked_at: string;
}

export async function getHealth(): Promise<HealthReport> {
  const anon = await createAnonServerClient();
  const service = serviceOrNull();
  const now = Date.now();

  const supabaseOk = await probeReachable(anon);

  // 0005: candidate_contact is anon-readable, so anon can probe it. 0006: ops
  // tables are service-role only — anon gets a privilege error, not 42P01, so
  // only the service client can distinguish "applied" from "absent".
  const m0005 = await probeApplied(service ?? anon, "candidate_contact");
  const m0006 = service ? await probeApplied(service, "agent_run") : null;

  const agents = emptyAgentHealth();
  if (service && m0006 === true) {
    const { data } = await service
      .from("agent_run")
      .select("agent, status, started_at")
      .order("started_at", { ascending: false });
    for (const row of data ?? []) {
      const a = row.agent as AgentName;
      if (a in agents && agents[a].last === null) {
        agents[a] = { last: row.started_at as string, status: row.status as string };
      }
    }
  }

  const newestHeartbeat = await newestPipelineEventAt(service ?? anon);

  return {
    supabase: supabaseOk ? "ok" : "unreachable",
    service_role: Boolean(service),
    migrations: { "0005": m0005, "0006": m0006 },
    agents,
    cron_heartbeat: {
      newest_at: newestHeartbeat,
      age_hours: newestHeartbeat === null ? null : ageHours(newestHeartbeat, now),
    },
    checked_at: new Date(now).toISOString(),
  };
}

function emptyAgentHealth(): Record<AgentName, AgentHealth> {
  return {
    R1: { last: null, status: null },
    R2: { last: null, status: null },
    R3: { last: null, status: null },
    R4: { last: null, status: null },
    dispatcher: { last: null, status: null },
  };
}

async function newestPipelineEventAt(
  client: SupabaseClient
): Promise<string | null> {
  const { data, error } = await client
    .from("news_item")
    .select("published_at")
    .eq("item_type", "pipeline_event")
    .order("published_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].published_at as string;
}

/* ---- /api/admin/overview ------------------------------------------------ */

export type PanelState<T> =
  | { status: "ok"; data: T }
  | { status: "empty"; note: string }
  | { status: "degraded"; missing: string }
  | { status: "error"; message: string };

export interface AgentRunRow {
  agent: AgentName;
  status: string | null;
  items_written: number | null;
  started_at: string | null;
  summary: string | null;
  report_path: string | null;
}

export interface FreshnessData {
  race_verified_at: string | null;
  candidate_verified_at: string | null;
  contact_verified_at: string | null;
  stale_count: number;
}

export interface LintFlag {
  id: string;
  kind: "banned_term" | "missing_url";
  term?: string;
  snippet?: string;
}

export interface FeedHealthData {
  counts: Record<string, number>;
  newest_published_at: string | null;
  lint: { verdict: "pass" | "flagged"; agent_rows: number; flags: LintFlag[] };
}

export interface PipelineData {
  published: number;
  draft: number | null; // null = not measurable without the service role
  in_review: number | null;
  newest_event_at: string | null;
}

export interface RiskItem {
  label: string;
  count: number;
}

export interface OverviewSnapshot {
  agent_runs: PanelState<AgentRunRow[]>;
  freshness: PanelState<FreshnessData>;
  feed_health: PanelState<FeedHealthData>;
  pipeline: PanelState<PipelineData>;
  waiting: PanelState<{ pending: number }>;
  risks: PanelState<{ items: RiskItem[]; total: number }>;
  generated_at: string;
}

export async function getOverview(): Promise<OverviewSnapshot> {
  const anon = await createAnonServerClient();
  const service = serviceOrNull();
  const content = service ?? anon; // content plane: service if present, else anon
  const now = Date.now();

  const m0005 = await probeApplied(service ?? anon, "candidate_contact");
  const m0006 = service ? await probeApplied(service, "agent_run") : null;

  const [agent_runs, freshness, feed_health, pipeline, waiting, risks] =
    await Promise.all([
      buildAgentRuns(service, m0006),
      buildFreshness(content, m0005),
      buildFeedHealth(content),
      buildPipeline(content, service),
      buildWaiting(service, m0006),
      buildRisks(service, m0006, now),
    ]);

  return {
    agent_runs,
    freshness,
    feed_health,
    pipeline,
    waiting,
    risks,
    generated_at: new Date(now).toISOString(),
  };
}

/* Pending review_item count — the single source for both the Overview
   "Waiting on Jason" panel and the nav Queue badge (A3). null when it can't be
   measured (0006 absent or service key missing) so the badge stays hidden
   rather than showing a fake zero. */
export async function getPendingReviewCount(): Promise<number | null> {
  const service = serviceOrNull();
  if (!service) return null;
  const { count, error } = await service
    .from("review_item")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending");
  if (error) return null;
  return count ?? 0;
}

/* ---- panel builders ----------------------------------------------------- */

async function buildAgentRuns(
  service: SupabaseClient | null,
  m0006: boolean | null
): Promise<PanelState<AgentRunRow[]>> {
  if (!service) return { status: "degraded", missing: MISSING_SERVICE };
  if (m0006 === false) return { status: "degraded", missing: MISSING_0006 };

  const { data, error } = await service
    .from("agent_run")
    .select("agent, status, items_written, started_at, summary, report_path")
    .order("started_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return { status: "degraded", missing: MISSING_0006 };
    return { status: "error", message: error.message };
  }

  // Newest run per agent; agents with no run appear with null fields so the UI
  // can render "has not run yet" rather than hiding them (AFR-002).
  const newest = new Map<AgentName, AgentRunRow>();
  for (const row of data ?? []) {
    const a = row.agent as AgentName;
    if (!AGENTS.includes(a) || newest.has(a)) continue;
    newest.set(a, {
      agent: a,
      status: row.status as string,
      items_written: (row.items_written as number | null) ?? null,
      started_at: row.started_at as string,
      summary: (row.summary as string | null) ?? null,
      report_path: (row.report_path as string | null) ?? null,
    });
  }
  const rows: AgentRunRow[] = AGENTS.map(
    (a) =>
      newest.get(a) ?? {
        agent: a,
        status: null,
        items_written: null,
        started_at: null,
        summary: null,
        report_path: null,
      }
  );
  return { status: "ok", data: rows };
}

async function buildFreshness(
  content: SupabaseClient,
  m0005: boolean | null
): Promise<PanelState<FreshnessData>> {
  if (m0005 === false) return { status: "degraded", missing: MISSING_0005 };

  const [raceRes, candRes, contactRes] = await Promise.all([
    content
      .from("race")
      .select("info_last_verified_at")
      .not("info_last_verified_at", "is", null)
      .order("info_last_verified_at", { ascending: false })
      .limit(1),
    content
      .from("candidate")
      .select("site_last_verified_at")
      .not("site_last_verified_at", "is", null)
      .order("site_last_verified_at", { ascending: false })
      .limit(1),
    content
      .from("candidate_contact")
      .select("last_verified_at")
      .order("last_verified_at", { ascending: false })
      .limit(1),
  ]);

  // A column/table not yet added by 0005 surfaces as undefined-column/table.
  const schemaGap = [raceRes, candRes, contactRes].some(
    (r) => r.error && (r.error.code === "42703" || r.error.code === "42P01")
  );
  if (schemaGap) return { status: "degraded", missing: MISSING_0005 };

  const realError = [raceRes, candRes, contactRes].find((r) => r.error);
  if (realError?.error) return { status: "error", message: realError.error.message };

  const race_verified_at = raceRes.data?.[0]?.info_last_verified_at ?? null;
  const candidate_verified_at = candRes.data?.[0]?.site_last_verified_at ?? null;
  const contact_verified_at = contactRes.data?.[0]?.last_verified_at ?? null;

  if (!race_verified_at && !candidate_verified_at && !contact_verified_at) {
    return { status: "empty", note: "No freshness stamps recorded yet." };
  }
  return {
    status: "ok",
    data: {
      race_verified_at,
      candidate_verified_at,
      contact_verified_at,
      stale_count: 0,
    },
  };
}

async function buildFeedHealth(
  content: SupabaseClient
): Promise<PanelState<FeedHealthData>> {
  const sinceIso = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await content
    .from("news_item")
    .select("id, item_type, title, summary, url, published_at")
    .gte("published_at", sinceIso);
  if (error) return { status: "error", message: error.message };

  const rows = data ?? [];
  const counts: Record<string, number> = {};
  let newest: string | null = null;
  const agentRows: Array<{
    id: string;
    item_type: string;
    title: string | null;
    summary: string | null;
    url: string | null;
  }> = [];

  for (const row of rows) {
    const t = row.item_type as string;
    counts[t] = (counts[t] ?? 0) + 1;
    const pub = row.published_at as string;
    if (!newest || pub > newest) newest = pub;
    if ((AGENT_ITEM_TYPES as readonly string[]).includes(t)) {
      agentRows.push({
        id: row.id as string,
        item_type: t,
        title: (row.title as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        url: (row.url as string | null) ?? null,
      });
    }
  }

  // Neutrality lint over the agent-written rows only (AFR-003), via the shared
  // matcher. One flag per issue: a missing-url flag and/or a banned-term flag
  // (first match per row, proportionate, same as the CLI). 0 agent rows is an
  // explicit pass, never a blank (design.md § 5).
  const flags: LintFlag[] = [];
  for (const r of agentRows) {
    if (isMissingRequiredUrl(r)) {
      flags.push({ id: r.id, kind: "missing_url" });
    }
    const match = findBannedTermMatch([r.title ?? "", r.summary ?? ""].join(" "));
    if (match) {
      flags.push({ id: r.id, kind: "banned_term", term: match.term, snippet: match.snippet });
    }
  }

  return {
    status: "ok",
    data: {
      counts,
      newest_published_at: newest,
      lint: {
        verdict: flags.length > 0 ? "flagged" : "pass",
        agent_rows: agentRows.length,
        flags,
      },
    },
  };
}

async function buildPipeline(
  content: SupabaseClient,
  service: SupabaseClient | null
): Promise<PanelState<PipelineData>> {
  // published rows + the pipeline_event heartbeat are anon-readable, so they
  // come from `content`. draft/in_review rows are NOT anon-readable (RLS
  // anon_read_published), so counting them with the anon client would return a
  // FAKE ZERO — dishonest. They come from the service client only; without it
  // they are reported as null ("—"), never a made-up 0 (roadmap Build Phil. 10).
  const [pub, newestEvent, draft, inReview] = await Promise.all([
    content
      .from("race_publication")
      .select("*", { head: true, count: "exact" })
      .eq("status", "published"),
    newestPipelineEventAt(content),
    service
      ? service
          .from("race_publication")
          .select("*", { head: true, count: "exact" })
          .eq("status", "draft")
      : null,
    service
      ? service
          .from("race_publication")
          .select("*", { head: true, count: "exact" })
          .eq("status", "in_review")
      : null,
  ]);

  const err = [pub, draft, inReview].find((r) => r && r.error);
  if (err?.error) return { status: "error", message: err.error.message };

  const data: PipelineData = {
    published: pub.count ?? 0,
    draft: service ? (draft?.count ?? 0) : null,
    in_review: service ? (inReview?.count ?? 0) : null,
    newest_event_at: newestEvent,
  };
  // Only claim "empty" when drafts were actually measured (service present) —
  // a null (unmeasured) draft count must not read as a confident zero.
  if (
    data.published === 0 &&
    data.draft === 0 &&
    data.in_review === 0 &&
    !data.newest_event_at
  ) {
    return { status: "empty", note: "No pipeline activity yet." };
  }
  return { status: "ok", data };
}

async function buildWaiting(
  service: SupabaseClient | null,
  m0006: boolean | null
): Promise<PanelState<{ pending: number }>> {
  if (!service) return { status: "degraded", missing: MISSING_SERVICE };
  if (m0006 === false) return { status: "degraded", missing: MISSING_0006 };

  const { count, error } = await service
    .from("review_item")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending");
  if (error) {
    if (error.code === "42P01") return { status: "degraded", missing: MISSING_0006 };
    return { status: "error", message: error.message };
  }
  const pending = count ?? 0;
  if (pending === 0) return { status: "ok", data: { pending: 0 } };
  return { status: "ok", data: { pending } };
}

async function buildRisks(
  service: SupabaseClient | null,
  m0006: boolean | null,
  now: number
): Promise<PanelState<{ items: RiskItem[]; total: number }>> {
  if (!service) return { status: "degraded", missing: MISSING_SERVICE };
  if (m0006 === false) return { status: "degraded", missing: MISSING_0006 };

  const staleCutoff = new Date(now - STALE_CLAIM_HOURS * 3_600_000).toISOString();
  const [failedRuns, applyErrors, staleClaims] = await Promise.all([
    service
      .from("agent_run")
      .select("*", { head: true, count: "exact" })
      .eq("status", "failed"),
    service
      .from("review_item")
      .select("*", { head: true, count: "exact" })
      .not("apply_error", "is", null),
    service
      .from("agent_run_request")
      .select("*", { head: true, count: "exact" })
      .eq("status", "claimed")
      .lt("claimed_at", staleCutoff),
  ]);

  const err = [failedRuns, applyErrors, staleClaims].find((r) => r.error);
  if (err?.error) {
    if (err.error.code === "42P01") return { status: "degraded", missing: MISSING_0006 };
    return { status: "error", message: err.error.message };
  }

  const items: RiskItem[] = [
    { label: "Failed agent runs", count: failedRuns.count ?? 0 },
    { label: "Review items with apply errors", count: applyErrors.count ?? 0 },
    { label: "Stale claimed run requests (> 6h)", count: staleClaims.count ?? 0 },
  ].filter((i) => i.count > 0);

  return { status: "ok", data: { items, total: items.reduce((n, i) => n + i.count, 0) } };
}
