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
/* 4 — 2026-09-21: the CATEGORY aliases were folded into their sub-issues.
   When the category questions were dropped on 2026-09-18 (measured redundant:
   a parent never fired alone across 10 fixtures), 20 alias terms silently
   stopped being asked anywhere, because they lived only on a category —
   "homelessness", "police", "sheriff", "courts", "public schools", "teachers",
   "classroom funding", "property taxes", "visas", "redistricting" and more.

   This was not caught by the 116-row gold set, because the worst-hit issues
   had zero gold examples there. It surfaced in an 834-article corpus run where
   A2 housing scored 0.0% while the corpus carried two homelessness stories.

   `verify-news-issues.ts` now asserts no category alias is orphaned, so this
   cannot recur silently.

   MEASURE BEFORE TRUSTING IT. The one previous time aliases were widened, A6
   went 14 -> 11 on the same corpus: more vocabulary is not monotonically
   better, and past roughly a dozen terms it appears to blur a question rather
   than sharpen it. This restores what was lost; it does not claim to improve
   recall. Re-run the gold set.

   3 — 2026-09-20: the `environment` category gained KYV2 (energy and
   utilities), KYV3 (growth, development and land conservation), KYV4 (storm
   resilience and flood protection) and KYV5 (water supply and drinking
   water); A5's aliases widened to the ambient-quality vocabulary it lacked.
   Bumped because a v2 row tagged `{}` on an energy, land-use or water-supply
   article was a miss the taxonomy could not express, and a v3 row tagged `{}`
   on the same article is a real negative. The two are not comparable, so the
   version has to say which one you are reading. */
/* 5 — 2026-09-21: `housing` gained KYV6 (renters and evictions) and KYV7
   (homelessness); `insurance` gained KYV8 (condominium and HOA costs).

   KYV7 IS THE v4 FOLD DONE PROPERLY, NOT A SECOND ATTEMPT AT IT. v4 restored
   "homelessness" by adding it to A2's aliases, which fixed the orphan and
   made the term askable again. But A2's label — CAP's, verbatim — is "Housing
   affordability", and asking a model whether a story about an encampment
   ordinance relates to housing AFFORDABILITY invites the answer the label
   deserves. That is the B6 failure exactly, and the KYV4 failure exactly: two
   subjects under one label, and the label is what the model is actually
   answering. So "homelessness" and "unhoused" move off A2 and onto KYV7,
   where the label says what the question means. The v4 invariant still holds
   — every category alias is asked somewhere — which is the property
   verify-news-issues.ts asserts, deliberately not "asked under its own
   category".

   WHAT IS AND IS NOT MEASURED HERE. KYV7 has real support: A2 scored 0.0%
   across the 834-article corpus that carried two homelessness stories (v4's
   note). KYV6 and KYV8 have none — the 116-row gold set holds no eviction,
   condo or insurance story at all, and A1/A2 sat at zero gold rows there.
   Those two rest on the quiz's wording and Florida's issue space, the KYV4
   standard rather than the B8 standard.

   A1 and A2 ALIASES WIDENED SPARINGLY, and v4's warning is why. A6 went
   14 -> 11 on that same corpus when its aliases grew; past roughly a dozen
   terms the vocabulary blurs the question. A1 lands at 7 and A2 at 8, and
   terms that were merely adjacent (mortgage rates, homeownership, rate
   filing, insurer insolvency) were dropped rather than kept for completeness. */
export const TAXONOMY_VERSION = "5";

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
    /* "development" was dropped in v4 rather than folded into a sub-issue: as
       a question word it is too generic, and it made "Economic Development"
       classify as an environment issue. Its specific senses live on KYV3
       ("suburban development", "development moratorium") and A2
       ("housing supply"). */
    aliases: ["rent", "homebuying", "homelessness"] },
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
       three different policies and three different arguments, and the original
       four aliases named only the first. Held to three additions, not the six
       first drafted: v4 measured A6 losing ground at 14 terms, so "rate
       filing" and "insurer insolvency" were dropped as insider vocabulary
       that no headline uses. Condominium and association costs are KYV8's. */
    aliases: ["property insurance", "premiums", "hurricane coverage",
              "Citizens Property Insurance", "flood insurance",
              "windstorm coverage", "reinsurance"] },
  { id: "A2", categoryId: "housing", label: "Housing affordability",
    /* COST, SUPPLY and BUYING: what a home costs and whether enough are being
       built. `rent` stays because a rent level is a price; the landlord-tenant
       relationship is KYV6's. "zoning" is KYV3's.

       "homelessness" and "unhoused" came here in the v4 fold and moved to
       KYV7 in v5 — see TAXONOMY_VERSION. They are still asked, which is what
       the orphan check requires; they are asked under a label that describes
       them. `homebuying` stays: buying a home is this issue. */
    aliases: ["housing costs", "rent", "housing supply", "first-time buyers",
              "homebuying", "home prices", "down payment assistance",
              "affordable housing"] },
  { id: "A3", categoryId: "insurance", label: "Property taxes",
    aliases: ["property tax", "property taxes", "homestead exemption",
              "property assessments", "millage"] },
  { id: "A4", categoryId: "economy", label: "Cost of living in Florida",
    /* Widened 2026-09-18: 0% recall. Missed a gas-price story and a minimum-wage
       rise — the model tagged only what a headline was ABOUT, not what it cost
       people. Cost-side terms only; "wages"/"jobs" stay with B1 to avoid
       collapsing the two. */
    aliases: ["household costs", "utility bills", "groceries", "affordability",
              "gas prices", "fuel costs", "grocery prices", "everyday expenses",
              "household budgets", "price increases", "paying the bills",
              "cost of living"] },
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
              "students", "education policy", "state colleges", "universities",
              "public schools", "teachers", "classroom funding"] },
  { id: "A7", categoryId: "elections", label: "Elections administration and voting access",
    aliases: ["voting access", "election administration", "ballot initiative process",
              "voter registration", "ballot access", "redistricting"] },
  { id: "B1", categoryId: "economy", label: "Economy, inflation, and jobs",
    aliases: ["economy", "inflation", "jobs", "wages", "unemployment"] },
  { id: "B2", categoryId: "healthcare", label: "Healthcare access and costs",
    /* Widened 2026-09-18: 20% recall. Missed a vaccine-access rule, a disease
       outbreak death and a Medicaid drug-pricing announcement. Public health is
       part of how people reach care, so it is named here explicitly. */
    aliases: ["healthcare costs", "coverage", "hospitals", "prescription prices",
              "public health", "vaccines", "Medicaid", "clinics", "pharmacies",
              "drug prices", "disease outbreaks", "insurance coverage",
              "prescription costs"] },
  { id: "B3", categoryId: "immigration", label: "Immigration and border enforcement",
    aliases: ["immigration", "border enforcement", "migrants", "detention", "asylum",
              "visas"] },
  { id: "B4", categoryId: "retirement", label: "Social Security and Medicare",
    aliases: ["Social Security", "Medicare", "retirement benefits", "entitlements",
              "retirement income", "benefits"] },
  { id: "B5", categoryId: "abortion", label: "Abortion policy",
    aliases: ["abortion", "gestational limits", "reproductive health policy",
              "abortion law"] },
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
    aliases: ["crime", "policing", "public safety", "sentencing",
              "police", "sheriff", "courts"] },
  /* B8 stays NATIONAL in scope, and its alias list is deliberately not
     widened: the 2026-09-18 evaluation scored it 0% recall, and the diagnosis
     was that all four gold rows were mislabelled rather than missed (eval §3).
     They were county moratoria on AI data centres, which the report reads as
     energy and land-use stories. Those rows now sit under KYV2/KYV3, and
     `energy` moves out of this list with them — leaving it here would recreate
     the A4/B1 overlap, where a broad label swallows every story a narrow one
     was added to catch. */
  { id: "B8", categoryId: "environment", label: "Climate and environment (national)",
    /* v4 adds the bare word "climate" only. That is B8's own subject — its
       label begins with it — not a broadening into a neighbour's territory,
       which is what the note above guards against. "energy" still stays out,
       with KYV2. */
    aliases: ["climate policy", "emissions", "environmental regulation",
              "federal environmental rules", "offshore drilling", "climate"] },

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
    /* v4 adds the bare "conservation" — in this issue's own label, and an
       `environment` category alias that stopped being asked.

       "development" was tried here and REVERTED. It is in the label too, but
       as a question word it is too generic: `verify-policy-areas.ts` caught
       "Economic Development" classifying as an environment issue. The
       specific senses are already covered — "suburban development" and
       "development moratorium" here, "housing supply" on A2 — so the bare
       word buys nothing and costs a false positive. */
    aliases: ["land use", "zoning", "development moratorium", "growth management",
              "wetlands", "permitting", "state parks", "conservation land",
              "rural boundary", "suburban development", "data centers",
              "conservation"] },
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

     KYV7 IS MEASURED; KYV6 AND KYV8 ARE NOT. The 834-article corpus that
     prompted v4 carried two homelessness stories and A2 caught neither, so
     the homelessness gap is a number rather than an opinion. The 116-row gold
     set holds no eviction, condo or insurance story at all — A1 and A2 sat at
     zero gold rows there — so KYV6 and KYV8 rest on the quiz's wording and on
     Florida's issue space, the KYV4 standard rather than the B8 standard.
     Whoever reads the first v5 evaluation should expect those two to be the
     least validated rows in it. */
  { id: "KYV6", categoryId: "housing", label: "Renters and evictions",
    /* The quiz's "stronger protections and stability for renters". Aliases
       name the TENANCY, not the price — a rent level is A2's. */
    aliases: ["renters", "tenants", "eviction", "landlord-tenant law",
              "rental assistance", "security deposits", "tenant protections",
              "lease terms", "rent stabilization"] },
  /* THE ONE ENTRY HERE WITH A MEASURED CASE, and the alias route was measured
     to fail before this one was written. A2 scored 0.0% across 834 articles
     that carried two homelessness stories, and
     docs/general-election/news-corpus-analysis-2026-09-19.md says why, in its
     own words: the two articles "are about homelessness *services*, not
     housing **affordability**, which is A2's label. Adding 'homelessness' as
     an alias did not change it, and the label is right to resist. CAP's 15 has
     no concept for housing insecurity — a taxonomy gap to note, not a tagging
     failure."

     So this is not a second opinion about A2's label. It is the missing
     concept that analysis asked for. `unhoused` comes across from the v4 fold
     for the same reason "homelessness" does. */
  { id: "KYV7", categoryId: "housing", label: "Homelessness",
    aliases: ["homelessness", "unhoused", "homeless services", "encampments",
              "public camping", "emergency shelters", "unsheltered",
              "transitional housing"] },
  /* THE WEAKEST ENTRY IN THE TAXONOMY, and the 834-article corpus is why.
     Its `Insurance & Property Costs` category totals 13 articles, and A1 (3)
     plus A3 (10) account for all 13 — nothing unexplained is sitting there
     waiting for a condo issue. Twenty-five days of 29 Florida outlets produced
     no condominium story that any issue caught.

     That is evidence against URGENCY, not against correctness: a special-
     assessment story could be sitting in the corpus's 531 untagged articles,
     which is exactly what this would catch, and the pool file was not
     preserved so nobody can look. The test is to label rows, which is what
     that report says to do about every zero in it.

     PARENT IS `insurance`, NOT `housing`, AND THAT IS A JUDGMENT CALL. The
     category's quiz question reads "On property insurance and what it costs to
     keep a home", and a five-figure special assessment is the sharpest example
     of that cost Florida offers. The argument for `housing` — a condominium is
     a home, milestone inspections are building safety — is not weak. Moving it
     is free while the sweep has never run and no row carries the tag. */
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
