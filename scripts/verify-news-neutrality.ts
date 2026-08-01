/* Guardrail required by CAP_Refresh_Agents_Plan §7 ("verify-news-neutrality"):
   lints recent agent-written news_item rows (item_type candidate_news /
   election_news) against the banned-word list from §4.2's neutral-wording
   rules, and requires a non-null url on those rows. Read-only — SELECTs
   only, never writes. Run inside R4 per the plan.

   The banned-terms list + word-boundary matcher now live in
   `src/lib/neutrality.ts` (design.md § 5 "Neutrality lint as a library") so the
   operator console and this script share ONE source of truth. This file keeps
   the CLI shell, the `--self-test` fixtures, the live read-only DB lint, and the
   terminal-sanitization layer (only this layer prints to a TTY; the web layer
   relies on React's escaping instead).

   If migration 0005 hasn't been applied yet, or there simply are no
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
   verify-sentry-scrub.ts. The relative import of the shared lib carries the
   explicit .ts extension for the same reason.) */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_ITEM_TYPES,
  RECENT_WINDOW_DAYS,
  findAllBannedTermMatches,
  findBannedTermMatch,
  isMissingRequiredUrl,
} from "../src/lib/neutrality.ts";

/* DB text below (title/summary/id/item_type) comes from agent-ingested web
   content, so a prompt-injected article could plant control characters —
   ANSI/OSC escape sequences, carriage returns, etc. — to forge or paint
   arbitrary terminal output (e.g. spoof a "  ok  " line). Strip C0 (\x00-
   \x1F) and C1/DEL (\x7F-\x9F) control-character ranges before any
   DB-derived string is interpolated into printed output. Snippets are
   single-line by intent, so stripping (not replacing) is correct — nothing
   of value is lost. This stays in the script layer by design (design.md § 5):
   the shared lib returns raw snippets; only this printing layer sanitizes. */
function sanitizeForTerminal(text: string): string {
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
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

  // Terminal-injection hardening: a prompt-injected/agent-ingested title
  // could carry ANSI/OSC control sequences meant to forge or paint terminal
  // output (e.g. a fake "  ok  " line). sanitizeForTerminal must strip C0/
  // C1/DEL control-character ranges while leaving normal text untouched.
  const forgedTitle = "\x1b[2K  ok  forged";
  const sanitizedForgedTitle = sanitizeForTerminal(forgedTitle);
  assert(
    "sanitizeForTerminal strips a control-sequence (ESC) from a forged title",
    !sanitizedForgedTitle.includes("\x1b") && sanitizedForgedTitle === "[2K  ok  forged",
    JSON.stringify(sanitizedForgedTitle)
  );
  assert(
    "sanitizeForTerminal leaves ordinary text unchanged",
    sanitizeForTerminal("Ordinary campaign update, no control chars.") ===
      "Ordinary campaign update, no control chars."
  );

  return failures;
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
    // row.id / row.item_type are DB-derived (agent-ingested); sanitize before
    // printing (see sanitizeForTerminal doc comment above).
    const safeId = sanitizeForTerminal(row.id);
    const safeItemType = sanitizeForTerminal(row.item_type);

    if (isMissingRequiredUrl(row)) {
      violations++;
      console.error(`VIOLATION  id=${safeId} item_type=${safeItemType} missing url`);
    }

    const combinedText = [row.title ?? "", row.summary ?? ""].join(" ");
    const match = findBannedTermMatch(combinedText);
    if (match) {
      violations++;
      // The shared lib returns a RAW snippet; sanitize here before printing.
      console.error(
        `VIOLATION  id=${safeId} item_type=${safeItemType} banned-term="${match.term}" text="${sanitizeForTerminal(
          match.snippet
        )}"`
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
