# "Do you know civics?": a simple quiz landing page for the "Who's my ___?" ads

**Date:** 2026-10-15 · **Status:** draft v2, waiting for the founder's approval
**For:** the paired "Who's my ___?" scroll-stoppers
(`docs/general-election/google-ads-research/output-engine/campaigns/whos-my-rep/`), under the
brand guide's Paired-party exception (`brand-kit/DESIGN.md`, ends 2026-11-03).
**HTML version:** `2026-10-15-civics-quiz-landing-design.html`.
**No product code is in this spec.** Nothing here has been built or committed.

## 0. What changed in v2

The founder, 2026-10-15: *"For now, let's keep it a simple landing quiz that all of them will link
over to."* The campaign now has two ad pairs, both with politicians from outside Florida:
**U.S. Senator** (Ossoff / Kennedy, statewide, `?role=senator`) and **Mayor** (Mamdani / Johnson,
`?role=mayor`, held until the quiz has mayor data). Governor and U.S. Representative are no longer
ad roles.

So v1 drops the three-stage quiz and everything that needs new geography except the mayor:

| v1 spec | v2 |
|---|---|
| Three levels (Easy, Medium, Hard), stop after each | **One short quiz**, 7 questions on one page, easiest first |
| U.S. Representative (needs a 2022-map lookup) | **Cut** for 2026 (no ad uses it; §9) |
| County commissioner, school board | **Cut** for 2026 (§9) |
| Mayor | **Kept**, in a second release (§8), because the Mayor ad pair waits on it |

## 1. Why

The ads end on "Wait… who's *my* [role]?". KYV stores candidates, not officeholders, so today it
can't say who holds an office if that person isn't on the 2026 ballot. This page answers the ad's
question with sourced facts, then sends the voter to the existing ballot guide.

## 2. The flow

1. **Landing** at `/civics` (Q1). Headline "Do you know civics?"; one line: "See who represents
   you, then see who's on your ballot." `?role=senator|mayor` (an office, never a location) only
   decides which question is opened first.
2. **Address box first.** The existing field and copy (`locationFieldCopy(true)`,
   `src/lib/scope-copy.ts`) and server path (`src/lib/census-block.ts`: our server → Census
   Geocoder only → 2020 census block). In v1 the address does two things: it sets up the hand-off
   to the ballot, and (from v1.1) it finds the voter's city.
3. **Seven questions, one page**, each **recall, then reveal**: the question → **Show answer** →
   the answer card → **I knew it / I didn't**. The tally ("You knew 5 of 7") stays in the page.
4. **Hand-off:** **See your ballot** opens the existing ballot guide with the district set the
   way the home page sets it today (the voter's click, the existing `kyv.district` cookie, nothing
   in the URL).

## 3. The questions

| # | Question | Answer (as of 2026-10-15; re-check before launch) | KYV has it today? | Ships |
|---|---|---|---|---|
| 1 | Who are your two U.S. Senators? | Rick Scott and Ashley Moody | Half: Moody is a 2026 candidate with verified incumbency; Scott isn't up, so no row | v1 |
| 2 | Who is your Governor? | Ron DeSantis | No: open seat, no incumbent candidate | v1 |
| 3 | Who is your Attorney General? | James Uthmeier (appointed 2025) | Yes ("Holds this office now", 0046, 0049) | v1 |
| 4 | Who is your Chief Financial Officer? | Blaise Ingoglia (appointed 2025) | Yes | v1 |
| 5 | Who is your Commissioner of Agriculture? | Wilton Simpson | Yes | v1 |
| 6 | How many statewide amendments are on your ballot, and what share of the vote does each need to pass? | Three; 60% | Yes (`FL-AM1/2/3-general`, DOS booklet; FL Const. Art. XI §5(e)) | v1 |
| 7 | Who is your mayor? | Depends on the address: city mayor, county mayor, or "no city mayor" | No: no city geography | **v1.1** |

Questions 1–6 are the same for every Floridian, so they work for any Florida address (and for
the Senator ads, which run statewide). Until v1.1 ships, question 7 isn't shown.

**Each answer card** shows the name as the official source prints it; the office; "in office
since" with "elected" or "appointed" (said for every holder alike); one sourced line on what the
office does; a receipt in IBM Plex Mono ("Source · Where · Checked 2026-10-15"); and a ballot
line ("This seat is on your ballot. See who's running →", or "Not on your ballot this year. Next
election: 2028.", or for the mayor "On your ballot, but this guide doesn't cover it. Your
county's sample ballot lists it.").

## 4. Data

### 4.1 Officeholder file

A typed data file in the repo, not a table: about 10 rows for v1 and about 85 more for v1.1.
Fields: `seat`, `name`, `party` (as printed; blank for nonpartisan offices), `since`,
`electedOrAppointed`, `termEnds`, `sourceName`, `sourceUrl`, `checkedAt`, `validUntil`,
`vacant`. A file because the PR is the review and git history is the audit trail, and it sits
outside the content freeze that opens 2026-10-18 (Q4). A check script asserts it agrees with
`candidate.is_incumbent` for Moody, Uthmeier, Ingoglia and Simpson.

### 4.2 Mayor geography (v1.1 only)

A new block → municipality table, same run-length shape as `block_district` (which freezes
10-18, so a new table). Built offline like `scripts/build-block-seed.mjs`: each 2020 block's
internal point (TIGER `tl_2020_12_tabblock20`) against each covered county's GIS
municipal-boundary layer, for the four counties' ~89,816 blocks. No match means unincorporated.

### 4.3 Official sources

| Data | Official source | Cross-check | Changes when |
|---|---|---|---|
| U.S. Senators | senate.gov senator list | Clerk / Bioguide | Scott's term runs to 2031-01-03. Moody's seat is a 2026 **special** election, so its winner may be sworn in after certification in November, not January (confirm) |
| Governor, AG, CFO, Agriculture | flgov.com, myfloridalegal.com, myfloridacfo.com, fdacs.gov | DOS results / appointment record | 2027-01-05 |
| Amendment facts | DOS amendment booklet (`src_fldos_amend_booklet_2026`, already in KYV); FL Const. Art. XI §5(e) | DOS Initiatives database ("Made ballot") | fixed to 2026-11-03 |
| County mayors | Miami-Dade: elected executive mayor (Mayor's office page). Orange: elected mayor, seat on the 2026 ballot, incumbent not running (orangecountyfl.net). Broward: ceremonial, the commission picks one each November (Mark Bogen since 2025-11-18; broward.org, charter). Hillsborough: **no county mayor**, the commission elects a chair (charter) | county charters | Broward at its November reorganization; Orange when the 2026 winner takes office (confirm date) |
| City mayors (~80) | each city's own site (mayor or commission page, city clerk) | Florida League of Cities Municipal Directory; Miami-Dade County League of Cities list (associations: cross-check only, never the source) | each city's own calendar (many in March or odd-year November); record the next date per city |
| Municipal boundaries | each county's GIS layer (current annexations) | Census Incorporated Places | annexations; refresh before v1.1 |
| "What the office does" lines | U.S. Const. Art. I; FL Const. Art. IV; county and city charters | — | fixed |

### 4.4 Freshness

- Every card prints `checkedAt`. Re-check every row weekly until 2026-11-03.
- **Stale guard:** a row checked more than 14 days ago, or past its `validUntil`, shows no name:
  "We're re-checking this one. [Source] lists it."
- Known changeovers: the U.S. Senate special's swearing-in and Broward's reorganization (both
  November), Orange mayor's start date, 2027-01-05 (Governor and Cabinet).
- A vacancy is an answer: "Vacant since [date]", with its source.

## 5. Question rules

1. **Facts only:** who, since when, elected or appointed, what the office does, how many, what
   threshold, whether the seat is on your ballot. Nothing graded but a fact.
2. **Every answer sourced** with the receipt. No source, no name.
3. **Recall, not multiple choice:** choices would mean KYV picking which real politicians appear
   as wrong answers. Recall needs no distractors.
4. **One template for every holder:** same fields, order and size; no photos (Q3); party by one
   rule for all (Q2).
5. **Describe the office, never the holder** (brand guide, Voice).
6. **Amendments: process facts only**, never their merits; link to KYV's measure pages.
7. **The ad's politicians never appear on the page.** They are out-of-state examples; the page
   is about the voter's own officeholders. No KYV wordmark beside an answer card.

## 6. Privacy

Per `brand-kit/DESIGN.md` Legal ("Never build audiences from addresses or ZIP codes entered on
the site, or pass them into conversion data"):

- The address follows today's path only: server → Census Geocoder, no IP forwarded. Not stored,
  logged, put in a URL or cookie, or sent to analytics or Google. The quiz's address route sits
  under `/api/address/*` so `sentry-scrub.ts` drops its bodies whole.
- The block and city live in memory for that request. Only the existing `kyv.district` cookie is
  written, only on **See your ballot**.
- Self-marks and the tally stay in component state: no server write, no localStorage.
- **Plausible:** `civics_started`, `civics_done`, `civics_handoff`. No props: never the role,
  score, office, county or city.
- **Google Ads:** loads only after Accept (Basic Consent Mode, `measurement.md`). KPI stays
  `ballot_lookup_completed`, at the ballot, not the quiz's address step. **Enhanced conversions
  (user-provided data) and automatic form-field collection stay off**: they would hash the
  address field. No remarketing or audiences from quiz visitors. Pairs reported side by side.
- One paragraph on the privacy page names the quiz and these rules.

## 7. Coverage honesty

| Voter's address | Questions 1–6 | Mayor (v1.1) |
|---|---|---|
| Miami-Dade, Broward, Hillsborough, Orange, in a city | all | the city's mayor, plus the county mayor fact |
| Same counties, unincorporated | all | "You live in unincorporated [County], so you have no city mayor." plus the county fact. This is an answer, not a gap |
| Hillsborough | all | adds "Hillsborough has no county mayor; the commission elects a chair" |
| Anywhere else in Florida | all | "We haven't mapped cities in [County] yet. Your Supervisor of Elections lists your local officials" → `supervisors.ts` link |
| Near a city line (block split) | all | names both, says why; never guesses |

So **the Mayor ad pair should target the four covered counties only** (Q5); statewide, most
viewers would land on "we haven't mapped your city". The page states its scope once at the top
(`scope-copy.ts` style) and repeats `NOT_COVERED_SENTENCE` before the hand-off.

## 8. What ships before Election Day

Today is 2026-10-15. The content freeze opens 10-18; early voting runs to at least 10-31; the
Paired-party exception and the ads end 11-03.

| Release | Ships | Target | Unblocks | If late |
|---|---|---|---|---|
| **v1** | `/civics`, address box, questions 1–6, answer cards, hand-off, privacy, events, stale guard | live **Tue 2026-10-20** | Senator pair (from Wed 10-21) | — |
| **v1.1** | Question 7, mayor: county facts, ~80 city mayors, block → municipality table | live **Tue 2026-10-27** | Mayor pair, four counties (from Wed 10-28) | not live by Wed 10-28 → **drop the Mayor pair for 2026**, quiz stays at 6 |
| After 11-03 | Ads stop. Take the page down 11-04, or keep it and re-check at each changeover (Q6) | — | — | — |

Rough effort. v1: about 10 rows researched and cross-checked, half a day; page and cards, a day
and a half; review, a network privacy check (consent declined and accepted) and the founder's
review, half a day. v1.1: boundaries and the block table, a day; about 85 mayor rows and their
second sources, one to two days. Needs approval by **Fri 10-16**.

## 9. Cut for 2026, kept for later

- **U.S. Representative.** KYV maps an address to the **2026** district (HB 1-D). Today's member
  was elected on the **2022** map, so this question needs a block → 2022-district table, and
  the card has to say both: "Your representative now is [name], District 25 on the 2022 map; on
  your 2026 ballot you're in District 20." Sources: Clerk of the House member list; the
  Legislature's 2022 plan block file.
- **County commissioner and school board.** The boundaries are mostly in
  `docs/general-election/boundaries/` (still missing: the Broward commission layer and Orange's
  **current 6-district** layer; the 8-district map there starts 2026-11-17). Sources: the four
  counties' commission pages and the four school districts' board pages, cross-checked against
  SOE certified results. Every 2026 seat changes hands on **2026-11-17** (s. 100.041). Building
  this would also make KYV's 17 loaded-but-unreachable county races reachable.
- Other counties, state legislators, sheriff and other county officers.

## 10. Changes elsewhere (not made here)

For the whos-my-rep campaign guide (another session's file): the Mayor pair stays held until
v1.1 is live, targets the four counties, and is dropped if v1.1 misses Wed 10-28. The guide's
truthful-landing Claims row is re-reviewed against this page. The founder reviews the live page
before any ad runs.

## 11. Open questions for the founder

| # | Question | Recommended |
|---|---|---|
| Q1 | Route and title: `/civics`, "Do you know civics?" | Yes |
| Q2 | Party on answer cards | Same rule as candidate cards (`partyLabel`): as printed; none for nonpartisan offices |
| Q3 | Officeholder photos | None |
| Q4 | Officeholder data as a reviewed file outside the content freeze | Yes, with same-day correction PRs |
| Q5 | Mayor pair targets the four covered counties only | Yes |
| Q6 | After 11-03: take down or keep updated | Take down 11-04 |
| Q7 | Approve by Fri 10-16 for v1 on Tue 10-20 | — |
| Q8 | Score sharing ("I knew 5 of 7") | Not in 2026 |

## 12. Done means

- `/civics` live with questions 1–6 (and 7 once v1.1 ships). Every receipt is dated within 14 days, and the officeholder ↔ incumbency check passes.
- Network inspection shows the address leaving only to Census, nothing sent to Google with consent
  declined, and no address-derived data in any Google request with consent accepted.
- Test addresses give the expected cards: v1, one per covered county plus one outside coverage;
  v1.1, adds unincorporated, Hillsborough, a city near a line and one city per county.
- The founder has reviewed the live page.
