# Roster completeness: design

Date: 2026-10-08. Status: draft for founder review, revised the same day
after a review. Every decision below is Recommended (pending founder
confirmation); none is assumed.

## 1. Purpose

Make the candidate roster complete enough that the facts we hold back today
can be shown, and shown the same way for every candidate:

- **Incumbency** for all 106 ballot-tier candidates, plus `race.incumbent_id`
  and `race.is_open_seat` for all 53 races. Each value comes from a named
  source that was fetched and read, and all of them ship in one reviewed
  migration, `roster_completeness`. That is what lets `SHOW_INCUMBENT_CHIP`
  flip.
- **Running mates** for the eight governor tickets, from the Division of
  Elections, shown for every ticket at once or for none.
- **One website slot on every card**: "Campaign website: <site>" or
  "Campaign website: none listed". This also settles the nine ballot
  candidates who have no `official_site`.
- **Campaign contact** (`candidate_contact`, 0 rows): where it appears once
  it is turned on after Nov 3, and how it stays hidden and unwritten until
  then.

Dates that bound this work: early voting starts 2026-10-19 in all four
covered counties, Election Day is 2026-11-03, and the founder's schedule is
"your yes by 10-15, publish by 10-17, freeze 10-18 → 11-03, corrections only"
(`docs/general-election/founder-decisions-2026-10-04.md:68`). Anything
voter-facing here lands by 2026-10-16 or waits until after Nov 3. The
founder's sittings for this spec are placed around the brief refresh's gates
(2.9): Fri 10-09 (four decisions), Sun 10-11 (two pull requests) and Tue
10-13 (one yes).

## 2. Current state

Every SQL below is a read-only SELECT run on production
(`pqracitpmzpiqfnzlngw`) on 2026-10-08, and the result is what it returned.
Web reads are GETs of public pages on 2026-10-08, with a browser user agent
unless stated.

### 2.1 The roster, and the migration number

- 299 candidate rows; 106 have `ballot_status = 'ballot'`, and exactly those
  106 are listed in some `race.candidate_ids`. 53 races. By level: county 32
  races / 49 candidates, federal 17 / 43 (16 U.S. House districts and the
  U.S. Senate), state 4 / 14.
  (`SELECT count(*) FROM candidate WHERE ballot_status='ballot'` → 106;
  `SELECT r.level, count(DISTINCT r.race_id), count(*) FROM race r,
  unnest(r.candidate_ids) cid GROUP BY 1` → county 32/49, federal 17/43,
  state 4/14.)
- 36 races are `published` and 17 are `listed` in `race_publication`;
  `FL-CFO-general` is the only listed statewide race. The published races
  hold 82 ballot candidates and the listed ones 24.
- `qualifying_status` across the 106: qualified 90, elected_in_primary 10,
  unopposed 6. The unopposed six are Frost (FL-10), Bogen, Fisher, McKinzie
  (Broward Commission 2, 4, 8), Bendross-Mindingall (Miami-Dade School
  Board 2) and Rendon (Hillsborough School Board 4).
- The newest migration on `main` is 0047; production's
  `supabase_migrations.schema_migrations` ends with `0047_candidate_lead_kind`
  (applied 2026-10-08 06:03 UTC) and `0046_uthmeier_incumbent` (00:33 UTC).
  **0046 is applied live but is not on `main`**: it lives on
  `claude/uthmeier-incumbent`, PR #131, open (`gh pr view 131` → OPEN).
- **The next number is not free, though no branch holds it.** No branch on
  `origin` holds a migration numbered 0048 or higher (`git ls-tree` over
  every remote branch), and the ledger's last row reads "0048+ free"
  (`supabase/migrations/README.md:64`). But three specs written the same day
  in this worktree each assign 0048 to their own file:
  - `2026-10-08-ballot-content-completion-design.md`: `0048_content_freeze.sql`,
    applied Thu 10-15 (§3.6.2, lines 620-622), and 0049 for Amendment 1's
    publish (its rollout step 2);
  - `2026-10-08-agent-retrofit-design.md`: `0048_agent_run_r5.sql` and
    `0049_contact_update_kind.sql` (lines 283 and 669);
  - `2026-10-08-news-source-integrity-design.md`: `0048_news_tags_kind.sql`
    (line 467).

  None of them has a ledger row yet. The ledger's own rule is that a number
  is claimed in its table first and planning docs reference it from there
  (`README.md:3-15`). So this spec names its migration only by its slug,
  `roster_completeness`; its number is the one its ledger row records (3.2,
  D13, section 5 step 0).
- `scripts/verify-migrations.mjs` replays every `.sql` file in filename order
  (`:166-167`). Where this file sorts relative to the freeze guard matters
  (3.2).

### 2.2 Incumbency today

- `is_incumbent` is true for 2 of 106: Patricia "Patti" Rendon
  (`FL-VF-HIL-2672`, set by `0038_county_roster_fixes.sql`) and James
  Uthmeier (`FL-DOE-89041`, set by 0046). `race.incumbent_id` is set on the
  same two races (`FL-HIL-SB4-general`, `FL-ATG-general`); `is_open_seat` is
  false on all 53; `fec_id` is NULL on all 299.
  (`SELECT count(*) FILTER (WHERE is_incumbent), ... FROM candidate` → 2;
  `race WHERE incumbent_id IS NOT NULL` → 2; `race WHERE is_open_seat` → 0;
  `candidate WHERE fec_id IS NOT NULL` → 0.)
- False has only ever meant "unknown": `0031_local_tier_a_2026.sql:41-43`
  ("False here means UNKNOWN, not 'challenger'"), 0038's header, and
  `src/lib/incumbency.ts:11-22`. The county lists the local roster came from
  (VoterFocus) do not state incumbency (`0031:5-7, 41-43`), so the SoE list
  confirms ballot placement, never incumbency.
- `SHOW_INCUMBENT_CHIP` is `false` (`src/lib/incumbency.ts:48`). Its TO FLIP
  conditions (`incumbency.ts:35-46`): every ballot candidate's
  `is_incumbent` set from a verified source, a false is a checked "not the
  sitting officeholder", and `race.incumbent_id` agrees. On `main`,
  `incumbency.ts:11-14` still says "exactly one" incumbent; PR #131 updates
  that comment to two.
- The chip renders in three places, each behind `showIncumbentChip`:
  `CandidateBrief.tsx:65`, `RaceListing.tsx:68` (`ListedCandidateCard`) and
  `RaceCompare.tsx:107` (the race page's roster cards).
  `scripts/verify-incumbent-chip.ts:76-79` lists only the first two as
  "the two cards"; the third passes only because part 3 strips every gated
  chip before scanning (`verify-incumbent-chip.ts:117-120`).
- Nothing in `src/` reads `incumbent_id` or `is_open_seat`; the verify script
  fails if anything outside `incumbency.ts` and `src/types/schema.ts` does
  (`verify-incumbent-chip.ts:98-130`).

### 2.3 The B4 incumbency run: code exists, never applied

Task B4 in `docs/general-election/data-ingest.md` §7 (lines 448-449: "Code
done 2026-09-07 — live DB write still pending"). The code, in the worktree
copy of the tool layer:

- `Civic Awareness (Know Your Vote)/toollayer/cap_toollayer/intake.py:440-548`
  (rules), `:595-800` (`resolve_incumbency`, pure), `:884-981`
  (`_incumbency_for_race`, the FEC fetch), `:983-1062` (`doe_file_intake`
  with `fill_incumbency: true`); `store.py:221-248` (`write_incumbency`);
  tests at `toollayer/test_toollayer_skeleton.py:1359` onward.
- Scope is the U.S. House only. The fetch is `office: "H"` per district
  (`intake.py:944`). The Senate returns `not_implemented`
  (`intake.py:890-902`); every state and county race returns
  `not_applicable` ("FEC covers federal races only", `intake.py:886-887`).
  So B4 can never cover 37 of the 53 races.
- Its prerequisites are open founder gates: the `SUPABASE_DB_URL` password
  and an arm64 Python 3.12 venv (`data-ingest.md:463-466`).
- It writes straight to production with no review step and no source per
  row: `UPDATE candidate SET is_incumbent = %s, fec_id = COALESCE(%s,
  fec_id) WHERE candidate_id = %s` (`store.py:243-247`).
- **Nothing in the database limits what it changes.** It connects as
  `cap_tool_wrapper` (`store.py:1-24`), which holds `INSERT, SELECT, UPDATE`
  on `candidate` (`information_schema.role_table_grants`) under the policy
  `capw_all_candidate`, every command, `USING (true)` (`pg_policy`).
  `candidate` has no trigger (`pg_trigger`, non-internal: none).
- The intake's own candidate upsert never names `is_incumbent`
  (`store.py:173-194`), so re-running the DoE intake neither sets nor clears
  it.
- Against today's FEC data it would refuse at least 6 of the 16 House races
  (FL-7, 11, 16, 20, 22, 24; 2.4; the other ten fields were not read in
  full): `resolve_incumbency` refuses an "I" row that matches no ballot
  candidate (`intake.py:729-738`) and a field with "C" rows and no "I" row
  (`intake.py:787-796`).

### 2.4 What the federal sources say

- **The House Clerk.** `https://clerk.house.gov/xml/lists/MemberData.xml`
  (HTTP 200 to a plain fetch; 119th Congress, 2nd session) lists, for each
  Florida district under the map members were elected on in 2024, who holds
  it today. `https://clerk.house.gov/Members` returns no member names to a
  fetch that does not run JavaScript (259,764 bytes, no "Florida" in the
  HTML), so the XML is the readable form of the same list.
- **The Senate.** `https://www.senate.gov/general/contact_information/senators_cfm.xml`
  lists Ashley Moody (Class III) and Rick Scott (Class I) for Florida.
- **The FEC.** Read earlier on 2026-10-08 with the public `DEMO_KEY`:
  `GET https://api.open.fec.gov/v1/candidates/?state=FL&office=H&election_year=2026&incumbent_challenge=I&per_page=100`
  → `pagination.count` 27, none of them in district 22; per-district fields
  for 07, 11, 16, 20, 22 and 24; and `office=S` → 37 rows. A re-check later
  the same day was refused: HTTP 429, `OVER_RATE_LIMIT`, "You have exceeded
  your rate limit of 40 calls per hour for the DEMO_KEY". That allowance is
  shared by every caller from this address. So the FL-22 district read (19
  rows, all coded "C") was made once and not re-read; the table relies on
  the statewide "I" query, which has no district-22 row.
- **Ballotpedia's snapshot** (`docs/general-election/ballots/ballotpedia/*.json`,
  retrieved 2026-09-22, a Tier 2 corroboration source per its own `source`
  field) agrees with the FEC column on every federal race.

| Race | Sitting member on this race's ballot (Clerk / Senate XML) | Who holds this district number today (Clerk XML) | FEC 2026 "I" row in the district | Ballotpedia 09-22 |
|---|---|---|---|---|
| FL-7 | none | Cory Mills (`FL-DOE-91581`, withdrawn/excluded) | MILLS, CORY `H2FL07156` | no incumbent |
| FL-8 | Haridopolos (holds 8) | Mike Haridopolos | HARIDOPOLOS, MIKE `H4FL08168` | Haridopolos |
| FL-9 | Soto (holds 9) | Darren Soto | SOTO, DARREN `H6FL09179` | Soto |
| FL-10 | Frost (holds 10) | Maxwell Frost | FROST, MAXWELL ALEJANDRO `H2FL10259` | Frost |
| FL-11 | none | Daniel Webster (no candidate row) | WEBSTER, DANIEL `H0FL08208` | no incumbent |
| FL-12 | Bilirakis (holds 12) | Gus M. Bilirakis | BILIRAKIS, GUS M `H6FL09070` | Bilirakis |
| FL-14 | Castor (holds 14) | Kathy Castor | CASTOR, KATHY `H6FL11126` | Castor |
| FL-15 | Lee (holds 15) | Laurel M. Lee | LEE, LAUREL `H2FL15241` | Lee |
| FL-16 | none | Vern Buchanan (`FL-DOE-88752`, withdrawn/excluded) | BUCHANAN, VERNON `H6FL13148` | no incumbent |
| FL-20 | Wasserman Schultz (holds 25) | vacant: "Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026." | CHERFILUS-MCCORMICK, SHEILA `H8FL20032`; WASSERMAN SCHULTZ, DEBBIE `H4FL20023` (districts by cycle 25, 25, 20) | Wasserman Schultz |
| FL-22 | none | Lois Frankel (no candidate row) | none | no incumbent |
| FL-24 | none | Frederica S. Wilson (`FL-DOE-89454`, withdrawn/excluded) | WILSON, FREDERICA S. `H0FL17068` | no incumbent |
| FL-25 | Moskowitz (holds 23) | Debbie Wasserman Schultz (on the FL-20 ballot) | MOSKOWITZ, JARED `H2FL22171` (districts 23, 23, 25) | Moskowitz |
| FL-26 | Diaz-Balart (holds 26) | Mario Diaz-Balart | DIAZ-BALART, MARIO `H2FL25018` | Diaz-Balart |
| FL-27 | Salazar (holds 27) | Maria Elvira Salazar | SALAZAR, MARIA ELVIRA `H8FL27185` | Salazar |
| FL-28 | Gimenez (holds 28) | Carlos A. Gimenez | GIMENEZ, CARLOS `H0FL26036` | Gimenez |
| FL-SEN | Moody (Senate XML) | (statewide) | MOODY, ASHLEY `S6FL00640` (office S) | Moody |

(Our-DB entries: `SELECT candidate_id, legal_name, qualifying_status,
ballot_status FROM candidate WHERE legal_name ~* '(frankel|donalds|webster|cherfilus|mills|buchanan|wilson)'`
→ Mills, Buchanan, Wilson and Cherfilus-McCormick present as
`withdrawn`/`excluded`; Byron Donalds on the Governor ballot; Daniel Webster
and Lois Frankel absent. `withdrawn` covers WIT/DEF/DNQ/REM (0038 header),
so our DB cannot say which.)

What this shows:

- **The 2026 map moved two sitting members.** Wasserman Schultz holds
  District 25 and runs in FL-20; Moskowitz holds 23 and runs in FL-25.
  District 20's own seat is vacant. FL-20's page is titled "U.S.
  Representative, District 20" (`src/lib/office-title.ts:26-28`), so a line
  "Holds this office now: Yes" beside Wasserman Schultz would say she holds
  District 20, which is false. The same holds for Moskowitz on FL-25's page.
  D1 words the line so that it is true (3.1, 3.5).
- **The FEC's "I" is not "serves today".** It still codes Cherfilus-McCormick
  "I", five months after she resigned, and codes Mills, Buchanan, Wilson and
  Webster "I" though none is on the November ballot. B4 refuses those
  districts. The Clerk's list says who serves today.
- **A sitting member can run for a different office.** Byron Donalds is the
  member for District 19 in the Clerk's list and is on the Governor ballot
  (`FL-DOE-89042`).
- The FEC spells the Senate candidate "GILESPIE, NEIL JOSEPH"
  (`S6FL00863`); our row is "Neil J. Gillespie". B4's name rule
  (`intake.py:565-573`) would not match him, which is why the fill stores
  `fec_id` by id, not by name.

### 2.5 Statewide and county: what we know, and from where

- **Governor.** Ron DeSantis has no candidate row
  (`SELECT ... WHERE legal_name ~* 'desantis'` → 0 rows), and the sitting
  lieutenant governor, Jay Collins (`FL-DOE-89690`), is `withdrawn`/
  `excluded`. Article IV, section 5(b) of Florida's constitution bars anyone
  who has served as governor for more than six years in two consecutive
  terms from being elected to the succeeding term; DeSantis took office in
  January 2019 and was re-elected in 2022. The Governor's own site
  (`https://www.flgov.com/eog/`, HTTP 200) shows "Governor Ron DeSantis" and
  links to `/eog/leadership/people/ron-desantis` and
  `/eog/leadership/people/jay-collins`. Ballotpedia: no incumbent. So no
  candidate on the Governor ballot holds the office.
- **Attorney General.** Uthmeier, set by 0046 from myfloridalegal.com, read
  2026-10-07 (0046 header).
- **CFO, Agriculture.** Ballotpedia marks Blaise Ingoglia (CFO) and Wilton
  Simpson (Agriculture) as incumbents. Not yet read on the offices' own
  sites.
- **County.** Leads only, none verified:
  - Ballotpedia 09-22 marks Maura McCarthy Bulman (Broward SB 1), Adam
    Cervera (Broward SB 6), Allen Zeman (Broward SB at-large 8), Vicki Lopez
    (Miami-Dade CC 5), Harry Cohen (Hillsborough CC 1), Gwen Myers (CC 3),
    Joshua Wostal (CC 7), Patricia Rendon (SB 4), Karen Perez (SB 6) and
    Michael Scott (Orange CC 6). It does not cover Broward Commission 2, 4
    or 8 at all (`coverage: not_covered`).
  - `docs/general-election/candidate-sites-2026-09-24.md` ("Candidates with
    no site") calls Bogen and McKinzie incumbents, and records government
    pages for Bogen (broward.org/district2), Fisher (broward.org/district4),
    McKinzie (broward.org/district8), Bendross-Mindingall
    (district2.dadeschools.net) and Gallo (ocps.net/district-1-angie-gallo).
  - **Gallo is the District 1 member running for Chair**, a different seat
    on the same board: the government page recorded for her is the District
    1 page, she is the one candidate in `FL-ORA-SBCHAIR-general`, and
    District 1 itself was won in August by Melissa Lopez Marantes
    (`FL-ORA-SB1-general`, `elected_in_primary`).
  - **Orange's commission went from six districts to eight for 2026**;
    Districts 7 and 8 are new (`docs/general-election/boundaries/README.md:31-34`).
- **The official hosts answer.** Each returned 200 to a browser user agent:
  clerk.house.gov, senate.gov, myfloridacfo.com, fdacs.gov,
  broward.org/Commission, the Miami-Dade commission page on miamidade.gov,
  hcfl.gov, orangecountyfl.net, browardschools.com, dadeschools.net,
  hillsboroughschools.org, ocps.net, myorangeclerk.com.
  `hillsboroughcounty.org` now redirects to `https://hcfl.gov/`.
  `myfloridalegal.com` answers 403 to a fetch with no browser user agent and
  200 to one with it.

### 2.6 Running mates

- Florida prints the contest as "Governor and Lieutenant Governor"
  (`docs/general-election/ballots/ballots_by_zip.json:128`).
- **The DoE candidate export has no running-mate field.** Its 26 columns are
  listed in `data-ingest.md:120`; none is a running mate. The 2026-09-07
  export's office codes (`roster_2026gen_public.json` keys) are AGR, ATG,
  CFO, CHI, CTJ, DCA, ECW, EWC, GBA, GOV, LOX, MED, PLB, PUB, SCJ, SEB, STA,
  STR, STS, TOL, USR, USS: no lieutenant governor office. The intake builds
  `legal_name` from the governor's own name columns
  (`intake.py:395-396`) and maps GOV to `FL-GOV-general` (`intake.py:90`).
  So none of the eight tickets records a running mate, and nothing in the
  ingest could.
- **The DoE's per-candidate page does.**
  `https://dos.elections.myflorida.com/candidates/canDetail.asp?account=<n>`,
  where `<n>` is the number in our `FL-DOE-<n>` id, shows a field labelled
  "Running Mate":

  | Ticket | Account | Running Mate as shown |
  |---|---|---|
  | Byron Donalds | 89042 | Bryan Avila |
  | David Jolly | 89243 | Gwen Graham |
  | Scott Eckhard Jewett | 84076 | Nicole Skelly |
  | Charles Burkett | 90630 | Ruben A. Coto |
  | Frank J. Russo | 89571 | Rachel Rodriguez |
  | Moliere "Moe" Dimanche | 88529 | Benjiman Rojas |
  | Dean Ocean Abrams | 90433 | Joe Van Vactor |
  | Jeffrey Peter "Dr. Jeff" Datto | 89630 | Juan Santana |

  All eight tickets have one. The same page also lists Address, Phone,
  Campaign Treasurer, Status, Date Filed, Date Qualified, Method and
  Campaign Documents. The page answers a plain fetch (200 for 89042 and
  90630).
- **The names are not clean in the HTML.** In the raw page for 89042 the
  field is `Running Mate: Bryan&nbsp;` followed by a carriage return, a line
  feed, two tabs and four spaces, then `Avila`; for 90630 it is `Ruben&nbsp;`,
  a line break, `A.&nbsp;`, a line break, `Coto` (line 58 onward of each
  page). They read "Bryan Avila" and "Ruben A. Coto" only once whitespace is
  collapsed (D6).
- **R5** (`cap-r5-candidate-leads`) looks for running-mate leads
  (`agents/r5-candidate-leads.prompt.md:9`). Its only run so far has not
  finished: `list_task_runs` shows it `running`, started 06:19:46 UTC, last
  activity 06:40:18 UTC. So the 0 rows of kind `candidate_lead`
  (`SELECT count(*) FROM review_item WHERE kind='candidate_lead'` → 0) come
  from a run that never reached its queue step, not from a completed empty
  run. The next scheduled run is 2026-10-08 13:38 UTC (`list_scheduled_tasks`),
  then Mondays and Thursdays.
- **R5's roster is the 82 published-race candidates, not all 106.** `check`
  compares mentions against `loadRoster` (`scripts/candidate-leads.ts:147-154`;
  the `on_roster` drop is `src/lib/candidate-leads.ts:191`), and
  `loadRoster` reads `profile` joined to `candidate`
  (`src/lib/news-intake.ts:151-172`). Only published races have profile
  rows: published 82 candidates / 82 with a profile; listed 24 / 0. The 24
  are all in a covered county or in the statewide CFO race, so R5's kind
  rules drop their mentions anyway (`covered_county`, or `unknown_county`
  for a statewide office that is not a running mate; R5 spec §4). Running
  mates are in neither list, so R5 would raise all eight as leads.

### 2.7 The nine ballot candidates with no `official_site`, and the site link

`SELECT ... FROM candidate WHERE ballot_status='ballot' AND official_site IS NULL`
→ 9 rows (97 of 106 have a site: 0036, 0038 and 0039). Reasons are from
`candidate-sites-2026-09-24.md` ("Candidates with no site", and the
2026-09-25 re-check, which changed none); status from `race_publication`:

| Candidate | Race (status) | Recorded reason |
|---|---|---|
| Peter Jassenoff `FL-DOE-92357` | FL-25 (published) | Nothing found; guessed domains do not resolve; FEC committee lists none |
| Deborah Ann Meidinger Hosey `FL-DOE-92137` | FL-26 (published) | Filing email domain has no A record |
| Jeffrey Peter "Dr. Jeff" Datto `FL-DOE-89630` | FL-GOV (published) | drjeffdatto.com parked; DoE record has no website |
| Mark D. Bogen `FL-VF-BRO-1179` | Broward CC 2 (listed) | Nothing found; only the county office page |
| Lamar Fisher `FL-VF-BRO-1178` | Broward CC 4 (listed) | Campaign domain not connected (Wix 404); lamarfisher.com parked |
| Robert McKinzie `FL-VF-BRO-1182` | Broward CC 8 (listed) | Nothing found |
| Dorothy Bendross-Mindingall `FL-VF-DAD-2926` | Miami-Dade SB 2 (listed) | Nothing found; only board-member office pages |
| Monica Colucci `FL-VF-DAD-2953` | Miami-Dade SB 8 (listed) | Genuine site, verified as hers (line 177 records its disclaimer naming her and the office), but compromised with injected casino spam; left NULL by founder decision 2026-09-25 (`founder-decisions-2026-10-04.md:86`) |
| Angie Gallo `FL-VF-ORA-1245` | Orange SB Chair (listed) | Squarespace site expired after she won outright in August |

- **Five surfaces print the link, and only when it is set:**
  `CandidateBrief.tsx:72-79`, `RaceListing.tsx:75-82`,
  `RaceCompare.tsx:121-128`, `CandidateBrowser.tsx:227-234` and
  `SavedCandidates.tsx:87-94`, each labelled "Official site". So in FL-GOV
  seven cards carry the label and Datto's does not.
- **No stored site is a government page.** A host scan of the 97 values
  finds no `.gov`, county or school-board domain; the collection stored
  campaign sites only (`candidate-sites-2026-09-24.md`, Method).
- **A site matters to a published brief.** A passage counts only when it is
  on the candidate's `official_site` (`src/lib/brief-rows.ts:352-357`: "No
  official_site means no passage can be the candidate's own"). The refresh's
  re-run cut-off was 10-12 (`founder-decisions-2026-10-04.md:68`), and the
  brief-content spec keeps "Verifying a new candidate site, or a database
  write for one" out of its refresh (its §7).

### 2.8 Campaign contact and R2

- `candidate_contact` has 0 rows. Its columns are `candidate_id`,
  `campaign_email`, `campaign_phone`, `mailing_address`, `contact_url`,
  `source_url`, `last_verified_at`, `verified_by`. Its anon policy is
  `anon_read_candidate_contact ... USING (true)`
  (`SELECT polname, pg_get_expr(polqual, polrelid) FROM pg_policy ...`):
  any row written is readable by anyone with the public key, at once.
- The UI is built and hidden: `CandidateContact` returns nothing unless
  `SHOW_CANDIDATE_CONTACT === "true"` (`CandidateContact.tsx:15`) and nothing
  when the candidate has no row (`:17-18`). It sits only on the candidate's
  own page (`src/app/(public)/candidates/[candidateId]/page.tsx:81, 125`),
  not on race pages. Whether the env var is set on Vercel was not checked:
  only the dashboard shows it.
- **R2's prompt contradicts itself and writes contact directly**
  (`~/.claude/scheduled-tasks/cap-r2-contact-refresher/SKILL.md`):
  - rule 1 says contact info "comes ONLY from the candidate's own site or an
    official election filing" (`:15-16`), while SOURCES says the
    candidate's own `official_site` only (`:27`);
  - rule 3 (`:19-20`), HOW TO WORK step 2 (`:35-38`) and operations appendix
    (a) (`:56`) write `candidate_contact`, including `mailing_address`;
  - race facts come "only from dos.fl.gov, county SoE sites, fec.gov"
    (`:28-30`, `:72`). The DoE's `canDetail` pages are on
    `dos.elections.myflorida.com`, outside that list.
- **R2 has never written.** `list_task_runs`: 15 runs. The last report file
  is `Agents/RunReports/2026-09-14-R2.md` ("Nothing in scope ... 0 rows").
  The 2026-09-21 and 09-28 runs ended within a minute with no report. The
  2026-10-05 run (12:01 to 12:09 UTC) read 82 candidates, stopped at a shell
  call and left no report and no writes. R2 is enabled; its next run is Mon
  2026-10-12 12:01 UTC (`list_scheduled_tasks`).
- `execute_sql` already runs without a prompt in scheduled sessions
  (`docs/general-election/founder-checklist-2026-10-08.md`, "Accept, or
  decline, the risk that comes with the scheduled agents"), so R2's direct
  `candidate_contact` upsert is reachable as soon as its shell prompt is
  answered.
- `site_last_verified_at` dates are all from the hand collection (09-21,
  09-24, 09-25) and `race.info_last_verified_at` is NULL on all 53.

### 2.9 The same-day plans this design has to fit

- **Brief content and the freeze**
  (`2026-10-08-ballot-content-completion-design.md`):
  - The freeze guard, `content_freeze` (§3.6.2), puts a row-level trigger on
    `candidate` from 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC. It refuses
    every UPDATE except one that changes only `site_last_verified_at`,
    unless the transaction sets `kyv.freeze_correction` (lines 640-648). It
    is applied Thu 10-15 and is inert until 10-18.
  - Corrections during the freeze follow its §3.6.5: a correction file, the
    founder's yes, then `BEGIN; SET LOCAL kyv.freeze_correction = '<file>';
    <the fix>; COMMIT;` in the SQL editor. "A roster fact that changed" and a
    hijacked link both count as corrections (§3.6.1).
  - Its frozen files (§3.6.3, line 671 onward) include `src/lib/listing.ts`,
    `src/lib/briefs.ts`, `src/app/(public)/methodology/page.tsx` and
    `src/components/features/RaceListing.tsx`, but not `incumbency.ts`,
    `CandidateBrief.tsx` or `RaceCompare.tsx`. The manifest is written last
    in the freeze-copy PR, merged by Sat 10-17 22:00.
  - Its calendar (§3.1): Gate 0, the founder's answers, Fri 10-09 by 18:00;
    Gate 1 and CFO's Gate 2 package, agent, Mon 10-12; CFO Gate 3, the
    founder's yes for CFO alone, Tue 10-13; Gate 2 and CFO Gate 4, agent,
    Wed 10-14; Gate 3, founder, Thu 10-15; Gate 4 Fri 10-16 and Sat 10-17.
  - BC12 disables R2 before Mon 10-12 08:00 EDT, through Nov 3 (§3.6.6,
    line 747; table line 798).
  - Its Sat 10-17 live check looks for "the 'Official site' link for all
    candidates in the race or none" (line 916).
  - It leaves running mates and the Incumbent chip out of scope (line 937).
- **The agent retrofit** (`2026-10-08-agent-retrofit-design.md`):
  - D9 disables R1 to R4 today; R2 returns only on a rewritten prompt,
    `agents/r2-logistics.prompt.md` (its PR D), which writes no
    `candidate_contact`.
  - Contact becomes a review kind, `contact_update`, in its 0049, built
    after Nov 3 (D5, line 715; §3.6, lines 571-585), with the payload
    `{ candidate_id, campaign_email, campaign_phone, contact_url, source_url,
    seen_at }`, taken from `mailto:`/`tel:` links on the candidate's own
    site, with no mailing address.
  - It leaves "the equal-space contact block that must exist first" out of
    scope (§7). Section 3.8 here is that block.
  - It says `candidate-leads.ts` is unchanged by its own PRs (lines 642-643).
    Section 3.6 here changes the `check` command's name list; whichever PR
    merges second rebases.
- **News source integrity** claims 0048 for `0048_news_tags_kind.sql`
  (line 467). Its table touches `review_item` only.
- **The founder checklist** (`docs/general-election/founder-checklist-2026-10-08.md`,
  renumbered while this spec was written, so cited by title):
  - "Approve tool permissions once for R5, R2 and R4" lists **Run now** on
    `cap-r2-contact-refresher` with its current prompt, which writes
    `candidate_contact`;
  - "Keep `SHOW_CANDIDATE_CONTACT` unset in Vercel" is advice, and no step
    checks it.

### 2.10 Caching

- `getRaceBrief` caches under `["race-brief", "v2", raceId]` and
  `getRaceListing` under `["race-listing", "v2", raceId]`;
  `getCandidateDetail` (`["candidate-detail", candidateId]`) and
  `getCandidateListing` (`["candidate-listing", candidateId]`) carry no
  version. All four use `revalidate: 3600` (`src/lib/briefs.ts:258-261,
  309-312`; `src/lib/listing.ts:149-152, 212-215`). The v2 comment explains
  why keys move: an entry cached by an older deploy would otherwise persist
  for up to an hour after a new one ships (`briefs.ts:253-256`).
- The race and candidate pages export `revalidate = 3600`
  (`races/[raceId]/page.tsx:19`, `candidates/[candidateId]/page.tsx:11`),
  and the race page has `generateStaticParams` (`:23`).
- The daily 10:00 UTC `refresh-news` cron (`vercel.json`) calls
  `revalidateTag("races", "max")` (`src/app/api/cron/refresh-news/route.ts:109`).
- The loaders read candidate rows with `select("*")` (`briefs.ts:182`,
  `listing.ts:100`), so new columns reach every cached entry fetched after
  they exist.

## 3. Design

### 3.1 What the words mean (D1)

- **Incumbent** (`candidate.is_incumbent = true`): today, the candidate
  serves in the office, or on the body, that this race elects to.
  - For an office one person holds (Governor, Attorney General, Chief
    Financial Officer, Commissioner of Agriculture, Orange County Mayor,
    Orange County Clerk of the Courts), that means holding the office.
  - For a body with several seats (the U.S. House, the U.S. Senate, each
    county commission, each school board), it means being a sitting member
    of that body, whatever seat or district number they hold.
  - So Wasserman Schultz (holds House District 25, runs in FL-20) and
    Moskowitz (holds 23, runs in FL-25) are sitting House members (2.4).
    Gallo (recorded as the District 1 member, runs for Chair) counts as a
    member of the Orange County School Board if the worksheet confirms she
    still holds District 1, and so does any district member running for an
    at-large seat on the same board. Byron Donalds, a House member running for Governor,
    does not hold the office of Governor. A school board member running for
    the county commission is not a commissioner.
- **What a voter sees is that fact, in words that are true for the race**
  (3.5): "Member of the U.S. House now: Yes", never "Holds this office now"
  where that would claim a seat the person does not hold.
- **A checked false**: `is_incumbent = false` with a source that lists the
  body's current members, or names the office's current holder, without
  this candidate. A false with no source stays "unknown", as today.
- **`race.incumbent_id`**:
  - the ballot candidate with `is_incumbent` when exactly one in the race
    has it;
  - NULL when none does;
  - when two or more do (two sitting members of one body running for one
    seat), the one who holds this race's own seat number, or NULL if
    neither does. The worksheet names which.
- **`race.is_open_seat`**: true exactly when `incumbent_id` is NULL. The
  predicted open races are `FL-GOV-general`, FL-7, FL-11, FL-16, FL-22 and
  FL-24 (2.4, 2.5); the county ones come out of the fill. Decided seats
  (unopposed, elected in the primary) are treated like contested ones. Not
  displayed (D4).
- **The worksheet also records the narrower fact** for every candidate:
  whether they hold this race's own seat number. It is neither stored nor
  shown under D1. It is what D1's TO FLIP would use, so a flip changes a
  column, not a read.

### 3.2 Schema: migration `roster_completeness`

**Its number** comes from the ledger (D13, section 5 step 0), and it must
sort **before** `content_freeze`. The reason: `verify-migrations.mjs`
replays every file in filename order at the real clock. Between 10-18 04:00
UTC and 11-04 05:00 UTC, a replay that applies the guard first refuses this
file's UPDATEs of the county candidate rows the harness seeds (0031, 0032,
0038). Every CI run in the freeze, correction PRs included, would then fail.

Additive columns on `candidate`, no new table:

```sql
ALTER TABLE candidate
  ADD COLUMN IF NOT EXISTS incumbency_source        text,
  ADD COLUMN IF NOT EXISTS incumbency_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS running_mate             text,
  ADD COLUMN IF NOT EXISTS running_mate_source      text,
  ADD COLUMN IF NOT EXISTS running_mate_verified_at timestamptz;
```

Constraints, added after the data so the existing rows satisfy them (each
`DROP CONSTRAINT IF EXISTS` then `ADD`, so the file re-runs):

- `candidate_incumbency_sourced`:
  `(incumbency_source IS NULL) = (incumbency_verified_at IS NULL)`.
- `candidate_incumbent_needs_source`:
  `NOT is_incumbent OR incumbency_verified_at IS NOT NULL`. A true cannot be
  written on a row that has no source. Once the migration has given all 106
  ballot candidates a source, this constraint guards only rows that arrive
  later, such as a newly ingested candidate. It does not stop a writer from
  flipping the value on a row that already has a source; the trigger below
  does that.
- `candidate_running_mate_sourced`: `running_mate`, `running_mate_source` and
  `running_mate_verified_at` are all NULL or all set.
- `candidate_running_mate_governor`:
  `running_mate IS NULL OR office_sought = 'Governor'` (all eight GOV ballot
  rows carry exactly `'Governor'`: `SELECT office_sought, ballot_status,
  count(*) ... GROUP BY 1,2` → Governor/ballot 8).
- `candidate_running_mate_clean`:
  `running_mate IS NULL OR running_mate = btrim(regexp_replace(running_mate, '\s+', ' ', 'g'))`,
  so a stored name never carries the page's tabs or doubled spaces (D6).

**A guard on changing a sourced value**, added last:

```sql
CREATE OR REPLACE FUNCTION candidate_sourced_fact_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_incumbent IS DISTINCT FROM OLD.is_incumbent
     AND OLD.incumbency_verified_at IS NOT NULL
     AND NEW.incumbency_source      IS NOT DISTINCT FROM OLD.incumbency_source
     AND NEW.incumbency_verified_at IS NOT DISTINCT FROM OLD.incumbency_verified_at THEN
    RAISE EXCEPTION 'candidate %: is_incumbent changed without a new incumbency_source or incumbency_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.running_mate IS DISTINCT FROM OLD.running_mate
     AND NEW.running_mate IS NOT NULL
     AND OLD.running_mate_verified_at IS NOT NULL
     AND NEW.running_mate_source      IS NOT DISTINCT FROM OLD.running_mate_source
     AND NEW.running_mate_verified_at IS NOT DISTINCT FROM OLD.running_mate_verified_at THEN
    RAISE EXCEPTION 'candidate %: running_mate changed without a new running_mate_source or running_mate_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS candidate_sourced_fact_guard ON candidate;
CREATE TRIGGER candidate_sourced_fact_guard
  BEFORE UPDATE OF is_incumbent, running_mate ON candidate
  FOR EACH ROW EXECUTE FUNCTION candidate_sourced_fact_guard();
```

- **What it does.** On a row that already has a source, a changed
  `is_incumbent` or `running_mate` must arrive with a new source or date in
  the same statement, or the statement fails and rolls back. B4's UPDATE
  (`store.py:243-247`) names neither column, so on any of the 106 it fails
  if it would change the value, and passes if the value is unchanged; on an
  unsourced row, a true fails the CHECK. Clearing all three running-mate
  columns (the takedown in 3.10) passes.
- **What it does not do.** It is a tripwire, not a lock. A writer that also
  writes a new source and date passes, and `cap_tool_wrapper` keeps table
  UPDATE. The control is still that no agent writes these columns (D10).
- `EXECUTE` on the function is revoked by name from `PUBLIC`, `anon`,
  `authenticated`, `cap_tool_wrapper` and `cap_readonly` (the lesson of
  0020). The trigger still fires for every writer: Postgres checks
  `EXECUTE` on a trigger function when the trigger is created, not when it
  fires. Section 6 tests this as `cap_tool_wrapper`.
- **The intake is unaffected**: `upsert_candidate` names none of these
  columns (`store.py:173-194`). A new candidate arrives unsourced and false,
  and hides its race's line until it gets a source (3.5).

**No constraint on `race`**: the intake inserts new races with the column
defaults (`is_open_seat` false, `incumbent_id` NULL), so a CHECK tying the
two would break the intake. The agreement is asserted by the migration's DO
block and by the gate query instead (3.11).

**Why columns and not rows**: running mates as their own `candidate` rows
would change the 106 count every migration asserts, the anon policy that
keys on `race.candidate_ids` (0033), the news matcher's roster
(`src/lib/news-intake.ts:151-172`), saved candidates and ballot order, for a
person who is not elected separately. A separate table would add a policy
and a join for eight values. (D5.)

`src/types/schema.ts` `Candidate` gains the five fields. The race loaders
read candidate rows with `select("*")` (2.10), so the fields reach every
card that needs them with no query change; the anon row policy already
covers them.

### 3.3 Verification method

The rules for every row, whatever the level:

- **Fetched and read**, never a search result. The page must name the
  person as a current member of the body, or as the current holder of the
  office.
- **Two independent reads.** Each source page is read twice, in two
  separate sessions at least an hour apart, and both reads must agree. Each
  Yes also needs a second, different official page that names the person as
  a current member or holder: their page on the body's own site, or their
  house.gov or senate.gov site. A disagreement goes into the worksheet as a
  question for the founder, never into the migration.
- **Fetch method.** Every HTML page is read in headless Chromium, as the
  `official_site` collection did (`candidate-sites-2026-09-24.md`, Method:
  Ballotpedia serves a JavaScript challenge to plain clients), because
  `myfloridalegal.com` refuses a fetch without a browser user agent (2.5).
  The House and Senate XML files and the DoE `canDetail` pages answer a
  plain fetch.
- `incumbency_source` is the URL that decides the row: the list or page
  that includes this candidate, or that lists the current members or holder
  without them. `incumbency_verified_at` is the first read's date.
- Ballotpedia is a lead and a cross-check, never the source of record (its
  snapshot calls itself Tier 2). The county SoE (VoterFocus) list confirms a
  candidate is on the 2026 ballot for that seat; it does not state
  incumbency (`0031:41-43`).
- No rule reads party.

**U.S. House (16 races, 40 candidates).**
1. Source of record: `https://clerk.house.gov/xml/lists/MemberData.xml`. A
   candidate who is the member for any Florida district is a Yes; anyone
   else is a No. The worksheet also records the district they hold, for
   D1's narrower column.
2. Second read for each Yes: the member's own house.gov site.
3. Cross-check, never decisive: the FEC field per district
   (`https://api.open.fec.gov/v1/candidates/?state=FL&office=H&district=NN&election_year=2026&per_page=100`,
   with `pagination.count` equal to the rows returned, as B4 requires).
   Match each ballot candidate to its row by hand and record the FEC
   `candidate_id`, `incumbent_challenge` and `election_districts`; store
   `fec_id` where matched. An FEC "I" on someone the Clerk does not list
   (Cherfilus-McCormick) is recorded as FEC lag and changes nothing.
4. **FEC access.** The read uses the project's FEC key, loaded by
   `scripts/env-local.ts` inside a read-only script and never printed or
   written. Sixteen district reads and one Senate read, each made twice,
   are 34 calls. The FEC's own 429 message gives a personal key 1,000 calls
   an hour. `DEMO_KEY` is not used: its 40-an-hour allowance is shared, and
   it refused this address on 2026-10-08 (2.4). On a 429 the script stops
   and resumes after an hour. A read that cannot be made leaves `fec_id`
   NULL and the worksheet says "FEC not read"; it never blocks a row,
   because the FEC decides nothing.

**U.S. Senate (1 race, 3 candidates).** Source of record:
`https://www.senate.gov/general/contact_information/senators_cfm.xml`.
Second read: the senator's page on senate.gov. FEC `office=S` cross-check,
matched by id (Gillespie is "GILESPIE" there).

**Statewide (4 races, 14 candidates).** The office's own site, naming the
current holder: Governor `https://www.flgov.com/eog/` ("Governor Ron
DeSantis"), Attorney General `myfloridalegal.com` (as 0046 did), Chief
Financial Officer `myfloridacfo.com`, Commissioner of Agriculture
`fdacs.gov`. The Governor rows also cite Art. IV, §5(b) and the DoE GOV
ballot rows as context, not as the source.

**County (32 races, 49 candidates).** The body's own list of current
members, or the office's own page:
- county commissions: `broward.org/Commission`, the commission page on
  `miamidade.gov`, `hcfl.gov` (`hillsboroughcounty.org` now redirects
  there), `orangecountyfl.net`;
- school boards: `browardschools.com`, `dadeschools.net`,
  `hillsboroughschools.org`, `ocps.net`;
- Orange County Mayor: `orangecountyfl.net`; Clerk of the Courts:
  `myorangeclerk.com`.

Orange Commission Districts 7 and 8 need no special source under D1, which
counts membership, not district. Under D1's TO FLIP, the county's 2026
commission district map viewer, set against the six-district map it
replaces (`boundaries/README.md:31-39`), shows they are new seats with no
holder.

### 3.4 The worksheet, and the data in `roster_completeness`

1. **Worksheet**: `docs/general-election/roster-completeness-2026-10.md`. It
   is written before the SQL, and the SQL is written from it.
   - One row per ballot candidate (106): race; the line's label (3.5);
     Yes or No; holds this race's own seat, Yes or No (D1's TO FLIP
     column); source URL; both read dates; the second page for a Yes; and
     one line of evidence, the page's own words, at most 15.
   - One row per race (53): `incumbent_id`, `is_open_seat`, and who holds
     this race's own seat today.
   - One row per ticket (8): the raw DoE string, the stored name (D6), the
     `canDetail` URL, both read dates, and the dates of the later re-reads
     (3.6).
   - One row per no-site candidate (9): the re-check result, and whether a
     find is written now or held (D11).
2. **Data**, in this order:
   - `UPDATE candidate ... FROM (VALUES (candidate_id, legal_name,
     is_incumbent, source, verified_at, fec_id), ...)` for all 106, joined
     on `candidate_id` **and** `legal_name`, so a wrong id updates nothing
     and the count assertion fails. `fec_id` only for the 43 federal rows,
     with `COALESCE` so a missing match keeps NULL.
   - Rendon and Uthmeier are written like everyone else: their source and
     date are added to the existing true values.
   - `race.incumbent_id` and `race.is_open_seat` for all 53, **derived in
     SQL** from the candidate rows: the one ballot candidate with
     `is_incumbent`, else NULL. Only a race with two or more gets a literal
     value, from the worksheet's race row. Then `is_open_seat =
     (incumbent_id IS NULL)`.
   - `running_mate`, `running_mate_source` (the `canDetail` URL) and
     `running_mate_verified_at` for the eight GOV ballot candidates, each
     name as D6 produces it.
   - `official_site` and `site_last_verified_at` only for a re-check find in
     a listed race (D11).
   - Then the constraints and the trigger (3.2).
3. **Assertions**, in a `DO $$` block like 0038's:
   - the 49 county ballot candidates all carry a source. This holds offline
     too, because 0031, 0032 and 0038 seed the county roster in the
     harness;
   - when the DoE roster is absent (offline harness: no `FL-GOV-general`
     candidates), `RAISE NOTICE` and stop, as 0038 does;
   - live: all 106 carry a source; the number with `is_incumbent` equals the
     worksheet's total, written into the file as a literal; every
     `incumbent_id` names a ballot candidate of that race who has
     `is_incumbent`; a race with exactly one such candidate names that one;
     `is_open_seat = (incumbent_id IS NULL)` on all 53; `FL-GOV-general` is
     open; `FL-ATG-general` is `FL-DOE-89041` and `FL-HIL-SB4-general` is
     `FL-VF-HIL-2672`; all eight GOV ballot candidates have a running mate;
     the sited count equals 97 plus the listed-race finds.
4. Idempotent: every statement re-runs, like 0038 and 0046. A re-run with
   the same values passes the trigger, because the values do not change.

The approval route for these values is D10: the founder reviews the
worksheet and the migration in one PR, and gives a separate yes before the
live apply. No agent writes any of these columns.

### 3.5 Display: incumbency (D2)

- **One line on every card in a race**, in the same place under the party
  chip, as plain caption text with no colour and no chip: **"<label>: Yes"**
  or **"<label>: No"**. The label is the same on every card in the race;
  only the value differs, as the name does. It appears on the three
  surfaces that render the chip today: `CandidateBrief`,
  `ListedCandidateCard` and the roster cards in `RaceCompare`.
- **The label comes from a fixed table** in `src/lib/incumbency.ts`, keyed
  on `race_id`:

  | Races | Label |
  |---|---|
  | `FL-<n>-general`, the 16 U.S. House races | Member of the U.S. House now |
  | `FL-SEN-general` | Member of the U.S. Senate now |
  | `FL-GOV`, `FL-ATG`, `FL-CFO`, `FL-AGR`, `FL-ORA-MAYOR`, `FL-ORA-CLERK` | Holds this office now |
  | `FL-BRO-CC*`, `FL-DAD-CC*`, `FL-HIL-CC*`, `FL-ORA-CC*` | Member of the Broward / Miami-Dade / Hillsborough / Orange County Commission now |
  | `FL-BRO-SB*`, `FL-DAD-SB*`, `FL-HIL-SB*`, `FL-ORA-SB*`, including At Large 8 and Chair | Member of the Broward / Miami-Dade / Hillsborough / Orange County School Board now |

  A `race_id` the table does not match gets no label, and its race shows no
  line. Each label states a fact that is true of the person beside it: on
  FL-20 it says Wasserman Schultz sits in the House, not that she holds
  District 20.
- **All or none per race.** `incumbencyFor(race, raceCandidates)` replaces
  `showIncumbentChip(candidate)`. It returns `{ label, byCandidate }` only
  when `SHOW_INCUMBENT_CHIP` is true, the race has a label, and every
  ballot candidate in the race has `incumbency_verified_at`; otherwise
  `null`, and no card in that race shows the line. A candidate added later
  without a source hides the line for that race instead of reading "No".
- **Computed at render**, outside the data cache (3.9): the race page and
  the candidate page call `incumbencyFor` on the rows the cached loaders
  return (`getRaceBrief`, `getRaceListing`, and `runningFor()` at
  `candidates/[candidateId]/page.tsx:26-27`) and pass the result to the
  cards.
- `race.incumbent_id` and `is_open_seat` stay unread in `src/`; the line
  carries the fact a voter needs (D4).
- **`/methodology` gets one paragraph, in the flip PR only**, so it never
  ships if the flag never flips: "Beside each candidate we say whether they
  serve today in the office or on the body the race elects to: 'Holds this
  office now' for an office one person holds, 'Member of … now' for
  Congress, a county commission or a school board. A member counts whatever
  district or seat they hold today: a member of Congress running in a
  district renumbered by Florida's 2026 map, and a commissioner or board
  member running for a different seat on the same body, both count. We
  check every candidate against the body's own list of current members."
- The constant keeps its name, `SHOW_INCUMBENT_CHIP`, so the gate, the
  founder's decision log and the verify script keep pointing at one thing.

### 3.6 Display: running mates (D5, D6)

- **On every Governor card** (the same three surfaces), one line under the
  name, in the same place on each: **"Running mate for Lieutenant
  Governor: <name>"**, the name exactly as stored.
- **All or none**: `src/lib/running-mate.ts` `runningMatesFor(raceCandidates)`
  returns names only when every ballot candidate in the race has
  `running_mate`; otherwise `null`. There is no constant: the gate is the
  data, and the migration fills all eight in one statement after a reviewed
  read. Races other than Governor never have a running mate, so they never
  show the line.
- No link, no party, no photo, no separate page for a running mate: every
  ticket gets exactly the name.
- **The stored name (D6)** is the DoE page's text after one rule: decode
  HTML entities, turn each non-breaking space into a space, collapse every
  run of whitespace (spaces, tabs, carriage returns, line feeds) to one
  space, and trim. Nothing else changes: case, accents and punctuation stay
  as printed. The rule is a pure function, `normalizeDoeText` in
  `running-mate.ts`, which the worksheet's read uses and section 6 tests on
  the two raw strings in 2.6.
- **R5**: `scripts/candidate-leads.ts check` adds the stored running-mate
  names (ballot rows where `running_mate` is not NULL) to the names it
  compares against, so a running mate already stored is dropped as
  `on_roster` rather than queued. R5's 82-name roster is otherwise
  unchanged (2.6). The news matcher's roster (`loadRoster`) is unchanged, so
  stories about a running mate do not attach to the governor candidate.
  `check` reads the new column, so this change merges only after the
  migration is live; the agent worktree checks out `origin/main` at every
  run start (R5 spec §2), so R5 picks it up at its next run.
- **Leads R5 queues before that** (its 2026-10-08 13:38 UTC run, and Mon
  10-12 if the code PR has not deployed): a `running_mate` lead whose name
  equals a worksheet running mate, after D6's rule and R5's own accent fold,
  is **approved**. Approval only records "lead noted for research" (R5 spec
  §5, lines 161-162), and its dedupe key stops the same name being queued
  again. A running-mate lead whose name matches no ticket goes to the
  replacement check below.
- **Detecting a replacement through Nov 3** (a governor candidate can name a
  new running mate). R2 is not used: it stays off (D12), its rails do not
  admit the DoE host (2.8), and it has produced no report since 09-14.
  Instead:
  1. the eight `canDetail` pages are re-read on Sat 10-17 (before the
     freeze), Mon 10-26 and Mon 11-02 by a read-only session, and the
     results are added to the worksheet;
  2. once the R5 change is live, a news mention of a running-mate name that
     is not stored is no longer dropped as `on_roster`, so R5 queues it as a
     lead. R5 keeps running through the freeze (brief-content BC12;
     agent-retrofit D11).

  Either way, a difference is a correction (3.10), never an automatic
  write.

### 3.7 The website slot, and the nine with no site (D7, D11)

- **One slot on every candidate card, on all five surfaces**:
  `CandidateBrief`, `ListedCandidateCard`, the `RaceCompare` roster card,
  `CandidateBrowser` and `SavedCandidates`. A new shared component,
  `src/components/features/CampaignWebsite.tsx`, renders **"Campaign
  website: "** followed by either a link whose text is the site's host
  without `www.` (for example `cynthiaforbrowardschools.com`), or **"none
  listed"**, in the same muted caption. The label is identical on every
  card; only the value differs. The screen-reader-only candidate name stays
  on the link, and the URL still goes through `safeHttpUrl`; a value that
  fails it renders "none listed".
- **"Campaign website" is true of all 97 stored values**: the collection
  stored campaign sites only, and no stored host is a government page
  (2.7).
- **"None listed" describes our list, not the candidate.** For eight of the
  nine, nothing verifiable was found. Colucci's genuine site was verified as
  hers and withheld because it is compromised (founder decision
  2026-09-25). For her, "none listed" is true because we list none, not
  because her site was unverified.
- **Re-check once more** during the worksheet pass, by the
  `candidate-sites-2026-09-24.md` method: fetched and read in headless
  Chromium, the page names the candidate and the 2026 office, and a second
  independent read. Colucci stays NULL unless her site is clean.
- **Where a find lands (D11).**
  - In a listed race (Bogen, Fisher, McKinzie, Bendross-Mindingall, Colucci,
    Gallo): written in the migration. A listed race has no brief, so the
    slot is the only thing the site changes.
  - In a published race (Jassenoff FL-25, Hosey FL-26, Datto FL-GOV):
    recorded in the worksheet and held until after Nov 3. Their briefs were
    built without a site: no passage of theirs could count
    (`brief-rows.ts:352-357`), the re-run cut-off was 10-12, and the
    brief-content refresh admits no new sites. Storing the site now would
    put a link beside a brief that never read it, and its "No stated
    position found" lines would rest on a site nobody read.
- `/methodology` needs no change: it already says the website is "one we
  have opened and confirmed names the candidate and the office"
  (`src/app/(public)/methodology/page.tsx:308-311`).

### 3.8 Campaign contact (D8, D12)

- **This section is the display only.** Collection and review are the agent
  retrofit's D5: the `contact_update` kind in its own migration, the payload
  `{ candidate_id, campaign_email, campaign_phone, contact_url, source_url,
  seen_at }`, `mailto:` and `tel:` links on the candidate's own site only,
  no mailing address, and approval in `/admin` writing the row; built after
  Nov 3. This spec adds no review kind, payload or migration for contact.
- **Where**: only on the candidate's own page, where `CandidateContact`
  already sits (`page.tsx:81, 125`), never on race pages, so race-page space
  stays equal.
- **Every candidate page** shows the "Contact the campaign" section once it
  is turned on. A candidate with no approved row gets one fixed sentence,
  the same for all: **"We do not list contact details for this
  campaign."** It states what we list, so it is true for a candidate with
  no website and for one whose contact row is still waiting for review.
- `CandidateContact` renders no mailing-address line, since none is
  collected.
- **Hidden through Nov 3**: `SHOW_CANDIDATE_CONTACT` stays unset, and the
  founder confirms in Vercel that it is unset before Mon 10-12 12:01 UTC
  (section 5).
- **R2 through Nov 3 (D12)**: disabled before Mon 10-12 12:01 UTC, as
  brief-content BC12 and agent-retrofit D9 also recommend, and the founder
  checklist's **Run now** on `cap-r2-contact-refresher` is skipped. R2 next
  runs on the retrofit's rewritten prompt, which writes no
  `candidate_contact`.
- **If R2 must run before then** (D12's TO FLIP), these lines of its
  `SKILL.md` change first, before Mon 10-12 12:01 UTC:
  - `:10`: drop "candidate contact info,";
  - `:15-16`: rule 1 drops contact, including "or an official election
    filing";
  - `:19-20`: rule 3 drops "candidate_contact rows";
  - `:27`: the contact source line goes;
  - `:35-38`: HOW TO WORK step 2 goes;
  - `:56`: write (a) goes;
  - `:70`: `candidate_contact` joins the never-write list.

  R2 gets no running-mate task either way.

### 3.9 Caching

- **Code takes effect on deploy.** `incumbencyFor`, `runningMatesFor` and
  the website slot run at render, on the rows the cached loaders return,
  outside `unstable_cache`. A code change (adding a line, the flip, turning
  the flag off) takes effect with the deploy that ships it, because the
  pages are rebuilt then (2.10).
- **Data takes up to an hour.** A database write reaches a page when that
  page's cache entry is next fetched: at most 3600 s later (all four
  loaders), and sooner after the daily 10:00 UTC `refresh-news` run marks
  the `races` tag stale.
- **The code PR moves the keys**: `race-brief` and `race-listing` go from
  `v2` to `v3`, and `candidate-detail` and `candidate-listing` gain `v2`.
  An entry cached before the migration was applied lacks the five columns.
  Without the bump, a page built by the new deploy could reuse it and show
  no running-mate line for up to an hour, which would also make the
  deploy's live check wrong. Missing fields read as "not set", so the worst
  case is a line hidden, never a wrong one.
- **What follows for timing.** The migration goes live Sun 10-11. The code
  PR deploys Mon 10-12 with new keys, so its cards read the filled rows at
  once. The flip is a code change, live on its deploy. The flip's last
  merge is Fri 10-16 18:00 EDT (D3). So nothing from this spec reaches
  voters inside the freeze except a correction (3.10).

### 3.10 Corrections and rollback

- **Before 10-18**: a wrong value is fixed by a reviewed migration, or by
  SQL the founder approves, with a new source and date. The trigger
  requires both.
- **From 10-18 04:00 UTC to 11-04 05:00 UTC**, `candidate` is under the
  freeze guard. A fix follows brief-content §3.6.5: a correction file in
  `docs/general-election/corrections/`, the founder's yes, then one
  transaction in the SQL editor that begins
  `SET LOCAL kyv.freeze_correction = '<file>'`.
- **Fastest safe responses**:
  - **Incumbency, a wrong value anywhere**: a one-line PR setting
    `SHOW_INCUMBENT_CHIP` to false. It hides the line on every race at
    once, takes effect on deploy and writes nothing to the database. Under
    D3 it then stays off through Nov 3. The data fix follows as above.
  - **Running mate, wrong or replaced**: clear `running_mate`,
    `running_mate_source` and `running_mate_verified_at` on one Governor
    row (one UPDATE, under the freeze setting during the freeze).
    `runningMatesFor` then hides all eight lines, within the cache bound in
    3.9. The fix restores all eight with the new value, source and date.
  - **Website**: set the bad `official_site` to NULL, under the freeze
    setting during the freeze; the card then reads "none listed".
  - **A candidate removed or added**: its own reviewed migration, as 0038
    was, under the freeze setting during the freeze. An added candidate has
    no incumbency source, so its race's line hides itself until it gets
    one.
- **An ask of the freeze-copy PR**: add `src/lib/incumbency.ts`,
  `src/lib/running-mate.ts`, `CandidateBrief.tsx`, `RaceCompare.tsx` and
  `CampaignWebsite.tsx` to the frozen-file manifest, so a change to them
  during the freeze shows up in the diff with a correction note. Its §3.6.3
  list has `RaceListing.tsx`, `listing.ts` and `briefs.ts`, but not these.

### 3.11 The gate to flip `SHOW_INCUMBENT_CHIP`

Flip to `true` only when every one of these holds, and paste the query
output into the flip PR:

1. `roster_completeness` is applied live and its DO block passed.
2. Every ballot candidate carries a source:
   ```sql
   SELECT count(*) FROM candidate c
    WHERE c.ballot_status = 'ballot'
      AND EXISTS (SELECT 1 FROM race r WHERE c.candidate_id = ANY (r.candidate_ids))
      AND c.incumbency_verified_at IS NULL;          -- must be 0
   ```
3. Every race agrees with its candidates (3.1):
   ```sql
   SELECT r.race_id
     FROM race r
     CROSS JOIN LATERAL (
       SELECT count(*) FILTER (WHERE c.is_incumbent)                         AS n_inc,
              max(c.candidate_id) FILTER (WHERE c.is_incumbent)              AS one_inc,
              coalesce(bool_or(c.is_incumbent AND c.candidate_id = r.incumbent_id), false) AS named_ok
         FROM candidate c
        WHERE c.candidate_id = ANY (r.candidate_ids) AND c.ballot_status = 'ballot') s
    WHERE r.is_open_seat <> (r.incumbent_id IS NULL)
       OR (r.incumbent_id IS NOT NULL AND NOT s.named_ok)
       OR (s.n_inc = 1 AND r.incumbent_id IS DISTINCT FROM s.one_inc);  -- must return no rows
   ```
4. `node scripts/verify-incumbent-chip.ts` passes, including the label check
   over the 53 production race ids (section 6).
5. The display (D2) is merged and deployed with the flag still false, and
   its live check is done.
6. The founder says yes by Thu 10-15 (D3), and the flip PR is merged and
   deployed by Fri 10-16 18:00 EDT. If any of these misses, the flag stays
   false through Nov 3.

`incumbency.ts`'s TO FLIP comment is rewritten to this list.

## 4. Founder decisions

**D1. Who counts as the incumbent.** Recommended (pending founder
confirmation): a candidate who serves today in the office, or as a sitting
member of the body, that the race elects to (3.1), shown with a label that
names the body or the office (3.5). Wasserman Schultz (FL-20) and Moskowitz
(FL-25) are Yes, and Gallo (Chair) is Yes if the worksheet confirms her
District 1 seat, each under a label that is true of them.
TO FLIP: "this seat only". `is_incumbent` means holding this race's own seat
number, and every race uses one label, "Holds this seat now". Wasserman
Schultz, Moskowitz and Gallo become No, and FL-20 and FL-25 are open (District
20 is vacant; District 25's member runs in FL-20). Orange Districts 7 and 8
have no holder (map viewer). The methodology paragraph then says which seat
counts. The worksheet's second column holds this data, so no new read is
needed.

**D2. How incumbency is shown.** Recommended (pending founder confirmation):
the "<label>: Yes / No" line on every card, all or none per race, replacing
the chip (3.5). TO FLIP: show nothing this cycle. Keep `SHOW_INCUMBENT_CHIP`
false through Nov 3 and store the data only. A chip shown only when true is
not offered: it is a label some candidates get and others do not, which the
house rule forbids.

**D3. When it can go live.** Recommended (pending founder confirmation): flip
only if the gate (3.11) closes, with the founder's yes by Thu 10-15 and the
flip PR deployed by Fri 10-16 18:00 EDT. Otherwise keep it off through Nov
3. Once turned off during the freeze (3.10), it stays off. TO FLIP: allow a
flip, or turning it back on after a correction, during the freeze, as a
correction under brief-content §3.6.5 with the same gate.

**D4. Open seats.** Recommended (pending founder confirmation):
`is_open_seat = (incumbent_id IS NULL)` on all 53 races, set by the
migration, and not displayed; the per-card line already says it. TO FLIP:
add one race-level sentence, identical on every open race: "No candidate in
this race serves in this office or on this body now."

**D5. Running mates: where stored and shown.** Recommended (pending founder
confirmation): three columns on `candidate` (3.2), and the "Running mate for
Lieutenant Governor" line on all eight Governor cards at once, data-gated
all or none (3.6). TO FLIP: store only and show nothing until after Nov 3
(drop the line, keep the columns).

**D6. Running-mate spelling.** Recommended (pending founder confirmation):
the DoE page's text with whitespace collapsed and nothing else changed
(3.6): "Bryan Avila" (no accent), "Ruben A. Coto". The same source and rule
for all eight. TO FLIP: each campaign's own spelling, which needs a second
source for every ticket, not just one.

**D7. The website slot.** Recommended (pending founder confirmation):
"Campaign website: <host>" or "Campaign website: none listed" on every card
of all five surfaces (3.7), replacing the "Official site" link. TO FLIP: all
or none per race. A link is shown only in races where every candidate has a
stored site, so the nine races with a candidate without one (FL-GOV, FL-25,
FL-26 and the six listed county races) show no link for anyone. Today's
behaviour, where the link appears only where set, is not offered: it is the
unequal label this slot removes.

**D8. Contact display.** Recommended (pending founder confirmation): on the
candidate page only; every candidate page gets the section once it is
turned on; with no approved row, the fixed sentence "We do not list contact
details for this campaign."; collection and review as the agent retrofit's
D5 (campaign-site `mailto:`/`tel:` only, no addresses, reviewed in
`/admin`); hidden through Nov 3 (3.8). TO FLIP: allow the DoE filing's email
and phone as a second source (this gives the nine no-site candidates contact
details at the cost of republishing personal filing data, and changes the
retrofit's D5); or show no contact section for 2026.

**D9. B4.** Recommended (pending founder confirmation): do not run B4 live
for 2026. It covers 16 of 53 races, would refuse at least 6 of those 16,
writes without review or source, and needs two open gates; the reviewed
migration covers all 53. Keep its resolver; the `fec_id` values the
migration stores make its id rule usable later. The new trigger makes it
fail on any value it would change on a sourced row, and the CHECK refuses a
sourceless true (3.2). TO FLIP: close the DB-password and venv gates and run
it as a read-only cross-check of FL-House rows before the worksheet PR is
reviewed (its output compared to the worksheet, nothing written).

**D10. The approval route for agent-produced roster data.** Recommended
(pending founder confirmation): the worksheet and the migration are produced
by an agent session, so they need a human approval before any voter sees
them. The approval is the founder's review of the PR that holds both (every
row with its URL and quoted evidence) and the founder's separate yes before
the live apply, as for 0036, 0038 and 0046. `/admin` has no review kind that
writes these columns, and building one cannot finish before 10-15. TO FLIP:
a `/admin` review kind, `roster_fact`. That needs a migration widening
`review_item_kind_check`, a payload `{ candidate_id, field, value,
source_url, read_at }`, an effect that writes the value with its source and
date, and a card, plus 114 approvals (106 candidates and 8 tickets). Display
then moves to after Nov 3, unless all of it is built, merged and approved by
Thu 10-15.

**D11. A newly found site in a published race.** Recommended (pending founder
confirmation): record it in the worksheet and write it after Nov 3, with a
brief run for that candidate then; write listed-race finds now (3.7). TO
FLIP: write it now and add that candidate to the brief refresh before Gate 2
(Wed 10-14). The brief-content spec's §7 then has to admit one new site,
with its own Gate 3 yes.

**D12. R2 through Nov 3.** Recommended (pending founder confirmation):
disabled before Mon 10-12 12:01 UTC, through Nov 3 (the same act as
brief-content BC12 and agent-retrofit D9). The founder checklist's **Run
now** on `cap-r2-contact-refresher` is skipped, and R2 returns only on the
retrofit's rewritten prompt. TO FLIP: keep R2 on. The prompt lines in 3.8
then change before Mon 10-12 12:01 UTC, and `SHOW_CANDIDATE_CONTACT` is
confirmed unset first.

**D13. Migration numbers for the four 2026-10-08 specs.** Recommended (pending
founder confirmation): one docs-only ledger PR, Fri 10-09 before 12:00 EDT,
claims every number the four specs need, in planned live-apply order, with
`roster_completeness` before `content_freeze`. If `content_freeze` already
holds a lower number by then, it moves: it is unapplied until Thu 10-15, so
the ledger's rule 1 allows it, at the cost of a `git mv` and a grep on its
branch. The same replay problem (3.2) hits any file that writes a guarded
table and sorts after `content_freeze`, such as the Amendment 1 publish the
brief-content spec plans for 10-16; the ledger PR flags that for its owner.
TO FLIP: each spec claims its number at its own branch cut, first come first
served. If `roster_completeness` then sorts after `content_freeze`, its data
statements run after `SELECT set_config('kyv.freeze_correction',
'roster_completeness', true)`, so a replay inside the window passes. The
setting is local to the migration's transaction and changes nothing before
10-18.

## 5. Rollout order

Each step names what must be merged or applied before it. Times are Eastern
(EDT until Nov 1).

0. **Fri 10-09, before 12:00: ledger PR** (D13, docs only). It adds rows to
   `supabase/migrations/README.md`, with `roster_completeness` before
   `content_freeze`. Needs: nothing. Before step 4, which cannot name a file
   without it.
1. **Now: merge PR #131** so 0046 is on `main`. It is already applied live,
   and the migration's assertions name its rows.
2. **Fri 10-09, by 18:00, with Gate 0: D1, D10, D12 and D13.**
   - D12: R2 disabled before Mon 10-12 12:01 UTC. This is the same act as
     BC12.
   - The founder confirms in Vercel (Project, Settings, Environment
     Variables) that `SHOW_CANDIDATE_CONTACT` is absent or not `true` for
     Production and Preview.
   - Needs: nothing.
3. **Fri 10-09 to Sat 10-10: the worksheet** (agent, read-only; 3.3, 3.4),
   including the nine site re-checks and the eight `canDetail` reads. It
   starts Fri morning on the Recommended D1; both D1 columns are recorded,
   so a flip changes a column, not a read.
4. **Sat 10-10 by 20:00: PR 1, `claude/roster-completeness`**: the
   worksheet, the migration under its claimed number, and its
   `verify-migrations.mjs` cases. Needs: steps 0, 1 and 3.
5. **Sun 10-11: founder review of PR 1.** Approving it confirms D4, D6, D9
   and D11, which the data encodes. After merge and the founder's yes,
   apply through the MCP `apply_migration`, read it back as `anon` on one
   listed and one published race, and run gate queries 2 and 3 read-only.
   Needs: step 4. **Cut-off**: applied by Thu 10-15 12:00; later, it waits
   until after Nov 3.
6. **Sun 10-11: PR 2, `claude/roster-display`**:
   - contents: `Candidate` type fields; the label table, `incumbencyFor` and
     the line, behind `SHOW_INCUMBENT_CHIP = false`; `runningMatesFor`,
     `normalizeDoeText` and the running-mate line; `CampaignWebsite` on the
     five surfaces; the cache keys (3.9); R5's running-mate names; the
     verify scripts;
   - the founder reviews it Sun 10-11 or Mon 10-12. Approving it confirms
     D2, D5, D7 and D8's display, because it ships the running-mate line and
     the website slot to voters on deploy;
   - merged only after step 5, because R5's `check` reads
     `candidate.running_mate`;
   - after deploy, the live check: FL-GOV shows eight running-mate lines
     and eight website slots (Datto's reads "none listed"); one listed
     county race; `/candidates`; `/saved`; one candidate page;
   - **cut-off**: merged by Fri 10-16 18:00, because it changes frozen
     files (`RaceListing.tsx`, `listing.ts`, `briefs.ts`). Missed, it waits
     until after Nov 3.
7. **After each R5 run until step 6 deploys** (2026-10-08 13:38 UTC; Mon
   10-12): triage `running_mate` leads as in 3.6. Needs: nothing.
8. **Tue 10-13, with CFO Gate 3: the founder's yes on the flip**, with the
   gate output (3.11). At the latest Thu 10-15, with Gate 3. Needs: steps 5
   and 6 deployed.
9. **Wed 10-14: flip PR**: `SHOW_INCUMBENT_CHIP = true`, the `incumbency.ts`
   comment, the `verify-incumbent-chip.ts` expectations and the
   methodology paragraph. Merged and deployed by Fri 10-16 18:00 at the
   latest, then the live check (FL-20 shows "Member of the U.S. House now"
   on all three cards). The freeze-copy PR (Sat 10-17) rebases on it,
   since both edit `methodology/page.tsx`. Needs: step 8.
10. **Sat 10-17**: the first `canDetail` re-read (3.6). The brief-content
    live check reads the "Campaign website:" slot, not "Official site", on
    every card. The freeze-copy PR adds the files in 3.10 to the manifest.
11. **Mon 10-26 and Mon 11-02**: the other two `canDetail` re-reads.
12. **After Nov 3**: the held published-race sites (D11) with their brief
    runs; contact, through the retrofit's PR E and then the display in 3.8;
    R2 back on its new prompt.

## 6. Testing

- **`scripts/verify-migrations.mjs`** (PGlite, offline), for
  `roster_completeness`:
  - it applies after 0047; the five columns exist;
  - the CHECKs reject a source without a date, a true `is_incumbent` with no
    source, a running mate on a non-Governor row, two of the three
    running-mate columns, and a running mate with a doubled space;
  - the trigger refuses a changed `is_incumbent` on a sourced row without a
    new source or date, run as `cap_tool_wrapper`, which has no `EXECUTE` on
    the function, using B4's exact statement from `store.py:243-247`;
  - the same change with a new source and date passes; an unchanged value
    passes; clearing all three running-mate columns passes;
  - `anon` reads the new columns on a listed race's candidate and not on a
    draft race's;
  - the county assertions pass on the seeded county roster, and the
    DoE-absent branch raises its notice instead of failing;
  - ordering: if a `*_content_freeze.sql` file exists,
    `*_roster_completeness.sql` sorts before it.
- **The migration's own DO block** on the live apply (3.4), the whole-ballot
  check the offline harness cannot do.
- **`scripts/verify-incumbent-chip.ts`**, updated:
  - `incumbencyFor` returns `null` with the flag false; with it true, it
    returns `null` when any candidate lacks `incumbency_verified_at` or the
    race has no label, and the full map otherwise;
  - the label table maps each of the 53 race ids (a fixture copied from
    `SELECT race_id FROM race` on the day PR 2 is cut) to the label in 3.5,
    and an unknown id to none;
  - each of the three surfaces (`CARDS` gains `RaceCompare.tsx`) renders
    the line once, from the map, with identical markup for Yes and No;
  - nothing else in `src/` reads `is_incumbent`, `incumbent_id`,
    `is_open_seat` or the new incumbency columns;
  - each guard is mutation-checked: deleting the all-or-none test, or
    rendering the line only when true, fails the script.
- **`scripts/verify-running-mate.ts`** (new, plain Node):
  - `normalizeDoeText` turns the raw strings from `canDetail` 89042 and
    90630 (2.6) into "Bryan Avila" and "Ruben A. Coto";
  - all eight named gives eight lines; one missing gives none; a
    non-Governor race gives none;
  - the three surfaces render it once, from the map; nothing else reads
    `running_mate`;
  - mutation-checked the same way.
- **`scripts/verify-campaign-website.ts`** (new: a pure helper plus a source
  scan, like `verify-incumbent-chip.ts`):
  - the host text drops `www.`; a URL that fails `safeHttpUrl` gives "none
    listed";
  - each of the five surfaces renders `<CampaignWebsite>` exactly once per
    card;
  - the string "Official site" appears nowhere under `src/components` or
    `src/app`;
  - mutation-checked.

  `scripts/verify-listing.ts` is not the harness for this. It tests the
  copy functions in `listing-copy.ts` and renders nothing; it keeps passing
  unchanged.
- **`scripts/verify-candidate-leads.ts`**: a running-mate mention whose name
  equals a stored running mate is dropped `on_roster`; with no stored
  running mates, the current fixtures' results are unchanged.
- **The gate queries** (3.11), run read-only on production before the flip.
- **Live checks** after each deploy (step 6, step 9): two GETs per page, as
  listed in section 5.
- `npm run verify` (all of the above) green before each of the three PRs
  merges.

## 7. Out of scope

- Retitling the Governor race "Governor and Lieutenant Governor" to match the
  ballot, and any running-mate page, news, socials or site.
- Showing `is_open_seat` (D4) or `prior_offices`.
- Contact collection and its review kind (agent-retrofit D5), and turning
  contact on before Nov 3.
- Running B4 live (D9), Congress.gov (B5), and fixing why R2 and R3 runs stop
  without a report (agent-retrofit).
- Incumbency and running mates in the candidate directory
  (`CandidateBrowser`) and saved-candidates views. They show neither today
  and gain neither; they do get the website slot (3.7), which they already
  print today.
- R5's roster scope (the 82 published-race candidates, 2.6), beyond adding
  the stored running mates.
- Any roster change beyond these columns and the nine site re-checks. A
  candidate found missing or wrong during the worksheet pass is reported to
  the founder and fixed in its own reviewed migration, as 0038 was.
