# Policy areas for candidate issues

**Status:** shipped
**Code:** `src/lib/policy-areas.ts`, `scripts/verify-policy-areas.ts`
**Date:** 2026-09-19

## The problem

An `issue` row (migration `0000_pipeline_read_models.sql`) carries a free-text
title the pipeline chose per race. Across the covered races that produces
"Economy & Affordability", "Consumer Protection", "Water & Land Use",
"Government Transparency", and a dozen others. Every title is legitimate.
Together they are not a vocabulary, so nothing joins:

- a housing position in one race to a housing position in another,
- a candidate's housing position to the housing question the quiz asks,
- a candidate's housing position to a housing article in the news feed.

The news pipeline already solved the same problem for articles: a reviewed
two-level taxonomy in `src/lib/news-issues.ts` whose category ids are the
quiz's question ids. Candidate policies were the surface still outside it.

## What this adds

`src/lib/policy-areas.ts` maps an issue row to one or more **policy areas**,
where an area is exactly a category from `news-issues.ts`. No second
vocabulary: change the taxonomy there and this follows.

Four decisions worth stating, because each rules out a plausible alternative.

**Derived at read time, not stored.** `issue` is a pipeline-owned read model
and this app never writes it. A stored `category_id` would need the pipeline
to fill it, would go stale the moment a title changed, and would need a
backfill every time the taxonomy moved. The cost of deriving is that an area
cannot be a SQL predicate; `src/lib/directory.ts` pays it by categorizing the
(published-only, small) issue set in memory.

**Deterministic, not modelled.** The news characterizer asks a model because a
headline is prose someone else wrote. An issue title is a topic label the
pipeline already chose, so a phrase match settles it, and a phrase match can be
read in a PR diff and reproduced exactly.

**No match stays no match.** An issue the taxonomy has no home for renders no
chip. Filing it under the nearest plausible parent would be a contested
editorial judgment made quietly, which is the same thing `news-issues.ts`
refused to do with abortion and elections.

**Equal treatment is structural.** A spine issue's title is race-wide, so
every candidate in the race gets the same areas for it. The only per-candidate
input is a candidate-tier issue, which is that candidate's own addition.

## The rule

In order, first hit wins:

1. **Identity.** The title IS a taxonomy label ("Education", "Property
   taxes"). Reported as `basis: "label"`.
2. **Phrases.** A taxonomy label or sub-issue alias appears as a whole phrase
   in the title or description; the bare topic words in `TITLE_ALIASES` count
   in the **title only**. Every hit is kept, so an issue that spans two areas
   comes back with both. Reported as `basis: "alias"`.
3. **Nothing.** No area is guessed. Reported as `basis: "none"`.

Matching normalizes to lowercase, folds `&` to "and", reduces punctuation to
single spaces, and pads both sides, so `includes()` is word-boundary aware:
"water" does not match inside "watershed".

### The two hand-written lists

These are the part a human has to review.

`TITLE_ALIASES` — bare topic words ("water", "insurance", "schools"), matched
against the title only. The news aliases are tuned for headlines, where a bare
word fires on any story that mentions it in passing; an issue title is not
prose about a subject, it **is** the subject. Restricting them to the title is
what keeps that argument true. Nothing here resolves a contested placement:
"taxes" and "budget" are deliberately absent.

`HEADLINE_ONLY_ALIASES` — four taxonomy aliases that do not categorize an
issue row at all, each with the title that earned it the exclusion:

| Alias | Taxonomy home | The title it got wrong |
|---|---|---|
| `coverage` | B2 Healthcare | "Hurricane Coverage and Premiums" |
| `detention` | B3 Immigration | "Juvenile Detention" |
| `certification` | B6 Election integrity | "Teacher Certification" |
| `restoration` | A5 Water and Everglades | "Historic Preservation and Restoration" |

Each sub-issue stays reachable through its label and its other aliases, and
`scripts/verify-policy-areas.ts` asserts both halves: the wrong area is gone
and the right one still resolves.

The category-level `aliases` in `news-issues.ts` are **not** consulted.
Nothing asks the category level today (`ASKABLE` is the sub-issues), so those
lists were never measured, and one of them mis-fires badly on titles:
"development" under Housing turns "Economic Development" into a housing issue.

## Coverage, measured

Every issue title in the demo fixtures, which are the shape the pipeline
writes:

| Categorized (10) | Uncategorized (6) |
|---|---|
| Economy & Affordability, Education, Environment & Water, Healthcare, Housing, Immigration, Insurance & Property Costs, Public Safety & Crime (identity); Farming & Rural Economy → Economy, Water & Land Use → Environment (phrase) | Consumer Protection, Consumer Services, Financial Transparency, Government Accountability, Government Transparency, State Budget & Spending |

The six are not a bug. Consumer protection and government accountability have
no home in a taxonomy built for a voter's issue questions, and inventing one
here would be an editorial judgment made in a helper function. Giving them a
home is a taxonomy decision, made in `news-issues.ts` with a version bump.

## Where it surfaces

- **Candidate briefs and race compare** (`IssueSection`): the areas for that
  issue, as neutral chips linking into the browse filter. Same chip style as
  `PartyChip`, never colour-coded, for the same reason.
- **Browse candidates** (`CandidateBrowser`, `?area=<id>`): filter to the
  candidates with a **stated** position in an area. A
  `no_stated_position_found` row is a recorded silence, not a position, so it
  does not match. Option counts are taken before the area filter applies, and
  the filter changes who is listed, never the ballot order they are listed in.

## Extending it

- A new area, or a new sub-issue: edit `src/lib/news-issues.ts` and bump
  `TAXONOMY_VERSION`. `verify-policy-areas.ts` will fail until the new area
  has at least one bare topic word, which is the point.
- A bare topic word: add it to `TITLE_ALIASES`. It must resolve to its own
  area and only its own area, and no two areas may claim the same word.
- An alias that mis-fires on titles: add it to `HEADLINE_ONLY_ALIASES` with
  the offending title as a fixture.

## Verify

```bash
node scripts/verify-policy-areas.ts
```

Pure and offline: no DB, no network, no model.
