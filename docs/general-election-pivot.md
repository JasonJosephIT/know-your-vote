# Phase 6: The General Election Pivot

> **Ship target: 2 days.** Everything below is scoped to that window. Anything
> that doesn't fit is in [Explicitly deferred](#explicitly-deferred) — listed,
> not forgotten.

The August 18 primary is over. On **November 3, 2026** Florida holds a general
election, and that is a different product problem, not the same product with
new rows. This document says what changes, why, and in what order.

---

## 1. Why the general is a different product

Four things flip at once:

1. **The electorate quadruples.** Florida's closed primary excluded every NPA
   voter — roughly a third of registrations. In November every registered
   voter gets the same ballot. Our current copy tells them the opposite
   (`YourRaces.tsx:132`, `api/voting-info/route.ts:137`). That copy is now
   actively wrong for the people who most need the product, and it is the
   cheapest high-value fix on this list.

2. **The ballot gets longer and less candidate-shaped.** A primary ballot is
   races. A general ballot is races **plus constitutional amendments** plus
   judicial retention plus county questions. We model none of that. Three
   legislature-referred amendments are on this ballot, each needing 60% to
   pass — and unlike candidates, they get almost no press coverage. This is
   where neutral, sourced explanation has the highest marginal value, and
   it is our largest content gap.

3. **Races collapse to head-to-head.** Four same-party primary candidates
   become one R against one D. This quietly breaks the quiz (see TASK-065):
   "you match candidate X" in a two-way race is just "you are a Democrat" or
   "you are a Republican" — precisely the partisan read the product exists
   to avoid.

4. **Most of the ballot is now statewide.** Governor, Senate, and the three
   Cabinet offices are on *every* Florida voter's ballot, as are all three
   amendments. Our four-metro `in_coverage` gate was right for a primary
   where the interesting races were local. In a general it turns away a
   voter in Tallahassee for whom we already have 8 of their ballot items
   sitting published in the database.

---

## 2. What's on the November 3, 2026 ballot

> **Unverified — treat as research, not as data.** Nothing here goes in front
> of a voter until it has been checked against the Division of Elections
> candidate list and the official ballot text, the same posture
> `election_event.verified_by` already enforces for dates. Sources are listed
> in § 8.

**Statewide races**

| Office | Republican | Democrat |
|---|---|---|
| Governor (open seat — DeSantis term-limited) | Byron Donalds | David Jolly |
| U.S. Senate (special) | Ashley Moody (appointed inc.) | Angie Nixon |
| Attorney General (no primary held) | James Uthmeier (appointed inc.) | José Javier Rodríguez |
| Chief Financial Officer | *confirm* | *confirm* |
| Commissioner of Agriculture | *confirm* | *confirm* |

**Constitutional amendments** — all three referred by the Legislature, each
requiring **60%** approval. All 22 citizen initiatives failed to qualify, so
there are no initiative measures this cycle.

- **Amendment 1** — Budget Stabilization Fund: raises the cap from 10% to 25%
  of general revenue; requires an annual transfer of the lesser of $750M or
  the amount needed to reach the cap.
- **Amendment 2** — exempts farm equipment on agricultural land from local
  property tax.
- **Amendment 3** — "Save Our Homes From Excessive Property Taxes": increases
  the homestead exemption.

**Also on the ballot, out of scope for this ship:** all 28 U.S. House seats
(we cover 4), all 120 Florida House seats, 20 of 40 Florida Senate seats,
judicial merit retention, and county/municipal offices and questions.

**Key dates** — already seeded in `0008_election_seed.sql` as `general_2026`,
every row `verified_by IS NULL`, so none of them render or send yet:

| Event | Seeded date |
|---|---|
| Voter registration deadline | 2026-10-05 |
| Vote-by-mail request deadline | 2026-10-22 |
| Early voting (statewide window) | 2026-10-24 → 2026-10-31 |
| **Election Day** | **2026-11-03** |

At time of writing that leaves **34 days to the registration deadline** and
**63 days to Election Day**.

---

## 3. What already works

Worth stating plainly, because it shrinks the job:

- The demo seed already writes `election = 'general'` for all nine races, and
  the roster (Governor, Senate, AG, CFO, Ag Commissioner, FL-10/15/23/28) is
  already the general-election set.
- `election_event`, the reminder schedule, the templates, and the ICS builder
  were all written with `general_2026` as a first-class value. The notification
  backbone needs verification, not construction.
- The race page and `YourRaces` already render `key_dates.general_date` and
  the registration deadline.
- The publication gate, Balance Audit re-check, and RLS posture are unchanged
  by any of this and should stay exactly as they are.

## 4. What's broken or missing

| # | Gap | Where |
|---|---|---|
| G1 | `election` is on `race` but **no read query filters on it**. A leftover primary race would render beside general races with no visual distinction. | `src/lib/resolve.ts`, `src/lib/briefs.ts`, `src/lib/directory.ts` |
| G2 | Every `general_2026` date row is unverified, so dates silently don't render and no reminder can fire. | `election_event` |
| G3 | Closed-primary copy tells NPA voters the opposite of the truth. | `YourRaces.tsx:132`, `api/voting-info/route.ts:137` |
| G4 | **No ballot-measure model of any kind.** | everywhere |
| G5 | Out-of-metro ZIPs get "We don't cover this area yet" for a ballot we largely have. | `src/lib/resolve.ts:56` |
| G6 | The quiz's match framing becomes a partisan tell in head-to-head races. | `src/lib/quiz.ts`, `QuizResult.tsx` |
| G7 | Landing page has no deadline, no urgency, no register-by date. | `src/app/(public)/page.tsx` |

---

## 5. Day 1 — ballot correctness

> Nothing ships without all four of these. They are ordered by dependency.

- [x] **TASK-057** — Single source of truth for "which election is live"
  Files: `src/lib/election.ts` (new), `src/lib/resolve.ts`, `src/lib/briefs.ts`, `src/lib/directory.ts`
  Notes: One module exporting `ACTIVE_ELECTION = "general_2026"`, its
  `ElectionKind` (`"general"`), and its display label. Every race query filters
  `election = activeElectionKind()`. Today the filter is absent, which is fine
  only because the database happens to hold one cycle — that is luck, not a
  guarantee, and it stops being true the moment a 2028 primary row lands.
  Verify: insert a `primary` race, confirm it appears in none of `/races`,
  `/candidates`, `/api/resolve`.
  **Done 2026-09-03 (`198cd75`)** — all eight reads filtered;
  `scripts/verify-election-scope.mjs` enforces it statically (no database
  needed) and was negative-tested. One documented exemption:
  `YourRaces.raceDates`, already scoped by ids `resolve.ts` filtered.

- [ ] **TASK-058** — Verify the `general_2026` date rows *(liability gate)*
  Files: `supabase/migrations/0010_verify_general_dates.sql`
  Notes: A human checks all five seeded dates against the Division of Elections
  page, then sets `verified_by`/`verified_at`. This is founder task F4 and it
  is the gate on every date-driven surface: the banner (TASK-064), the
  reminder cron, the ICS file, and the voting-info email are all no-ops until
  it's done. Do it first — it unblocks the most surface area per minute of any
  task here.
  Verify: `/api/calendar/general_2026.ics` returns 5 VEVENTs; `dueReminders()`
  yields the T-7 registration reminder for 2026-09-28.
  **Done 2026-09-07** — the founder verified all five dates against
  `dos.fl.gov/elections/for-voters/election-dates/` and they are stamped:
  `verified_by = joseph.jasonjj@gmail.com`, `verified_at = 2026-09-07T03:22Z`.

  | event_type | date |
  |---|---|
  | `registration_deadline` | 2026-10-05 |
  | `vbm_request_deadline` | 2026-10-22 |
  | `early_voting_start` | 2026-10-24 |
  | `early_voting_end` | 2026-10-31 |
  | `election_day` | 2026-11-03 |

  Both acceptance criteria checked against the real dates rather than assumed:
  `buildElectionCalendar` emits **5 VEVENTs** with a valid VCALENDAR envelope,
  and `dueReminders(events, "2026-09-28")` returns exactly one reminder —
  `reg_deadline_t7`, dedupe key
  `general_2026:registration_deadline:T-7:email`. A day with nothing scheduled
  returns zero, so the matcher is not firing indiscriminately.

  The resulting send calendar:

  | fires | template | rule |
  |---|---|---|
  | 2026-09-28 | `reg_deadline_t7` | registration deadline T-7 |
  | 2026-10-04 | `reg_deadline_t1` | registration deadline T-1 |
  | 2026-10-21 | `vbm_deadline_t1` | vote-by-mail deadline T-1 |
  | 2026-10-24 | `early_voting_start` | day-of |
  | 2026-11-03 | `election_day` | day-of |

  `early_voting_end` has no reminder rule by design — it is on the calendar
  file but nothing emails about it.

  **Nothing sent, and nothing can yet.** `voting_info_subscription` holds zero
  rows and `notification_send_log` zero sends, so stamping lit up the banner,
  the ICS feed and the voting-info email path without any message going to
  anyone. What it did remove is the *gate*: from here the T-7 reminder depends
  only on the cron actually running on 2026-09-28.

- [x] **TASK-059** — Retire the closed-primary copy
  Files: `src/components/features/YourRaces.tsx`, `src/app/api/voting-info/route.ts`
  Notes: Replace both instances with the general-election truth: every
  registered Florida voter receives the same ballot regardless of party
  registration, including NPA voters who could not vote in August. Say it
  positively and without spin — for a third of the state this is news, and
  it's the most useful sentence on the page.
  Verify: no occurrence of "closed-primary" remains in `src/`.
  **Done 2026-09-03 (`198cd75`)** — both instances replaced; grep confirms
  none remain. Note `docs/prd.md` §433 and §530 still instruct showing the
  note (logged in `docs/scope-changes.md`).

- [ ] **TASK-060** — Open ZIP coverage statewide for shared ballot items
  Files: `scripts/build-zip-seed.mjs`, `supabase/migrations/0011_zip_statewide.sql`, `src/lib/resolve.ts`, `src/types/app.ts`
  Notes: Regenerate the Census crosswalk for **all** Florida ZCTAs rather than
  the four metro counties. Keep `in_coverage` meaning "we have this ZIP's
  congressional race" and let `resolve()` return statewide races and measures
  for any Florida ZIP. Replace the dead-end message with an honest partial
  answer: what we have for them, and what we don't yet. Preserve the split-ZIP
  confirm behaviour (FR-001) — never auto-pick a district.
  Verify: a Tallahassee ZIP returns 5 statewide races + 3 measures and no
  congressional race, with copy naming the gap; a Miami ZIP additionally
  returns FL-28; a Georgia ZIP still returns out-of-state.
  **Partially blocked (2026-09-06):** `www2.census.gov` returns 403 through
  the Claude Code session's egress proxy, so neither ZCTA crosswalk file can
  be fetched from there. The resolution logic and copy are writable; the seed
  SQL needs the two files downloaded by someone who can reach them, then
  `node scripts/build-zip-seed.mjs <block_assignment.txt> <zcta_tabblock.txt>`.
  (The generator moved to the enacted 2026 map on 2026-09-07 — its inputs are
  now the EOGPCRP2026 block assignment and the ZCTA/tabblock relationship
  file, and it writes `0018_zip_seed_2026.sql`. A statewide build widens the
  `METROS` filter there rather than reviving the CD119 build.)

## 6. Day 2 — amendments and urgency

- [x] **TASK-061** — `ballot_measure` data model (app-owned)
  Files: `supabase/migrations/0010_ballot_measure.sql`, `0011_measure_rls.sql` (as shipped — see the Done note)
  Notes: App-owned, because the app never modifies pipeline tables. Three
  tables mirroring the race pattern:
  `ballot_measure` (`measure_id`, `election`, `number`, `official_title`,
  `ballot_summary`, `full_text_url`, `placed_by`, `threshold_pct`,
  `jurisdiction`), `measure_argument` (`measure_id`, `side` ∈
  `support`/`oppose`, `text`, `source_id`, `attributed`), and
  `measure_publication` mirroring `race_publication` exactly.
  RLS follows `0002` verbatim: anon reads published rows only, no anon writes.
  **Balance rule:** a measure is publishable only when its support and oppose
  argument counts are within the same tolerance the Balance Audit applies to
  candidates. An amendment has no campaign obliged to balance it, so if we
  don't enforce symmetry here the neutrality claim fails on exactly the part
  of the ballot where nobody else is checking.
  Verify: extend `scripts/verify-migrations.mjs` to assert anon cannot read an
  unpublished measure and cannot write any measure table.
  **Done 2026-09-06** — migrations `0010_ballot_measure.sql` /
  `0011_measure_rls.sql` (taking 0010/0011 rather than the 0012/0013 penciled
  in here: TASK-058 and TASK-060 landed later, and a gap would mean a
  lower-numbered migration arriving after a higher one had been applied).
  Fourteen assertions added to the pglite harness. The symmetry rule needed
  **two** triggers, not one: guarding `measure_publication` alone left a
  published measure skewable by deleting an opposing argument afterwards, so
  a deferred constraint trigger on `measure_argument` closes it. Both paths
  are asserted.

- [x] **TASK-062** — Measure read layer and pages
  Files: `src/lib/measures.ts`, `src/app/(public)/measures/[measureId]/page.tsx`, `src/components/features/MeasureCompare.tsx`
  Notes: `measures.ts` mirrors `briefs.ts` — published-only, arguments dropped
  when they carry no source, same belt-and-braces re-check of the balance flag.
  The UI mirrors `RaceCompare`: two equal columns, **What a YES does** and
  **What a NO does**, then sourced arguments on each side, never a
  recommendation. Show the **60% threshold** prominently; most voters believe
  a simple majority passes an amendment, and correcting that is real service.
  Verify: an unpublished measure 404s; a measure with an unbalanced argument
  set never publishes.
  **Done 2026-09-06** — `src/lib/measures.ts`, `MeasureCompare`,
  `MeasureThreshold`, and `/measures/[measureId]`. The rule lives in
  `src/lib/measure-balance.ts`, dependency-free so
  `scripts/verify-measure-balance.ts` can run it under Node's type stripping
  (the same reason `notifications/schedule.ts` is separate from its route).
  An unbalanced or unpublished measure returns null from the read layer and
  renders the in-review page rather than a one-sided view.

- [x] **TASK-063** — Surface measures in resolution and the races list
  Files: `src/lib/resolve.ts`, `src/types/app.ts`, `src/components/features/YourRaces.tsx`
  Notes: All three measures are statewide, so every Florida ZIP gets all three.
  Render them as a distinct "Ballot questions" group below races — a voter
  scanning for candidates should not mistake a measure for one.
  **Done 2026-09-06** — `src/components/features/BallotQuestions.tsx`, mounted
  in `YourRaces`. **Design change from this plan:** measures are deliberately
  NOT added to `ResolveResult`. They are statewide and identical for everyone,
  so threading them through a ZIP lookup would couple location-free data to a
  location query — and rendering them without a ZIP is exactly what TASK-067
  needs, so the component drops straight into the landing page. This file
  listed `resolve.ts` and `app.ts` because it was written before the measure
  tables existed. The component renders nothing when no measure is published,
  so it is safe on the page before TASK-066 content lands.

- [x] **TASK-064** — Deadline banner on the landing page
  Files: `src/components/features/DeadlineBanner.tsx`, `src/app/(public)/page.tsx`
  Notes: Reads the next *verified* `election_event` and renders
  "Register by October 5 · Election Day November 3" with the calendar link.
  Degrades to rendering nothing when no verified row exists (§0.7), so it is
  safe to merge before TASK-058 lands. Countdown urgency without alarm — the
  design brief's calm poll-worker voice, not a campaign banner.
  Verify: with rows unverified the banner is absent, not broken.
  Done: `src/lib/election-dates.ts` reads the verified statewide events through
  the service client wrapped in `unstable_cache` (1h revalidate, tag
  `election-dates`), so the landing page stays prerendered — the build still
  reports `/` as `○` static with a 1h revalidate. It returns `null` on any of
  three degradations: no `SUPABASE_SERVICE_ROLE_KEY`, no rows, or no *verified*
  rows; `DeadlineBanner` renders nothing in that case, which is the state today
  until TASK-058 lands. States the dates rather than counting down — a
  countdown goes stale under ISR and would be wrong for up to an hour.

- [x] **TASK-065** — Reframe the quiz away from matching *(neutrality)*
  Files: `src/lib/quiz.ts`, `src/lib/quiz-guardrails.ts`, `src/components/features/QuizResult.tsx`
  Notes: In a four-way same-party primary, "here's who lines up with you" is a
  genuinely neutral service. In a two-way general it resolves to "you're a
  Republican" / "you're a Democrat," which is the one output this product must
  never produce. Keep the questions and the data; change the result from a
  ranked match to **"here is where each candidate stands on the issues you
  picked"** — same evidence, equal space, no verdict. Update the guardrails
  and `verify-quiz-guardrails.ts` to reject ranked or comparative output.
  Verify: no result path emits an ordering, score, or "best match".
  Done: the quiz was already unranked — `SYSTEM_PROMPT` has said "Never rank,
  score, or compare candidates" since Phase 4, and no result path emitted an
  ordering. The residual match-shape was the *alignment framing*, which in a
  two-way general is a verdict even without a ranking: an "alignment note" per
  candidate is a match score with the number filed off. So the concept was
  renamed end to end — `alignmentNote → stanceSummary`,
  `alignedIssues → issuesCovered`, tool `record_alignment → record_stances` —
  and the prompt now carries an explicit rule: describe the candidate's stated
  position, do not describe how it relates to, matches, aligns with, agrees
  with, or differs from the voter's answers. The prompt is guidance, not a
  boundary, so `COMPARATIVE_RE` in `quiz-guardrails.ts` joins `ENDORSEMENT_RE`
  as a second filter that replaces any comparative phrasing that slips through
  with the neutral fallback. `verify-quiz-guardrails.ts` covers six comparative
  phrasings (all replaced) and four legitimate stance sentences that contain
  the word "your" without comparing (all survive) — 16 checks, all passing.

- [ ] **TASK-066** — Publish the content *(the real critical path)*
  Notes: Not a code task, and the one most likely to slip. Nine races
  (5 statewide + FL-10/15/23/28), roughly 18–20 candidates, plus 3 measures,
  each through the Balance Audit, each publication flag flipped. Then remove
  every `demo-` row via `scripts/demo-teardown.sql`. **The app cannot go public
  until this is done** — the README's launch gate is unchanged by this pivot.
  Start it in parallel on Day 1; don't leave it to Day 2.

  **Preparation, 2026-09-07.** The content itself is unchanged — still open,
  still needs a human. What was done is everything around it that does not
  require judgement about real candidates.

  *Measured state of the database.* Every voter-facing row is a fixture:
  9/9 races, 29/29 candidates, 261/261 claims, 88 positions, 87 sources and
  38 social accounts all carry the `demo-` prefix. `ballot_measure` is empty —
  the tables exist as of 0010/0011 but hold nothing. There is no partial real
  content to build on; intake starts from zero.

  *A latent bug in the teardown, fixed.* `scripts/demo-teardown.sql` predates
  two tables. `candidate_contact` (PR #12) holds a `candidate_id` foreign key
  with `ON DELETE NO ACTION`, and was not in the script — so the moment intake
  populates contacts, `DELETE FROM candidate WHERE candidate_id LIKE 'demo-%'`
  fails with a foreign-key violation. Zero rows today, which is why nothing
  has caught it; it fires on launch day and nowhere earlier. The three measure
  tables were missing too. Both are now covered, in dependency order. Verified
  by schema inspection rather than execution — dry-run it inside
  `BEGIN … ROLLBACK` before trusting it live.

  *What the roster does and does not give you.*
  `CAP_Target_Race_Candidates_2026_v1.csv` is the **qualifying** list, not the
  general-election field: 24 candidates for Governor, 12 across the four
  House districts. The August primary settled those fields and the CSV
  predates it. It also contains **no U.S. Senate rows**, while the app models
  a `demo-fl-us-senate` race — that discrepancy needs resolving before the
  race list is final, because it changes whether the shared ballot is five
  statewide races or four. And it carries identity only: no issues, no stated
  positions, no records, no sources.

  *What still needs a human, and why no agent should shortcut it.* Every claim
  this product publishes is about a real, named person standing in a live
  election. The design already says so — sourced claims, fact-check verdicts,
  the Balance Audit, and a human verification gate. Generating plausible
  positions or records for Donalds, Jolly, Frankel, Giménez or anyone else,
  from a model whose training predates the primary and with the official
  sources (`dos.myflorida.com`, `results.elections.myflorida.com`,
  `ballotpedia.org`) all denied at this session's egress gateway, would
  produce exactly the failure the Balance Audit exists to prevent — and it
  would be indistinguishable from real content once loaded. The pipeline
  agents plus a human are the path; there is no faster one worth taking.

---

## 7. Explicitly deferred

Listed so they're decisions rather than oversights:

- **State legislative races** (120 House, 20 Senate). Needs a ZIP↔legislative
  district crosswalk we don't have and roughly 14× the content. Post-launch.
- **Judicial merit retention** (Supreme Court and DCA yes/no votes). Real
  ballot items, genuinely under-covered, and a neutrality minefield — the
  `ballot_measure` model from TASK-061 extends to them cleanly later.
- **County and municipal races and questions.** Highest volume, lowest
  reusability.
- **Write-in and NPA candidates.** A qualified write-in changes what "every
  candidate, equal space" means. Needs a stated rule before it needs code.
- **The remaining 24 congressional districts** (existing TASK-053).
- **`key_dates.primary_date`** is now dead weight on the race record. Harmless;
  leave it.

## 8. Sources

Ballot research above, all pending official verification per § 2:

- [Florida elections, 2026 — Ballotpedia](https://ballotpedia.org/Florida_elections,_2026)
- [2026 Florida gubernatorial election — Wikipedia](https://en.wikipedia.org/wiki/2026_Florida_gubernatorial_election)
- [2026 U.S. Senate special election in Florida — Wikipedia](https://en.wikipedia.org/wiki/2026_United_States_Senate_special_election_in_Florida)
- [2026 Florida Attorney General election — Wikipedia](https://en.wikipedia.org/wiki/2026_Florida_Attorney_General_election)
- [Donalds, Jolly to face off for governor as Florida's statewide races are set — WUSF](https://wusf.org/text/politics-issues/2026-08-18/2026-primary-results-donalds-jolly-to-face-off-for-governor-as-floridas-statewide-races-are-set)
- [Florida 2026 ballot measures — Ballotpedia](https://ballotpedia.org/Florida_2026_ballot_measures)
- [Florida's Proposed Constitutional Amendments on November's Ballot — League of Women Voters](https://my.lwv.org/florida/alachua/article/floridas-proposed-constitutional-amendments-novembers-ballot)
- [U.S. House elections in Florida, 2026 — Ballotpedia](https://ballotpedia.org/United_States_House_of_Representatives_elections_in_Florida,_2026)
- [Division of Elections — Florida Department of State](https://dos.fl.gov/elections/) *(authoritative for dates and the qualified-candidate list)*

---

## The one non-negotiable, restated for measures

Equal space and equal scrutiny applied to a ballot question means the YES and
NO cases get the same room and the same sourcing standard, and the app never
implies which one a voter should pick — including by ordering, emphasis, or
which side happens to have more material available.
