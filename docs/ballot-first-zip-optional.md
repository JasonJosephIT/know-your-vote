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

- [ ] **TASK-067** — Landing page renders the shared ballot
  Files: `src/app/(public)/page.tsx`, `src/components/features/SharedBallot.tsx` (new)
  Notes: Server-render the statewide races and published measures directly on
  `/`. Keep the ZIP field, demoted from gate to upgrade: *"Add your U.S. House
  race."* Preserve the county fallback. Requires Phase 6 TASK-060 and TASK-063.
  Verify: a first visit with JavaScript disabled and no stored state shows all
  eight shared ballot items.

- [ ] **TASK-068** — Un-gate the quiz
  Files: `src/components/features/Quiz.tsx`
  Notes: Delete the `{ kind: "zip" }` stage; start at the first question and
  run against the statewide races. Offer ZIP at the *results* step to add the
  district race. Sequence after Phase 6 TASK-065 (the neutrality reframe) so
  the result shape is settled before this touches the same file.
  Verify: the quiz completes end to end with no ZIP ever entered.

- [ ] **TASK-069** — Un-gate the news feed
  Files: `src/components/features/NewsFeed.tsx`, `src/app/api/news/route.ts`
  Notes: Replace the `noLocation` dead end with statewide items; metro scoping
  becomes a narrowing filter when a location is present in the URL, not a
  precondition.
  Verify: `/news` with empty storage renders statewide items, not an empty state.

- [ ] **TASK-070** — Remove `kyv.location`
  Files: `src/lib/location.ts` (delete), `ZipEntry.tsx`, `Quiz.tsx`, `NewsFeed.tsx`, `SavedCandidates.tsx`
  Notes: Drop the read/write/clear helpers and every `readLocation()` call;
  keep `locationQuery()`'s URL behavior, which is what actually carries state.
  Leave `kyv.saved` alone. Do this **after** 067–069, so nothing still depends
  on stored location when it disappears.
  Verify: `grep -r "kyv.location" src` returns nothing; a full ZIP → races →
  polling-place flow works with `localStorage` disabled entirely.

- [ ] **TASK-071** — Update the privacy page and analytics funnel
  Files: `src/app/(public)/privacy/page.tsx`, `src/lib/analytics.ts`
  Notes: The privacy page's "What stays on your device" section becomes
  narrower and truer — say plainly that ZIP is used for the request and not
  retained. The `zip_resolved` funnel step is no longer the entry event, since
  the magic moment now precedes it; add a `ballot_viewed` event or the funnel
  will read as a cliff-edge drop the day this ships.
  Verify: no claim on the privacy page describes storage that no longer exists.

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
