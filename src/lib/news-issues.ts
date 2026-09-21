/* The news issue taxonomy — two levels.
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.1
   docs/general-election/news-issue-taxonomy-options-2026-09-18.md

   Founder direction 2026-09-18: the quiz's eight become CATEGORIES; the
   fifteen researched issues from CAP_Issue_List_FL_2026_v1.md become the
   SUB_ISSUES underneath them. Eight `KYV`-prefixed sub-issues have been added
   since, each where a measured gap or the quiz's own wording showed a subject
   with nowhere to go — see TAXONOMY_VERSION and the KYV entries below.

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

   LABELS ARE COPIED WHERE THEY EXIST, DRAFTED WHERE THEY DO NOT. Category
   labels for the eight are verbatim from src/lib/quiz-questions.ts (TASK-032,
   neutrality-reviewed). A- and B-prefixed sub-issue labels are verbatim from
   CAP_Issue_List_FL_2026_v1.md (2026-07-15, sourced and balance-checked). The
   three non-quiz category labels, the eight `KYV` sub-issue labels and every
   `aliases` array were written here — that is the part a human must read in
   review, because nothing upstream has vetted them.

   Ballot amendments are NOT issues. `ballot_measure` (migration 0010) holds
   them with a measure_id and an official title. A3 "Property taxes" is the
   issue; Amendment 3 is a measure, and they are different objects.

   Pure and dependency-free; scripts/verify-news-issues.ts drives it. */

import type { NewsIssue } from "./news-characterize.ts";

export type { NewsIssue };

/** Bumped in the SAME PR as any change below, and recorded on every
    characterized row, so a tag written under one version is distinguishable
    from one written under the next. */
/* 2 — 2026-09-18: CAP's B6 split into B6 + KYV1; A4/A6/B2 aliases widened
   after the gold-set evaluation. Bumped because tags written under v1 are
   not comparable to tags written under v2. */
/* 3 — 2026-09-20: the `environment` category gained KYV2 (energy and
   utilities), KYV3 (growth, development and land conservation), KYV4 (storm
   resilience and flood protection) and KYV5 (water supply and drinking
   water); A5's aliases widened to the ambient-quality vocabulary it lacked.
   Bumped because a v2 row tagged `{}` on an energy, land-use or water-supply
   article was a miss the taxonomy could not express, and a v3 row tagged `{}`
   on the same article is a real negative. The two are not comparable, so the
   version has to say which one you are reading. */
/* 4 — 2026-09-21: `housing` gained KYV6 (renters and evictions) and KYV7
   (homelessness); `insurance` gained KYV8 (condominium and HOA costs). A1 and
   A2 aliases widened. Bumped for the same reason as 3: a v3 row tagged `{}` on
   an eviction-ordinance or special-assessment story was a gap the taxonomy
   could not express, and a v4 row tagged `{}` on one is a real negative.

   UNLIKE 3, NOTHING HERE IS MEASURED. Version 3 was prompted by B8's 0%
   recall over four real gold rows. The 2026-09-18 corpus contains no housing
   story, no insurance story, no condo story, no eviction story and no
   homelessness story — A1 and A2 already sat at zero gold rows before this.
   These three rest on the quiz's own wording and on Florida's issue space,
   which is the standing KYV4 justification, not on evidence of a miss. */
export const TAXONOMY_VERSION = "4";

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
    /* Widened 2026-09-21. In Florida wind, flood and the residual market are
       three different policies and three different arguments; the original
       four aliases named only the first. Condominium and association costs
       are KYV8's, not A1's. */
    aliases: ["property insurance", "premiums", "hurricane coverage",
              "Citizens Property Insurance", "flood insurance", "windstorm coverage",
              "rate filing", "insurer insolvency", "reinsurance"] },
  { id: "A2", categoryId: "housing", label: "Housing affordability",
    /* Widened 2026-09-21, and deliberately kept to COST, SUPPLY and BUYING:
       what a home costs and whether enough are being built. The landlord-
       tenant relationship is KYV6, having nowhere to live is KYV7. `rent`
       stays here because a rent level is a price. */
    aliases: ["housing costs", "rent", "housing supply", "first-time buyers",
              "home prices", "down payment assistance", "affordable housing",
              "mortgage rates", "homeownership"] },
  { id: "A3", categoryId: "insurance", label: "Property taxes",
    aliases: ["property tax", "homestead exemption", "property assessments", "millage"] },
  { id: "A4", categoryId: "economy", label: "Cost of living in Florida",
    /* Widened 2026-09-18: 0% recall. Missed a gas-price story and a minimum-wage
       rise — the model tagged only what a headline was ABOUT, not what it cost
       people. Cost-side terms only; "wages"/"jobs" stay with B1 to avoid
       collapsing the two. */
    aliases: ["household costs", "utility bills", "groceries", "affordability",
              "gas prices", "fuel costs", "grocery prices", "everyday expenses",
              "household budgets", "price increases", "paying the bills"] },
  { id: "A5", categoryId: "environment", label: "Water quality and Everglades restoration",
    /* Widened 2026-09-20 — the aliases named the Everglades and red tide but
       not the everyday ways water quality reaches the news. AMBIENT quality
       only: what is in the water in the environment. What comes out of a tap,
       and whether there is enough of it, is KYV5. */
    aliases: ["water quality", "Everglades", "red tide", "nutrient pollution", "restoration",
              "algae blooms", "blue-green algae", "sewage spill", "wastewater discharge",
              "septic to sewer", "nutrient runoff", "water pollution", "springs", "seagrass"] },
  { id: "A6", categoryId: "education", label: "Public education and school choice",
    /* Widened 2026-09-18: 25% recall. Missed AI-in-schools rules, a work-based
       learning grant and a public-education polling story — all plainly
       education policy, none matching the narrow original alias set. */
    aliases: ["public school funding", "vouchers", "school choice", "teacher pay",
              "K-12", "school districts", "school board", "classrooms", "curriculum",
              "students", "education policy", "state colleges", "universities"] },
  { id: "A7", categoryId: "elections", label: "Elections administration and voting access",
    aliases: ["voting access", "election administration", "ballot initiative process", "voter registration"] },
  { id: "B1", categoryId: "economy", label: "Economy, inflation, and jobs",
    aliases: ["economy", "inflation", "jobs", "wages", "unemployment"] },
  { id: "B2", categoryId: "healthcare", label: "Healthcare access and costs",
    /* Widened 2026-09-18: 20% recall. Missed a vaccine-access rule, a disease
       outbreak death and a Medicaid drug-pricing announcement. Public health is
       part of how people reach care, so it is named here explicitly. */
    aliases: ["healthcare costs", "coverage", "hospitals", "prescription prices",
              "public health", "vaccines", "Medicaid", "clinics", "pharmacies",
              "drug prices", "disease outbreaks", "insurance coverage"] },
  { id: "B3", categoryId: "immigration", label: "Immigration and border enforcement",
    aliases: ["immigration", "border enforcement", "migrants", "detention", "asylum"] },
  { id: "B4", categoryId: "retirement", label: "Social Security and Medicare",
    aliases: ["Social Security", "Medicare", "retirement benefits", "entitlements"] },
  { id: "B5", categoryId: "abortion", label: "Abortion policy",
    aliases: ["abortion", "gestational limits", "reproductive health policy"] },
  /* CAP's B6 was "Election integrity and threats to democracy" — two distinct
     subjects under one label, and the 2026-09-18 evaluation measured the cost:
     25% precision, 20% recall. The annotator read it broadly (press freedom
     counted); the model read it narrowly (elections only). Both readings are
     defensible, which is exactly why one label could not carry both. Split
     2026-09-18: B6 keeps CAP's id and its election-specific half. */
  { id: "B6", categoryId: "elections", label: "Election integrity",
    aliases: ["election integrity", "certification", "election security", "voter rolls",
              "ballot counting", "election fraud allegations", "recounts"] },
  /* The other half of CAP's B6. The `KYV` prefix is deliberate: an A- or
     B-prefixed id traces to a sourced CAP entry, a KYV-prefixed id is this
     project's own addition and carries no CAP provenance. Do not renumber it
     into the B series. */
  { id: "KYV1", categoryId: "elections", label: "Threats to democratic institutions",
    aliases: ["press freedom", "freedom of the press", "rule of law", "political violence",
              "checks and balances", "abuse of office", "democratic norms"] },
  { id: "B7", categoryId: "safety", label: "Crime and public safety",
    aliases: ["crime", "policing", "public safety", "sentencing"] },
  /* B8 stays NATIONAL in scope, and its alias list is deliberately not
     widened: the 2026-09-18 evaluation scored it 0% recall, and the diagnosis
     was that all four gold rows were mislabelled rather than missed (eval §3).
     They were county moratoria on AI data centres, which the report reads as
     energy and land-use stories. Those rows now sit under KYV2/KYV3, and
     `energy` moves out of this list with them — leaving it here would recreate
     the A4/B1 overlap, where a broad label swallows every story a narrow one
     was added to catch. */
  { id: "B8", categoryId: "environment", label: "Climate and environment (national)",
    aliases: ["climate policy", "emissions", "environmental regulation",
              "federal environmental rules", "offshore drilling"] },

  /* ── The environment category, expanded 2026-09-20 ──────────────────────
     Two independent readings asked for the same three issues.

     THE EVALUATION. B8 was the only issue scoring 0% recall with gold rows to
     its name, and no alias list could have fixed it: a county moratorium on a
     data centre is not national climate policy, so the model's refusal was
     correct and the label was the defect. The missing thing was an issue, not
     a word.

     THE QUIZ. Its environment question (quiz-questions.ts, TASK-032) offers
     three priorities — water quality and restoration projects, balancing
     environmental rules with growth and development, and preparing
     infrastructure for storms and flooding. Only the first had a sub-issue. A
     voter who picked either of the other two got no news matching the
     priority they had just named, which is the one thing a shared vocabulary
     between the quiz and the feed is for.

     KYV prefix, per KYV1: an A- or B-prefixed id traces to a sourced CAP
     entry, a KYV id is this project's own addition and carries no CAP
     provenance. Do not renumber these into the A or B series.

     SCOPE IS THE SEAM. These three are state and local; B8 is national. That
     split is what keeps them from competing for the same article the way A4
     and B1 do (eval §3) — and it is also the line to check first if a later
     evaluation finds one of them never firing. */
  { id: "KYV2", categoryId: "environment", label: "Energy and utilities",
    /* Aliases are deliberately ELECTRIC and fuel terms, not "utility rates"
       in general: a water bill is KYV5's, and one alias reading on both
       sides of that seam would make the pair inseparable in the data. */
    aliases: ["electricity", "power grid", "electric rates", "power bills",
              "rate case", "power plants", "solar", "natural gas",
              "energy policy", "data centers", "data center power demand"] },
  { id: "KYV3", categoryId: "environment", label: "Growth, development and land conservation",
    aliases: ["land use", "zoning", "development moratorium", "growth management",
              "wetlands", "permitting", "state parks", "conservation land",
              "rural boundary", "suburban development", "data centers"] },
  /* No gold row scores this — the position A1, A2, A5, B4 and B5 are also in.
     It exists because the quiz asks about it and Florida votes on it, not
     because the evaluation demanded it.

     THE LABEL SAYS "PROTECTION", AND THAT IS THE WHOLE POINT. The first
     draft was "Storm resilience and flooding", with `flooding` among the
     aliases, and the gold set already held its refutation: two Broward rows
     ("Flooding causes travel delays", "Flood advisory issued") are weather
     reports the annotator correctly tagged with NO issue. Asked whether they
     relate to "flooding", a model says yes and is not wrong — the question
     was bad. Asked whether they relate to flood PROTECTION, it says no.
     Weather is not a policy issue; what a government builds or funds before
     the water arrives is. Every alias here names the second thing. */
  { id: "KYV4", categoryId: "environment", label: "Storm resilience and flood protection",
    aliases: ["storm resilience", "hurricane preparedness", "flood mitigation",
              "flood control", "resilience funding", "sea-level rise",
              "coastal flooding", "stormwater infrastructure", "drainage projects",
              "beach renourishment", "sea walls", "evacuation routes"] },
  /* WATER HAS TWO HALVES AND THE TAXONOMY ONLY HAD ONE. A5 is CAP's entry and
     its label — fixed, verbatim — says "Water quality and Everglades
     restoration": what is in the water out in the environment. Nothing named
     the tap. A wellfield permit, a hosepipe ban, an aquifer drawdown, a
     desalination plant or a water-rate rise is not a quality story, and
     filing one under A5 would show a voter a label that does not describe
     what they clicked. Florida runs on the Floridan aquifer and argues about
     withdrawals from it; this is a live issue here, not a hypothetical.

     Unscored, like KYV4: the 14-day window carried no water-supply story.
     One thing to watch in the v3 re-run — the data-centre rows describe the
     facilities as "water- and power-guzzling", so they may now fire KYV5
     alongside KYV2/KYV3. The gold labels were left at KYV2+KYV3; whether the
     water clause earns a third tag is a labelling call, and eval §0 still
     holds that those labels are an agent's, not the founder's. */
  { id: "KYV5", categoryId: "environment", label: "Water supply and drinking water",
    aliases: ["drinking water", "water supply", "aquifer", "wellfield",
              "water restrictions", "desalination", "water utility",
              "water rates", "water main", "reclaimed water",
              "drinking water contamination"] },

  /* ── Housing and property costs, 2026-09-21 ────────────────────────────
     TWO CATEGORIES, THREE SUB-ISSUES BETWEEN THEM, AND A QUIZ THAT ASKS
     ABOUT MORE THAN THAT. `housing` had one child (A2, affordability) while
     its quiz question offers three priorities: building more, help for
     first-time buyers, and stronger protections for renters. The first two
     are A2's and KYV3's. The third had nothing. And the category's own alias
     list has named `homelessness` since it was written, with no sub-issue
     able to catch it — a tag that can never fire is a promise the taxonomy
     does not keep.

     NOTHING HERE IS MEASURED, and that is a weaker footing than the energy
     work stood on. The 2026-09-18 corpus holds no housing, insurance, condo,
     eviction or homelessness story at all; A1 and A2 were already at zero
     gold rows. These rest on the quiz's wording and on Florida's issue space
     — the KYV4 standard, not the B8 standard. Whoever reads the first v4
     evaluation should expect these three to be the least validated rows in
     it. */
  { id: "KYV6", categoryId: "housing", label: "Renters and evictions",
    /* The quiz's "stronger protections and stability for renters". Aliases
       name the TENANCY, not the price — a rent level is A2's. */
    aliases: ["renters", "tenants", "eviction", "landlord-tenant law",
              "rental assistance", "security deposits", "tenant protections",
              "lease terms", "rent stabilization"] },
  { id: "KYV7", categoryId: "housing", label: "Homelessness",
    aliases: ["homelessness", "homeless services", "encampments",
              "public camping", "emergency shelters", "unsheltered",
              "transitional housing", "street homelessness"] },
  /* PARENT IS `insurance`, NOT `housing`, AND IT IS A JUDGMENT CALL. That
     category's quiz question reads "On property insurance and what it costs
     to keep a home" — and a five-figure special assessment is the sharpest
     example of what it costs to keep a home that Florida currently offers.
     The argument for `housing` is that a condominium is a home and milestone
     inspections are building safety; it is not a weak argument. It is cheap
     to move today, because the sweep has never run and no row carries this
     tag yet; it stops being cheap once one does. */
  { id: "KYV8", categoryId: "insurance", label: "Condominium and HOA costs",
    aliases: ["condominium association", "HOA", "homeowners association",
              "special assessment", "milestone inspection",
              "structural integrity reserve", "condo fees", "association dues",
              "condo board", "reserve funding"] },
];

/* What the model is asked about: THE SUB-ISSUES ONLY.

   The categories above are a derived display layer, not questions. They are
   never asked and never stored — `categoriesFor()` computes them from the
   sub-issue tags on a row.

   This was measured, not assumed. The first live run (2026-09-18, 10 fixtures,
   jev-1.13.0) asked both levels — 26 Nouls — and in every single row where a
   parent fired, one of its children fired too. The parent never caught
   anything alone, including the fixture written specifically to need it: a
   deliberately broad "Florida's economy is slowing" headline, which B1 caught
   at 0.98 without help. Eleven of twenty-six questions were doing no work, so
   the founder dropped them.

   If a later evaluation finds broad articles slipping through with no tags,
   the fix is to put these back — add CATEGORIES to ASKABLE and re-measure.
   The rest of the pipeline does not care: the core takes whatever list this
   exports, and `categoriesFor()` already handles a category id appearing as a
   stored tag, which is what a restored parent question would produce. */
export const ASKABLE: readonly NewsIssue[] = SUB_ISSUES;

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
