# The 17 listed races, the silent candidates, and FL-27 / FL-AGR (2026-10-04)

Launch handoff §3, founder decisions 4 and 6, plus the "known quality limits" item for FL-27 and FL-AGR (`launch-handoff-2026-10-04.md`). **Nothing here changed the database.** Every count was read live with `SELECT` on 2026-10-04 between about 20:15 and 20:35 UTC, or from the run files named in each section. Live pages were fetched with `GET` only.

| Decision | Recommended (pending founder confirmation) | How to flip |
| -------- | ------------------------------------------- | ----------- |
| 4. Is "listed, no brief" acceptable on Election Day for the 17? | **Yes.** Keep all 17 at `listed`. Change the listing copy so it stops promising a brief that is not coming (written behind one constant; the card line reaches voters once two components pass the race's status, §2). | Set `LISTED_IS_FINAL = false` in `src/lib/listing-copy.ts` to restore the "in review" wording. To brief them anyway, see "If the founder says no" below. |
| 6. A second source for silent candidates? | **No, not this cycle.** They stay "No stated position found". | See "Silent candidates" below. |
| Known limit: FL-27 and FL-AGR have no spine coverage | **Accept, disclose on the methodology page, and let the refresh re-read Eliott Rodriguez's site** (his issues page was walled on 09-29). | Take either race back to `listed` with the SQL under "FL-27 and FL-AGR". |

## 1. The headline: 10 of the 17 are not on the November ballot

The live `qualifying_status` of the 17 races' candidates splits them three ways. Only **7 are contests a voter will see on their ballot.**

| State on 2026-11-03 | Races |
| ------------------- | ----- |
| **On the ballot (7)** | FL-CFO; Broward SB6; Hillsborough SB6; Orange CC4, CC6, Clerk and SB3 |
| **Decided in the August primary (5)** (`elected_in_primary`) | Broward CC6 (Shuham); Broward SB At-Large 8 (Zeman); Miami-Dade SB8 (Colucci); Orange SB1 (Marantes); Orange SB Chair (Gallo) |
| **Elected without opposition (5)** (`unopposed`) | Broward CC2 (Bogen), CC4 (Fisher) and CC8 (McKinzie); Miami-Dade SB2 (Bendross-Mindingall); Hillsborough SB4 (Rendon) |

So decision 4 is smaller than it looked: for 10 of the 17, a brief would describe someone the voter cannot vote for or against in November.

## 2. What voters see today, and the copy change

`GET https://knowyour.vote/races/<race_id>` at about 20:17 UTC (the URL pattern is `src/app/(public)/races/[raceId]/page.tsx`; a race with no visible brief renders `ListedRace`).

**FL-CFO-general** (a printed contest), as served:

> Here's who is on the ballot for this race, in ballot order — every candidate gets the same card.
>
> These are the names printed on the ballot for this race, from the Florida Division of Elections and the county Supervisor of Elections. **The full briefs are still in review.**
>
> *(each card)* Brief in review — we publish what a candidate says, has done, and what's verified only after every candidate in the race has equal space and equal scrutiny.

**FL-BRO-CC2-general** (unopposed) and **FL-DAD-SB8-general** (decided in August) show the right status line ("No one filed against this candidate…" and "This contest was decided in the August primary…"), then "The full brief is still in review" and the same card line.

**What misleads, if listed is the Election Day state:**
- "Still in review" and "Brief in review" promise a brief that is not coming. For the 6 races with no site at all, nothing was ever going to be reviewed.
- "What a candidate says, has done, and what's verified" describes more than any published brief carries. Every published brief holds stated positions only, quoted from the candidate's own site (`verifiable_fact_count = 0` and `fact_checks_performed = 0` on all 82 profiles; launch handoff §1).
- Nothing tells the voter why the cards are empty, so an empty card can read as "this candidate has no positions".

**The fix, in `src/lib/listing-copy.ts`** (one constant, `LISTED_IS_FINAL = true`, picks the wording):
- Both intros drop their last sentence ("The full briefs are still in review." and "The full brief is still in review."). The status line, county note and write-in note are unchanged.
- A listed race's card line becomes (`NO_BRIEF_CARD_LINE`): "No brief for this race. We write a brief only when a candidate's own campaign website states a position we can quote on an issue we cover, and we have not found one here. That is about our sources, not a judgment of the candidates."
  - It states the rule as a condition the race has not met, and promises no brief later. That keeps it true in all 17 races: no site, a site we could not read, commitments outside the 25 issues we cover, or a passage withheld as a past record. In particular, Orange Clerk has quotable commitments but no issue we cover (§3), so a line promising a brief "once we find a position we can quote" would be false there.
- A published race shown as a roster keeps an in-review line whatever the switch says (`listingCardLine(status)`), because for it a brief exists and is only briefly unreadable (see the edge case below). The in-review line is now "Brief in review — we publish what candidates state on their own campaign websites only after every candidate in the race has been held to the same rules." That is the old line without its two overpromises: "has done, and what's verified" (no published brief carries a record or a fact-check) and "equal space" (the audit's `word_count` gate runs at 150; the trust-copy rewrite in `src/app/layout.tsx` drops it too).
- With `LISTED_IS_FINAL = false`, the old "in review" intros come back word for word, and every card says "Brief in review".
- A new `LISTED_RACE_LABEL` export carries the race-card caption ("Names on the ballot · no brief") under the same switch.

**What has to land with it, and what is safe alone.** Every export keeps its HEAD name, and `BRIEF_IN_REVIEW_LINE` is still the in-review line, so `scripts/verify-listing.ts` passes unchanged and `listing-copy.ts` can merge on its own. Merged alone, voters see the intros without "still in review" and every card with the new in-review line. That agrees with the race-card caption ("brief in review"), but not with this PR's methodology rewrite, which says a listed race stays listed with no brief. So for the copy to agree everywhere, and for "No brief for this race" to reach voters, these land in the same PR (each requested of its file's owner):
- `src/components/features/RaceListing.tsx` and `CandidateListing.tsx`: pass `listing.status` to the card and render `listingCardLine(status)` in place of `BRIEF_IN_REVIEW_LINE` (type-checked in a scratch copy on 2026-10-04).
- `src/lib/races.ts`: `raceStatusLabel` returns `LISTED_RACE_LABEL` for a listed race.
- `src/app/(public)/methodology/page.tsx`: "Listed before briefed" must not say the page reads "in review". In this PR's working tree (2026-10-04, about 21:00 UTC) it already says a race "stays listed, with no brief, when there is nothing to compare", and has no "in review" left.
- `scripts/verify-listing.ts`: five added checks that pin the switch (tested in a scratch copy with the switch on and off; all checks pass).

**One edge case, now handled.** A published race whose brief is unreadable (it fails the audit re-check in `briefs.ts`, or it is dark during a rebuild, `balance_check_passed = false`) also renders the listing. `src/lib/listing.ts` carries its `status` as `published`, and `listingCardLine("published")` gives it the in-review line, which is true for it. So a race that has a brief never shows "No brief for this race" while it is dark, even in a page cached during that window (up to 3600 s). This holds once the two components pass the status. Until then every card has the in-review line anyway. The exception is a published race taken to `listed` on purpose (Path B2 of `brief-runs/refresh-plan-2026-10.md`, or a correction takedown in the freeze). Its cards read "No brief for this race" until it is published again, which is one reason the plan recommends Path B1.

## 3. The 17 races, candidate by candidate

"09-25" is the first full ingest (`policy-runs/passages-2026-09-25/`). "09-29" is the Jev-link ingest plus the two-gate Step 2 run that every published brief rests on (`brief-runs/ingest-jev-2026-09-29.md`, `gate2-2026-09-30.md`). "Both gates" counts passages that clear `commitment` and `own_commitment` at 0.85. "On an issue" counts those that also match one of the 25 taxonomy issues at 0.85; only these can become claims.

| Race | On Nov ballot? | Candidate | Verified site | 09-25 | 09-29 passages (pages) | Both gates | On an issue | Why no claim |
| ---- | -------------- | --------- | ------------- | ----- | ---------------------- | ---------- | ----------- | ------------ |
| FL-CFO | yes | Blaise Ingoglia (REP) | blaiseforflorida.com | 80 | 50 (3) | 3 | 1 | The one issue-matched passage (`6c7aaec4`, "Strengthened voter ID and election integrity laws") is a past record, withheld under the founder's 2026-09-30 middle-path rule. Two other commitments (first responders, B7 at 0.82; social media, KYV1 at 0.75) match no issue at 0.85. |
| | | Annette Taddeo (DEM) | annettetaddeo.com | 10 | 0: bot wall on the run and on its one re-run | — | — | **Walled after reading before** (decision 5). |
| Broward CC2 | no (unopposed) | Mark D. Bogen (DEM) | none | — | — | — | — | No site found (`candidate-sites-2026-09-24.md`). |
| Broward CC4 | no (unopposed) | Lamar Fisher (DEM) | none | — | — | — | — | Site disconnected (Wix 404); the other domain is parked. |
| Broward CC6 | no (decided in August) | Caryl Sandler Shuham (DEM) | carylshuham.com | 42 | 0: challenge rendered an empty page, run and re-run | — | — | **Walled after reading before** (decision 5). |
| Broward CC8 | no (unopposed) | Robert McKinzie (DEM) | none | — | — | — | — | No site found. |
| Broward SB6 | yes | Roberto Fernandez III | electroberto2026.com | 21 | 21 (1) | 0 | 0 | Nothing on the page clears both gates. |
| | | Adam Cervera | adamcervera.com | 19 | 19 (1) | 1 | 0 | "Safer Schools…" is a commitment, but matches no issue (top: B7 at 0.36). |
| Broward SB At-Large 8 | no (decided in August) | Allen Zeman | electallenzeman.com | 7 | 11 (2) | 0 | 0 | Nothing clears both gates. |
| Miami-Dade SB2 | no (unopposed) | Dorothy Bendross-Mindingall | none | — | — | — | — | No campaign site; only social profiles and her school-board office pages. |
| Miami-Dade SB8 | no (decided in August) | Monica Colucci | none stored | — | — | — | — | Her real site is hacked (casino spam), so it is stored as NULL. Still compromised on 2026-10-04: see `candidate-conflicts-2026-09-25.md`. |
| Hillsborough SB4 | no (unopposed) | Patricia "Patti" Rendon | votepattirendon.com | 1 | 1 (1) | 0 | 0 | The site yields one short passage. |
| Hillsborough SB6 | yes | Kenneth "Ken" Gay | votekennethgay.com | 13 | 18 (3) | 2 | 0 | Two commitments ("Create Pathways for New Teacher Recruitment", "Prioritize Money Directly to Student Learning") score A6 at 0.63 and 0.82, under 0.85. |
| | | Karen Perez | keepkarenperez.com | 15 | 15 (1) | 0 | 0 | Nothing clears both gates. Her `/about` page rendered 23 characters on 09-29, but it was never read before either. |
| Orange CC4 | yes | Brian Jones | brianhubertjones.com | 0 | 6 (1) | 3 | 0 | Three commitments on school-area micromobility safety match no issue (top: B7 at 0.47). |
| | | Johanna Lopez | votejohannalopez.com | 41 | 21 (2) | 0 | 0 | Nothing clears both gates. |
| Orange CC6 | yes | Michael "Mike" Scott | mymikescott.com | 9 | 19 (3) | 0 | 0 | Nothing clears both gates. |
| | | Lawanna Gelzer | lawannagelzer.com | 1 | 23 (2) | 0 | 0 | Nothing clears both gates. |
| Orange Clerk | yes | Roberta Walton Johnson (DEM) | voteroberta.com | 58 | 56 (3) | 10 | 0 | A six-point Clerk platform clears both gates, but no taxonomy issue fits a Clerk of Courts, which is why the office has no spine (`spine-proposal-2026-10-03.md`). |
| | | Terrell Thomas (NPA) | thomasforclerk.com | 23 | 43 (2) | 3 | 0 | Same: office-administration commitments, no issue fits. |
| Orange SB1 | no (decided in August) | Melissa Lopez Marantes | melissaforkids.com | 5 | 9 (2) | 2 | 0 | Two commitments score A6 at 0.13 and 0.20. |
| Orange SB3 | yes | Susanne Peña | vote4pena.com | 3 | 10 (2) | 2 | 0 | Two commitments score A6 at 0.49 and KYV10 at 0.27. |
| | | Diana Moore | votefordianamoore.com | 18 | 13 (1) | 3 | 0 | Three commitments; the closest is KYV9 at 0.72. |
| Orange SB Chair | no (decided in August) | Angie Gallo | none | — | — | — | — | Her site lapsed after she won in August (Squarespace "Website Expired"). |

**The three causes, by race:**
- **No site at all (6):** Broward CC2, CC4 and CC8; Miami-Dade SB2 and SB8; Orange SB Chair. Every one is off the November ballot.
- **Walled (1 race whole, 1 race half):** Broward CC6 (Shuham, the only candidate). FL-CFO, where Taddeo is walled and Ingoglia's one quotable passage was withheld.
- **Read, but nothing that is both a commitment and on a taxonomy issue (9):** Broward SB6 and SBAL8; Hillsborough SB4 and SB6; Orange CC4, CC6, Clerk, SB1 and SB3. In 6 of these (all but Broward SBAL8, Hillsborough SB4 and Orange CC6), at least one candidate *does* state commitments on their site. They fall short because their issue scores sit under 0.85, or because the 25-issue taxonomy has no home for the office's work (the Clerk).

So "no usable claim" never means "the candidates said nothing". The listing copy above says it that way: it is about our sources, not the candidates.

**Not recommended this cycle:** lowering the 0.85 issue threshold or adding Clerk or school-safety issues to the taxonomy. Either is a new standard that changes every race's brief (all 36 published ones included), needs Steps 2 to 4 again for everyone, and has no review time left before early voting on 10-24.

### If the founder says no (decision 4 flipped)

- **To brief the 7 printed contests anyway** (a brief of "No stated position found" in every spine cell): `brief-runs/plans-2026-10-03.ts` skips any race with no claim at `if (!claims[race.race_id])`. A copy of it without that skip writes their plans, and the apply runs exactly as on 2026-10-04. Orange Clerk has no spine, so its brief would be empty: it should stay listed whatever the call.
- **To say "in review" again** (for example, while a second source is collected under decision 6): `LISTED_IS_FINAL = false`.

## 4. Silent candidates (decision 6)

**Recommended (pending founder confirmation): no second source this cycle.** The methodology quotes the candidate's own official site only. Adding questionnaires or social posts four weeks out would be a new sourcing standard, with:
- no review time;
- no allowlist (whose questionnaire? which accounts are verified as the candidate's own?);
- a new kind of passage for the commitment gates and reviewers;
- and either a second ingest for every candidate (to keep "same kinds of source for everyone", FL-GOV D1) or a source used for some candidates only.

The 16 ballot candidates with no run stay "No stated position found" on every spine issue where their race has a brief, and keep a roster card where it does not.

| Candidate | Race | Brief published? | Why silent |
| --------- | ---- | ---------------- | ---------- |
| Dean Ocean Abrams | FL-GOV | yes | Cloudflare "Just a moment" (HTTP 403) never cleared: 09-25 (four attempts) and 09-29 (run and re-run). Never read. |
| Rob Piper | Miami-Dade CC5 | yes | Cloudflare refuses any automated client, even a real browser, every run. Never read. |
| Mike Beltran | FL-14 | yes | **Read on 09-25 (34 passages, 3 pages)**, walled on both 09-29 runs and the re-run. In the decision 5 re-run. |
| Pia Dandiya | FL-22 | yes | **Read on 09-25 (62 passages, 3 pages)**, walled on both 09-29 runs and the re-run. In the decision 5 re-run. |
| Annette Taddeo | FL-CFO | no (listed) | **Read on 09-25 (10 passages) and in the 09-29 keyword crawl**, walled on the Jev-link run and its re-run. In the decision 5 re-run. |
| Caryl Sandler Shuham | Broward CC6 | no (listed) | **Read on 09-25 and in the 09-29 keyword crawl (42 passages)**, walled on the Jev-link run and its re-run. In the decision 5 re-run. |
| Jeannette Quiñones Hernández | Orange CC8 | yes | Her robots.txt refuses ClaudeBot, Claude-Web and anthropic-ai by name. Honoured, as designed. No re-run: it is the site owner's choice. |
| Jeffrey "Dr. Jeff" Datto | FL-GOV | yes | No site: his posts advertise a parked domain (FL-GOV D3). |
| Peter Jassenoff | FL-25 | yes | No verified site. |
| Deborah Ann Meidinger Hosey | FL-26 | yes | No verified site. |
| Mark D. Bogen | Broward CC2 | no (listed) | No site found. |
| Lamar Fisher | Broward CC4 | no (listed) | Site disconnected; the other domain is parked. |
| Robert McKinzie | Broward CC8 | no (listed) | No site found. |
| Dorothy Bendross-Mindingall | Miami-Dade SB2 | no (listed) | Social and office pages only. |
| Monica Colucci | Miami-Dade SB8 | no (listed) | Real site, hacked; stored NULL until cleaned. |
| Angie Gallo | Orange SB Chair | no (listed) | Site lapsed after her August win. |

**The handoff named only Taddeo and Shuham as "read before, walled later".** The 09-25 index shows **Beltran and Dandiya also read on 09-25**. They were walled only on 09-29, when both 09-29 runs and the re-run failed. All four are in `brief-runs/rerun-targets-2026-10.tsv`. **Eliott Rodriguez** (FL-27) is there too, for a walled page rather than a walled site (§5).

**A wording issue that touches every silent cell (requested of the owner of `src/components/features/ClaimList.tsx`).** `NoStatedPosition` says "we searched this candidate's own sources and found no position on this issue". For Datto and the 8 other no-site candidates, there was nothing to search. For Abrams and Piper, nothing could be read. For candidates like Salazar on healthcare (§5), the site has text on the issue that the gates scored as a record, not a commitment. Suggested wording, true in all three cases: "No stated position found — we found no position on this issue that we could quote from this candidate's own campaign website. Silence is recorded honestly, never filled in."

**If the founder says yes to a second source (decision 6 flipped):** the narrowest version that keeps one rule for everyone is "a candidate's answers to a named nonpartisan questionnaire, quoted verbatim, for every candidate in the race where one exists". It needs:
- a methodology paragraph;
- a `source.type` the brief shows distinctly;
- an ingest for that one source;
- the same two gates and reviewer pass;
- and the refresh calendar moved, because it would not fit by 10-17.

## 5. FL-27 and FL-AGR: published, with no spine coverage

Both are published. In each, every spine cell reads "No stated position found" for both candidates. Live, `GET` on 2026-10-04 about 20:25 UTC:
- **FL-27:** the spine is B1 Economy, B2 Healthcare, B3 Immigration, B4 Social Security and Medicare. All 8 cells are "No stated position found".
  - Eliott Rodriguez: nothing else.
  - Maria Elvira Salazar: three candidate-added issue blocks: KYV1, a Venezuela bill; A5 and KYV4, the same Everglades passage shown twice.
- **FL-AGR:** the spine is A5, KYV5, KYV3 and A4. All 8 cells are "No stated position found".
  - Wilton Simpson: one candidate-added block, KYV9 School choice.
  - Joey Mendoza Atkins: nothing else.

Live rows (`SELECT` on `issue`, `position`, `claim`): FL-27 has 3 claims, 7 issues and 11 positions; FL-AGR has 1 claim, 5 issues and 9 positions. Every spine position is `no_stated_position_found`.

**Why, from the run files:**
- **Eliott Rodriguez, FL-27: a walled page, not a silent candidate.**
  - His `/issues` page gave **50 passages on 09-25 and again in the 09-29 keyword crawl**.
  - On the 09-29 Jev-link run, two hours later, it "rendered, but only 23 characters of text". That is the same signature as Taddeo's challenge page on her first 09-29 attempt.
  - Only his homepage was read (3 passages, 0 commitments). His ingest exited 0, so the 09-29 "re-run every failure" rule never caught it.
  - He is the one page-level case in `rerun-targets-2026-10.tsv`. To read the decision 5 rule as whole-site walls only, delete his line from that file.
- **Maria Elvira Salazar, FL-27: the gates, working as designed.**
  - Her economy and healthcare pages are mostly record lines ("Passed…", "Introduced…", "Co-sponsored…").
  - Her forward-looking lines fail the second gate at 0.85. "As your representative in Congress, I am working to create more opportunities…" scores B1 0.98 but `own_commitment` 0.46. "I am committed to strengthening our healthcare system…" scores B2 0.96 but `own_commitment` 0.73.
  - This is the "commitment gate recall of about 0.85" limit, as it lands on one race.
- **Wilton Simpson, FL-AGR:**
  - His environment and agriculture pages are records of his Senate and Commissioner terms ("Under Wilton's leadership…", "$782 million for water quality…"). They score high on A5 and KYV3 and low on commitment.
  - His forward-looking greenbelt line (`69f66975`, KYV3 0.89) has `own_commitment` 0.66.
  - Four tax-exemption list items cleared both gates and were withheld as past record (middle path, 2026-09-30).
- **Joey Mendoza Atkins, FL-AGR:** his site gives 2 passages. The one on cost of living (A4 0.96) scores `commitment` 0.49.

**Recommendation (pending founder confirmation): keep both published, disclose, and re-read Rodriguez.**
- Taking them down would hide the 4 claims they do have, under a rule the founder already set: a race with at least one claim gets a brief (spine-proposal Decision 3).
- The methodology page should say plainly that the gates reject record lines and some forward-looking lines (the ~0.85 recall). That is the other agent's page.
- Rodriguez's walled `/issues` page is the one fixable cause, and the refresh or the decision 5 re-run covers it. If it reads, FL-27 is rebuilt by the published-race procedure in `brief-runs/refresh-plan-2026-10.md`.

**To flip (take either race down to the roster).** This is the exact SQL for the founder: one call per race, through the same door as every publish. It writes an `admin_action` row, and the brief rows stay but are unreadable at `listed`:

```sql
SELECT set_race_publication('FL-27-general', 'listed', 'founder',
  'No spine coverage for either candidate; roster only until the refresh (listed-races-2026-10-04.md §5)');
SELECT set_race_publication('FL-AGR-general', 'listed', 'founder',
  'No spine coverage for either candidate; roster only until the refresh (listed-races-2026-10-04.md §5)');
```

## How this was produced

- **Live `SELECT`s, project `pqracitpmzpiqfnzlngw`, 2026-10-04 about 20:15–20:35 UTC:**
  - `race_publication` joined to `race` and `candidate` for the 17 `listed` rows: candidates, `qualifying_status`, `official_site`, and 0 claims and 0 profiles in each.
  - Totals: 53 races, 36 published, 17 listed, 299 candidates, 106 on the ballot (97 with a site), 82 profiles and 648 claims.
  - `issue`, `position` and `claim` for FL-27 and FL-AGR.
- **Run files:** each candidate's `run.json` (counts and per-passage verdicts), `ingest.log` and `passages.jsonl` in `brief-runs/<RACE>/<candidate_id>/`; `policy-runs/passages-2026-09-25/index.json`; `withheld-2026-09-30.json`.
- **Live pages (`GET`):**
  - `/races/FL-CFO-general`, `/races/FL-BRO-CC2-general` and `/races/FL-DAD-SB8-general` (listed);
  - `/races/FL-27-general` and `/races/FL-AGR-general` (published). The first FL-AGR request failed twice in this container with a TLS reset; the third returned 200.
- **A labelling slip, for the record.** `brief-runs/spine-analysis-2026-10-03.json` labels the five walled candidates (Beltran, Dandiya, Shuham, Taddeo and Piper) "robots.txt disallows the crawl". Its regex tested the whole report after the "Result" column, so any log line mentioning robots.txt ("robots.txt read in the browser", "robots.txt unreadable") matched. The plans and `brief.sql` headers built from the run files say "bot challenge did not clear", correctly, and nothing in the database carries the label. The table above uses the ingest logs.
