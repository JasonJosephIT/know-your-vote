/* The news issue taxonomy — two levels.
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.1
   docs/general-election/news-issue-taxonomy-options-2026-09-18.md

   Founder direction 2026-09-18: the quiz's eight become CATEGORIES; the
   fifteen researched issues from CAP_Issue_List_FL_2026_v1.md become the
   SUB_ISSUES underneath them.

   WHY TWO LEVELS. Tagging at the coarse level loses information that cannot be
   recovered: tag an article "Insurance & Property Costs" and you can never
   afterwards tell whether it was about property insurance or property taxes.
   Tagging only at the fine level leaves four researched issues — elections
   administration, Social Security and Medicare, abortion, election integrity —
   with no home, because the quiz never asked about them; an article about any
   of those would come back with no tags at all, which is indistinguishable
   from an article about nothing. Two levels lose neither.

   THREE CATEGORIES ARE NOT IN THE QUIZ, deliberately (`inQuiz: false`).
   Elections & Voting, Retirement & Benefits and Abortion Policy exist here so
   those articles are taggable, without forcing a redesign of a live
   voter-facing quiz — and without the alternative, which was filing abortion
   under "Healthcare" or elections under nothing. Which of those is the right
   parent is a contested editorial judgment, and this project does not make
   contested editorial judgments quietly. The quiz still asks eight questions.

   LABELS ARE COPIED, NOT DRAFTED. Category labels for the eight are verbatim
   from src/lib/quiz-questions.ts (TASK-032, neutrality-reviewed). Sub-issue
   labels are verbatim from CAP_Issue_List_FL_2026_v1.md (2026-07-15, sourced
   and balance-checked). Only the three new category labels and the `aliases`
   arrays were written here, and they are the part a human must read in review.

   Ballot amendments are NOT issues. `ballot_measure` (migration 0010) holds
   them with a measure_id and an official title. A3 "Property taxes" is the
   issue; Amendment 3 is a measure, and they are different objects.

   Pure and dependency-free; scripts/verify-news-issues.ts drives it. */

import type { NewsIssue } from "./news-characterize.ts";

export type { NewsIssue };

/** Bumped in the SAME PR as any change below, and recorded on every
    characterized row, so a tag written under one version is distinguishable
    from one written under the next. */
export const TAXONOMY_VERSION = "1";

export interface IssueCategory {
  /** For the eight, this is verbatim QUIZ_QUESTIONS[].id — the shared key that
      lets "news on the issues you picked" be a query rather than a project. */
  id: string;
  label: string;
  aliases: readonly string[];
  /** false for the three the quiz does not ask about. Not a lesser tier: the
      taxonomy is a superset of the quiz, not a mirror of it. */
  inQuiz: boolean;
}

/** A sub-issue is a NewsIssue that knows its parent. It satisfies NewsIssue,
    so the core consumes it without knowing the hierarchy exists. */
export interface TaxonomyIssue extends NewsIssue {
  categoryId: string;
}

export const CATEGORIES: readonly IssueCategory[] = [
  { id: "economy", label: "Economy & Affordability", inQuiz: true,
    aliases: ["cost of living", "jobs", "wages", "inflation", "utility bills"] },
  { id: "education", label: "Education", inQuiz: true,
    aliases: ["public schools", "teachers", "classroom funding", "universities"] },
  { id: "healthcare", label: "Healthcare", inQuiz: true,
    aliases: ["hospitals", "clinics", "coverage", "prescription costs"] },
  { id: "housing", label: "Housing", inQuiz: true,
    aliases: ["rent", "homebuying", "development", "homelessness"] },
  { id: "environment", label: "Environment & Water", inQuiz: true,
    aliases: ["water quality", "conservation", "climate", "coastal flooding"] },
  { id: "immigration", label: "Immigration", inQuiz: true,
    aliases: ["migrants", "border enforcement", "visas", "asylum"] },
  { id: "insurance", label: "Insurance & Property Costs", inQuiz: true,
    aliases: ["property insurance", "premiums", "property taxes", "homestead exemption"] },
  { id: "safety", label: "Public Safety & Crime", inQuiz: true,
    aliases: ["police", "sheriff", "courts", "sentencing"] },

  /* Not in the quiz — see the header. */
  { id: "elections", label: "Elections & Voting", inQuiz: false,
    aliases: ["voting access", "election administration", "ballot access", "redistricting"] },
  { id: "retirement", label: "Retirement & Benefits", inQuiz: false,
    aliases: ["Social Security", "Medicare", "retirement income", "benefits"] },
  { id: "abortion", label: "Abortion Policy", inQuiz: false,
    aliases: ["abortion law", "reproductive health policy", "gestational limits"] },
];

/* Ids and labels verbatim from CAP_Issue_List_FL_2026_v1.md. The `A`/`B`
   prefixes are CAP's own (A = Florida-specific, B = national issues Florida
   voters weigh) and are kept so a tag traces back to a sourced entry. */
export const SUB_ISSUES: readonly TaxonomyIssue[] = [
  { id: "A1", categoryId: "insurance", label: "Property insurance costs",
    aliases: ["property insurance", "premiums", "hurricane coverage", "Citizens Property Insurance"] },
  { id: "A2", categoryId: "housing", label: "Housing affordability",
    aliases: ["housing costs", "rent", "housing supply", "first-time buyers"] },
  { id: "A3", categoryId: "insurance", label: "Property taxes",
    aliases: ["property tax", "homestead exemption", "property assessments", "millage"] },
  { id: "A4", categoryId: "economy", label: "Cost of living in Florida",
    aliases: ["household costs", "utility bills", "groceries", "affordability"] },
  { id: "A5", categoryId: "environment", label: "Water quality and Everglades restoration",
    aliases: ["water quality", "Everglades", "red tide", "nutrient pollution", "restoration"] },
  { id: "A6", categoryId: "education", label: "Public education and school choice",
    aliases: ["public school funding", "vouchers", "school choice", "teacher pay"] },
  { id: "A7", categoryId: "elections", label: "Elections administration and voting access",
    aliases: ["voting access", "election administration", "ballot initiative process", "voter registration"] },
  { id: "B1", categoryId: "economy", label: "Economy, inflation, and jobs",
    aliases: ["economy", "inflation", "jobs", "wages", "unemployment"] },
  { id: "B2", categoryId: "healthcare", label: "Healthcare access and costs",
    aliases: ["healthcare costs", "coverage", "hospitals", "prescription prices"] },
  { id: "B3", categoryId: "immigration", label: "Immigration and border enforcement",
    aliases: ["immigration", "border enforcement", "migrants", "detention", "asylum"] },
  { id: "B4", categoryId: "retirement", label: "Social Security and Medicare",
    aliases: ["Social Security", "Medicare", "retirement benefits", "entitlements"] },
  { id: "B5", categoryId: "abortion", label: "Abortion policy",
    aliases: ["abortion", "gestational limits", "reproductive health policy"] },
  { id: "B6", categoryId: "elections", label: "Election integrity and threats to democracy",
    aliases: ["election integrity", "democratic institutions", "certification", "political violence"] },
  { id: "B7", categoryId: "safety", label: "Crime and public safety",
    aliases: ["crime", "policing", "public safety", "sentencing"] },
  { id: "B8", categoryId: "environment", label: "Climate and environment (national)",
    aliases: ["climate policy", "emissions", "environmental regulation", "energy"] },
];

/* What the model is actually asked about: BOTH levels, in one request.

   Asking the parents too is not redundancy. Fifteen narrow questions can each
   individually miss what one broad question catches — a general "Florida's
   economy is slowing" piece may clear neither "Cost of living in Florida" nor
   "Economy, inflation, and jobs" on its own, and would otherwise come back
   with nothing. The parent Noul catches it.

   Whether the parents actually earn their place is a question for the gold-set
   evaluation (spec §6), not an assumption: if no article is ever caught by a
   parent alone, drop these eleven questions in a later PR. Measuring it costs
   ~$0.02 per sweep, so it is measured rather than argued about. */
export const ASKABLE: readonly NewsIssue[] = [
  ...CATEGORIES.map(({ id, label, aliases }) => ({ id, label, aliases })),
  ...SUB_ISSUES,
];

export const ASKABLE_IDS: readonly string[] = ASKABLE.map((i) => i.id);
export const CATEGORY_IDS: readonly string[] = CATEGORIES.map((c) => c.id);
export const SUB_ISSUE_IDS: readonly string[] = SUB_ISSUES.map((i) => i.id);

/** Roll a stored tag set up to categories: every category explicitly tagged,
    plus the parent of every sub-issue tagged. Returned in CATEGORIES order so
    display is stable. Unknown ids are ignored rather than guessed at. */
export function categoriesFor(ids: readonly string[]): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    if (CATEGORY_IDS.includes(id)) set.add(id);
    const sub = SUB_ISSUES.find((s) => s.id === id);
    if (sub) set.add(sub.categoryId);
  }
  return CATEGORY_IDS.filter((c) => set.has(c));
}
