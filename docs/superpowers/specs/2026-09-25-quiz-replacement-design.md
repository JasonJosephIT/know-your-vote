# Quiz replacement: a Ballotpedia link and an issue filter on race pages

**Date:** 2026-09-25 · **Status:** approved in session, awaiting spec review
**Follows:** `docs/general-election/quiz-clipped-2026-09-25.md` (PR #94). This
spec builds options 1 and 2 from that note. Options 3 and 4 are not built.

## Why

The quiz came off because a model wrote a `stanceSummary` about each
candidate, which is text the site authored. Voters still need a way to see
where candidates stand on the issues they care about. These two pieces
replace it, and the site writes none of the content in either one.

## Founder calls made in session

| # | Call | Decision |
| - | ---- | -------- |
| Q1 | Where the issue filter lives | On each race page, not as a standalone page |
| Q2 | Which outside tool to link | **Ballotpedia only.** Vote411 is not linked: the League of Women Voters runs it and took positions against Amendments 1 and 2. The county election office is not linked here either. |

## Part 1: Ballotpedia link on the candidates hub

- One static card in `src/app/(public)/candidates/page.tsx`, directly under
  the tab nav, so it shows on all three tabs (`browse`, `races`, `saved`).
- New component `src/components/features/OutsideResources.tsx`. It takes no
  props and loads no data.
- Copy (final wording can be tuned in review, but these facts must stay):
  heading **"Another view"**; body "Ballotpedia, a nonpartisan encyclopedia,
  has a sample-ballot lookup and candidates' own survey answers."; link text
  **"Look up your ballot on Ballotpedia"**.
- The link goes to `https://ballotpedia.org/Sample_Ballot_Lookup`. It uses
  `target="_blank"` and `rel="noreferrer"`. Open it in a real browser during
  implementation, because curl gets a 202 bot challenge.
- The card shows no logo, image, embed or script from Ballotpedia. The privacy
  page promises no third-party requests on page load, and a plain link keeps
  that promise.
- No per-candidate Ballotpedia links. That would need one URL per candidate
  and is out of scope.

## Part 2: issue filter on race pages

### Routing

Reading `searchParams` in `src/app/(public)/races/[raceId]/page.tsx` would
switch the race page from ISR prerender (`revalidate = 3600`,
`generateStaticParams`) to dynamic rendering (Next 16 docs,
`01-app/01-getting-started/03-layouts-and-pages.md`). The filtered view
therefore gets **its own route**, and the race page stays static:

- `/races/[raceId]` is unchanged, except that it adds the chip row
  (`IssueFilter`). The chips are plain `<Link>`s with nothing selected.
- **New:** `src/app/(public)/races/[raceId]/issues/page.tsx` renders the
  filtered view from `?pick=<id>,<id>`. It is dynamic because it reads
  `searchParams`, but its data comes from the existing cached
  `getRaceBrief(raceId)` (`unstable_cache`, one hour), so each request
  doesn't go back to the database.
- No client JavaScript is involved: the chips are links, and the selection
  lives only in the URL, so it can be shared and nothing is stored.

### The pick parameter

- Pure function `parseIssuePick(raw: string | string[] | undefined,
  available: string[]): string[]` in `src/lib/issue-pick.ts`:
  - It splits on commas, trims, and drops anything not in `available`.
    `available` holds the sub-issue ids of the race's spine issues.
  - It removes duplicates and returns ids in the order of `available` (the
    race's spine order), not in URL order. That way two URLs with the same
    picks show the same page.
  - An array value (`?pick=a&pick=b`) is treated as its entries joined with
    commas.
- Pure function `togglePickHref(raceId: string, current: string[], id:
  string, available: string[]): string` builds each chip's link. It adds or
  removes `id` and returns `/races/<raceId>/issues?pick=…`. When removing
  the last id empties the set, it returns `/races/<raceId>`.
- A spine issue's sub-issue id comes from its `issue_id`, which is
  `${raceId}--issue-${subIssueId}` (`src/lib/brief-rows.ts`). The filter
  offers **spine issues only**, meaning the ones every candidate in the race
  is measured on. Candidate-tier extras are not choosable, because only one
  candidate has them and a side-by-side row would be empty for everyone
  else.

### Components

- `src/components/features/IssueFilter.tsx` (server component). Its props are
  `raceId`, the spine issues as `{ id, title }[]`, and the `selected` ids.
  - It renders one chip per spine issue, using the issue's own `title`.
    A selected chip gets `aria-current="true"` and the selected style.
  - It also renders a **"Show everything"** link back to `/races/<raceId>`
    whenever something is selected.
  - It renders nothing when the race has no spine issues.
- Pure function `issueRowsFor(brief: RaceBrief, selected: string[]):
  IssueRow[]` in `src/lib/issue-pick.ts`. It returns one `IssueRow` per
  selected issue, in spine order:
  `{ subIssueId, title, cells: { candidateId, name, coverage, say }[] }`.
  The cells follow the order of `brief.candidates`, and `say` is that
  candidate's `SourcedClaim[]` for the issue. **The type has no field for
  `stanceSummary`, `done` or `factCheck`,** so the component can't render
  them. This function is the testable part of the view.
- `src/components/features/IssueRows.tsx` (server component). Its props are
  the `IssueRow[]` from `issueRowsFor`. It only lays them out.
  - It renders one section per selected issue, in spine order. The heading is
    the issue `title`, followed by a grid with one cell per candidate. The
    candidates are in the same order and use the same column rules as
    `RaceCompare` (at most 3 across, stacking on mobile).
  - Each cell shows the candidate's name, then the candidate's `say` claims
    for that issue, rendered with the existing claim and source rendering
    used by `IssueSection` and `SourceLinks`. If `coverage` is
    `no_stated_position_found`, the cell shows exactly the wording
    `IssueSection` already uses for that case.
  - **It never renders `stanceSummary`**, and never renders `done` or
    `factCheck` either. The view shows what each candidate said, with its
    sources, and nothing else. For the full record, each cell links to the
    candidate's page.
  - If shared rendering needs to be pulled out of `IssueSection` to reuse it,
    move it into a small exported component. Don't duplicate it.

### The issues page

- It awaits `params` and `searchParams` (Next 16: both are Promises), then
  calls `getRaceBrief(raceId)`.
- If the brief is `null`, meaning the race isn't published or the audit
  isn't passed, it redirects to `/races/<raceId>`. That page already explains
  the listed or in-review state.
- It runs `parseIssuePick` against the spine sub-issue ids. If the result is
  empty, it redirects to `/races/<raceId>`.
- Otherwise it renders the same `RaceHeader` as the race page (moved to a
  shared module if needed), then `IssueFilter` with the selection, then
  `IssueRows`.
- `generateMetadata` gives the title `"<office>: <issue titles> — Know Your
  Vote"`, reusing the brief the page already loaded (the same cached call).
- It keeps the existing footer copy ("We write none of it") and adds no new
  copy about candidates.

### Other touch points

- `src/app/sitemap.ts`: do **not** add `/issues` URLs. They are filtered
  views of a page that is already listed.
- Analytics: no new event. (`quiz_completed` is already gone.)
- The redirects from PR #94 (`/where-i-stand` and `/find-my-candidates` to
  `/candidates`) stay as they are.

## Behaviour today

No race has published and audited briefs yet (Session C is blocked on
credentials). Until one does, the race page renders `RaceListing` rather than
`RaceCompare`, so the chip row never shows, and `/issues` redirects. That is
correct. The feature goes live with no further change when FL-GOV publishes.

## Verification

- New `scripts/verify-issue-pick.ts` (plain `node`, same style as the other
  `verify-*.ts` scripts), with unit checks for:
  - `parseIssuePick`: an unknown id is dropped; duplicates are removed;
    output follows spine order; `undefined`, `""` and `","` all give `[]`;
    an array value works; whitespace is trimmed; ids are case-sensitive.
  - `togglePickHref`: adding an id, removing one, and removing the last one
    (which returns `/races/<id>`); the ids in the returned `pick` follow spine
    order.
- Guardrail checks by static source scan in the same script: `IssueRows.tsx`
  does not reference `stanceSummary`, `done` or `factCheck`, and
  `OutsideResources.tsx` has no `<img`, `<iframe` or `<script`, and has
  `rel="noreferrer"`.
- `issueRowsFor` checks against a fixture `RaceBrief`: two candidates and
  three spine issues, where one candidate has `no_stated_position_found` on
  one issue and every `stanceSummary` holds a sentinel string. The checks
  confirm one row per selected issue in spine order, cells in candidate
  order, the coverage value carried through, and that the sentinel never
  appears in `JSON.stringify` of the output. The verify scripts have no
  JSX transform, so the components themselves are checked by source scan
  and in the browser.
- `npx tsc --noEmit` and `npm run lint` are clean on the changed files. The race page still
  builds as static and ISR (check that the `next build` route table doesn't
  mark `/races/[raceId]` as dynamic).
- Browser: the `/candidates` card shows on all three tabs, the Ballotpedia
  link opens in a new tab, and no requests go to ballotpedia.org on page
  load.

## Out of scope

- A standalone "pick your issues across the whole ballot" page, and options
  3 and 4 from the clip note.
- Remembering picks between visits. The URL is the only state.
- Renaming `quiz-questions.ts`.
