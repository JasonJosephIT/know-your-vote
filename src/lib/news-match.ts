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

/* ---- FOUNDER CALL: surnames that are also common words ----------------
   RECOMMENDED (PENDING FOUNDER CONFIRMATION), 2026-10-04. Launch handoff §5;
   the open question is news-ingest-order-results-2026-09-23.md §4 item 3, and
   the pending decision is recorded in docs/general-election/stream-surface-handoff.md §7.

   THE PROBLEM, MEASURED. Case (b) below used to attach a BARE surname anywhere
   in the title or dek. Over a 30-day sweep (2026-10-04: 545 articles, 23/24
   feeds) against the live enqueue roster (82 ballot candidates with a
   profile), that produced 75 `related` attachments. Hand-reading all 75 found
   at most one about the candidate. "Robert People" took 37 ("2 shot dead and
   dozens injured at neighborhood block party"), and Lee, Garcia, Wilson,
   Brown, Singer, Russell and Davis took most of the rest. Meanwhile `named`
   gave 51 attachments over 38 articles, all of them recognisably campaign or
   officeholder stories. The approval boundary would catch every bad row, but
   the queue would open at three junk rows for every two real ones.

   THE RECOMMENDED RULE: `title_and_surname`. A surname without the full name
   attaches only in candidate-news-PRD.md §6's own "title + surname" form: a
   political title immediately before it ("Rep. Lee", "Commissioner Smith",
   "Sen. Moody"). It applies to every candidate identically. On the same
   sweep it leaves 0 of the 75. `named` and case (a) are untouched.

   WHY NOT A STOP-LIST OF COMMON WORDS. Someone would have to decide whose
   surname is "common", and that is a judgment about particular candidates'
   names. The 75 also included uncommon surnames (Strada, Rojas, Gilbert)
   matched on unrelated people, so a list would not have been enough. This
   rule needs no list of names, only a list of titles, and treats every name
   alike: "ambiguity resolves toward symmetry" still holds.

   WHAT IT COSTS. A headline that names a candidate by bare surname, with no
   title and no full name anywhere in the title or dek, no longer reaches the
   review queue. In the 30-day sample that was at most one story. The
   founder's 2026-09-07 direction ("if it's a bit ambiguous, we can still
   relate") still applies to ambiguity that comes with a title, so "Commissioner
   Smith" still attaches to every Smith.

   TO FLIP: set SURNAME_ONLY_RULE to "bare_surname". That restores the
   pre-2026-10-04 behaviour exactly; scripts/verify-news-match.ts runs both
   modes. Nothing reads this until scripts/news-enqueue.ts runs, and nothing
   that script queues reaches a voter until approved. */
export type SurnameOnlyRule = "title_and_surname" | "bare_surname";
export const SURNAME_ONLY_RULE: SurnameOnlyRule = "title_and_surname";

/** Titles that make a bare surname a `title + surname` mention, in the
    normalised form `normalize` produces ("U.S. Rep." reads as "u s rep").
    Office titles only: no party, no ideology, nothing that varies by
    candidate. Spanish and French forms are included because Spanish- and
    French-language outlets are on the outlet list, and a rule that only
    understood English titles would not treat their readers' candidates alike. */
export const SURNAME_TITLES: readonly string[] = [
  "rep", "representative", "congressman", "congresswoman",
  "sen", "senator", "gov", "governor", "lt gov",
  "attorney general", "commissioner", "commish", "mayor", "clerk",
  "councilman", "councilwoman", "council member",
  "board member", "school board member", "chair", "chairman", "chairwoman",
  "candidate",
  "representante", "congresista", "senador", "senadora", "gobernador",
  "gobernadora", "fiscal general", "comisionado", "comisionada", "alcalde",
  "alcaldesa", "senateur", "gouverneur", "maire", "commissaire",
];

export interface MatchOptions {
  /** Overrides SURNAME_ONLY_RULE. For guardrails that test both modes; the
      enqueue runner passes nothing, so the constant decides. */
  surnameOnly?: SurnameOnlyRule;
}

function surnameRegex(last: string, rule: SurnameOnlyRule): RegExp {
  if (rule === "bare_surname") return new RegExp(`\\b${esc(last)}\\b`);
  const titles = SURNAME_TITLES.map((t) => t.split(" ").map(esc).join("\\s+"));
  return new RegExp(`\\b(?:${titles.join("|")})\\s+${esc(last)}\\b`);
}

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
  options: MatchOptions = {},
): Match[] {
  const surnameRule = options.surnameOnly ?? SURNAME_ONLY_RULE;
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

  /* §6 case (b): a surname left over after the full-name pass, in the form
     SURNAME_ONLY_RULE admits (title + surname by default; see the founder-call
     block above). Attaches to EVERY candidate whose surname it could be,
     including when that is exactly one, because the match still was not
     deterministic. */
  const surnamed = new Set<string>();
  for (const candidate of roster) {
    if (named.has(candidate.candidateId)) continue;
    const parts = nameParts(candidate.legalName);
    if (!parts) continue;
    if (surnameRegex(parts.last, surnameRule).test(residue)) {
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
