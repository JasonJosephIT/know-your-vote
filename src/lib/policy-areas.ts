/* Policy areas for candidate issues — the categorization layer over the
   race-specific `issue` rows.

   THE PROBLEM. An `issue` row carries a free-text title chosen per race:
   "Economy & Affordability" in the Governor's race, "Consumer Protection" in
   the Attorney General's, "Water & Land Use" in Agriculture. Every title is
   legitimate, and together they are not a vocabulary — nothing joins a
   candidate's housing position in one race to a housing position in another,
   to the housing question the quiz asks, or to a housing article in the feed.
   This file supplies that join without asking the pipeline to change.

   ONE VOCABULARY, NOT A SECOND ONE. The categories are imported from
   src/lib/news-issues.ts, which is where the reviewed taxonomy already lives
   and where the ids are already shared with the quiz (a category id IS a
   QUIZ_QUESTIONS id for the eight the quiz asks). Adding a policy-only list
   would have produced two vocabularies that drift, and the drift would show
   up as a voter picking "housing" in the quiz and seeing it named something
   else on a brief. Change the taxonomy in news-issues.ts; this file follows.

   DERIVED AT READ TIME, NOT STORED. `issue` is a pipeline-owned read model
   (migration 0000) and this app never writes it, so a stored category column
   would need the pipeline to fill it and would be stale the moment a title
   changed. Deriving keeps one source of truth — the title the pipeline wrote —
   and makes a taxonomy change take effect on the next render rather than
   needing a backfill. The cost is that a category cannot be a SQL predicate;
   src/lib/directory.ts pays it by deriving over the (small, published-only)
   issue set in memory.

   DETERMINISTIC, NOT MODELLED. The news characterizer asks a model because a
   headline is prose written by someone else. An issue title is a topic label
   the pipeline already chose, so a phrase match settles it, and a phrase match
   can be read in a PR diff, verified offline, and reproduced exactly.
   scripts/verify-policy-areas.ts drives this file.

   NO MATCH STAYS NO MATCH. "Consumer Protection" and "Government
   Transparency" have no home in the taxonomy. They come back with no area and
   render with no chip. Filing them under the nearest plausible parent would
   be a contested editorial judgment made quietly, which this project does not
   do — the same rule news-issues.ts applies to abortion and elections.

   EQUAL TREATMENT. A spine issue's title is race-wide, so every candidate in
   the race gets the same areas on the same issue. The only per-candidate
   input is a candidate-tier issue, which is that candidate's own addition.
   Nothing here can give one candidate more or fewer chips than another for
   the same issue.

   Pure and dependency-free: no DB, no clock, no network, no framework. */

import { CATEGORIES, SUB_ISSUES, TAXONOMY_VERSION } from "./news-issues.ts";

/** The taxonomy version a categorization was produced under. Re-exported so a
    caller recording provenance does not have to import both modules, and so a
    bump in news-issues.ts is a bump here. */
export const POLICY_AREA_TAXONOMY_VERSION = TAXONOMY_VERSION;

/** Id plus voter-facing label. The rest of an `IssueCategory` (aliases,
    `inQuiz`) is matching machinery and stays in this module. */
export interface PolicyAreaRef {
  id: string;
  label: string;
}

/** Every policy area, in taxonomy order. Display order is this order, always,
    so two briefs never disagree about which chip comes first. */
export const POLICY_AREAS: readonly PolicyAreaRef[] = CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
}));

/* Bare topic words, matched against the TITLE ONLY.

   These are additions this file makes, and they are the part a human has to
   read in review. The justification is the difference in input: news-issues.ts
   aliases are tuned for headlines, where a bare "water" or "insurance" fires
   on any story that mentions one in passing, so the aliases there are
   deliberately phrase-shaped ("water quality", "property insurance"). An issue
   title is not prose about a subject, it IS the subject, already chosen as a
   label — so a title reading "Water & Land Use" is about water in the way a
   headline containing the word "water" is not.

   The restriction to the title is what keeps that argument true. A
   description is prose again, so these never run against it; the phrase-shaped
   aliases from the taxonomy do.

   Every entry is a plain topic noun that names its own area. Nothing here
   resolves a contested placement: "taxes" is absent because property taxes sit
   under Insurance & Property Costs while a general tax debate does not, and
   "budget" is absent because state fiscal policy is not household
   affordability. Those stay uncategorized on purpose.

   These are also the ONLY category-level phrases matched. The `aliases` on
   news-issues.ts's categories are deliberately left out: nothing asks the
   category level today (ASKABLE is the sub-issues), so those lists were never
   measured against anything, and one of them mis-fires badly on titles —
   "development" under Housing turns "Economic Development" into a housing
   issue. The sub-issue aliases, which the 2026-09-18 gold set did measure, are
   matched in full. */
/* Taxonomy aliases that do NOT categorize an issue row, at any level.

   Each is a single generic word that means its topic only inside a headline,
   which is the input news-issues.ts was tuned for. An issue title puts the
   same word in the open, where it means something else:

     coverage      B2 Healthcare, but "Hurricane Coverage and Premiums" is an
                   insurance issue.
     detention     B3 Immigration, but "Juvenile Detention" is not.
     certification B6 Election integrity, but "Teacher Certification" is not.
     restoration   A5 Water and Everglades, but "Historic Preservation and
                   Restoration" is not.

   Every sub-issue above stays reachable through its label and its other
   aliases, so this list narrows what fires, never what exists. It is short on
   purpose: an alias earns a place here by producing a wrong area on a title a
   pipeline would plausibly write, and scripts/verify-policy-areas.ts holds
   that title as the evidence. */
const HEADLINE_ONLY_ALIASES: readonly string[] = [
  "coverage",
  "detention",
  "certification",
  "restoration",
];

export const TITLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  economy: ["economy", "affordability"],
  education: ["education", "schools", "teacher", "teachers"],
  healthcare: ["healthcare", "health care", "mental health"],
  housing: ["housing", "homelessness"],
  environment: [
    "environment",
    "environmental",
    "water",
    "land use",
    "everglades",
    "conservation",
  ],
  immigration: ["immigration", "immigrants"],
  insurance: ["insurance", "property costs"],
  safety: ["public safety", "crime", "policing", "law enforcement"],
  elections: ["elections", "voting", "democracy", "redistricting"],
  retirement: ["retirement", "pensions"],
  abortion: ["abortion", "reproductive health"],
};

/** What a caller hands in. `description` is optional because most issue rows
    have none, and because a caller categorizing a bare title should not have
    to invent one. */
export interface CategorizableIssue {
  title: string;
  description?: string | null;
}

export interface PolicyAreaMatch {
  /** Areas this issue falls under, in taxonomy order. Empty = no match. */
  areas: PolicyAreaRef[];
  /** The finer taxonomy entries that fired, in taxonomy order. Always a
      subset of `areas`' children. Kept because it is strictly more
      information than the area, and losing it here would lose it forever. */
  subIssues: PolicyAreaRef[];
  /** How the match was reached: an exact title/label identity, a phrase hit,
      or nothing. A caller that wants to show only confident matches can read
      this instead of guessing. */
  basis: "label" | "alias" | "none";
}

const NO_MATCH: PolicyAreaMatch = { areas: [], subIssues: [], basis: "none" };

/* Lowercase, fold "&" to "and", reduce every other non-alphanumeric run to a
   single space, and pad with one space at each end. The padding is what makes
   plain `includes()` word-boundary-aware: " water " cannot match inside
   "watershed", and no regex has to be built from taxonomy text (which would
   need escaping, and would silently change meaning if an alias ever contained
   a regex character). */
function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

/** Taxonomy aliases minus the ones a title reads differently. */
function usable(aliases: readonly string[]): string[] {
  return aliases.filter(
    (a) => !HEADLINE_ONLY_ALIASES.includes(a.trim().toLowerCase())
  );
}

function hasPhrase(haystack: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => {
    const needle = normalize(p);
    return needle.trim().length > 0 && haystack.includes(needle);
  });
}

const areaRef = (id: string): PolicyAreaRef | null =>
  POLICY_AREAS.find((a) => a.id === id) ?? null;

/** The categorization. Same input, same output, every time.

    Order of precedence, first hit wins:
      1. The title IS a taxonomy label ("Education", "Property taxes") —
         identity, reported as `basis: "label"`.
      2. A taxonomy label or alias appears as a phrase in the title or
         description; bare topic words (TITLE_ALIASES) count in the title only.
         Every hit is kept, so an issue that genuinely spans two areas comes
         back with both.
      3. Nothing matched. No area is guessed. */
export function categorizeIssue(issue: CategorizableIssue): PolicyAreaMatch {
  const title = normalize(issue.title ?? "");
  if (title.trim().length === 0) return NO_MATCH;

  /* 1. Identity. */
  const exactArea = CATEGORIES.find((c) => normalize(c.label) === title);
  if (exactArea) {
    const ref = areaRef(exactArea.id);
    /* "Abortion policy" is both the area's label and B5's. Keeping the
       sub-issue loses nothing and reports the finer fact the title carries. */
    const alsoSub = SUB_ISSUES.filter((s) => normalize(s.label) === title);
    return ref
      ? {
          areas: [ref],
          subIssues: alsoSub.map((s) => ({ id: s.id, label: s.label })),
          basis: "label",
        }
      : NO_MATCH;
  }
  const exactSub = SUB_ISSUES.find((s) => normalize(s.label) === title);
  if (exactSub) {
    const parent = areaRef(exactSub.categoryId);
    return parent
      ? {
          areas: [parent],
          subIssues: [{ id: exactSub.id, label: exactSub.label }],
          basis: "label",
        }
      : NO_MATCH;
  }

  /* 2. Phrases. */
  const prose = normalize(`${issue.title} ${issue.description ?? ""}`);
  const subHits = SUB_ISSUES.filter((s) =>
    hasPhrase(prose, [s.label, ...usable(s.aliases)])
  );
  const areaIds = new Set(subHits.map((s) => s.categoryId));
  for (const c of CATEGORIES) {
    /* The area's own label anywhere in the row, or one of its bare topic
       words in the title. Its taxonomy `aliases` are not consulted — see
       TITLE_ALIASES. */
    if (
      hasPhrase(prose, [c.label]) ||
      hasPhrase(title, TITLE_ALIASES[c.id] ?? [])
    ) {
      areaIds.add(c.id);
    }
  }
  if (areaIds.size === 0) return NO_MATCH;

  return {
    areas: POLICY_AREAS.filter((a) => areaIds.has(a.id)),
    subIssues: subHits.map((s) => ({ id: s.id, label: s.label })),
    basis: "alias",
  };
}

/** Just the ids, for callers that index or filter rather than render. */
export function policyAreaIdsFor(issue: CategorizableIssue): string[] {
  return categorizeIssue(issue).areas.map((a) => a.id);
}

/** Resolve stored/collected ids to labels, in taxonomy order, ignoring ids the
    taxonomy no longer knows rather than rendering a raw id at a voter. */
export function policyAreasFor(ids: Iterable<string>): PolicyAreaRef[] {
  const wanted = new Set(ids);
  return POLICY_AREAS.filter((a) => wanted.has(a.id));
}

/** One label, or null for an unknown id. */
export function policyAreaLabel(id: string): string | null {
  return areaRef(id)?.label ?? null;
}

/** True when `id` names a real policy area. Query-string input goes through
    this before it reaches a filter. A type predicate so a caller that checks
    does not then have to assert. */
export function isPolicyAreaId(id: string | undefined | null): id is string {
  return typeof id === "string" && POLICY_AREAS.some((a) => a.id === id);
}
