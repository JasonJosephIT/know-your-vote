# Home page: sample ballot links and an easier scroll

Build spec, 2026-10-12. Reconciles the two judges' final specs (both built on Design 2, "scroll-rhythm", with Design 1's resources block). The visual version, with before/after mockups and the decision form, is `home-readability.html` in this folder.

- Repo: `.claude/worktrees/candidate-profiles-handoff-46d6e7`, branch `claude/home-readability`, written on `main` b3f0b86 and rechecked on `main` 71db8fb. Cut each PR from current `main` (71db8fb or later) in its own worktree; rebase or re-cut `claude/home-readability` before building PR A.
- Spacing scale (custom): 1=4px, 2=8, 3=12, 4=16, 5=24, 6=32, 7=48, 8=64, 9=96. Use arbitrary px (`min-h-[24px]`) wherever an exact size matters; `min-h-6` is 32px here.
- Heights marked **m** were measured on the dev server (audit or prototype, 2026-10-12, at b3f0b86). Heights marked **k** were measured in this folder's HTML mockup, which uses the site's tokens and real copy but system fonts; on the b3f0b86 page it ran within about 2% of the dev server on phones (6,420 vs 6,278) and 6% long on desktop. Heights marked **e** are estimates. Re-measure after each PR.
- Nothing under `src/` or `public/` was edited to write this spec.

> **Rebased on main 71db8fb (address lookup, PRs #171/#172).** The plan still applies. What changed on main: the House step's field takes a street address or a ZIP by default (`addressEntryEnabled()`, off only with `ADDRESS_LOOKUP_OFF`), a typed address goes from our server to the Census Bureau's geocoder, and once its JavaScript loads `LocationEntry` shows a two-line hint under the label "Your address or ZIP code". An address saves the same `FL-nn|fips` district cookie through `LocationEntry`'s one `commit()`, always one of the four counties; a Florida address outside them gets the statewide ballot and saves nothing. These files the plan edits or reads are byte-identical to b3f0b86: `supervisors.ts`, `counties.ts`, `district-cookie.ts`, `notifications/`, `DeadlineBanner`, `BallotAtAGlance`, `HomeNews`, `NewsRail`, `KeyDatesRail`, `Glyphs`, `SharedBallot`, `BallotQuestions`, `JudicialRetentionNote`, `LinkRows`, `SectionNav`, `layout.tsx`, `globals.css`, `config.ts`, the freeze manifest. In the PR A files that did change (`page.tsx`, `LocationEntry.tsx`, `CoverageSummary.tsx`), every string this spec replaces or relies on, and every pin it names, is still there; only line numbers moved. What changed here:
> - Base commit 71db8fb. #171 edited the House-step hunk A7 rewrites, and A7 now spells out the `<LocationEntry>` element with the new `suggestEnabled={suggestEnabled}` prop (§3).
> - Heights: `{field.noun}` now renders "address or ZIP" and the hint adds a line, so with no saved county everything below the House step sits ≈67px lower on phones and ≈21–25px lower on desktop (k). Today's page is ≈6,345 / ≈3,720; after A+B ≈5,370 / ≈3,780. Saved-county numbers don't change (no field). A7's own saving doesn't change (§1, §3, §4).
> - Wording: §2.5 and Appendix B no longer imply the site has no address field; §2.2 says why the privacy line must keep "there"; §2.5 says the block branches on `voterLinks()`.
> - §2.8's `supervisorSite(…?.fips)` didn't type-check (it predates main); it is spelled out.
> - §8: `verify-address-resolve` and main's new pins join the must-stay-green list; manual step 10 pointed at a URL where `LocationEntry` never renders and is split; steps 1, 3, 7 and 12 cover the address field. §5 notes that main changed two frozen files. §9 item 9 gains the Census-county idea for after Nov 3, and item 11 (JavaScript-off wording) is new.

Contents: [1 Plan](#1-the-plan-in-one-paragraph) · [2 Resources block](#2-the-resources-block-sample-ballot-and-how-to-vote) · [3 Readability changes](#3-readability-changes) · [4 Page order](#4-new-page-order) · [5 Freeze timing](#5-freeze-timing-and-pr-plan) · [6 Neutrality](#6-neutrality-checks) · [7 Accessibility](#7-accessibility-checks) · [8 Verify](#8-verify-steps) · [9 Follow-ups](#9-follow-ups) · [10 Decisions](#10-founder-decisions) · [A Reconciliation](#appendix-a-how-the-two-judges-specs-were-reconciled) · [B Not doing](#appendix-b-not-doing)

---

## 1. The plan in one paragraph

Put the official tools a voter came for right under the key dates, then make the page shorter and easier to scan so the new block costs almost nothing. A new server-rendered block, **"Sample ballot and how to vote"**, sits 12px under the key-dates card. It links only to the four county Supervisors of Elections' own pages and the Florida Division of Elections: your sample ballot, where to vote on Election Day, early voting, and the mail ballot, whose row switches from "Request" to "Return" by date. With a saved district it shows that county's four links; without one it shows five closed rows (the four counties, then "Another Florida county"). It stores nothing. It takes the slot of the three count tiles, which become a one-row "On this page" jump list. The rest of PR A tightens the top of the phone page (24px main padding, a 32px two-line h1 grouped with a shorter dark lede, one line per key date at 14px), drops repeated copy, shows the 4 newest stories on phones and puts news before "What this guide covers", and ends the desktop news column's inner scroll. PR B, which touches frozen ballot files and must merge as one unit by **Fri Oct 16**, makes the ballot itself readable: one candidate name per line in dark text, the date said once, "Amendment N" as the heading with the official title quoted underneath, and the 546px judges box reduced to its heading, its "we don't cover these" sentence and a disclosure. PR C, separate and optional, stops the bars being fixed on short screens (landscape phones, 200% and 400% zoom). On a 375×812 phone with no saved county the page goes from **≈6,345px to about 5,370px** (9.1 to 7.7 screens of 694px; 6,278 measured at b3f0b86, plus 67 for main's address-field hint and wording), the official links start at the bottom of screen 1 instead of being absent, the first race row moves only from y 1,303 to about 1,395, the House step moves up from 3,312 to about 3,040 and news from ≈4,610 to about 3,460. On desktop the page stays about as long (≈3,780px with no county saved, ≈3,650 with one, against ≈3,720 today), but it has one scrollbar and the official links sit on the first screen.

Four founder decisions are in [§10](#10-founder-decisions).

---

## 2. The resources block: "Sample ballot and how to vote"

### 2.1 What it is and where it sits

- New server component `src/components/features/VotingResources.tsx`. No `"use client"`, no `cookies()`, no storage, no URL parameters, no third-party script. It links out; it never embeds a county tool (those load reCAPTCHA and Google Translate, which the privacy page rules out).
- Props: `{ countyFips?: string }`. `page.tsx` passes `saved?.countyFips`, the same validated value `DeadlineBanner` and `HomeNews` already get.
- Placement in `src/app/(public)/page.tsx`, replacing the `<DeadlineBanner/>` and `<BallotAtAGlance />` lines:

  ```tsx
  <div className="flex flex-col gap-3">
    <DeadlineBanner remindersHref={/* unchanged */} countyFips={saved?.countyFips} />
    <VotingResources countyFips={saved?.countyFips} />
  </div>
  <BallotAtAGlance />
  ```

  The dates and the actions read as one group (12px apart), then the column's 32px gap. The key-dates sun sticker only rises into the gap *above* its card, so nothing overlaps.
- Anchor `id="sample-ballot"`, so `/#sample-ballot` can be shared. No `scroll-mt-*` (design.md: the root `scroll-padding` already clears the bars).
- Renders nothing once a verified `election_day` row is before today (the same rule as `bannerDates`). With no verified rows at all it still renders: the links don't depend on dates, only the notes do.

### 2.2 Copy

Heading, both states: `<h2 id="sample-ballot-h" className="text-h2">Sample ballot and how to vote</h2>` (two balanced lines on phones, one from `sm`; the heights below include that).

**No saved county** (most visitors, and everyone outside the four counties)

> Your county’s Supervisor of Elections has your official sample ballot. Choose your county:

Then one bordered list of five closed rows, in `COVERED_COUNTIES` order: **Miami-Dade County · Broward County · Hillsborough County · Orange County · Another Florida county**. Each opens to four tiles. Under the tiles, one line: "Links open votemiamidade.gov, the Supervisor’s own site. We never see what you enter there." (the county's `site`), or "From the Florida Division of Elections. We never see what you enter there." in the last row. (The intro stays two lines on a phone; the privacy sentence sits where the voter is about to click.) Keep "there" in every version of that sentence: the House step's own field sends what's typed to our server and on to the Census Bureau, so a bare "we never see what you enter" would be untrue.

Footer: **Check your voter registration**.

**Saved county** (Orange shown)

> From the Orange County Supervisor of Elections, who runs your election. These links open voteorangefl.gov in a new tab; we never see what you enter there.

Then the four tiles directly (stacked on phones, 2×2 from `sm`). Footer: **Check your voter registration** · **Another county’s Supervisor of Elections**.

**The four tiles, same order and same words for every county**

| # | Label | Note (14px, `text-on-surface`) | Link |
|---|---|---|---|
| 1 | See your sample ballot | `Asks for {sampleBallotAsks}` | `sampleBallot` |
| 2 | Where to vote on Election Day | `November 3, 7 a.m. to 7 p.m.` (from the verified `election_day` row; polling hours are set by s. 100.011 for every county). On Nov 3: `Today, November 3, 7 a.m. to 7 p.m.` No row: no note. | `pollingPlace` |
| 3 | Early voting sites and hours | The county's own window, e.g. `October 19 to November 1`, **only when all four covered counties have verified early-voting rows** (otherwise no note for any county). Hours are never printed: Orange runs 8 to 8, the others 7 to 7. | `earlyVoting` |
| 4 | Mail row (dated, §2.4) | dated note | `mailRequest`, or `mailReturn` in the return phase |

**"Another Florida county" tiles** (`who` = Florida Division of Elections)

| # | Label | Note | Link |
|---|---|---|---|
| 1 | Find your county’s Supervisor of Elections | They have your official sample ballot | Supervisors directory |
| 2 | Where to vote on Election Day | Every county’s polling-place finder | Voter Precinct Lookup |
| 3 | Early voting sites and hours | `Every county: at least October 24 to October 31` (statewide verified rows) through Oct 31, then no note | Early voting and drop boxes |
| 4 | Mail row (dated, §2.4) | dated note | DoS vote-by-mail page, both phases |

### 2.3 Links (all checked 2026-10-12)

Supervisors' own pages only. Never a vendor tool (`voterfocus.com`, `electionsfl.org`, `omniballot.us`), never Vote411, and no Ballotpedia on the home page (the "Another view" card on /candidates stays as it is). Status: **200** = HEAD and GET returned 200 to curl; **403\*** = Cloudflare refuses curl but the page loaded in a real browser the same day.

| County (FIPS, `site`) | Key | URL | Status |
|---|---|---|---|
| Miami-Dade (12086, votemiamidade.gov) | sampleBallot | https://www.votemiamidade.gov/elections/voters/information.page | 200 |
| | sampleBallotAsks | "your name and date of birth" | confirm on the live form |
| | pollingPlace | https://www.votemiamidade.gov/elections/voters/information.page (the county's only lookup; say so in a code comment) | 200 |
| | earlyVoting | https://www.votemiamidade.gov/elections/voters/early-voting.page | 200 |
| | mailRequest | https://www.votemiamidade.gov/elections/voters/vote-by-mail.page | 200 |
| | mailReturn | https://www.votemiamidade.gov/elections/voters/vote-by-mail.page (lists the ways to return a ballot) | 200 |
| Broward (12011, browardvotes.gov) | sampleBallot | https://my.browardvotes.gov/Portals/ElectionLink/VoterSearch.aspx (the county's own subdomain, not OmniBallot) | 200 |
| | sampleBallotAsks | "your name, year of birth and house number" | confirm on the live form |
| | pollingPlace | https://browardvotes.gov/voters/precinct-finder | 200 |
| | earlyVoting | https://browardvotes.gov/voters/early-voting-ballot-return | 200 |
| | mailRequest | https://browardvotes.gov/voters/vote-mail-information | 200 |
| | mailReturn | https://browardvotes.gov/voters/early-voting-ballot-return | 200 |
| | (don't use) | browardvotes.gov/voters/sample-ballot | 404 |
| Hillsborough (12057, votehillsborough.gov) | sampleBallot | https://www.votehillsborough.gov/180/On-the-Ballot (personal lookup plus the All Races PDF) | 403\* |
| | sampleBallotAsks | "your name and date of birth" | confirm on the live form |
| | pollingPlace | https://www.votehillsborough.gov/159/Voting-Precincts | 403\* |
| | earlyVoting | https://www.votehillsborough.gov/171/Early-Voting | 403\* |
| | mailRequest | https://www.votehillsborough.gov/173/Request-a-Vote-By-Mail-Ballot | 403\* |
| | mailReturn | **Provisional:** https://www.votehillsborough.gov/291/2026-General-Election. A person opens /173 and /291 in a browser **by Oct 21** and keeps whichever explains returning a ballot and where to drop it off (if /173 does, use it for both). | 403\* |
| Orange (12095, voteorangefl.gov) | sampleBallot | https://voteorangefl.gov/whats-on-my-ballot/ (the sample ballot for any address in the county) | 200 |
| | sampleBallotAsks | "your address" | confirm on the live form |
| | pollingPlace | https://voteorangefl.gov/find-your-polling-place/ | 200 |
| | earlyVoting | https://voteorangefl.gov/vote-early/ | 200 |
| | mailRequest | https://voteorangefl.gov/request-a-mail-ballot/ | 200 |
| | mailReturn | https://voteorangefl.gov/secure-ballot-intake-stations-drop-boxes/ | 200 |
| State | `SUPERVISOR_DIRECTORY_URL` | https://dos.elections.myflorida.com/supervisors/ | 200 |
| | pollingPlace | https://dos.fl.gov/elections/for-voters/check-your-voter-status-and-polling-place/voter-precinct-lookup/ | 200 |
| | earlyVoting | https://dos.fl.gov/elections/for-voters/voting/early-voting-and-secure-ballot-intake-stations/ | 200 |
| | mail | https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/ | 200 |
| | `REGISTRATION_STATUS_URL` | https://registration.dos.fl.gov/CheckVoterStatus | 200 to GET (404 to HEAD) |

`SUPERVISOR_LIST_URL` (the contact hub) is **not** changed: `verify-supervisor-link.ts` pins it and the CountyPicker uses it.

### 2.4 Dated rows, day by day

All dates come from verified `election_event` rows via `homeElectionEvents()` (cached; `DeadlineBanner` already reads it in this render) and `easternToday()`. Copy states dates and never counts them down. The switch is by Florida calendar day.

| Florida day | Mail row label | Mail row note | Mail href |
|---|---|---|---|
| Oct 12 – Oct 21 | Request a mail ballot | By 5 p.m. on October 22 | `mailRequest` |
| Oct 22 | Request a mail ballot | By 5 p.m. today, October 22 | `mailRequest` |
| Oct 23 – Nov 2 | Return your mail ballot | It must be received by 7 p.m. on November 3, and can’t be handed in at an Election Day polling place. | `mailReturn` |
| Nov 3 | Return your mail ballot | It must be received by 7 p.m. today, November 3, and can’t be handed in at an Election Day polling place. | `mailReturn` |
| Nov 4 on | (block renders nothing) | | |
| no verified rows | Vote by mail | (none) | `mailRequest` |

Early-voting tile: the county window note shows only when all four covered counties have verified `early_voting_start`/`early_voting_end` rows (`COVERED_COUNTIES.every(c => countiesWithOwnDates(all).includes(c.fips))`). When they do, a county's tile is left out from the day after its own `early_voting_end` (Nov 2 for all four). When they don't, all four tiles stay, with no note, through Election Day. The statewide tile stays through Election Day; its "at least October 24 to October 31" note drops on Nov 1.

### 2.5 Saved-county behaviour

- The county comes from the existing district cookie (`saved?.countyFips`). Every way of saving a district (a ZIP, the district picker, and since #171 a typed street address) goes through `LocationEntry`'s one `commit()`, which saves a district and a covered county together, so the block needs no address-specific code. A Florida address outside the four counties gets the statewide ballot and saves nothing, so that visitor sees the five rows. `page.tsx` checks the pair against `getCoveredDistricts()` but accepts any well-formed value when that read fails, so the block branches on `voterLinks(countyFips)`, not on whether `countyFips` is set: `null` renders the five closed rows.
- Nothing new is stored: the district cookie stays the only thing the block depends on. An address typed in the House step is used to find the district and then dropped; the site still never keeps an address or ZIP (the reminder signup's ZIP is the existing, opt-in exception).
- Saved: that county's four tiles show directly, plus "Another county’s Supervisor of Elections" (the state directory) in the footer. To switch county the voter uses the district chip at the top, as today.
- Not saved: five closed rows; nothing is pre-opened, and which row was opened is never remembered. `name="sample-ballot-county"` on each `<details>` makes them an exclusive accordion where supported (Chrome 120+, Safari 17.2+, Firefox 130+); elsewhere several can be open at once, which is harmless.
- A district saved later (the chip, or the House step's address-or-ZIP field) changes the block on the next render, because the page already reads the cookie per request.

### 2.6 Data and helpers

**`src/lib/supervisors.ts`** (not frozen; keep relative `.ts` imports so plain-Node scripts can load it). Keep `SUPERVISOR_SITES`, `SUPERVISOR_LIST_URL`, `supervisorSite` and `supervisorLink` unchanged. Add:

```ts
export type VoterLinks = {
  site: string;              // host shown in copy, no www: "voteorangefl.gov"
  sampleBallot: string;
  sampleBallotAsks: string;  // "your address"
  pollingPlace: string;
  earlyVoting: string;
  mailRequest: string;
  mailReturn: string;
};
const COUNTY_VOTER_LINKS: Record<string, VoterLinks> = { /* §2.3, keyed by FIPS */ };
export function voterLinks(countyFips?: string | null): VoterLinks | null; // null unless covered
export const SUPERVISOR_DIRECTORY_URL = "https://dos.elections.myflorida.com/supervisors/";
export const REGISTRATION_STATUS_URL = "https://registration.dos.fl.gov/CheckVoterStatus";
export const STATE_VOTER_LINKS = { pollingPlace, earlyVoting, mail }; // §2.3
```

Header comment records the check date (2026-10-12), that vendor hosts are never linked, and that hours are never printed.

**`src/lib/voter-resources.ts`** (new, pure, plain-Node loadable). Imports: `import type { ElectionEvent } from "./notifications/election-events"` (type-only, so `server-only` is erased), `bannerLongDate` from `./notifications/banner.ts`, `countiesWithOwnDates` and `eventsForCounty` from `./notifications/schedule.ts`, `COVERED_COUNTIES` from `./counties.ts`, and the link data from `./supervisors.ts`.

```ts
export type MailBallotRow = { kind: "request" | "return" | "info"; label: string; note: string | null };
export function mailBallotRow(events: ElectionEvent[], today: string): MailBallotRow;

export type ResourceTile = {
  key: "sample-ballot" | "polling-place" | "early-voting" | "mail";
  label: string; note: string | null; href: string;
};
// countyFips null = the "Another Florida county" panel (state links).
// Returns null once a verified election_day row is before today.
export function resourceTiles(countyFips: string | null, all: ElectionEvent[], today: string): ResourceTile[] | null;
```

**`src/components/ui/Glyphs.tsx`**: add `ExternalGlyph` (an arrow leaving a box) and `ArrowDownGlyph`, in the existing `svg` idiom (20-unit grid, `currentColor`, 1.75 stroke, `aria-hidden`, `size-[1em]`). The Inter subsets the site serves don't include ↗, ↓ or ›, which is why the file exists. Stays non-client.

### 2.7 Markup and classes

```tsx
<section id="sample-ballot" aria-labelledby="sample-ballot-h" className="flex flex-col gap-2">
  <h2 id="sample-ballot-h" className="text-h2">Sample ballot and how to vote</h2>
  <p className="text-body-sm text-on-surface lg:max-w-[65ch]">{intro}</p>
  {/* saved: <TaskTiles/>  |  none: the five <details> rows */}
  <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">{footer links}</p>
</section>
```

- **TaskTiles**: `<ul className="grid gap-2 sm:grid-cols-2">`. Each `<li>` holds
  `<a href target="_blank" rel="noreferrer" className="flex h-full min-h-[48px] items-start justify-between gap-3 rounded-lg bg-primary-muted px-4 py-3 text-primary-hover ring-primary transition-shadow hover:ring-1">`
  with `<span className="flex flex-col gap-0.5"><span className="text-label">{label}</span>{note && <span className="text-body-sm text-on-surface">{note}</span>}</span>`, then `<ExternalGlyph />`, then `<span className="sr-only">, {who} (opens in a new tab)</span>` where `who` is "Orange County" or "Florida Division of Elections". The visible label comes first in the accessible name (WCAG 2.5.3). The sage fill is the retired count tiles' style, so the page gains no new visual language and the block doesn't read as one more white card.
- **County rows** (no saved county): `<div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">` holding five
  `<details name="sample-ballot-county" className="group/county">`
  `<summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-label text-on-surface hover:bg-background [&::-webkit-details-marker]:hidden">Miami-Dade County<span className="text-on-surface-muted group-open/county:rotate-180"><CaretGlyph /></span></summary>`
  `<div className="flex flex-col gap-2 px-4 pb-4"><TaskTiles …/><p className="text-body-sm text-on-surface-muted">Links open votemiamidade.gov, the Supervisor’s own site. We never see what you enter there.</p></div></details>`. No transition on the caret.
- **Footer links**: `className="inline-flex min-h-[24px] items-center gap-1 text-primary underline underline-offset-2 hover:text-primary-hover"`, new tab, `ExternalGlyph`, sr-only "with the Florida Division of Elections (opens in a new tab)".
- Size (k): phone ≈395px with no county (rows closed), ≈500px saved (four stacked tiles); desktop ≈365px no county, ≈255px saved (2×2). Opening a county row adds ≈390px on a phone, ≈185px on desktop.

### 2.8 Tie-ins

- `CoverageSummary.tsx` "Not covered" row: "has your official sample ballot." becomes "has your `<a href="#sample-ballot" className="underline underline-offset-2 hover:text-on-surface">`official sample ballot`</a>`." No other wording changes.
- `src/lib/notifications/config.ts`: `officialSources(county)` takes `office.url` from `supervisorSite` (relative imports `../counties.ts`, `../supervisors.ts`). `supervisorSite` takes a `string` and returns `string | null`, and `OfficialSource.url` is a `string`, so spell it out or `tsc` fails:

  ```ts
  const fips = COVERED_COUNTIES.find((c) => c.name === county)?.fips;
  const url = fips ? supervisorSite(fips) : null;
  // in the returned object:
  office: county && SUPERVISORS[county] && url ? { name: SUPERVISORS[county].name, url } : null,
  ```

  Office names stay in `config.ts`; its own `url` fields go (`SUPERVISORS` becomes `Record<string, { name: string }>`). This retires the two redirecting addresses (`miamidade.gov/global/elections/home.page`, `www.ocfelections.gov`) from the welcome email and the frozen YourRaces fallback card, so it merges in PR A, before the freeze.

---

## 3. Readability changes

Columns: px at 375 (phone) and 1280 (desktop), negative = shorter. Totals are rounded.

### PR A: not frozen, merge by Wed Oct 14

| # | Change | File(s) | Classes / copy | 375 | 1280 | Frozen |
|---|---|---|---|---|---|---|
| A1 | Resources block under key dates, grouped 12px | `VotingResources.tsx` (new), `supervisors.ts`, `voter-resources.ts` (new), `Glyphs.tsx`, `page.tsx` | §2 | +406 no county / +514 saved (k) | +377 / +269 saved (k) | No |
| A2 | Main padding | `page.tsx` | `py-8` → `py-5 lg:py-8` (64 → 24px on phones and tablets) | −80 (m −40 top) | 0 | No |
| A3 | h1 two lines on phones, grouped with the lede | `page.tsx` | h1 `text-h1 sm:text-display`; wrap h1 and the lede grid in `<div className="flex flex-col gap-3 lg:gap-6">`. h1 text unchanged (SITE_TITLE sync) | −78 (m) | 0 | No |
| A4 | Shorter, dark lede | `page.tsx` | `<p className="text-body text-on-surface sm:text-body-lg">See the races we cover and what each candidate says, quoted from their own campaign sites with every source linked. The same rules for every candidate. No ZIP, no account, no agenda.</p>` Keeps the pinned "See the races we cover"; no "full ballot". | −74 (e) | 0 (the hero walk sets the row) | No |
| A5 | Key dates: one line per date on phones, 14px | `KeyDatesRail.tsx`, `DeadlineBanner.tsx` | Rail text span: `flex flex-wrap items-baseline gap-x-2 sm:flex-col sm:flex-nowrap sm:items-center sm:gap-x-0`; label and date spans `text-caption` → `text-body-sm` (label keeps `font-semibold`). Banner `link` const `text-caption` → `text-body-sm` | −45 (m) | +6 (e) | No |
| A6 | Count tiles become an "On this page" jump list | `BallotAtAGlance.tsx` (keeps its name and export), `page.tsx` (`id="house-race"` on the House `<section>`) | `<nav aria-labelledby="on-this-page" className="flex flex-col gap-2">`; `<h2 id="on-this-page" className="text-label text-on-surface">On this page</h2>` with the unchanged lg-only magnifier beside it; `<ul className="flex flex-wrap gap-1.5">`; chip `inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 text-body-sm text-on-surface hover:bg-surface-muted` + `<ArrowDownGlyph/>` (10px side padding and 6px gaps keep the four chips to two rows at 375px; three at 320px). Chips: "5 statewide races" → `#statewide-races`, "3 ballot questions" → `#ballot-questions`, "U.S. House race" → `#house-race`, "Election news" → `#home-news` on an `<li className="lg:hidden">`. Zero-count chips drop; no races and no questions → `null`. Palm sticker removed (asset kept; note it retired in `docs/design/brand-assets-2026-10-11/placement-map.md`) | −8 (−152 tiles, +144 list) (k) | −39 (k) | No |
| A7 | Shorter House step, no repeated coverage note | `page.tsx`, `LocationEntry.tsx` | No-district `<p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">Your U.S. House race depends on where you live, so it isn’t in the list above. Give us your {field.noun} and we’ll add it. We have House races for {coveredCountyNames()} counties so far, and we keep only the district, never your {field.noun}.</p>` (import `coveredCountyNames` from `@/lib/counties`). With address lookup on (production) `{field.noun}` renders "address or ZIP"; the copy reads correctly either way. Home call site: `<LocationEntry submitLabel="Add my House race" addressEnabled={addressEnabled} suggestEnabled={suggestEnabled} coverageNote={false} districts={districts} />` (keep main's `suggestEnabled`). `coverageNote`: new prop, default `true`, wraps the "Full statewide coverage isn&rsquo;t available yet…" `<p className="text-body-sm …">` (YourRaces passes nothing, so it is unchanged). Don't move `const field = locationFieldCopy(addressEnabled);` in `page.tsx` or touch `LocationEntry`'s label, hint or input block (all pinned). Saved branch: delete only "The statewide races and amendments above are the same for every Florida voter."; keep `{NOT_COVERED_SENTENCE}` and "See your races for {saved.district}"; add `lg:max-w-[65ch]` to its two paragraphs | −150 (m −163; unchanged on 71db8fb: before and after both gain the address hint) | −80 (e) | No |
| A8 | News: 4 newest on phones, before the coverage card; desktop column in normal flow | `NewsRail.tsx`, `page.tsx` | `const PHONE_SHOW = 4;` `<li className={n >= PHONE_SHOW ? "max-lg:hidden" : undefined}>` (`SHOW` stays 8; same cap for every region filter, newest first). Move `<CoverageSummary hasDistrict={Boolean(saved)} addressEnabled={addressEnabled} />` (exact string, pinned) to be the first child of the row-2 div, before its wave. Aside class becomes `min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border-strong lg:pl-6` (drop `lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto`). Rewrite the grid comment | −453 (m) | 0 (547px of news leaves the inner scroll; one scrollbar) | No |
| A9 | Coverage card links the block, loses a repeated caption | `CoverageSummary.tsx` | Link "official sample ballot" to `#sample-ballot` (§2.8). Remove the trailing `<p className="text-caption …">Every candidate in a race we cover … How we stay fair</p>`; the page-end caption keeps "How we stay fair · Privacy". h2, cat and the six pinned "Not covered" needles unchanged | −48 (e) | −40 (e) | No |
| A10 | Official office links from one map | `config.ts` | §2.8 | 0 | 0 | No (feeds frozen YourRaces; merge pre-freeze) |
| A11 | Desktop line length | `page.tsx`, `VotingResources.tsx` | `lg:max-w-[65ch]` on the House paragraphs and the block intro (86–93 characters per line today; target 60–75) | 0 | +20 (e) | No |
| A12 | Verify scripts | `scripts/verify-voter-links.ts` (new), `scripts/verify-home-layout.ts` | §8 | 0 | 0 | No |
| | **After PR A** | | | **≈5,870** (≈5,910 saved) | **≈4,030** (≈3,900 saved) | |

### PR B: frozen-adjacent ballot rows, all or none, merge by Fri Oct 16

| # | Change | File(s) | Classes / copy | 375 | 1280 | Frozen |
|---|---|---|---|---|---|---|
| B1 | Candidate names one per line, date said once, party key behind a disclosure | `SharedBallot.tsx` | Delete `candidateList()`. `sharedDate` = `formatDate` of the one `generalDate` when every race shares it, else `null`. Intro `<p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">On every Florida ballot{sharedDate ? ` on ${sharedDate}` : ""}, whatever your ZIP or party, including no party.</p>`. Legend: `<details className="group/legend"><summary className="inline-flex min-h-[24px] w-fit cursor-pointer list-none items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover [&::-webkit-details-marker]:hidden">What the party codes mean <span className="group-open/legend:rotate-180"><CaretGlyph/></span></summary><p className="mt-1 text-body-sm text-on-surface-muted lg:max-w-[65ch]">{legend}</p></details>`. Row children: `<ul className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">`, one `<li className="text-body leading-snug text-on-surface sm:whitespace-nowrap">{c.name}{party && <span className="text-body-sm text-on-surface-muted"> ({party})</span>}</li>` per candidate in ballot order. Aside stays the status only. Per-row "General election {date}" only when `sharedDate` is null. Keep `<h2 className="text-h2">Statewide races</h2>` and a propless `<BallotQuestions />` | −55 (e: names +26, legend −60, intro −21) | −130 (e) | **Yes** |
| B2 | "Amendment N" heading, verbatim title underneath | `BallotQuestions.tsx` (renders on frozen YourRaces) | `title={`Amendment ${m.number}`}`; first child `<p className="text-[0.9375rem] leading-[1.5] text-on-surface">{m.official_title}</p>` (ALL CAPS as stored, word for word), then the threshold `<p>` unchanged. Intro `<p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">Each needs a supermajority to pass, not a simple majority.</p>`. Fix the stale header comment: SharedBallot passes no county, on purpose (verify-judicial-retention) | −65 (e; m −44 titles) | +45 (e) | No, ships in B |
| B3 | Judges note: heading and scope sentence visible, links behind a disclosure | `JudicialRetentionNote.tsx` | Keep the aside, its box classes and `<h3 className="text-label">Judges on your ballot</h3>`. Visible `<p className="text-body-sm text-on-surface">Your ballot also asks whether to keep some judges in office. Know Your Vote doesn’t cover these questions.</p>`. Then `<details className="group/judges"><summary className="inline-flex min-h-[32px] w-fit cursor-pointer list-none items-center gap-1 text-body-sm font-semibold text-primary underline underline-offset-2 hover:text-primary-hover [&::-webkit-details-marker]:hidden">Who is on the ballot, with links <span className="group-open/judges:rotate-180"><CaretGlyph/></span></summary><div className="mt-2 flex flex-col gap-2">{existing <ul>, unchanged}{existing closing "The Florida Division of Elections …" body-sm <p>}</div></details>`. Keep `const appeals = appealsForCounty(county);`. Drop "The links go to the state’s list…". Closed for every visitor on every page | −390 (m −399) | −165 (e) | **Yes** |
| B4 | Row status at 14px | `LinkRows.tsx` (renders on frozen YourRaces, CountyRaces) | aside `text-caption` → `text-body-sm`; keep `text-primary after:absolute after:inset-0` | 0 | 0 | No, ships in B |
| | **PR B total** | | | **≈ −510** | **≈ −250** | |

**A + B:** phone ≈ **5,370px** no county (≈5,410 saved), down from ≈6,345 on main 71db8fb (6,278 measured at b3f0b86 plus 67 for the address hint and wording; k, rounded). Desktop ≈ **3,780px** no county / ≈3,650 saved, about today's ≈3,720 (3,696 at b3f0b86 plus 25), with one scrollbar.

### PR C: fixed chrome on short screens (optional, its own PR)

| # | Change | File(s) | Classes | 375×812 | Short screens | Frozen |
|---|---|---|---|---|---|---|
| C1 | Variant | `globals.css` | after `@import "tailwindcss"`: `@custom-variant short (@media (max-height: 31.25rem));` | 0 | | No |
| C2 | Scroll padding | `globals.css` | in the `html` rule after `@variant md {}`: `@media (max-height: 31.25rem) { scroll-padding-top: calc(8px + env(safe-area-inset-top)); scroll-padding-bottom: calc(8px + var(--kyv-overlay-bottom, 0px)); }` | 0 | | No |
| C3 | Bars in flow | `SectionNav.tsx` | header `short:static`; nav `short:static short:shadow-none` (below md the nav then renders in DOM order at the top; say so in the comment) | 0 | frees 118px: 26% of 640×450 (200% zoom), 46% of 320×256 (400%), 30% of a 390px-tall landscape phone | No |
| C4 | Body padding | `layout.tsx` | body adds `short:pt-[env(safe-area-inset-top)] md:short:pt-0 short:pb-[var(--kyv-overlay-bottom,0px)]` | 0 | | No |
| C5 | 5px masthead overlap | `layout.tsx` | measure the phone header at 375 first; if 45px, `pt-[calc(40px+…)]` → `pt-[calc(45px+…)]` | +5 | | No |

No hide-on-scroll and no motion. The cookie banner stays fixed; the `--kyv-overlay-bottom` term stays everywhere.

---

## 4. New page order

### Phone 375×812, PRs A+B, no saved county (y = top of block; usable height 694 per screen)

| # | Block | Today y | After y (e) |
|---|---|---|---|
| 1 | Fixed top bar (Donate, district chip), masthead dateline | 0 | 0 (unchanged) |
| 2 | h1 "Florida candidates, in their own words." 32px, 2 lines | 170 | ≈130 |
| 3 | Lede, 5 lines of dark 16px, 12px under the h1 | 334 | ≈216 |
| 4 | Key-dates card, one line per date at 14px | 568 | ≈376 |
| 5 | **Sample ballot and how to vote** (h2 just above the bottom nav on screen 1; rows on screen 2) | absent | ≈705 |
| 6 | On this page: 2 rows of chips | (tiles 954) | ≈1,135 |
| 7 | Statewide races: one-line intro, "What the party codes mean", first race row | 1,106 (row 1,303) | ≈1,275 (row ≈1,395) |
| 8 | Ballot questions, "Amendment N" rows, judges box closed | ≈2,000 | ≈2,200 |
| 9 | Zigzag with the 88px seated reader (unchanged art) | 3,256 | ≈2,985 |
| 10 | Add your U.S. House race (`#house-race`) | 3,312 | ≈3,040 |
| 11 | Florida election news, 4 newest | ≈4,610 | ≈3,460 |
| 12 | What this guide covers (wave, cat, card with the sample-ballot link) | ≈3,850 | ≈4,230 |
| 13 | Wave, reminder signup (when live), install card, "How we stay fair · Privacy" | ≈5,820 | ≈4,950 |
| 14 | Footer | | total ≈5,370 (was ≈6,345) |

Heights are from the mockup (k), whose top half matches the dev server to the pixel (h1 170, lede 334 today). "Today" above the House step was measured at b3f0b86 and is unchanged on 71db8fb; below it, it is that measurement plus 67px for main's address hint and wording. The hint arrives with the page's JavaScript, so on phones everything below the House step moves down ≈46px after load (main's behaviour, far below screen 1; after A8 it moves the news). Measure after load. With a saved county the block is ≈110px taller (four stacked tiles), so everything down to the House step moves down ≈110px; that step has no field then, and the page ends at ≈5,410. PR A alone: ≈5,870 (≈5,910 saved).

### Desktop 1280×900, PRs A+B

| # | Left column | y (e) |
|---|---|---|
| 1 | h1 40px; lede (18px, dark) beside the hero walk (row unchanged, ≈300px) | 182 |
| 2 | Key-dates card, horizontal rail at 14px | ≈590–776 |
| 3 | Sample ballot and how to vote: five rows (≈365px) or, saved, a 2×2 tile grid (≈255px). On the first screen | ≈790 |
| 4 | On this page: one row of 3 chips (no News chip at lg), magnifier beside the label | ≈1,190 |
| 5 | Statewide races, names flowing inline in ballot order. First race row ≈1,400 no county / ≈1,290 saved (today 1,072) | ≈1,285 |
| 6 | Ballot questions, judges closed; zigzag with the 150px sitter; House step with the tote figure | |
| 7 | Row 2: What this guide covers (same place as today), wave, cards, caption | |
| R | Right column: Florida election news, 8 stories, `border-l`, scrolls with the page (no sticky, no inner scroll) | 182 |

Total ≈3,780 no county / ≈3,650 saved (today ≈3,720 on 71db8fb: 3,696 measured at b3f0b86, plus 25 for the address hint and wording). The hint fits beside the 160px tote figure, so on desktop only the House paragraph's extra line (+21) remains after A7. Desktop y values are the mockup's less 44px: its fallback display font wraps the 40px h1 to two lines.

---

## 5. Freeze timing and PR plan

| When | What |
|---|---|
| Mon Oct 12 | Founder reads this spec and answers §10. Build PR A from `main` 71db8fb or later. |
| Tue Oct 13 | PR A review. A person opens all 24 county URLs and 5 state URLs on a phone (Hillsborough refuses scripts) and confirms each "Asks for" string. |
| **Wed Oct 14** | **PR A merged** (mail-ballot request links live 8 days before the Oct 22, 5 p.m. deadline). Includes `config.ts`, which feeds the frozen YourRaces fallback card. |
| **Thu Oct 15** | **Founder approves PR B as one unit**. |
| **Fri Oct 16** | **PR B merged.** If it isn't merged by end of day, close it and redo it after Nov 4. Never merge part of it: half would leave races and amendments styled differently. PR A stands alone. |
| Sat Oct 17 | Freeze-copy PR writes the sha256 hashes (`node scripts/verify-freeze.ts --write`). This, not the cut-off, is the real deadline. |
| Sun Oct 18 04:00 UTC | Content freeze starts (`FREEZE_WINDOW`). Frozen files take corrections only. |
| Oct 19 | Early voting opens in all four counties: re-check the county links. |
| by Oct 21 | Decide Hillsborough's `mailReturn` (/173 or /291). |
| Oct 23 | The mail row switches to "Return": check it live in all five panels. |
| Nov 1 | Last early-voting day: re-check links. |
| Nov 4 | The block renders nothing. Redo PR B here if it slipped. |

PR C: any time after A. It is not freeze-bound, but it changes every page's chrome; if it isn't merged by Oct 23, hold it until after Nov 3.

Which files are frozen: `SharedBallot.tsx` and `JudicialRetentionNote.tsx` (in `FROZEN_FILES`). `BallotQuestions.tsx`, `LinkRows.tsx` and `LocationEntry.tsx` aren't hashed but render on the frozen YourRaces and CountyRaces, so their changes land before the hashes: B2 and B4 ship in PR B; A7's `LocationEntry` prop defaults to today's behaviour, so YourRaces is unchanged. Everything else (`page.tsx`, `VotingResources`, `BallotAtAGlance`, `KeyDatesRail`, `DeadlineBanner`, `NewsRail`, `CoverageSummary`, `supervisors.ts`, `config.ts`, `SectionNav`, `layout.tsx`, `globals.css`) is free to change. No `globals.css` type tokens change: that would restyle every frozen page.

Main's address lookup (#171/#172) changed two frozen files, `YourRaces.tsx` and `src/lib/resolve.ts`. This plan edits neither, and both changes land before the hashes are written. Any further address-lookup fix that touches either must merge before the Sat Oct 17 hash write, or ship as a correction during the freeze. Fixes to `LocationEntry.tsx`, `address-text.ts`, `address-lookup.ts`, `census-block.ts` or `geocode.ts` don't trip the hash check, but they still render on frozen YourRaces.

---

## 6. Neutrality checks

- **Official sources only.** The block links the four county Supervisors' own pages and the Florida Division of Elections. No vendor tools, no Vote411 (its operator took positions on Amendments 1 and 2), no Ballotpedia on the home page (D6 and Q2 stand; the /candidates "Another view" card stays).
- **Every county the same.** Same four tiles, same labels, same order, same style. `verify-voter-links` enforces all six link keys for every covered county. Counties appear in `COVERED_COUNTIES` order, all closed. The only preselection is the visitor's own saved county.
- **County facts are the county's.** The "Asks for …" line states each county's own form. The early-voting window shows for all four counties or for none. No hours are printed, because one line can't be true for Orange (8 to 8) and the others (7 to 7). Election Day polling hours are the same for every county by law, so they print for all.
- **Dates stated, never counted.** Every date comes from verified rows; "today" appears only on the date itself, as the banner already does. `verify-voter-links` and `verify-home-layout` reject "days to/until/left".
- **Every candidate the same.** One line each, ballot order, same size and colour, party as a plain-text code. Every name printed, nothing truncated, no "and N more", no race collapsed or opened first. The jump list names sections, never a race or a candidate (no "Start here: Governor").
- **Amendment titles verbatim.** The official ALL-CAPS title is quoted word for word; only its size and position change.
- **Judges.** Collapsed identically for every visitor on every page; the visible sentence still says they're on the ballot and not covered (founder decision 10). The home page still passes no county, so everyone gets the full list (`verify-judicial-retention`).
- **News.** The phone cap is time only: the 4 newest, the same for every region filter. If 4 stories look lopsided, run news-fairness.md §2 first; a real skew is shown with its context, never padded or trimmed. The "Jolly makes campaign stop in Coconut Creek" row in the home column (no `candidate_id`) is a pipeline tagging gap to fix upstream (§9), not by editing the column.
- **No new storage.** No cookie, localStorage key or URL parameter; `verify-no-stored-location` stays green.

## 7. Accessibility checks (WCAG 2.2 AA)

- **Targets (2.5.8):** tiles and county summaries ≥48px; jump chips 40px; judges summary 32px; legend summary and footer links 24px. Nothing new relies on the spacing exception.
- **Text size:** no must-read text below 14px (design.md). Key-date labels and dates, banner links and row status rise from 13px to 14px.
- **Contrast** (from the tokens): `primary-hover` on `primary-muted` ≈6.8:1; `on-surface` on `primary-muted` ≈12.9:1; `on-surface-muted` on white 6.7:1; jump chips ink on white.
- **Headings:** h1 → h2 Sample ballot and how to vote → h2 On this page → h2 Statewide races → h3 offices → h2 Ballot questions → h3 "Amendment N" → h3 Judges on your ballot (outside the `<details>`, so it stays in the headings list) → h2 House → h2 News → h2 What this guide covers. The capitals title is no longer a heading.
- **Links:** new-tab links carry a decorative `ExternalGlyph` and sr-only text naming the county ("…, Orange County (opens in a new tab)"), so a links list never shows four bare "See your sample ballot". In-page chips use `ArrowDownGlyph`, inside `<nav aria-labelledby="on-this-page">`, and never ↗, so they don't read as leaving the page.
- **Disclosures:** native `<details>`/`<summary>`: keyboard (Enter/Space), announced expanded/collapsed, works with JavaScript off. Find-in-page opens closed panels in Chrome 97+ and Firefox 139+; Safari is unverified, so every summary names its county or its subject.
- **Focus and anchors:** no `scroll-mt-*`; the root `scroll-padding` keeps jumps and focus clear of the bars. PR C makes the bars static at ≤500px tall (2.4.11 Focus Not Obscured, 1.4.10 Reflow).
- **Reflow:** single column below `sm`, tiles stack, no fixed widths, no long URLs shown as text; check `scrollWidth === 320` at 320px.
- **Motion:** none added; carets rotate without a transition.

---

## 8. Verify steps

### New `scripts/verify-voter-links.ts` (plain node, relative imports; `verify-all.mjs` picks up `verify-*.ts`)

1. Every `COVERED_COUNTIES` FIPS has a `VoterLinks` entry with all seven keys non-empty; no other FIPS has one. `voterLinks("12099")`, `voterLinks(undefined)` and `voterLinks("")` are `null`, and `VotingResources.tsx` chooses tiles or rows by `voterLinks(countyFips)` (so a well-formed but uncovered cookie, which `page.tsx` lets through when the districts read fails, gets the five rows).
2. Every URL is `https`. Each county's hosts match its own domain: `/(^|\.)votemiamidade\.gov$/`, `/(^|\.)browardvotes\.gov$/`, `/(^|\.)votehillsborough\.gov$/`, `/(^|\.)voteorangefl\.gov$/`; `site` is the suffix of `supervisorSite(fips)`'s host.
3. State URLs are on `dos.fl.gov`, `dos.elections.myflorida.com` or `registration.dos.fl.gov`.
4. No `voterfocus.com`, `electionsfl.org`, `omniballot.us`, `vote411` or `ballotpedia` in the code of `supervisors.ts`, `voter-resources.ts` or `VotingResources.tsx`. `SUPERVISOR_LIST_URL` is unchanged.
5. Day-by-day walk, 2026-10-12 → 2026-11-04, over fixture rows (verify-home-layout's `EVENTS` plus `ballot_return_deadline`, and Oct 19–Nov 1 rows for all four counties): Oct 12–21 request + "on October 22"; Oct 22 "today, October 22"; Oct 23–Nov 2 return + "on November 3"; Nov 3 "today"; Nov 4 `resourceTiles` → `null`. Miami-Dade's early tile reads "October 19 to November 1" through Nov 1 and is gone Nov 2; with only three counties' rows, no county shows a window note; the statewide panel reads "at least October 24 to October 31" through Oct 31. No rows: "Vote by mail", no notes.
6. No output and no code (comments stripped) matches `/\bdays? (?:to|until|left)\b/i`.
7. `VotingResources.tsx` has no `"use client"`, `localStorage`, `document.cookie`, `cookies(` or `searchParams`; every `<a` has `target="_blank"`, `rel="noreferrer"` and "(opens in a new tab)"; it has `name="sample-ballot-county"`; no ↗, ↓ or › characters in it, `BallotAtAGlance.tsx`, `SharedBallot.tsx` or `JudicialRetentionNote.tsx`.
8. `page.tsx` renders `<VotingResources countyFips={saved?.countyFips} />` exactly once, after `<DeadlineBanner` and before `<SharedBallot />`, and has `id="house-race"`. `BallotAtAGlance.tsx` has `<nav aria-labelledby="on-this-page"` and the four hrefs. `config.ts` calls `supervisorSite(` and contains neither `ocfelections.gov` nor `miamidade.gov/global/elections`.

### Additions to `scripts/verify-home-layout.ts`

- Add `VotingResources.tsx` and `src/lib/voter-resources.ts` to the "no countdown copy" file list.
- The news aside's class has no `overflow-y-auto` and no `lg:sticky`; `page.indexOf("<HomeNews") < page.indexOf("<CoverageSummary")`; `NewsRail.tsx` has `PHONE_SHOW = 4`, `SHOW = 8` and `max-lg:hidden`.
- Keep the `<BallotAtAGlance />` check (update its name to "the jump list").

### Must stay green unchanged

`verify-home-coverage` ("See the races we cover", "Give us your {field.noun}", `{NOT_COVERED_SENTENCE}`, the exact `<CoverageSummary …/>`, the six "Not covered" needles, `locationFieldCopy(addressEnabled).noun`; new on main: `addressEnabled = addressEntryEnabled()` and `locationFieldCopy(addressEnabled)` in `page.tsx`, `const takesAddress = addressEnabled && hydrated;` and `locationFieldCopy(takesAddress)` in `LocationEntry`, and the address copy's "city or ZIP" hint), `verify-entry-flow` ("Each needs a" and "The Florida Division of Elections" in body-sm `<p>`s, exact h2s, `text-primary after:absolute after:inset-0`, no ✓/▾; main changed two `LocationEntry` checks, the hint-aware `aria-describedby` and `const combobox = suggestEnabled ?`, both in the input block A7 leaves alone), `verify-address-resolve` (new on main; reads `LocationEntry.tsx` and `resolve.ts`), `verify-judicial-retention` (propless `<SharedBallot />` and `<BallotQuestions />`, `<JudicialRetentionNote county={county} />`, `{a.county} ballots:{" "}`), `verify-shared-ballot` (no client component under SharedBallot; `<SharedBallot` before `saved ?`), `verify-supervisor-link`, `verify-official-sources`, `verify-reminder-schedule` (config.ts still loads), `verify-no-stored-location` (now also pins /privacy's Census wording, which PR A doesn't touch), `verify-freeze`, `verify-freeze-rules`.

### Commands (arm64 Node 22 on PATH)

```
node scripts/verify-voter-links.ts
node scripts/verify-all.mjs
npx tsc --noEmit
npm run lint
npm run build
```

### Manual, on the dev server

1. Measure page height and section tops at 375×812, 390×844, 320×640 and 1280×900, with no district and with Orange and Miami-Dade saved, after the page's JavaScript has loaded (the address hint arrives with it). `document.documentElement.scrollWidth === 320` at 320.
2. Five rows render closed; Enter/Space open them; opening Broward closes Miami-Dade (Chrome 120+, Safari 17.2+). Each tile opens a new tab on the right host.
3. Choose FL-10 in Orange with the chip: only Orange's four tiles plus "Another county’s Supervisor of Elections"; the mail tile reads "Request a mail ballot / By 5 p.m. on October 22". Then forget the district, type an Orange County street address with its ZIP in the House step, come back to `/`, and confirm only Orange's four tiles show. A Florida address outside the four counties saves nothing: `/` still shows the five rows.
4. Keyboard: Tab reaches every tile with a visible ring; nothing focused sits under a bar or the cookie banner.
5. VoiceOver rotor: headings list in the order of §7; links list names each county.
6. Find-in-page "Broward" in Chrome, Firefox and Safari.
7. JavaScript off: the block, the jump list and every disclosure work. Expected, from main: the House paragraph says "address or ZIP" while the field reads "Your ZIP code" and takes a ZIP only until its JavaScript loads (§9 item 11).
8. Fixture days Oct 22, 23, Nov 1, 2, 3 and 4 (the verify walk): read the mail and early-voting tiles.
9. 1280×900: the aside is `position: static`, overflow visible, 8 stories; 3 chips; the magnifier beside "On this page"; the sun clears the 12px gap.
10. After PR B, `/candidates?view=races&district=FL-27&county=12086`: "Amendment N" rows with verbatim titles, judges closed with the h3 visible, row status at 14px. Then `/candidates?view=races` with nothing saved: the `LocationEntry` coverage note and the address hint still show (YourRaces renders `LocationEntry` only with no result, out of coverage or a split ZIP, never on the district page above).
11. axe at 375 and 1280: no new violations, every target ≥24px.
12. PR C: 375×812 unchanged; 640×450, 320×256 and 844×390 bars in flow; 1280×900 unchanged; all with the cookie banner open. At 844×390 and 640×450, in the home House step, type an address with no city or ZIP and press Enter: the input and its `role="alert"` message are both visible and not under a bar.

---

## 9. Follow-ups

1. **Hillsborough return link** (by Oct 21): open /173 and /291 in a browser; set `mailReturn`.
2. **Link re-checks**: Oct 19, Oct 21, Oct 23, Nov 1. Add the 24 county and 5 state URLs to the weekly re-check routine until Nov 3.
3. **0043 county early-voting rows**: confirm they are verified (F4). Until they are, the key-dates card tells no-county visitors Oct 24–31 while all four counties open Oct 19, and the block shows no window note.
4. **"Jolly makes campaign stop in Coconut Creek"** reached the home column because its row has no `candidate_id`. A tagging gap in the news pipeline (AGENTS.md: fix pipeline gaps); fix it there, not in the column.
5. **Broward's mail-ballot page** still opens with the August request deadline, and Orange's six other-language ballots say "COMING SOON". Theirs to fix; the founder may want to email Broward's office.
6. **13px text left on the home page**: the news filter pills and `NewsStoryCard` meta lines. Both render on /news and candidate pages; raise to 14px after Nov 4.
7. **Welcome email and `VotingInfo`**: "Your polling place and sample ballot:" could point at `voterLinks().sampleBallot` instead of the Supervisor's home page. Changes a sent email and a frozen page's card; after Nov 4.
8. **Desktop placement**: with no county saved, the first race row moves from y 1,072 to ≈1,400. If that matters after launch, try the block at the top of the right column at lg (needs a second render for phones). Not now.
9. **67-county directory** (unmerged commit `1bde01b` on `claude/election-office-lookup-af7473`): revisit after Nov 3, refreshed from the 2026-09-24 DoS spreadsheet; check with the CountyPicker owner first. Since #171 the Census answer already names the county for any Florida address (the block GEOID's first five characters), but `/api/address/resolve` drops it outside the four counties (`resolveStatewideOnly`, "no county or district is claimed"). With the directory, that statewide answer could link the voter's own Supervisor, shown inline and not stored. Not before Nov 3: the cookie needs a district, and /privacy lists its value exactly.
10. **2028 cycle**: `COUNTY_VOTER_LINKS` is 2026 data; re-check every URL before the next election uses it.
11. **House paragraph before the field's JavaScript loads** (main's behaviour, kept by A7): `page.tsx` takes `{field.noun}` from `addressEntryEnabled()` alone, so it always says "address or ZIP", while `LocationEntry` reads "Your ZIP code" and accepts only `\d{5}` until hydrated (so a typed address never rides in a GET URL). With JavaScript off the paragraph asks for something the field refuses. Founder call whether to match them; not in PR A (`verify-home-coverage` needs `Give us your {field.noun}` on the page).

---

## 10. Founder decisions

**Decided 2026-10-13: 1 (a), 2 (a), 3 (a), 4 (a).** PR A (not frozen) and PR C (bars) go in as soon as each passes review. PR B (frozen ballot rows) goes in as one unit, merged by Fri Oct 16. Since this spec was written, the location field became address-only (PR #175), so A7's House step reads "address". The motion reading D2 (a) applies too: nothing moves on phones except colour changes and loading indicators.

Each has a recommended option. The HTML page has the same four as a form with "Copy as markdown".

1. **Count tiles → resources block + "On this page" list.**
   - **(a) Recommended:** replace the "On every Florida ballot" tiles (layout pass item 3, approved 10-11) with "Sample ballot and how to vote", and turn the tiles into a jump list that keeps the counts: "5 statewide races · 3 ballot questions · U.S. House race · Election news" (news on phones only). The "17 candidates in them" total and the ≥1400px palm sticker go; the magnifier stays.
   - (b) Keep the tiles under the new block: about +150px on phones, and still no quick way to the House step or the news.
2. **PR B, the frozen ballot rows, as one unit.**
   - **(a) Recommended:** approve by Thu Oct 15 so it merges Fri Oct 16: one name per line in dark text (inline on desktop), the date said once, the party key behind "What the party codes mean", "Amendment N" with the official title quoted underneath, the judges note's heading and "we don't cover these" sentence visible with the court links behind "Who is on the ballot, with links", row status at 14px. About −510px on phones.
   - (b) Defer all of it to after Nov 4. PR A ships on its own either way. Never part of it.
3. **News layout.**
   - **(a) Recommended:** phones show the 4 newest stories (same cap for every region filter, "All election news" kept) and news moves above "What this guide covers"; on desktop the column stops being a sticky box with its own scrollbar and scrolls with the page, keeping 8 stories. −453px on phones; fixes the main desktop scroll complaint.
   - (b) Phones only: keep the sticky inner-scroll column on desktop.
   - (c) Leave news as it is.
4. **Phone bars.**
   - **(a) Recommended:** keep the 45px top bar (the district chip's only home) and the bottom nav fixed on normal screens, with no hide-on-scroll; make both static only on screens 500px tall or less (landscape phones, 200% and 400% zoom), in PR C, revertible on its own.
   - (b) Hide the top bar on scroll down, show it on scroll up: saves about 5% of the screen but adds motion on top of Safari's own toolbars.
   - (c) Leave the bars as they are.

---

## Appendix A: How the two judges' specs were reconciled

Order of precedence: neutrality, then readability evidence, then build risk. J1 = judge 1's final spec, J2 = judge 2's.

| # | Question | J1 | J2 | Call | Why |
|---|---|---|---|---|---|
| 1 | Early-voting note per county | County window from its rows; tile dropped after its end | No note | J1, gated: the window shows for all four counties or none | Neutrality (all or none), then readability (no-county visitors otherwise only see the statewide Oct 24–31) |
| 2 | Orange sample-ballot link | `/sample-ballots/` hub | `/whats-on-my-ballot/` | J2 | Neutrality: every county's first tile is the page where you get *your* ballot; fewer steps |
| 3 | Broward "asks for" | date of birth | year of birth | J2 | Accuracy: the research records name, birth year and house number |
| 4 | Return-phase note | "can't be dropped off at a polling place" | "…at an Election Day polling place" | J2 | Accuracy: early-voting sites take mail ballots at intake stations |
| 5 | Mail labels | "Request a vote-by-mail ballot" | "Request a mail ballot" | J2 | Readability: shorter, and the rail above says "mail-ballot" |
| 6 | Polling tile label | "Find your polling place" | "Where to vote on Election Day" | J2 | Readability: separates it from early-voting sites |
| 7 | Polling tile note | "Election Day … 7 a.m. to 7 p.m." | none | J1 (date from the verified row) | Readability: when beside where; the hours are statutory and identical for every county |
| 8 | Tile note colour | `on-surface` | `on-surface-muted` | J1 | Readability: the audit found 62% of the page grey; the notes carry deadlines |
| 9 | Saved-county intro | names the county's host | generic | J1 | Readability and trust: says where the click goes, the same way for every county |
| 10 | Glyphs | ↗ › ↓ characters | SVG `ExternalGlyph`, `ArrowDownGlyph`, `CaretGlyph` | J2 | Build risk: the Inter subset lacks them (Glyphs.tsx exists for this) |
| 11 | Pure helper | `voter-resources.ts` (all tiles) | `mail-ballot-line.ts` (mail only) | One file, `src/lib/voter-resources.ts`, with `mailBallotRow` and `resourceTiles` | Build risk: one place to walk day by day |
| 12 | `<details name>` | `kyv-sample-ballot-county` | `kyv-county` | `sample-ballot-county` | Build risk: no `kyv.`-style prefix that reads like a storage key |
| 13 | Lede | "The same rules for every candidate." | "Same rules for everyone." | J1 | Accuracy: the rules apply to candidates |
| 14 | Saved House paragraph | unchanged | drop "same for every Florida voter" | J2 | Readability: the fifth repeat; not pinned |
| 15 | Coverage caption "Every candidate … How we stay fair" | remove | keep | J1 (remove) | Readability: repeats the lede and the closing caption; not pinned |
| 16 | Rail at `sm` | `sm:items-stretch` | `sm:items-center` | J2 | Build risk: keeps today's centred desktop rail |
| 17 | Jump chips | 40px, "Election news" | 32px, "News" | 40px with 10px sides and 6px gaps, "Election news" | Readability on phones (thumb targets) while staying two rows at 375px; the label matches the section's h2 |
| 18 | Candidate count in rows | dropped | moved into the aside | Dropped | Readability: the aside would wrap on 4 of 5 rows at 375 (+≈84px); a `<ul>` already announces "list, 8 items" and a stacked list shows the count. Equal for every race either way |
| 19 | Amendment title size | 15px | 14px | 15px | Readability: ALL-CAPS text reads slower; the audit measured at 15px |
| 20 | Ballot-questions intro | one sentence | unchanged + 65ch | J1 (one sentence) + 65ch | Readability: "whatever your ZIP" repeat removed; "Each needs a" kept |
| 21 | Judges summary | 32px, semibold, no underline | 24px, underlined | 32px, semibold, underlined | Readability (reads as a control) and a larger target |
| 22 | Judges visible sentence | `on-surface` | muted | `on-surface` | Readability: it is the scope statement |
| 23 | PR C scroll padding | `8px + safe-area` | `8px` | J1 | Build risk: notched phones in landscape |
| 24 | Statewide early-voting note | "Every county: at least Oct 24 to Oct 31" | "Links to every county" | J1, dropped after Oct 31 | Readability: states the legal minimum from verified rows |
| 25 | Verify location | all in one new script + verify-home-layout | all in the new script | New script for the block; layout checks in verify-home-layout | Build risk: checks sit next to the ones they extend |
| 26 | PR B sign-off | approve Thu Oct 15 | by Fri Oct 16 | Approve Thu Oct 15, merge Fri Oct 16 | Build risk: a day for review |
| 27 | Height claims | A+B ≈5,300 / desktop ≈3,450 | ≈5,200 / ≈3,200 | ≈5,370 / ≈3,780 (≈5,300 / ≈3,760 before main's address field) | Measured in the HTML mockup (real copy and tokens, system fonts); desktop counts the block's real height |

Both judges already agreed on: no `:has()` radio pills, no `tall:` sticky news, no "Vote" nav item, no county passed through `SharedBallot`, no `SUPERVISOR_LIST_URL` change, no 2-column name grid, and keeping "See the races we cover".

## Appendix B: Not doing

- No address field in this block and no embedded county tool. The House step's field already takes an address, uses it only to find the district and keeps nothing else (/privacy). The county sample-ballot tools ask for personal details (§2.3 "Asks for") on the county's own site, and load third-party scripts.
- No vendor deep links (VoterFocus, electionsfl.org, OmniBallot): their addresses change between elections.
- No sticky sub-nav (content-to-chrome would drop from ≈5.9:1 to ≈4:1) and no hide-on-scroll top bar.
- No collapsing or truncating of races or amendments.
- No county passed through `SharedBallot` (deliberate; pinned by `verify-judicial-retention`).
- No CSS `:has()` radio pills; no "Vote" nav item (it would share "/" with "Ballot"); revisit after Nov 3.
- No `globals.css` token changes; no `SUPERVISOR_LIST_URL` change.
- No new art. The palm sticker retires with the tiles; the magnifier, sun, seated reader and cat stay as they are.
