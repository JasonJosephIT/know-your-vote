# Empty race states — every covered location, 2026-10-12

Founder rule, 2026-10-12: *"none of the races should be empty. There should be
no 'No race yet'."*

**Answer.** No covered location can land on an empty race state, on the live
database or in production. Every one of the 4 counties and 18 county+district
pairs a voter can be placed in has the 5 statewide races, its U.S. House race
and its county races. Production showed no empty state at any of them
(checked 2026-10-12 against `knowyour.vote`).

One real pipeline gap turned up: **Miami-Dade was missing 8 settled county
seats** (6 commission, 2 school board). A Miami-Dade voter in Commission
District 4, 6, 8, 10, 12 or 1, or School Board District 4 or 6, found no row
for their own seat. `0057` fixes it, written but not applied.

The copy that told a voter their races were "not published yet … check back
soon" is gone. It could only show on a failed read, and it gave the wrong
reason. It now says what is true: a fault on our side, and where the voter's
full sample ballot is.

## 1. Every empty state in the code

| Surface | Branch | Old copy | Reachable for a covered location? | Now |
|---|---|---|---|---|
| `YourRaces.tsx` | no statewide race came back | "Your races aren't published yet — we publish a race only after every candidate in it has been through the same checks. Check back soon." (shown only when county races were empty too; with county races, nothing was said) | **Only on a failed read.** `resolveCounty` and the statewide-only path read through `getStatewideRaces` and `racesForCounty`, which return `[]` on error rather than throw | `RACES_NOT_LOADED` (nothing loaded) or `STATEWIDE_NOT_LOADED` (county races did) + a link to the county Supervisor of Elections |
| `YourRaces.tsx` | district resolved, its House race absent | "We don't have the U.S. House race for FL-X yet … will appear here once it's published." | **No.** All 16 covered districts have a readable House race (FL-10 as decided) | `houseRaceNotLoaded(district)` + Supervisor link |
| `SharedBallot.tsx` (home) | no statewide race (and no measure) | "The ballot isn't published yet — … Check back soon." (with measures, nothing was said) | **Only on a failed read** (both reads degrade to `[]`) | `BALLOT_NOT_LOADED` (nothing loaded) or `STATEWIDE_NOT_LOADED` (questions did) + the state's list of Supervisors |
| `CountyRaces.tsx` | `races.length === 0` | renders nothing | **No.** Every covered county has county races | unchanged |
| `CountyRaces.tsx` | no contested seat in the county | "None of X County's seats this year are contested …" | Not today (each county has at least one contested seat); a stated fact if it happens | unchanged |
| `BallotAtAGlance.tsx` | every count is 0 | renders nothing | Only on a failed read | unchanged |
| `CandidateBrowser.tsx` | search matches nobody | "No candidates match that search …" | Only for a typed search or area filter with no match; a county filter always lists races | unchanged |
| `YourRaces.tsx` | ZIP not in coverage / Seminole or Pasco side / Florida address outside the 4 counties | "We can't place that ZIP …", "We don't cover X County's local races yet", "Full statewide coverage isn't available yet" | Not covered locations. The last two still show the statewide ballot (and the House race, for the other side of a split ZIP) | unchanged |
| `/races/[id]`, `/candidates/[id]` | the id is not visible | "This race isn't published", "This candidate isn't published yet" | A single race or person by id, not a location | unchanged |

The new sentences live in `src/lib/coverage.ts` (not frozen, safe for client
and script imports):

- `RACES_NOT_LOADED`: "We couldn't load your races just now. That's a fault on
  our side, not an empty ballot: every Florida voter has statewide races on
  theirs. Get your sample ballot from *the Miami-Dade County Supervisor of
  Elections*."
- `houseRaceNotLoaded("FL-27")`: "The U.S. House race for FL-27 is missing
  from this list. That's a fault on our side, not your ballot. Get your full
  sample ballot from *the Miami-Dade County Supervisor of Elections*."
- `BALLOT_NOT_LOADED`: "We couldn't load the statewide ballot just now.
  That's a fault on our side: every Florida ballot has statewide races and
  constitutional amendments. Get your sample ballot from *your county
  Supervisor of Elections*."
- `STATEWIDE_NOT_LOADED`, when the county races (races view) or the ballot
  questions (home page) loaded and the statewide races did not: "We couldn't
  load the statewide races just now. That's a fault on our side, not your
  ballot: every Florida voter has statewide races on theirs. Get your full
  sample ballot from *…*."

None says "try again in a minute": `getStatewideRaces` caches a failed read
as `[]` for up to an hour (`races.ts`), so a reload would not bring the races
back. The Supervisor link is the way out.

## 2. Every covered location × race type (live, 2026-10-13 01:30 UTC)

Read as **anon** (what a voter's browser sees: `listed` or `published`, RLS
0033), replaying `resolve.ts`'s reads. Generated by
`node scripts/verify-no-empty-races.ts` with the Supabase env set. Cells are
races; "decided" means not printed in November (unopposed, or won in the
August primary) and shown under "Already decided" or "Not on your ballot".

| Location | Statewide | U.S. House | County commission | School board | County mayor | Clerk of courts | Candidates shown |
|---|---|---|---|---|---|---|---|
| Miami-Dade (county only) | 5 | — | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 24 |
| Miami-Dade FL-24 | 5 | 1 (1 contested) | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 26 |
| Miami-Dade FL-25 | 5 | 1 (1 contested) | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 27 |
| Miami-Dade FL-26 | 5 | 1 (1 contested) | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 27 |
| Miami-Dade FL-27 | 5 | 1 (1 contested) | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 26 |
| Miami-Dade FL-28 | 5 | 1 (1 contested) | 2 (1 contested, 1 decided) | 3 (1 contested, 2 decided) | 0 | 0 | 27 |
| Broward (county only) | 5 | — | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 27 |
| Broward FL-20 | 5 | 1 (1 contested) | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 30 |
| Broward FL-22 | 5 | 1 (1 contested) | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 29 |
| Broward FL-24 | 5 | 1 (1 contested) | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 29 |
| Broward FL-25 | 5 | 1 (1 contested) | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 30 |
| Broward FL-26 | 5 | 1 (1 contested) | 4 (**0 contested**, 4 decided) | 5 (1 contested, 4 decided) | 0 | 0 | 30 |
| Hillsborough (county only) | 5 | — | 4 (4 contested) | 3 (2 contested, 1 decided) | 0 | 0 | 30 |
| Hillsborough FL-12 | 5 | 1 (1 contested) | 4 (4 contested) | 3 (2 contested, 1 decided) | 0 | 0 | 33 |
| Hillsborough FL-14 | 5 | 1 (1 contested) | 4 (4 contested) | 3 (2 contested, 1 decided) | 0 | 0 | 33 |
| Hillsborough FL-15 | 5 | 1 (1 contested) | 4 (4 contested) | 3 (2 contested, 1 decided) | 0 | 0 | 32 |
| Hillsborough FL-16 | 5 | 1 (1 contested) | 4 (4 contested) | 3 (2 contested, 1 decided) | 0 | 0 | 33 |
| Orange (county only) | 5 | — | 5 (5 contested) | 4 (1 contested, 3 decided) | 1 (1 contested) | 1 (1 contested) | 36 |
| Orange FL-8 | 5 | 1 (1 contested) | 5 (5 contested) | 4 (1 contested, 3 decided) | 1 (1 contested) | 1 (1 contested) | 38 |
| Orange FL-9 | 5 | 1 (1 contested) | 5 (5 contested) | 4 (1 contested, 3 decided) | 1 (1 contested) | 1 (1 contested) | 38 |
| Orange FL-10 | 5 | 1 (**0 contested**, 1 decided) | 5 (5 contested) | 4 (1 contested, 3 decided) | 1 (1 contested) | 1 (1 contested) | 37 |
| Orange FL-11 | 5 | 1 (1 contested) | 5 (5 contested) | 4 (1 contested, 3 decided) | 1 (1 contested) | 1 (1 contested) | 39 |

**After `0057`** (applied, then listed), every Miami-Dade row changes:
commission **8 (1 contested, 7 decided)**, school board **5 (1 contested, 4
decided)**, and 8 more candidates shown (county only 32; FL-24 and FL-27 34;
FL-25, FL-26 and FL-28 35).

Also checked, no zero:

- **All 235 covered ZIPs** are `in_coverage` and resolve to one of the 18
  pairs above (a split ZIP asks which, then lands on one).
- **Statewide-only** (a Florida address outside the 4 counties): the 5
  statewide races plus the "full statewide coverage isn't available" notice.
- **Address path**: `block_district` places voters in the same 18 pairs plus
  one, Orange FL-7 (below).
- **Production pages**: `/candidates?view=races&county=…&district=…` for all
  18 pairs, FL-7 in Orange, the 4 counties and `scope=statewide` each render
  the race counts above, with no "Check back soon" and no missing-House-race
  notice.

## 3. Every zero, diagnosed

The question for each (AGENTS.md; `news-fairness.md` §2): did our pipeline
miss something (fix it), or is it real (state it)? The source check is the
county's own 2026 candidate list on VoterFocus, read 2026-10-13 01:29 UTC for
all four counties, compared office by office with our rows.

| Zero | Gap or real | Source | What the voter sees |
|---|---|---|---|
| **Miami-Dade: 6 commission seats (Districts 1, 4, 6, 8, 10, 12) and 2 school board seats (Districts 4, 6) absent** | **Pipeline gap — fixed in `0057`** | VoterFocus lists all eight as settled: Gallon (CC1), Steinberg (CC4), Milian Orbis (CC6), Rodriguez (CC10), Bermudez (CC12), Alonso (SB4) and Rojas (SB6) Unopposed; Cohen Higgins (CC8) Elected. The School Board's member page shows Districts 2, 4, 6 and 8 with terms ending Nov. 2026, which is exactly this year's regular seats | Today: nothing for their seat. After `0057`: each seat under "Already decided", naming who takes it and why |
| Broward: 0 contested commission seats | Real | VoterFocus: District 2 Bogen, 4 Fisher, 8 McKinzie Unopposed; 6 Sandler Shuham Elected (beat three opponents in the August primary; two other filers withdrew) | "Already decided", one line per seat, with the reason. Already live |
| Orange FL-10: 0 contested House races | Real | One qualified candidate, unopposed; F.S. 101.151(7) keeps it off the ballot (Orange's composite sample ballot has no FL-10 contest) | "Not on your ballot" in the races view; `houseRaceNotOnBallot` on the home page. Already live |
| No county mayor or clerk race in Miami-Dade, Broward or Hillsborough | Real | No mayor or clerk office on any of the three counties' 2026 VoterFocus lists | Nothing to state: no page has a mayor or clerk slot outside Orange, so nothing renders empty |
| Orange FL-7 (address path only) | Real | 0045: the plan puts 4 Orange blocks (about 2.5 ha) in FL-7 and Orange's composite sample ballot has no FL-7 contest, so no Orange voter votes in it | `resolveDistrict` shows the Orange county view (5 statewide + 11 county races). Pinned by the verify script: a pair the block table places voters in but the ZIP table does not offer must be a retired pair |

**Root cause of the Miami-Dade gap.** `0032` loaded the seats VoterFocus
printed as "(Active-Unopposed)" or "(Active-Elected)". These eight print as
"(Inactive - Unopposed)" and "(Inactive - Elected)": the winner closed the
campaign account, which says nothing about the seat. Miami-Dade's three that
`0032` did load (Bastien, Bendross-Mindingall, Colucci) were still Active.
Broward, Hillsborough and Orange had no Inactive winner in a covered office,
which is why only Miami-Dade came up short. `parseVoterFocus` (R2's logistics
check) reads the last status span, so the same read cannot drop them again.
Every other commission, school board, mayor and clerk office on all four
lists is in the database with the same candidates.

Nothing was padded. No race was invented: every one of the eight is on the
county's own list, and the School Board's own page corroborates the cycle.

## 4. What changed

**Data — `supabase/migrations/0057_miami_dade_decided_seats.sql`, NOT
APPLIED.** Eight candidates (party `NOP`, as `0032`'s Miami-Dade rows; ids
from VoterFocus's `ca=` key), eight races (`level 'county'`,
`DAD-CC-n` / `DAD-SB-n`), one `draft` publication row each. Incumbency read
the way `0049` read it, from the same two member lists: Steinberg, Milian
Orbis, Cohen Higgins, Rodriguez, Bermudez, Alonso and Rojas sit on the body
today; Gallon is a checked false (the County's page lists Oliver G. Gilbert,
III for District 1), so CC1 is an open seat. A closing block asserts all
eight landed, each with one decided ballot candidate, and that `0049`'s
`incumbent_id`/`is_open_seat` rule holds for every Miami-Dade race.

No migration lists a race (pinned by `verify-ballot-seeds.mjs` and
`verify-migrations.mjs`), so listing is a second step through the door, which
writes the audit row:

```sql
SELECT set_race_publication(race_id, 'listed', 'founder',
  'Listed tier: decided Miami-Dade county seat from the VoterFocus list '
  || '(read 2026-10-13), missed by 0032; roster only, no brief (0057)')
  FROM race_publication
 WHERE status = 'draft'
   AND race_id IN ('FL-DAD-CC1-general', 'FL-DAD-CC4-general',
                   'FL-DAD-CC6-general', 'FL-DAD-CC8-general',
                   'FL-DAD-CC10-general', 'FL-DAD-CC12-general',
                   'FL-DAD-SB4-general', 'FL-DAD-SB6-general');
```

**Timing.** `0057` must be applied **before the content freeze opens,
2026-10-18 04:00 UTC**; inside the window its INSERTs are refused and it can
only go in as a correction. The listing call passes inside the window too
(`0050` lets an UPDATE to `listed` through).

**Code** (frozen files, so the PR must merge by **Fri 2026-10-16**):

- `YourRaces.tsx` (frozen): the no-statewide-race branch and the
  missing-House notice say what is true, with a link to the voter's
  Supervisor of Elections. Only those branches and their imports changed,
  so it merges cleanly with the address-only work (#175).
- `SharedBallot.tsx` (frozen): the same for the home page's shared ballot,
  including when only the ballot questions loaded.
- `races.ts` (frozen): a comment that described the old copy.
- `coverage.ts` (not frozen): the four sentences and `nothingLoaded`.
- Not touched: `LocationEntry.tsx`, `scope-copy.ts`, the home page components,
  `resolve.ts`, `CountyRaces.tsx`, `RaceListing.tsx`.

**Checks.**

- New `scripts/verify-no-empty-races.ts`. Offline: no races surface says a
  race is still coming; the empty branches render the fault copy with the
  Supervisor link; `nothingLoaded` on fixtures. Live (anon key only, read
  only; skipped without the env): every covered county and county+district
  pair has statewide races, its House race and county races, every readable
  race names a readable candidate, and the only block-only pair is a retired
  one. It prints the table in §2.
- `verify-ballot-seeds.mjs`: counts updated for `0057` (40 county races, 57
  local candidates, 23 decided, 12 unopposed, 11 elected in the primary); new
  checks that each covered county has county races anon can read, each naming
  a candidate anon can read, and that Miami-Dade has 13.
- `verify-migrations.mjs`: `0049`'s re-apply checks set `0057`'s rows aside
  inside their transaction (`0049`'s assertions describe the 2026-10-08
  ballot); the county incumbency check now expects 57 of 57.
- `verify-coverage.ts`: follows the new House-race notice.

## 5. Founder decisions

1. **Approve `0057` and apply it before Sun 2026-10-18 04:00 UTC**, then run
   the listing call above. Until then the eight seats stay missing (nothing
   renders empty; the seats just aren't there).
2. **Merge the PR by Fri 2026-10-16**: it changes two frozen files.
3. The fault copy names our side as the cause. If you'd rather it name no
   cause at all, the four sentences are in one place (`coverage.ts`).

## 6. Follow-ups (not done here)

- **Catch a missing office, not just a changed candidate.** R2's logistics
  check matches our roster candidates against VoterFocus; it never asks
  whether VoterFocus has a covered office (commission, school board, mayor,
  clerk) with a live winner and no race row of ours. That question is what
  found this gap.
- `docs/general-election/roster-completeness-2026-10.md` (the `0049`
  worksheet) does not carry the eight; their incumbency sources are in `0057`.
- Hillsborough FL-16 stays offered for ZIP 33598 (one ZIP). `0045` notes no
  official Hillsborough ballot has been read to confirm FL-16 is on it; once
  the composite sample ballot is out, check it the way `0045` checked Orange.
