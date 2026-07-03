/* Guardrail required by CAP_Refresh_Agents_Plan §7 ("verify-news-neutrality"):
   lints recent agent-written news_item rows (item_type candidate_news /
   election_news) against the banned-word list from §4.2's neutral-wording
   rules, and requires a non-null url on those rows. Read-only — SELECTs
   only, never writes. Run inside R4 per the plan.

   If migration 0005/0006 hasn't been applied yet, or there simply are no
   agent-written rows in the last 30 days, that is a PASS with an explicit
   "0 agent-written rows to lint" note — never a crash. Mirrors
   verify-refresh-schema.mjs's fail-closed-on-missing-env-var behavior, but
   treats "table/column doesn't exist yet" as a graceful pass rather than a
   gate, since this script's whole job is linting rows that may not exist
   yet in a not-yet-migrated environment.

   Self-test mode (--self-test) runs the matcher against in-memory fixture
   strings — one per banned category, one clean string, one missing-url case
   — with no network access, so the check logic has real evidence behind it
   instead of a vacuous "0 rows" pass.

   Run: node scripts/verify-news-neutrality.ts
   Self-test: node scripts/verify-news-neutrality.ts --self-test
   (Node >= 23 strips types natively — same as verify-quiz-guardrails.ts /
   verify-sentry-scrub.ts.) */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ---- Banned-terms list --------------------------------------------------
   CAP_Refresh_Agents_Plan §4.2 (neutral-wording rules) / §7 (this lint's
   requirement). This is the starting set from the plan/brief verbatim — do
   not editorialize or extend it here; if the plan's wording rules change,
   update this list to match, not the other way around. Each entry is a
   plain phrase; matching is case-insensitive and word-boundary aware (see
   buildBannedTermRegex below), so multi-word phrases match as a literal
   run of words bounded by \b on each end. */
export const BANNED_TERMS: readonly string[] = [
  // attribution verbs implying judgment
  "claims",
  "admits",
  "boasts",
  "concedes",
  "denies",
  "insists",
  "brags",
  "touts",
  // horse-race words
  "surging",
  "embattled",
  "front-runner",
  "frontrunner",
  "front runner",
  "momentum",
  "landslide",
  "underdog",
  "dark horse",
  // motive phrases
  "in a bid to",
  "hoping to",
  "in an attempt to",
  "seeking to",
  "in an effort to",
  "aims to",
];

/* item_types this lint applies to. pipeline_event/official_link are
   app/pipeline-authored, not agent-authored, and are out of scope (brief). */
const AGENT_ITEM_TYPES = ["candidate_news", "election_news"] as const;

const RECENT_WINDOW_DAYS = 30;

/* Build a word-boundary-aware regex for one banned phrase. \b works on
   word-character boundaries, so it correctly rejects "claims" appearing
   inside another word (e.g. "reclaims", "disclaims") while still matching
   "claims" as a standalone word, including at punctuation boundaries
   ("He claims," / "(claims)"). Phrases containing a hyphen (front-runner)
   or an internal space (front runner, in a bid to) still work: \b anchors
   only the outer edges of the whole phrase, and the phrase's own characters
   (spaces, hyphens) are matched literally in between. */
function buildBannedTermRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

const BANNED_TERM_MATCHERS: ReadonlyArray<{ term: string; regex: RegExp }> =
  BANNED_TERMS.map((term) => ({ term, regex: buildBannedTermRegex(term) }));

/* Scans title+summary text for the first banned term found (there may be
   more than one; the lint reports one violation line per row per §... brief
   Output requirement, so first-match is enough evidence and keeps output
   proportionate — see findAllBannedTermMatches for the self-test's stronger
   per-category assertions). */
function findBannedTermMatch(
  text: string
): { term: string; snippet: string } | null {
  for (const { term, regex } of BANNED_TERM_MATCHERS) {
    const match = regex.exec(text);
    if (match) {
      return { term, snippet: extractSnippet(text, match.index, match[0].length) };
    }
  }
  return null;
}

/* Every banned term this text matches — used only by --self-test so each
   fixture can assert it hits the specific category it was designed for. */
function findAllBannedTermMatches(text: string): string[] {
  const hits: string[] = [];
  for (const { term, regex } of BANNED_TERM_MATCHERS) {
    if (regex.test(text)) hits.push(term);
  }
  return hits;
}

/* A short surrounding-context window around the match, for the violation
   line's "offending text snippet" (brief Output requirement 4). */
function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + length + 20);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/* ---- Self-test mode ------------------------------------------------------
   Runs entirely in-memory, no network access, so it is real evidence the
   matcher works even when live has 0 rows to lint. */
function runSelfTest(): number {
  let failures = 0;
  function assert(name: string, cond: boolean, extra = "") {
    if (cond) console.log(`  ok  ${name}`);
    else {
      failures++;
      console.error(`FAIL  ${name} ${extra}`);
    }
  }

  // One fixture per banned category, one clean row, one missing-url row.
  const attributionVerb = "The candidate's campaign claims voter turnout will be record-breaking.";
  const horseRace = "Polling shows the incumbent surging into the final week.";
  const motivePhrase = "The senator is seeking to expand the coalition ahead of November.";
  const clean = "The FEC filing shows the campaign raised $2.1 million in the second quarter.";

  assert(
    "attribution-verb fixture matches 'claims'",
    findAllBannedTermMatches(attributionVerb).includes("claims"),
    JSON.stringify(findAllBannedTermMatches(attributionVerb))
  );
  assert(
    "horse-race fixture matches 'surging'",
    findAllBannedTermMatches(horseRace).includes("surging"),
    JSON.stringify(findAllBannedTermMatches(horseRace))
  );
  assert(
    "motive-phrase fixture matches 'seeking to'",
    findAllBannedTermMatches(motivePhrase).includes("seeking to"),
    JSON.stringify(findAllBannedTermMatches(motivePhrase))
  );
  assert(
    "clean fixture matches nothing",
    findBannedTermMatch(clean) === null,
    JSON.stringify(findAllBannedTermMatches(clean))
  );

  // Word-boundary cases: "claims" must match as a standalone word but must
  // NOT match inside another word (brief self-review requirement, verbatim).
  const claimsAsWord = "He claims the results are final.";
  const claimsInsideWord = "The office reclaims unused ballots after the deadline.";
  const claimsInsideWord2 = "Insurance disclaims liability for late filings.";
  assert(
    "word-boundary: 'claims' matches as a standalone word",
    findAllBannedTermMatches(claimsAsWord).includes("claims"),
    JSON.stringify(findAllBannedTermMatches(claimsAsWord))
  );
  assert(
    "word-boundary: 'claims' does NOT match inside 'reclaims'",
    !findAllBannedTermMatches(claimsInsideWord).includes("claims"),
    JSON.stringify(findAllBannedTermMatches(claimsInsideWord))
  );
  assert(
    "word-boundary: 'claims' does NOT match inside 'disclaims'",
    !findAllBannedTermMatches(claimsInsideWord2).includes("claims"),
    JSON.stringify(findAllBannedTermMatches(claimsInsideWord2))
  );

  // Case-insensitivity.
  assert(
    "case-insensitive: 'CLAIMS' (uppercase) still matches",
    findAllBannedTermMatches("Campaign CLAIMS victory early.").includes("claims")
  );

  // Multi-word / hyphenated phrase boundaries: "front-runner" as a token
  // must match, but must not fire on unrelated hyphenated words, and the
  // space-variant "front runner" is matched by its own separate list entry.
  assert(
    "hyphenated phrase: 'front-runner' matches",
    findAllBannedTermMatches("The front-runner held her lead in the poll.").includes("front-runner")
  );
  assert(
    "space-variant phrase: 'front runner' matches",
    findAllBannedTermMatches("She remains the front runner heading into the primary.").includes(
      "front runner"
    )
  );
  assert(
    "motive phrase: 'in a bid to' matches as a full phrase",
    findAllBannedTermMatches("He toured the district in a bid to shore up support.").includes(
      "in a bid to"
    )
  );

  // Missing-url case (row-level rule 3 from the brief) is a separate check
  // from term-matching; exercise the same predicate the live-DB path uses.
  const missingUrlRow = { id: "fixture-1", item_type: "candidate_news", url: null };
  assert(
    "missing-url case: candidate_news row with url=null is flagged",
    isMissingRequiredUrl(missingUrlRow)
  );
  const presentUrlRow = { id: "fixture-2", item_type: "candidate_news", url: "https://example.com/a" };
  assert(
    "missing-url case: candidate_news row with a url is NOT flagged",
    !isMissingRequiredUrl(presentUrlRow)
  );

  return failures;
}

/* ---- Row-level url rule (brief requirement 3) --------------------------- */
function isMissingRequiredUrl(row: { item_type: string; url: string | null }): boolean {
  return (
    (AGENT_ITEM_TYPES as readonly string[]).includes(row.item_type) &&
    (row.url === null || row.url === undefined)
  );
}

/* ---- Live-DB read-only lint --------------------------------------------- */

type NewsItemRow = {
  id: string;
  item_type: string;
  title: string | null;
  summary: string | null;
  url: string | null;
  published_at: string;
};

/* PostgREST surfaces an undefined column/table as these codes (same
   detection approach as verify-refresh-schema.mjs's MIGRATION_NOT_APPLIED,
   confirmed against this project's live schema). Treated as a graceful
   pass here (brief requirement 1) rather than a hard gate, since this
   script's job — linting agent-written rows — is vacuously satisfied when
   there is no schema for agent-written rows to exist in yet. */
const SCHEMA_NOT_READY = /^(42703|42P01|PGRST20[45])$/;

async function runLiveLint(): Promise<number> {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const envLocal = path.join(root, ".env.local");
  if (existsSync(envLocal)) {
    process.loadEnvFile(envLocal);
  }

  function requireEnvOrFailClosed(name: string): string {
    const value = process.env[name];
    if (!value) {
      console.error(
        `FAIL  environment: ${name} is not set (checked process env and ${envLocal}). ` +
          `Cannot run this script's live checks without it.`
      );
      process.exit(1);
    }
    return value;
  }

  const SUPABASE_URL = requireEnvOrFailClosed("NEXT_PUBLIC_SUPABASE_URL");
  const ANON_KEY = requireEnvOrFailClosed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  // Read-only lint: anon key only, SELECT only. No service-role key, no
  // writes, anywhere in this script.
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  const sinceIso = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await anon
    .from("news_item")
    .select("id, item_type, title, summary, url, published_at")
    .in("item_type", AGENT_ITEM_TYPES as unknown as string[])
    .gte("published_at", sinceIso);

  if (error) {
    if (SCHEMA_NOT_READY.test(error.code ?? "")) {
      console.log(
        "  ok  0 agent-written rows to lint (migration adding candidate_news/" +
          "election_news item_types is not applied yet on this project — pass by construction)"
      );
      console.log("\nAll news-neutrality checks passed.");
      return 0;
    }
    console.error(`FAIL  could not query news_item (code ${error.code}): ${error.message}`);
    return 1;
  }

  const rows = (data ?? []) as NewsItemRow[];

  if (rows.length === 0) {
    console.log(
      `  ok  0 agent-written rows to lint (no candidate_news/election_news rows in the last ` +
        `${RECENT_WINDOW_DAYS} days)`
    );
    console.log("\nAll news-neutrality checks passed.");
    return 0;
  }

  let violations = 0;
  for (const row of rows) {
    if (isMissingRequiredUrl(row)) {
      violations++;
      console.error(`VIOLATION  id=${row.id} item_type=${row.item_type} missing url`);
    }

    const combinedText = [row.title ?? "", row.summary ?? ""].join(" ");
    const match = findBannedTermMatch(combinedText);
    if (match) {
      violations++;
      console.error(
        `VIOLATION  id=${row.id} item_type=${row.item_type} banned-term="${match.term}" text="${match.snippet}"`
      );
    }
  }

  console.log(
    `\n${rows.length} agent-written row(s) linted, ${violations} violation(s) found.`
  );
  if (violations > 0) {
    console.error(`\n${violations} news-neutrality violation(s) found.`);
    return 1;
  }
  console.log("\nAll news-neutrality checks passed.");
  return 0;
}

/* ---- Entry point ---------------------------------------------------------
   --self-test: matcher fixtures only, no network. Anything else: the live
   read-only lint against Supabase. */
const selfTestRequested = process.argv.includes("--self-test");

if (selfTestRequested) {
  const failures = runSelfTest();
  if (failures) {
    console.error(`\n${failures} self-test check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll news-neutrality self-test checks passed.");
  process.exit(0);
} else {
  const exitCode = await runLiveLint();
  process.exit(exitCode);
}
