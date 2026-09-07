/* Guardrail required by CAP_Refresh_Agents_Plan §7 ("verify-news-neutrality"):
   lints recent agent-written news_item rows (item_type candidate_news /
   election_news) against the banned-word list from §4.2's neutral-wording
   rules, requires a non-null url on those rows, and (N6, S2) requires each
   such row to carry a populated source: a non-null source_id, an embedded
   source that actually resolves, and a source whose type and lean_tag are
   both non-null/non-empty. This is the read-side half of "no source, no
   card" — the write-side constraint is a separate stream's migration and is
   deliberately not touched here. Read-only — SELECTs only, never writes.
   Run inside R4 per the plan.

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
   strings — one per banned category, one clean string, one missing-url case,
   and a set of N6 sourcedness fixtures (missing source_id, missing embedded
   source, null type, null lean_tag, a fully populated source, and a
   non-agent row with no source) — with no network access, so the check
   logic has real evidence behind it instead of a vacuous "0 rows" pass.

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
import type { LeanTag, SourceType } from "../src/lib/news-labels.ts";

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

/* ---- Sourcedness rule (N6, S2) -------------------------------------------
   "No source, no card": every agent-written row must have a source_id, and
   that source_id must resolve to an embedded source whose type and lean_tag
   are both populated. `source.type`/`source.lean_tag` are NOT NULL in the
   DB, but this lint deliberately does not trust that — a row's source_id
   can dangle, or (in fixtures / a not-yet-backfilled row) the embedded
   source can carry a null type/lean_tag — so every piece is checked
   explicitly rather than assumed from the schema.

   One pure function drives both --self-test and the live lint (house
   pattern, mirrors isMissingRequiredUrl in src/lib/neutrality.ts), so the
   embed-shape normalization below is exercised by real fixture evidence
   before it ever runs against Supabase. Kept in this script, not
   src/lib/neutrality.ts, per the S2 brief (script-only change). */
type EmbeddedSource = { type: SourceType | null; lean_tag: LeanTag | null } | null | undefined;

function sourcednessViolation(row: {
  item_type: string;
  source_id: string | null | undefined;
  source: EmbeddedSource | EmbeddedSource[];
}): string | null {
  if (!(AGENT_ITEM_TYPES as readonly string[]).includes(row.item_type)) {
    return null;
  }
  if (row.source_id === null || row.source_id === undefined) {
    return "missing source_id";
  }
  // PostgREST returns a to-one embed as an object, but older versions and
  // some relationship shapes return a one-element array (same normalization
  // as src/app/api/news/route.ts). Normalize both rather than trusting one.
  const raw = row.source;
  const source = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
  if (!source) {
    return "source_id set but embedded source not found";
  }
  if (!source.type) {
    return "source missing type";
  }
  if (!source.lean_tag) {
    return "source missing lean_tag";
  }
  return null;
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

  // Sourcedness (N6, S2): every agent-written row needs source_id AND a
  // resolvable embedded source AND both source.type and source.lean_tag.
  const fullSource = { type: "factual_reporting" as SourceType, lean_tag: "center" as LeanTag };

  const noSourceIdRow = { item_type: "candidate_news", source_id: null, source: null };
  assert(
    "sourcedness: agent row with source_id=null is flagged",
    sourcednessViolation(noSourceIdRow) !== null,
    JSON.stringify(sourcednessViolation(noSourceIdRow))
  );

  const danglingSourceIdRow = { item_type: "election_news", source_id: "src-1", source: null };
  assert(
    "sourcedness: agent row with source_id set but no embedded source is flagged",
    sourcednessViolation(danglingSourceIdRow) !== null,
    JSON.stringify(sourcednessViolation(danglingSourceIdRow))
  );

  const nullTypeRow = {
    item_type: "candidate_news",
    source_id: "src-2",
    source: { type: null, lean_tag: "left" as LeanTag },
  };
  assert(
    "sourcedness: agent row with a source but null type is flagged",
    sourcednessViolation(nullTypeRow) !== null,
    JSON.stringify(sourcednessViolation(nullTypeRow))
  );

  const nullLeanTagRow = {
    item_type: "candidate_news",
    source_id: "src-3",
    source: { type: "opinion" as SourceType, lean_tag: null },
  };
  assert(
    "sourcedness: agent row with a source but null lean_tag is flagged",
    sourcednessViolation(nullLeanTagRow) !== null,
    JSON.stringify(sourcednessViolation(nullLeanTagRow))
  );

  const emptyTypeRow = {
    item_type: "candidate_news",
    source_id: "src-6",
    source: { type: "" as SourceType, lean_tag: "center" as LeanTag },
  };
  assert(
    "sourcedness: agent row with a source but empty type is flagged",
    sourcednessViolation(emptyTypeRow) !== null,
    JSON.stringify(sourcednessViolation(emptyTypeRow))
  );

  const emptyLeanTagRow = {
    item_type: "candidate_news",
    source_id: "src-7",
    source: { type: "factual_reporting" as SourceType, lean_tag: "" as LeanTag },
  };
  assert(
    "sourcedness: agent row with a source but empty lean_tag is flagged",
    sourcednessViolation(emptyLeanTagRow) !== null,
    JSON.stringify(sourcednessViolation(emptyLeanTagRow))
  );

  const fullyPopulatedRow = {
    item_type: "election_news",
    source_id: "src-4",
    source: fullSource,
  };
  assert(
    "sourcedness: agent row with a fully populated source passes",
    sourcednessViolation(fullyPopulatedRow) === null,
    JSON.stringify(sourcednessViolation(fullyPopulatedRow))
  );

  // PostgREST embed-shape normalization: some relationship shapes return a
  // one-element array instead of an object; a fully populated array embed
  // must pass the same as an object embed.
  const arrayEmbedRow = {
    item_type: "election_news",
    source_id: "src-5",
    source: [fullSource],
  };
  assert(
    "sourcedness: agent row with a fully populated ARRAY-shaped embed passes",
    sourcednessViolation(arrayEmbedRow) === null,
    JSON.stringify(sourcednessViolation(arrayEmbedRow))
  );

  const nonAgentRow = { item_type: "official_link", source_id: null, source: null };
  assert(
    "sourcedness: non-agent row (official_link) with no source is NOT flagged",
    sourcednessViolation(nonAgentRow) === null,
    JSON.stringify(sourcednessViolation(nonAgentRow))
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
  source_id: string | null;
  source: EmbeddedSource | EmbeddedSource[];
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
    .select("id, item_type, title, summary, url, published_at, source_id, source(type, lean_tag)")
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

    const sourceProblem = sourcednessViolation(row);
    if (sourceProblem) {
      violations++;
      console.error(`VIOLATION  id=${safeId} item_type=${safeItemType} ${sourceProblem}`);
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
