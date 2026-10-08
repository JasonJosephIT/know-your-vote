/* R4's digest step (spec docs/superpowers/specs/2026-10-08-agent-retrofit-design.md
   §3.7), run only through scripts/agent-run.sh as `R4 digest`:

     task-runs.json (R4's list_task_runs answers) on stdin  ->  digest.json on stdout

   READ ONLY. Every database call is a SELECT through PostgREST (a GET, or a
   HEAD for a count). scripts/verify-ops-digest.ts checks the source for any
   write call and runs this file against a fake server that logs every
   method. It writes no file: the wrapper saves stdout as
   <run dir>/digest.json. The counting rules are in src/lib/ops-digest.ts.

   Fail closed: a read error exits 1 naming the table, with nothing on
   stdout, so R4 never renders a page from part of the data. A bad
   task-runs.json is not a read error: the digest says so and goes on.

   It never reads an address: voting_info_subscription gives zip5 and
   consent_at only, and election_event never gives who verified a row.

   KYV_RUN_REPORTS is for scripts/verify-ops-digest.ts only. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import {
  AGENT_NEWS_TYPES,
  ELECTION,
  ELECTION_KIND,
  FEED_WINDOW_DAYS,
  buildDigest,
  summaryLine,
  type AgentRunRow,
  type CandidateRow,
  type ElectionEventRow,
  type NewsRow,
  type PipelineEventRow,
  type ProfileRow,
  type PublicationRow,
  type RaceRow,
  type ReviewRow,
  type SendLogRow,
  type SubscriptionRow,
} from "../src/lib/ops-digest.ts";

loadEnvLocal(import.meta.url);

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPORTS =
  process.env.KYV_RUN_REPORTS ||
  "/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/Agents/RunReports";
/* The project folder holds the digest pages; RunReports is <project>/Agents/RunReports. */
const PROJECT = path.dirname(path.dirname(REPORTS));
/* PostgREST returns at most 1000 rows per request. */
const PAGE = 1000;
const NEWS_COLUMNS = "id, item_type, race_id, candidate_id, metro, county_fips, relation, source_id, published_at";
const EVENT_COLUMNS = "id, county_fips, event_type, election, event_date, rule, details_url, verified_at";

function die(code: number, message: string): never {
  console.error(`ops-digest: ${message}`);
  process.exit(code);
}

if (process.argv.length > 2) die(2, `unknown argument(s) ${process.argv.slice(2).join(" ")}; usage: ops-digest.ts < task-runs.json`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) die(1, "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Page = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** Every row of a read, page by page; a read error stops the digest. */
async function all<T>(label: string, page: (from: number, to: number) => Page): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) die(1, `could not read ${label}: ${error.message}`);
    const got = (data ?? []) as T[];
    rows.push(...got);
    if (got.length < PAGE) return rows;
  }
}

async function stdinText(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
/* Local time, as the wrapper's `date +%F` names the run folder and report. */
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const since30 = new Date(now.getTime() - FEED_WINDOW_DAYS * 86_400_000).toISOString();

const taskRunsText = await stdinText();

let vercel: unknown = null;
try {
  vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
} catch {
  vercel = null; // the digest reports "vercel.json has no crons list"
}

const reports = existsSync(REPORTS)
  ? readdirSync(REPORTS).map((name) => ({ name, path: path.join(REPORTS, name) }))
  : [];
const latest = path.join(PROJECT, "CAP_Ops_Digest_latest.html");
const monthly = path.join(PROJECT, `CAP_Ops_Digest_${date.slice(0, 7)}.html`);

const agentRuns = await all<AgentRunRow>("agent_run", (f, t) =>
  db.from("agent_run").select("agent, started_at, finished_at, status, items_written, summary").order("started_at").order("id").range(f, t),
);
const review = await all<ReviewRow>("review_item", (f, t) =>
  db.from("review_item").select("id, kind, source, status, created_at, decided_at, apply_error").order("created_at").order("id").range(f, t),
);
const races = await all<RaceRow>("race", (f, t) =>
  db.from("race").select("race_id, office, candidate_ids, info_last_verified_at").eq("election", ELECTION_KIND).order("race_id").range(f, t),
);
const publications = await all<PublicationRow>("race_publication", (f, t) =>
  db.from("race_publication").select("race_id, status, published_at").order("race_id").range(f, t),
);
const candidates = await all<CandidateRow>("candidate", (f, t) =>
  db.from("candidate").select("candidate_id, legal_name, party, ballot_status, site_last_verified_at").order("candidate_id").range(f, t),
);
const profiles = await all<ProfileRow>("profile", (f, t) =>
  db.from("profile").select("candidate_id, race_id, audit").order("candidate_id").order("race_id").range(f, t),
);
const recentNews = await all<NewsRow>("news_item (last 30 days)", (f, t) =>
  db.from("news_item").select(NEWS_COLUMNS).gte("published_at", since30).order("published_at").order("id").range(f, t),
);
const sourcelessNews = await all<NewsRow>("news_item (no source_id)", (f, t) =>
  db.from("news_item").select(NEWS_COLUMNS).in("item_type", [...AGENT_NEWS_TYPES]).is("source_id", null).order("id").range(f, t),
);
const pipelineEvents = await all<PipelineEventRow>("news_item (pipeline_event)", (f, t) =>
  db.from("news_item").select("race_id, published_at").eq("item_type", "pipeline_event").order("published_at").order("id").range(f, t),
);
const events = await all<ElectionEventRow>(`election_event (${ELECTION})`, (f, t) =>
  db.from("election_event").select(EVENT_COLUMNS).eq("election", ELECTION).order("event_date").order("id").range(f, t),
);
/* The reminder cron reads every verified row, of any election
   (verifiedElectionEvents in src/lib/notifications/election-events.ts, which
   imports server-only, so the filter is repeated here). */
const verifiedEvents = await all<ElectionEventRow>("election_event (verified)", (f, t) =>
  db.from("election_event").select(EVENT_COLUMNS).not("verified_by", "is", null).order("event_date").order("id").range(f, t),
);
const sendLog = await all<SendLogRow>("notification_send_log", (f, t) =>
  db.from("notification_send_log").select("dedupe_key, sent_at, recipient_count").order("dedupe_key").range(f, t),
);
const subscriptions = await all<SubscriptionRow>("voting_info_subscription", (f, t) =>
  db.from("voting_info_subscription").select("zip5, consent_at").eq("active", true).order("unsubscribe_token").range(f, t),
);
const zipCounty = new Map<string, string>();
const zips = [...new Set(subscriptions.map((s) => s.zip5))];
for (let i = 0; i < zips.length; i += 200) {
  const rows = await all<{ zip5: string; county_fips: string }>("zip_district", (f, t) =>
    db.from("zip_district").select("zip5, county_fips").in("zip5", zips.slice(i, i + 200)).order("zip5").range(f, t),
  );
  for (const r of rows) zipCounty.set(r.zip5, r.county_fips);
}
const contact = await db.from("candidate_contact").select("candidate_id", { count: "exact", head: true });
if (contact.error || contact.count === null) die(1, `could not read candidate_contact: ${contact.error?.message ?? "no count"}`);

const digest = buildDigest(
  {
    date,
    outputs: { latest, latest_exists: existsSync(latest), monthly, monthly_exists: existsSync(monthly) },
    vercel,
    taskRunsText,
    reports,
    agentRuns,
    review,
    races,
    publications,
    candidates,
    profiles,
    recentNews,
    sourcelessNews,
    pipelineEvents,
    events,
    verifiedEvents,
    sendLog,
    subscriptions,
    zipCounty,
    contactRows: contact.count,
  },
  now,
);

/* No process.exit after the write: it can cut a large stdout short. */
process.stdout.write(`${JSON.stringify(digest, null, 1)}\n`);
console.error(summaryLine(digest));
