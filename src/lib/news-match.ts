/* The association matcher — candidate-news-PRD.md §6 (task C8).

   Decides which candidates a swept article attaches to, and how. Pure: no DB,
   no network, no clock, no model. scripts/verify-news-match.ts drives it.

   THE RULE THAT CARRIES EVERYTHING: `related` never resolves ambiguity by
   picking the most likely candidate. A "Commissioner Smith" story attaches to
   EVERY Smith it could mean; a race story with no name attaches to every
   ballot candidate in that race. Choosing a winner here would put back, one
   row at a time, exactly the editorial discretion the project takes out of
   the pipeline. Ambiguity resolves toward symmetry.

   Explicitly out of scope (§6): embedding similarity, topical relevance
   scoring, any model judgment about whether a story "feels" like it is about
   someone. Two values, one column, deterministic rules. */

export type NewsRelation = "named" | "related";

export interface RosterCandidate {
  candidateId: string;
  /** `candidate.legal_name`. The only name the schema has. */
  legalName: string;
  raceId: string;
}

export interface MatchableArticle {
  title: string;
  /** Dek/summary. Matched alongside the title; §6 says "title or dek". */
  summary?: string | null;
  /** Race the article is about, when the sweep could tell (an office name in
      the text). Drives `related` case (a). Null = not race-identifiable. */
  raceId?: string | null;
}

export interface Match {
  candidateId: string;
  relation: NewsRelation;
}

/* Fold accents, drop punctuation that splits names ("O'Brien", "Smith-Jones"),
   collapse whitespace. Applied identically to the article and to every
   candidate name, so the comparison is symmetric. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Honorifics and suffixes are not name tokens: "Rep. Maria Vasquez Jr." and
   "Maria Vasquez" are the same person, and treating "jr" as a surname would
   match every Jr on the ballot. */
const DROPPED = new Set([
  "mr", "mrs", "ms", "dr", "rep", "sen", "gov", "hon", "the",
  "jr", "sr", "ii", "iii", "iv",
]);

function nameTokens(legalName: string): string[] {
  return normalize(legalName)
    .split(" ")
    .filter((t) => t.length > 0 && !DROPPED.has(t));
}

/** First and last token, plus any middles. A one-token legal name has no
    surname distinct from its first name; it is handled as both. */
function nameParts(legalName: string) {
  const tokens = nameTokens(legalName);
  if (tokens.length === 0) return null;
  return {
    first: tokens[0],
    last: tokens[tokens.length - 1],
    middles: tokens.slice(1, -1),
  };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* A full-name match is "first ... last", where the only thing allowed in
   between is one of THIS candidate's own middle tokens or an initial of one.
   Allowing any filler would make "Maria met John Vasquez" a match for Maria
   Vasquez; allowing none would miss "Maria Elena Vasquez" for a roster entry
   of "Maria Vasquez" and vice versa. */
function fullNameRegex(parts: NonNullable<ReturnType<typeof nameParts>>): RegExp {
  const initials = parts.middles.map((m) => m[0]);
  const filler = [...parts.middles, ...initials].map(esc);
  const middle = filler.length > 0 ? `(?:\\s+(?:${filler.join("|")}))*` : "";
  return new RegExp(`\\b${esc(parts.first)}\\b${middle}\\s+\\b${esc(parts.last)}\\b`, "g");
}

/** Match one article against a roster. Returns one entry per (candidate)
    attachment; the caller writes one news_item row each. */
export function matchArticle(
  article: MatchableArticle,
  roster: readonly RosterCandidate[],
): Match[] {
  const haystack = normalize(`${article.title} ${article.summary ?? ""}`);
  if (!haystack) return [];

  const named = new Set<string>();
  /* Spans consumed by a full-name match are blanked before the surname pass,
     so "Maria Vasquez" does not also hand a `related` row to every other
     Vasquez on the ballot. The surname in a full name is not an ambiguous
     mention — it is already resolved. */
  let residue = haystack;

  for (const candidate of roster) {
    const parts = nameParts(candidate.legalName);
    if (!parts) continue;
    const re = fullNameRegex(parts);
    if (re.test(haystack)) {
      named.add(candidate.candidateId);
      residue = residue.replace(fullNameRegex(parts), " ");
    }
  }

  const matches: Match[] = [...named].map((candidateId) => ({
    candidateId,
    relation: "named" as const,
  }));

  /* §6 case (b): a surname (or title + surname) left over after the full-name
     pass. Attaches to EVERY candidate whose surname it could be — including
     when that is exactly one, because the match still was not deterministic. */
  const surnamed = new Set<string>();
  for (const candidate of roster) {
    if (named.has(candidate.candidateId)) continue;
    const parts = nameParts(candidate.legalName);
    if (!parts) continue;
    if (new RegExp(`\\b${esc(parts.last)}\\b`).test(residue)) {
      surnamed.add(candidate.candidateId);
    }
  }
  for (const candidateId of surnamed) {
    matches.push({ candidateId, relation: "related" });
  }

  /* §6 case (a): about the race, naming nobody. Attaches to every candidate
     in that race — the symmetric answer, and the reason this tier is safe. */
  if (named.size === 0 && surnamed.size === 0 && article.raceId) {
    for (const candidate of roster) {
      if (candidate.raceId === article.raceId) {
        matches.push({ candidateId: candidate.candidateId, relation: "related" });
      }
    }
  }

  return matches;
}

/* ---- CN-R10: the denominator ------------------------------------------ */

/** Per-candidate counts for the coverage-variance report, over **`named`
    rows only**.

    This is the whole of CN-R10 and it is deliberately a selection, not a
    calculation: the variance itself is `balance_audit_core`'s, and that core
    is never reimplemented (news-fairness.md §2, N5). What C8 owns is which
    rows are allowed to reach it.

    Why named-only: a `related` row attaches to every candidate the ambiguity
    admits, so those counts are equal across a race by construction. Feeding
    them in would drag (max-min)/max toward zero and make our coverage look
    fairer than the press actually was. `related` exists to fill a voter's
    page, not to improve the number we publish about ourselves. */
export function namedCountsByCandidate(
  rows: readonly { candidateId: string; relation: NewsRelation | null }[],
  roster: readonly RosterCandidate[],
): Record<string, number> {
  /* Every roster candidate appears, including at zero — a candidate the press
     ignored is the most important number in the report, and dropping them
     would silently exclude the widest gap from the variance. */
  const counts: Record<string, number> = {};
  for (const c of roster) counts[c.candidateId] = 0;
  for (const row of rows) {
    if (row.relation !== "named") continue;
    if (!(row.candidateId in counts)) continue;
    counts[row.candidateId] += 1;
  }
  return counts;
}
