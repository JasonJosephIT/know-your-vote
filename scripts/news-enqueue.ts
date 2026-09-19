/* Matches swept articles to the candidate roster and enqueues them for review
   — candidate-news-PRD.md §6 (task C8), founder decision 2026-09-19.

   THIS IS THE MISSING LINK. src/lib/news-match.ts has done the categorising
   since C8 landed, and scripts/verify-news-match.ts has tested it thoroughly,
   but until now `matchArticle` had no caller outside its own guardrail:
   scripts/news-sweep.ts prints articles to stdout and writes nothing, and
   scripts/news-characterize.ts says in its header that it "never writes
   candidate_id or relation". So `news_item.relation` was only ever set by an
   operator typing into the console, and the candidate page's "In the news" /
   "Also about this race" sections had no automated way to fill.

   IT ENQUEUES, IT DOES NOT PUBLISH. Rows land in `review_item` with status
   `pending` and reach a voter only once approved in the console. That is the
   boundary the rest of the product already enforces (src/lib/admin/effects.ts:
   "This is the security boundary"), and automated name-matching is exactly the
   thing that should not skip it: a `related` match attaches to EVERY candidate
   an ambiguous surname admits, so one bad row is several candidates' pages.

   IT MAKES NO REQUESTS TO ANY PUBLISHER. Articles arrive as JSON on stdin,
   which is what news-sweep.ts already prints:

     node scripts/news-sweep.ts | node scripts/news-enqueue.ts --dry-run
     node scripts/news-sweep.ts | node scripts/news-enqueue.ts

   That split is deliberate and not just tidiness — it means this script is
   reviewable and runnable against a saved sweep without touching a single
   outlet, and the open AI-crawler policy question
   (docs/general-election/news-corpus-verification-2026-09-17.md §3 item 4)
   belongs entirely to the sweep on the left of the pipe.

   WHAT `related` CAN AND CANNOT MEAN HERE. matchArticle produces `related` two
   ways: (a) the article is about a known race, and (b) it names a surname
   several candidates share. A swept article carries no race id — the sweep does
   not identify races — so only (b) fires from this runner. Race-scoped
   `related` rows need a race identifier the sweep does not yet produce, and
   pretending otherwise would attach race stories to candidates on no evidence.

   SCOPE: candidate matches only. An article that matches nobody is counted in
   the summary and dropped, not enqueued as county news — `NewsInsertRow` has no
   `county_fips`, so a county-scoped election_news row cannot survive the
   approval boundary yet. Widening that is a separate change; inventing a metro
   value to squeeze it through would put a story in the wrong county's feed.

   Fail-closed throughout: no stdin, no roster, or a failed write all exit
   non-zero. A silent empty success is the one outcome this must never produce,
   because it looks exactly like "the press wrote nothing about these people". */

import { loadEnvLocal } from "./env-local.ts";
import { createClient } from "@supabase/supabase-js";
import { matchArticle, type RosterCandidate } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import {
  dedupeKey,
  domainFromSourceId,
  planAttachments,
  reviewPayloadFor,
  type Attachment,
} from "../src/lib/news-enqueue.ts";
import type { SweptArticle } from "../src/lib/news-sweep.ts";

loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const limit = limitArg === -1 ? Infinity : Number(args[limitArg + 1]);

function die(message: string): never {
  console.error(`news-enqueue: ${message}`);
  process.exit(1);
}

/* ---- 1. the articles, from stdin ---------------------------------------- */

const stdin = await new Promise<string>((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});

if (!stdin.trim()) {
  die(
    "no articles on stdin. Pipe the sweep in:\n"
      + "  node scripts/news-sweep.ts | node scripts/news-enqueue.ts --dry-run",
  );
}

let articles: SweptArticle[];
try {
  const parsed: unknown = JSON.parse(stdin);
  if (!Array.isArray(parsed)) die("stdin parsed but is not an array of articles");
  articles = parsed as SweptArticle[];
} catch (err) {
  die(`stdin is not valid JSON: ${String(err)}`);
}
if (articles.length === 0) die("stdin held an empty array — nothing to match");

/* ---- 2. the roster ------------------------------------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  die("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}
const db = createClient(url, key);

/* `profile` is what links a candidate to a race (src/lib/briefs.ts does the
   same join). Ballot-tier only: a withdrawn filing has no page to put news on,
   and matching against them would hand `related` rows to names that are not on
   the ballot. */
const { data: profiles, error: rosterErr } = await db
  .from("profile")
  .select("candidate_id, race_id, candidate!inner(legal_name, ballot_status)");
if (rosterErr) die(`could not read the roster: ${rosterErr.message}`);

type ProfileRow = {
  candidate_id: string;
  race_id: string;
  candidate: { legal_name: string; ballot_status: string } | { legal_name: string; ballot_status: string }[] | null;
};

const roster: RosterCandidate[] = ((profiles ?? []) as unknown as ProfileRow[])
  .map((p) => {
    const c = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
    return c && c.ballot_status === "ballot"
      ? { candidateId: p.candidate_id, legalName: c.legal_name, raceId: p.race_id }
      : null;
  })
  .filter((r): r is RosterCandidate => r !== null);

if (roster.length === 0) {
  die(
    "the roster is empty — no ballot-tier candidate has a profile row. "
      + "Matching against nobody would report 'no coverage' for every candidate, "
      + "which is indistinguishable from the press ignoring them.",
  );
}

/* ---- 3. match ----------------------------------------------------------- */

/* The decidable half lives in src/lib/news-enqueue.ts so it can be driven
   offline (scripts/verify-news-enqueue.ts). This script keeps the I/O. */
const { attachments: pending, counts } = planAttachments(
  articles,
  roster,
  matchArticle,
  (u) => outletForUrl(u, OUTLETS),
);
const { unmatched, offList } = counts;

const capped: Attachment[] = Number.isFinite(limit) ? pending.slice(0, limit) : pending;

console.error(
  `news-enqueue: ${articles.length} article(s) in -> ${pending.length} candidate attachment(s) `
    + `(${capped.filter((p) => p.relation === "named").length} named, `
    + `${capped.filter((p) => p.relation === "related").length} related), `
    + `${unmatched} matched no candidate, ${offList} from no listed outlet, `
    + `roster ${roster.length}`,
);

if (capped.length === 0) {
  die(
    "nothing to enqueue. That is a real outcome, not an error to ignore: either "
      + "the sweep found no story naming anyone on the ballot, or the roster and "
      + "the corpus do not overlap. Check the counts above before re-running.",
  );
}

/* ---- 4. dry run --------------------------------------------------------- */

if (dryRun) {
  /* The EXACT payload the real path would enqueue, so a dry run reviews what
     would be written rather than a summary of it. */
  for (const p of capped) console.log(JSON.stringify(reviewPayloadFor(p)));
  console.error("news-enqueue: --dry-run, wrote nothing");
  process.exit(0);
}

/* ---- 5. source rows ----------------------------------------------------- */

/* One `source` row per OUTLET, not per article — the source IS the outlet, which
   is how 0014's own seed attributes rows. Migration 0014 requires every
   candidate_news / election_news row to carry a source_id, and `lean_tag` is
   NOT NULL, so this is only insertable at all because the founder designated the
   31 local outlets `unrated` on 2026-09-19. Before that, a swept local article
   had no legal lean value and could never have satisfied the CHECK. */
const outletsNeeded = [...new Set(capped.map((p) => p.sourceId))];
for (const sourceId of outletsNeeded) {
  const domain = domainFromSourceId(sourceId);
  const outlet = OUTLETS.find((o) => o.domain === domain);
  if (!outlet) die(`internal: no outlet for ${sourceId}`);
  if (outlet.leanTag === null) {
    die(
      `${domain} has no signed-off leanTag, so its source row cannot be written `
        + "(source.lean_tag is NOT NULL). Sign the lean off in "
        + "src/lib/news-sources.ts, or drop this outlet from the sweep.",
    );
  }
  const { error } = await db.from("source").upsert(
    {
      source_id: sourceId,
      url: `https://${domain}`,
      url_norm: domain,
      publisher: outlet.publisher,
      type: outlet.type,
      lean_tag: outlet.leanTag,
    },
    { onConflict: "url_norm" },
  );
  if (error) die(`could not upsert source ${sourceId}: ${error.message}`);
}

/* ---- 6. enqueue -------------------------------------------------------- */

/* Skip anything already queued or already published for this (url, candidate).
   0005's uq_news_item_url_candidate would reject the duplicate at APPROVAL
   time, which is the worst place to find out: an operator would approve a row
   and watch it fail. */
const urls = [...new Set(capped.map((p) => p.article.url))];
const { data: existingNews } = await db
  .from("news_item")
  .select("url, candidate_id")
  .in("url", urls);
const { data: existingQueue } = await db
  .from("review_item")
  .select("payload, status")
  .eq("kind", "manual_news")
  .in("status", ["pending", "approved"]);

const seen = new Set<string>();
for (const r of (existingNews ?? []) as { url: string; candidate_id: string | null }[]) {
  seen.add(dedupeKey(r.url, r.candidate_id));
}
for (const r of (existingQueue ?? []) as { payload: { url?: string; candidate_id?: string | null } }[]) {
  if (r.payload?.url) seen.add(dedupeKey(r.payload.url, r.payload.candidate_id ?? null));
}

const rows = capped
  .filter((p) => !seen.has(dedupeKey(p.article.url, p.candidateId)))
  .map((p) => ({
    kind: "manual_news",
    /* `source` records WHO proposed this, which is what distinguishes a swept
       article from an operator's hand-add; the payload shape is identical, so
       the existing `manual_news` kind is correct and no CHECK widening is
       needed. */
    source: "agent:R1",
    status: "pending",
    payload: reviewPayloadFor(p),
  }));

const skipped = capped.length - rows.length;
if (rows.length === 0) {
  console.error(
    `news-enqueue: all ${capped.length} attachment(s) were already queued or published — nothing new`,
  );
  process.exit(0);
}

const { error: insertErr } = await db.from("review_item").insert(rows);
if (insertErr) die(`could not enqueue: ${insertErr.message}`);

console.error(
  `news-enqueue: queued ${rows.length} review item(s) as pending`
    + (skipped > 0 ? `, skipped ${skipped} already queued or published` : "")
    + ". Nothing is voter-facing until approved in the console.",
);
