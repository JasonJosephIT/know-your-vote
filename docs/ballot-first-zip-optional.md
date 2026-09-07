# Phase 7: Ballot First, ZIP Optional

> Depends on Phase 6 ([`general-election-pivot.md`](./general-election-pivot.md)),
> specifically TASK-060 (statewide ZIP coverage) and TASK-061–063 (ballot
> measures). Phase 7 is what those two make possible.

The proposal: stop saving things, let people re-enter their ZIP, and require a
ZIP for only a couple of sections. That instinct is right, and the November
ballot is what makes it right. One correction to the premise, and one
distinction worth keeping.

---

## 1. The correction: it's four sections today, not two

ZIP or stored location currently gates **four** surfaces, not two:

| Surface | Where | What it needs |
|---|---|---|
| Landing page `/` | `(public)/page.tsx` + `ZipEntry.tsx` | ZIP is the **only** way in. No ZIP, no product. |
| Your races | `YourRaces.tsx` | `zip` + `district`, or a `county` fallback |
| Where I Stand (quiz) | `Quiz.tsx:15` — a `{ kind: "zip" }` stage | ZIP gate before the first question |
| Local news | `NewsFeed.tsx` | `readLocation()` → district or metro, else `noLocation` |
| *(Polling place)* | `VotingInfo.tsx` | ZIP + email — genuinely needs it |

Only **Browse candidates** (`/candidates` with no params), Methodology, and
Privacy work with no location at all.

So the current product is a **ZIP wall**: the landing page renders one input
and nothing else. A voter who mistypes, or lives outside the four covered
metros, hits a dead end before seeing a single candidate.

## 2. Why November makes ZIP nearly unnecessary

This is the part that changes the calculus, and it is new as of the general
election. The November ballot is overwhelmingly **statewide**:

| Ballot item | Needs ZIP? |
|---|---|
| Governor | No — every FL voter |
| U.S. Senate | No |
| Attorney General | No |
| Chief Financial Officer | No |
| Commissioner of Agriculture | No |
| Amendment 1 (budget stabilization) | No |
| Amendment 2 (farm equipment) | No |
| Amendment 3 (homestead exemption) | No |
| **U.S. House district race** | **Yes** |
| **Polling place / sample ballot** | **Yes** |

**Eight of ten ballot items are identical for every Florida voter.** In the
August primary the interesting races were the local ones, so a ZIP wall was
defensible. In the general it gates a shared ballot behind a question whose
answer changes almost nothing — which lands exactly on the two sections named
in the proposal.

## 3. The adjustment

**Flip the default: show the shared ballot first, ask for ZIP only to
personalize it.**

- The landing page renders the statewide races and the three amendments
  immediately, with no input. The magic moment costs zero keystrokes and
  cannot dead-end.
- ZIP becomes an **upgrade**, offered in place, in the two spots where it
  genuinely changes the answer: *"Add your U.S. House race"* and *"Find your
  polling place."*
- The quiz and the news feed stop gating on ZIP: both fall back to the
  statewide set, which is most of the ballot anyway.

Copy has to stay honest about the difference: a statewide list is *most* of
someone's ballot, not all of it. Lead with what it is — "Everything on every
Florida ballot" — and let the ZIP prompt say what it adds, rather than calling
an incomplete list "your ballot."

## 4. The persistence question — three stores, not one

"Nothing saved" is worth separating into the three things actually stored,
because they are not the same decision:

| Store | What it is | Recommendation |
|---|---|---|
| `kyv.location` | ZIP / county / district / metro, written by `ZipEntry` | **Drop it** |
| `kyv.saved` | The "Keeping in mind" candidate list (FR-008) | **Keep it** |
| InstallCard dismiss flag | One boolean so a dismissed card stays dismissed | Keep — trivial |

**Dropping `kyv.location` is cheap** because the URL already carries the same
state: `locationQuery()` puts `zip`, `district`, and `county` into the query
string, and every ZIP-aware page reads them from there. Within a visit,
navigation keeps working untouched. What is lost is cross-visit memory — which
the proposal explicitly accepts, and which now costs a returning voter one
optional field instead of a mandatory one.

**Keeping `kyv.saved` matters.** "Nothing saved" could be read as deleting this
too, but it is a different thing: an explicit user action that creates a
feature ("Keeping in mind"), not incidental state the app accumulates. It is
already device-local, already opt-in, already clearable. Deleting it removes
value nobody asked to remove. If it should go, that is a separate call worth
making on its own merits.

The payoff is a privacy claim that gets simpler and stronger — *"we remember
nothing about you between visits except the candidates you choose to save"* —
which for this product is not a footnote. Nonpartisan credibility is the
product, and a claim a skeptic can verify by opening devtools is worth more
than a paragraph of assurance.

---

## 5. Tasks

- [x] **TASK-067** — Landing page renders the shared ballot
  Files: `src/app/(public)/page.tsx`, `src/components/features/SharedBallot.tsx` (new)
  Notes: Server-render the statewide races and published measures directly on
  `/`. Keep the ZIP field, demoted from gate to upgrade: *"Add your U.S. House
  race."* Preserve the county fallback.
  **Dependency correction (2026-09-06):** this originally said it requires
  TASK-060. It does not. Statewide races already resolve with no ZIP
  (`resolve.ts` reads `district IS NULL`), and measures are readable via
  `getActiveMeasures()` since TASK-062. TASK-060 removes the out-of-metro
  dead end, which is worth doing on its own, but it does not gate this.
  TASK-063 is the real prerequisite, and only so the two link together.
  Verify: a first visit with JavaScript disabled and no stored state shows all
  eight shared ballot items.
  **Done 2026-09-07** — `src/components/features/SharedBallot.tsx` renders the
  statewide races and mounts `BallotQuestions`; `src/lib/races.ts` is the
  location-free read behind it, kept out of `resolve.ts` for the same reason
  measures were kept out of `ResolveResult` in TASK-063 — that file answers
  "what does this ZIP get", and a statewide race is nobody's ZIP question.
  `resolveCounty` now reads through it too, so "statewide" has one definition,
  one cache, and one ordering.

  Three things the plan did not anticipate:

  1. **The build broke before the page did.** Moving a database read onto a
     prerendered route made `createAnonServerClient`'s throw-on-missing-config
     a *build-time* failure: a checkout with no `.env` could no longer
     `next build` at all. Both landing-page reads now degrade to empty the way
     `election-dates.ts` already did around `createServiceClient`. `/` is still
     `○` static with a 1h revalidate.
  2. **An empty ballot had to become visible.** With both reads degrading, a
     misconfigured deploy would have shipped a silently blank landing page —
     the one failure nobody would notice. `SharedBallot` now says the ballot
     isn't published yet rather than rendering an empty div.
  3. **The ZIP field works without JavaScript.** It is a client component, so
     with scripts off it was a field that did nothing. Adding
     `action="/candidates" method="get"` and a hidden `view=races` makes the
     browser's plain GET land on the same server-rendered result; `submit()`
     still preventDefaults, so the split-district prompt is unchanged. The
     county fallback is preserved but remains JavaScript-only — it is a button
     with an onClick, and rewriting it is TASK-070's neighbourhood, not this
     task's.

  Copy changed with the framing: the headline is now "Everything on every
  Florida ballot" rather than "Your ballot, laid out fairly", because without
  a ZIP this page cannot keep the second promise. The site title and OG card
  moved with it — every other public page sets its own title, so `title.default`
  in the root layout *is* the landing page's, and a shared link should make the
  same honest claim the page does. The ZIP prompt deliberately makes **no**
  storage claim: `writeLocation` still writes `kyv.location` until TASK-070
  drops it, so "never stored" would be false today.

  `scripts/verify-shared-ballot.ts` guards the structural half of the verify
  criterion — that nothing the ballot reaches is a client component, and that
  the ZIP form keeps its no-JavaScript GET.

  **Verified on the preview deploy 2026-09-07: the five statewide races render.**
  The three amendments do not, and could not have — see the note below.

  **The verify criterion was wrong, and finding out took a deploy.** "All eight
  shared ballot items" assumed the measure tables existed in the project
  database. They did not: migrations `0009`–`0011` had never been applied
  there, so `ballot_measure` was missing entirely and `getActiveMeasures`
  returned `[]` — because `fetchActiveMeasures` destructures `const { data }`
  and drops `error`, PostgREST's "relation does not exist" was indistinguishable
  from "nothing published". That had been true since TASK-062 shipped, on
  `/candidates` as well as here; nothing surfaced it because nothing looked.

  0009–0011 were applied on 2026-09-07 (plus `0012`, which pins `search_path`
  on the three balance functions — the linter flagged them, and a SECURITY
  INVOKER function whose table references resolve against the caller's
  search_path is a poor guard for the one part of the ballot no campaign is
  checking). The schema is now correct and anon-readable. **The amendments
  still need TASK-066**: 0010/0011 create tables, not content, so eight items
  is unreachable until the measures are authored and pass the Balance Audit.

  Two things this leaves behind:

  - `scripts/verify-migrations.mjs` applies the migration files to an embedded
    pglite instance, so it proves the *files* are right while saying nothing
    about what the real database has. It passed throughout the drift. Detecting
    that needs a check against the deployed project, which does not exist yet.
  - Reads that swallow `error` as an empty result (`fetchActiveMeasures`, and
    `fetchStatewideRaces` as written here) trade a loud failure for a silent
    wrong answer. On the landing page that is the right trade — a voter should
    not get an error page — but it is the reason a missing table looked like an
    unpublished ballot for a day.

- [x] **TASK-068** — Un-gate the quiz
  Files: `src/components/features/Quiz.tsx`
  Notes: Delete the `{ kind: "zip" }` stage; start at the first question and
  run against the statewide races. Offer ZIP at the *results* step to add the
  district race. Sequence after Phase 6 TASK-065 (the neutrality reframe) so
  the result shape is settled before this touches the same file.
  Verify: the quiz completes end to end with no ZIP ever entered.
  **Done 2026-09-07** — the ZIP stage is gone; the quiz opens on question one
  and runs against `getStatewideRaces()`, and ZIP moved to the results step
  where it adds the district race to a result already on screen.

  **The file list was short by two.** `src/app/api/quiz/route.ts` required
  `zip` (`z.string().regex(ZIP_RE)`) and `runQuiz` took it as a required
  positional, so deleting the stage alone would have produced a 400 on every
  submission. Both now treat it as optional; the route additionally *rejects*
  a `district` sent without a `zip` rather than ignoring it, since that can
  only come from a malformed client and silently dropping it would answer a
  different question than the one asked.

  **What un-gating cost, and where it was paid.** The ZIP stage did real work
  besides collecting a ZIP: it checked coverage before the voter answered
  anything, so an out-of-coverage voter heard it on question zero rather than
  five questions in. That check now happens at the results step — and costs
  nothing when it fails, because the statewide results are already rendered
  and stay put. `addDistrictRace` never replaces the results stage on error;
  it only sets a notice. Failing to add a race a voter did not have a moment
  ago is a much smaller loss than failing before they had anything.

  **Copy moved with it**, on the same honesty rule as TASK-067: the disclaimer
  said "every candidate on your ballot", which a statewide-only run does not
  deliver. It now says "in these races", and the page subtitle names the
  statewide scope and the ZIP upgrade. The intro also lost "candidates whose
  stated positions line up" — that is the alignment framing TASK-065 removed
  from the results, still sitting in the invitation, promising exactly what
  the answer refuses to give.

  `scripts/verify-quiz-ungated.ts` guards the nine structural facts that would
  regress silently: no `{ kind: "zip" }` stage, the intro entering the
  questions directly, question one going back to the intro, the route's
  optional `zip` and its district refinement, `runQuiz`'s optional parameter,
  the statewide read on the no-ZIP path, the results-step upgrade still
  existing, and the disclaimer not reclaiming the whole ballot. Re-adding a
  ZIP gate is a one-line change that reads as harmless; this fails on it.
  (Regression-tested by re-adding the stage, which fails the script.)

  **Not verified here:** the end-to-end run. It needs a database and an
  `ANTHROPIC_API_KEY`, and this session has neither — the live check is a
  no-ZIP quiz on the preview deploy.

- [x] **TASK-069** — Un-gate the news feed
  Files: `src/components/features/NewsFeed.tsx`, `src/app/api/news/route.ts`
  Notes: Replace the `noLocation` dead end with statewide items; metro scoping
  becomes a narrowing filter when a location is present in the URL, not a
  precondition.
  Verify: `/news` with empty storage renders statewide items, not an empty state.
  **Done 2026-09-07** — the last of Phase 7's gates.

  **`route.ts` needed no change at all.** Every parameter was already optional
  and a request with none already returns the statewide scope
  (`and(race_id.is.null,metro.is.null)`). The gate lived entirely in the
  component: the effect `return`ed before fetching when no location was
  stored, and the render replaced the feed with an "Add your ZIP" prompt. Both
  are gone; the file is otherwise untouched, and `verify-news-ungated` pins
  the three parameters as optional so the feed cannot be re-gated from the
  server side without anyone noticing.

  **The data was checked before the code was written**, which is the lesson
  TASK-067 paid for: querying `news_item` as `anon` first confirmed three
  genuinely statewide rows — voter registration, the Division of Elections,
  and statewide election news (HB 991). Un-gating therefore produces a real
  feed rather than an honest-looking empty state, and that was known going in
  rather than discovered on a deploy.

  **Deviation from the plan's wording:** it says metro scoping "becomes a
  narrowing filter". The route ORs statewide, metro, and race scopes, so a ZIP
  *adds* local items rather than hiding statewide ones — kept as is. A voter
  who enters a ZIP should not thereby lose the voter-registration link, which
  is what narrowing would do.

  **Not moved to the URL.** The plan says "when a location is present in the
  URL", but `/news` is a static route and `useSearchParams` here would force a
  Suspense bailout for no gain today. It still reads `kyv.location`; TASK-070
  owns that migration and already lists this file.

  Copy followed TASK-067's honesty rule: the page was titled *Local electoral
  news*, and with no location it is statewide, so "Local" came off.

- [x] **TASK-070** — Remove `kyv.location`
  Files: `src/lib/location.ts` (delete), `ZipEntry.tsx`, `Quiz.tsx`, `NewsFeed.tsx`, `SavedCandidates.tsx`
  Notes: Drop the read/write/clear helpers and every `readLocation()` call;
  keep `locationQuery()`'s URL behavior, which is what actually carries state.
  Leave `kyv.saved` alone. Do this **after** 067–069, so nothing still depends
  on stored location when it disappears.
  Verify: `grep -r "kyv.location" src` returns nothing; a full ZIP → races →
  polling-place flow works with `localStorage` disabled entirely.
  **Done 2026-09-07** — `src/lib/location.ts` deleted, net −101 lines.

  **Two corrections to the file list.** `locationQuery()` had **no callers** —
  the note to keep it because it "is what actually carries state" described an
  intent, not the code; the URL is built inline at each `router.push`. It went
  with the rest of the module. And `SavedCandidates.tsx` needed no change at
  all: it only ever touched `kyv.saved`, which this task deliberately keeps.

  **What this costs, beyond re-entering a ZIP.** Two capabilities were only
  reachable through the store, and both are now gone rather than merely
  unused:

  1. **Metro-scoped news.** `NewsFeed` read a stored location to send `?zip=`
     or `?metro=`. The route still supports both and 7 of 10 `news_item` rows
     carry a metro, but the section nav is the only link to `/news` and has no
     location to pass — so `/news` is statewide for everyone now. A link from
     the races view carrying the location already in *that* URL restores it in
     one line; left as a deliberate follow-up rather than built speculatively
     here.
  2. **The quiz's district prefill.** `post()` sent a stored district so a
     voter who had confirmed one on a split ZIP did not have to again. Without
     it, a split ZIP entered at the quiz's results step comes back asking for
     confirmation. That is the honest answer once nothing is remembered
     between pages, and it is the cost the proposal explicitly accepted.

  **The payoff lands on the landing page.** TASK-067 deliberately made no
  storage claim next to the ZIP field, because `writeLocation` made "never
  stored" false. It is true now, so the claim is there: *"We use it to find
  your district; nothing is saved on your device."* Scoped to the device on
  purpose — that is the half a skeptic can verify in devtools in ten seconds.
  A broader "we never see it" would be false for a lookup the server answers.

  `scripts/verify-no-stored-location.ts` is the task's grep, made durable:
  comments are stripped (several files now explain the absence, and that must
  not read as presence), and it also fails on a device-stored location under
  any *other* key — re-adding the behaviour as `kyv.loc` would pass a literal
  grep while undoing the task. `kyv.saved` and the InstallCard dismiss flag
  are the two allowed keys. Regression-tested by writing a `kyv.loc` key,
  which fails it.

  `verify-news-ungated` was updated, not merely kept passing: two of its
  checks pinned TASK-069's code shape (a pre-hydration guard, a conditional
  query string) that this task deleted. What they protected — that the request
  is always issued — is asserted directly now.

  `saved.ts` already wraps every storage call in try/catch, so the second half
  of the verify criterion holds structurally: with `localStorage` disabled the
  app degrades rather than throwing.

- [x] **TASK-071** — Update the privacy page and analytics funnel
  Files: `src/app/(public)/privacy/page.tsx`, `src/lib/analytics.ts`
  Notes: The privacy page's "What stays on your device" section becomes
  narrower and truer — say plainly that ZIP is used for the request and not
  retained. The `zip_resolved` funnel step is no longer the entry event, since
  the magic moment now precedes it; add a `ballot_viewed` event or the funnel
  will read as a cliff-edge drop the day this ships.
  Verify: no claim on the privacy page describes storage that no longer exists.
  **Done 2026-09-07** — Phase 7 complete.

  **The privacy page carried a claim that was never true.** It said quiz
  answers were "stored in your browser only". They never were: `Quiz.tsx`
  keeps them in React state, and the only two `localStorage` keys the app has
  ever written are `kyv.saved` and the install-prompt flag. That predates
  Phase 7 entirely — the verify criterion says "no claim describes storage
  that no longer exists", and this one described storage that never existed.
  For a page whose entire value is being checkable, that is the worst kind of
  error to carry.

  The section now names **every** key the app writes and says plainly that
  neither the quiz answers nor the ZIP are kept. The ZIP paragraph names its
  own exception inline rather than leaving it to the next section: "your ZIP
  isn't stored" sitting directly above "we store your ZIP" reads as a
  contradiction even though both are true of different things, and a privacy
  page that needs careful reading to be accurate is not doing its job.

  The AI section also said the model receives "your ZIP-resolved races", which
  stopped being true in TASK-068 — it now receives the races on your ballot,
  statewide when no ZIP is given.

  **`ballot_viewed` is the funnel's new entry event**, ahead of `zip_resolved`.
  It fires only when a ballot actually rendered, not merely when the landing
  page loaded — the landing page re-reads the same two `unstable_cache` calls
  `SharedBallot` makes in that render, so it costs a cache hit rather than a
  query. Mounted on the page rather than inside `SharedBallot`: the tracker is
  a client component, and `verify-shared-ballot` enforces that nothing the
  ballot reaches needs JavaScript.

  Worth being honest about what the funnel can and cannot tell you: `zip_resolved`
  now measures how many voters *want* their district race, which is a smaller
  number by design. Comparisons across the ship date are misleading in both
  directions and no renaming fixes that — the honest reading is a new funnel
  starting at `ballot_viewed`.

  `TrackBriefView` became the generic `TrackView` rather than gaining a
  near-identical twin; the event name was the only thing that ever differed.
  Its two existing call sites moved with it.

  `verify-no-stored-location` grew the claim checks: the two assertions that
  were actually wrong, the two keys actually written, and the funnel order.
  Deliberately narrow — it pins facts, and does not pretend to validate
  English. Regression-tested by restoring the false quiz-answer claim, which
  fails it.

---

## 6. What this costs

Worth stating plainly rather than discovering later:

- **Returning voters re-enter ZIP** to see their district race or polling
  place. Accepted in the proposal, and now one optional field rather than a
  mandatory gate.
- **The PRD's magic moment is redefined.** FR-001 and TASK-015 describe ZIP →
  ballot as *the* entry flow. Under this change ZIP becomes secondary, so the
  PRD needs an amendment note — otherwise the docs and the product disagree.
- **Analytics discontinuity.** `zip_resolved` stops being the top of the
  funnel; comparisons across the change will be misleading unless TASK-071
  lands with it.
- **The district race gets less traffic**, because reaching it now takes an
  extra step. That is the real trade: a shared ballot everyone sees instantly,
  against one race fewer people personalize. In a general election where the
  statewide contests are the headline, that trade looks right — but it is a
  trade, not a free win.
