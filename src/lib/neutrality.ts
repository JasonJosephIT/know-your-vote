/* Neutral-wording matcher — one source of truth for CAP_Refresh_Agents_Plan
   §4.2's wording rules (design.md § 5 "Neutrality lint as a library"). Both the
   CLI guardrail (`scripts/verify-news-neutrality.ts`) and the operator console
   (submit-time advisory lint, approve-time authoritative re-lint, overview
   Feed-health verdict) import from here so the banned-terms list and the
   word-boundary matcher can never drift between the two.

   Deliberately framework-free: no `server-only`, no Supabase, no Node APIs — so
   the plain-Node verify script, server route handlers, AND client form
   components can all import it. Terminal-sanitization is NOT here: it stays in
   the script layer (only that layer prints to a TTY); the web layer relies on
   React's default escaping (design.md § 5). Snippets returned here are therefore
   raw — callers that print to a terminal must sanitize them. */

/* ---- Banned-terms list --------------------------------------------------
   CAP_Refresh_Agents_Plan §4.2 (neutral-wording rules) / §7 (the lint's
   requirement). This is the starting set from the plan/brief verbatim — do not
   editorialize or extend it here; if the plan's wording rules change, update
   this list to match, not the other way around. Each entry is a plain phrase;
   matching is case-insensitive and word-boundary aware (see buildBannedTermRegex
   below), so multi-word phrases match as a literal run of words bounded by \b on
   each end. */
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
export const AGENT_ITEM_TYPES = ["candidate_news", "election_news"] as const;
export type AgentItemType = (typeof AGENT_ITEM_TYPES)[number];

export const RECENT_WINDOW_DAYS = 30;

/* Build a word-boundary-aware regex for one banned phrase. \b works on
   word-character boundaries, so it correctly rejects "claims" appearing inside
   another word (e.g. "reclaims", "disclaims") while still matching "claims" as
   a standalone word, including at punctuation boundaries ("He claims," /
   "(claims)"). Phrases containing a hyphen (front-runner) or an internal space
   (front runner, in a bid to) still work: \b anchors only the outer edges of
   the whole phrase, and the phrase's own characters (spaces, hyphens) are
   matched literally in between. */
function buildBannedTermRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

const BANNED_TERM_MATCHERS: ReadonlyArray<{ term: string; regex: RegExp }> =
  BANNED_TERMS.map((term) => ({ term, regex: buildBannedTermRegex(term) }));

export interface BannedTermMatch {
  term: string;
  index: number;
  length: number;
  snippet: string;
}

/* A short surrounding-context window around the match, for a violation line's
   "offending text snippet" (brief Output requirement 4). Pure: it does NOT
   sanitize — a terminal caller must run the result through its own control-char
   scrubber; a web caller renders it through React's escaping. */
export function extractSnippet(
  text: string,
  index: number,
  length: number
): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + length + 20);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/* The first banned term found in the text (there may be more than one; the CLI
   lint reports one violation line per row, so first-match is enough evidence
   and keeps output proportionate — see findAllBannedTermMatches for the
   self-test's stronger per-category assertions, and for the console's
   full-list advisory). */
export function findBannedTermMatch(text: string): BannedTermMatch | null {
  for (const { term, regex } of BANNED_TERM_MATCHERS) {
    const match = regex.exec(text);
    if (match) {
      return {
        term,
        index: match.index,
        length: match[0].length,
        snippet: extractSnippet(text, match.index, match[0].length),
      };
    }
  }
  return null;
}

/* Every banned term this text matches — used by --self-test (so each fixture
   can assert it hits the specific category it was designed for) and by the
   console's advisory lint (so the operator sees every wording flag at once). */
export function findAllBannedTermMatches(text: string): string[] {
  const hits: string[] = [];
  for (const { term, regex } of BANNED_TERM_MATCHERS) {
    if (regex.test(text)) hits.push(term);
  }
  return hits;
}

/* Row-level url rule (brief requirement 3): an agent-written news row must
   carry a source url. Non-agent item_types are out of scope. */
export function isMissingRequiredUrl(row: {
  item_type: string;
  url: string | null;
}): boolean {
  return (
    (AGENT_ITEM_TYPES as readonly string[]).includes(row.item_type) &&
    (row.url === null || row.url === undefined)
  );
}
