# Ballots by ZIP — handoff for the next session

**Written:** 2026-09-07 · **Built in:** worktree `missing-data-streams-html-7d8f8f` · **Committed on:** `claude/ballots-handoff-docs-835025` (off `main` at `0cebc42`, PR #32 merged)

The derived data sits beside this file, under `docs/general-election/ballots/`: `README.md`, `zip_districts_2026.csv`, `ballots_by_zip.json`, `roster_2026gen_public.json`, `november-ballots-by-zip.html`.

**Two files are deliberately *not* in the repo:**

- `ballots/EOGPCRP2026_block_assignment.txt` (7.6 MB, gitignored) — the enacted congressional plan. Re-fetch before §4.2 from `https://www.flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt`.
- the raw DoE candidate export — it carries candidate addresses, phones, emails and treasurer names. Keep it outside the working tree; **never commit it.**

Published pages from the session (private artifacts, the founder's account):

| Page | URL |
|---|---|
| Know Your Vote Data Streams (what is missing, by owner) | https://claude.ai/code/artifact/1746b747-a2b4-404a-81ef-1ab080f9f3a1 |
| November Ballots by ZIP (this work) | https://claude.ai/code/artifact/90bbb802-d532-4e91-a5f9-7a81b53368d1 |

---

## 1. What was asked, and what was delivered

> "Get the different zip codes that we will be servicing, and then, based off those zip codes, find out exactly what their ballots would be like and get those different ballots."

**Delivered:**

1. **The ZIP list.** 235 distinct ZIPs (304 seed rows) from `supabase/migrations/0003_zip_seed.sql`: Miami-Dade 101 rows, Broward 76, Hillsborough 69, Orange 58.
2. **Districts per ZIP**, three layers: U.S. House under the **enacted 2026 map** (see §2, this is the big finding), state senate (SLDU 2024), state house (SLDL 2024). 5% land-share rule, same as the existing seed builder.
3. **The state and federal half of every ballot**, per ZIP: 5 statewide offices, 3 amendments, Supreme Court retention (Muñiz), the House contest(s), state senate seat if up, state house contest, DCA retention judges by county, circuit-judge runoffs by county. Source: the DoE `20261103-GEN` candidate file, all six office groups, fetched 2026-09-07.

**Not delivered, and why:** the **county half** of the ballot (county commission, school board, county court, special districts, municipal questions). Those are filed with the county Supervisor of Elections, not the state, and none of the four counties has posted 2026 general sample ballots yet (Orange: "Not available"; Broward mails domestic vote-by-mail 2026-09-24 → 10-01, which is when precinct ballots normally appear). That is task §4.1.

## 2. Findings that change the app (read before touching ingest or resolve)

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| F1 | **Florida redrew its congressional map in May 2026.** HB 1-D signed 2026-05-04; FL Supreme Court let it stand 2026-06-10; federal qualifying moved to 2026-06-12, so candidates filed under the new lines | flsenate.gov Congressional Redistricting page (plan `EOGPCRP2026`); Wikipedia "2026 Florida redistricting" | `0003_zip_seed.sql` was built from Census `CD119` = the **2024 map**. **133 of 235 covered ZIPs resolve to a different district set** under the enacted plan. Broward is now FL-20/22/24/25/26 (seed: 20/23/24/25). The DoE file's `Juris1num` is already the new numbering, so the app's `FL-23-general` race would be Lois Frankel's Palm Beach contest, shown to Broward voters |
| F2 | **FL-10 is not printed on the ballot.** Its only qualified candidate (Frost) is `UNO` with no write-in; F.S. 101.151(7) keeps unopposed candidates off the general ballot | DoE file: `USR|010` has one `UNO` row, zero `WRI` | The race page must say "elected without opposition", not render a one-column comparison. `data-architecture.md` §3's "unopposed" handling assumed the race still appears. Same for state senate districts 4 and 16, and 28 state house districts |
| F3 | **Two status codes B1 never saw:** `XTL` "Transferred to Local" (7 legislative rows) and `DEC` "Deceased" (1 circuit judge) | DoE file, whole-file counts | The office filter, not the status map, is what keeps today's run green: `parse_candidate_list` checks `OfficeCode`/`Juris1num` against `_TARGET_US_HOUSE` before it ever calls `_ballot_status`, and every `XTL`/`DEC` row today sits on an office outside that filter (`STS`, `CIRJUD`), so it is skipped before status is read. The trap is **latent, not active** — it springs the first time a targeted office carries one of these codes, which is exactly what widening coverage past the original four races does (§4.2). Both codes are already mapped to `excluded`, with a test row for each, on `claude/intake-xtl-dec` (not yet merged) |
| F4 | New party code `ASP` (American Solidarity Party of Florida, 2 rows). `MGT` still ships with an empty description | DoE file | Harmless post-0013 (party stored verbatim); `party-label.ts` fallback covers it. Note it in `data-ingest.md` Q3 |
| F5 | **U.S. Senate general line is three names:** Ashley Moody (REP), Angie Nixon (DEM), Neil J. Gillespie (NPA) | DoE `USS` rows, `QUA` non-`WRI` | The demo fixture guessed 4. TASK-066's "Senate share of 14 filings unknown" is now answered: 3 ballot, 0 write-in, 11 excluded |
| F6 | The DoE download endpoint is `extractCanList.asp`, not `downloadcanlist.asp`, and needs a browser User-Agent | `scripts/doe-code-dump.py` already has it right; my first attempt used the form URL and got the form page back | Do not "fix" the script |
| F7 | County sample ballots are not published yet (see §1) | Orange `/sample-ballots/`, Broward `/register-vote/when-register` | County contests are a late-September task |

Ballot-tier counts per covered House district under the 2026 map (from the DoE file):

| District | Ballot line | Counties in coverage |
|---|---|---|
| FL-7 | Dalton (DEM), Dennison (LPF), Elijah (REP) | Orange (2 ZIPs) |
| FL-8 | Haridopolos (REP), Jenkins (DEM) | Orange |
| FL-9 | Green (REP), Soto (DEM) | Orange |
| FL-10 | **not printed** (Frost, unopposed) | Orange |
| FL-11 | Groves (LPF), Pericola (DEM), Strada (REP) | Orange |
| FL-12 | Bilirakis (REP), Overman (DEM), Scrivener (NPA) | Hillsborough |
| FL-14 | Beltran (REP), Castor (DEM), Lambert (LPF) + write-in line | Hillsborough |
| FL-15 | Lee (REP), People (DEM) + write-in line | Hillsborough |
| FL-16 | Davis (NPA), Gruters (REP), Kirschner (DEM) | Hillsborough (1 ZIP) |
| FL-20 | Andersen (REP), Maxime (IND), Wasserman Schultz (DEM) | Broward |
| FL-22 | 2-way (see roster) | Broward |
| FL-24 | Brown (REP), Gilbert (DEM) + write-in line | Miami-Dade, Broward |
| FL-25 | Jassenoff (LPF), Moskowitz (DEM), Singer (REP) + write-in line | Broward, Miami-Dade |
| FL-26 | Diaz-Balart (REP), Locklin (DEM), Meidinger Hosey (NPA) | Miami-Dade, Broward |
| FL-27 | Rodriguez (DEM), Salazar (REP) | Miami-Dade |
| FL-28 | Ehr (DEM), Gimenez (REP), Rojas (NPA) | Miami-Dade |

FL-23 (Adeimy vs Frankel) is **no longer in any covered ZIP**. The app's four target House races (10/15/23/28) are therefore: one not printed, one intact (15), one out of coverage (23), one intact (28).

## 3. Files and how they were made

| File | What | Rebuild recipe |
|---|---|---|
| `ballots/zip_districts_2026.csv` | ZIP × 2026-map House district with land share, the seed's district, SD, HD, `changed` flag | Census `rel2020/zcta520/tab20_zcta520_tabblock20_natl.txt` (1.06 GB; stream and keep rows whose `GEOID_TABBLOCK_20` starts with `12`, the 10th `\|`-column) joined to `EOGPCRP2026.txt` (block → district), summed `AREALAND_PART`, ≥ 5% share. SD/HD from `rel2020/cd-sld/tab20_sldu202420_zcta520_st12.txt` and `tab20_sldl202420_zcta520_st12.txt` |
| `ballots/ballots_by_zip.json` | Per-ZIP manifest (schema: `county`, `congressional_seed_2024_map`, `congressional_2026_map[]`, `state_senate[]`, `state_house[]`, `statewide[]`, `amendments[]`, `supreme_court_retention`, `dca_retention`, `circuit_judge_runoffs[]`, `county_and_municipal`) | DoE file + the crosswalks. Contest rules: only `QUA`/`UNO`; `WRI` ⇒ `write_in_line: true`; a lone `UNO` with no write-in ⇒ `printed: false` |
| `ballots/roster_2026gen_public.json` | Every ballot-tier candidate keyed `OFFICE\|Juris1\|Juris2`, name + party + status only | DoE file, `QUA`/`UNO`, not `WRI` |
| `ballots/EOGPCRP2026_block_assignment.txt` | Enacted plan, block → district. **Gitignored** (7.6 MB); re-fetch when needed | https://www.flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt |
| `ballots/november-ballots-by-zip.html` | The published page | Generated from the manifest by a scratchpad script (not kept); the template is plain HTML with `{{STATEWIDE}}`, `{{AMEND}}`, `{{COUNTIES}}`, `{{ROWS}}`, `{{CHANGED}}`, `{{NZIP}}` placeholders — regenerate by hand or rewrite the generator (≈80 lines of Python) |

**Fetching the DoE file** (needs real network; remote sessions are egress-blocked):

```bash
/usr/bin/python3 - <<'PY'
import urllib.parse, urllib.request
URL="https://dos.elections.myflorida.com/candidates/extractCanList.asp"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
for office in ("FED","CAB","ATT","LEG","JUD","SPD"):
    body=urllib.parse.urlencode({"elecID":"20261103-GEN","office":office,"status":"All","cantype":"ALL","FormSubmit":"Download Candidate List"}).encode()
    raw=urllib.request.urlopen(urllib.request.Request(URL,data=body,headers={"User-Agent":UA}),timeout=90).read()
    open(f"doe_{office}.tsv","wb").write(raw)
PY
```

> ⚠️ The raw export carries candidate addresses, phones, emails and treasurer names. **Save it outside the working tree; never commit it.** Only the derived files above belong in the repo.

Use `/usr/bin/python3` on this Mac; the python.org 3.11 alpha on `PATH` has no CA bundle.

## 4. Next tasks, in order

### 4.1 Get the county half of each ballot (late September)

Check on or after **2026-09-24**:

| County | Where | Notes |
|---|---|---|
| Orange | https://voteorangefl.gov/sample-ballots/ | Posts composite + per-precinct PDFs; "What's On My Ballot" tool by address |
| Broward | https://browardvotes.gov/ (precinct finder at `/voters/precinct-finder`) | Sample ballots historically under Voters → Sample Ballots |
| Hillsborough | https://www.votehillsborough.gov/ ("Voter Information Lookup" → personalized sample ballot) | Search box found nothing yet |
| Miami-Dade | https://www.votemiamidade.gov/ (Voter Information tool; sample-ballots archive at `/elections/data/sample-ballots-archive.page`) | Also publishes precinct → district tables at `/elections/data/current-precincts-districts-municipalities.page` |

Goal: one composite ballot per county (all contests and questions), then the precinct → ZIP overlap so each ZIP's manifest gains `county_and_municipal.contests[]`. ZIPs straddle precincts, so expect ambiguity of the same kind the House split already handles.

### 4.2 Rebuild `zip_district` for the 2026 map (engineering, Stream P owns migrations)

- Extend `scripts/build-zip-seed.mjs` to take the block assignment file and the ZCTA↔block file instead of the CD119 file (or add a sibling script). Keep the 5% rule and `is_split`.
- New migration (next free number in `supabase/migrations/README.md`; **claim it in the ledger first**) replacing the `zip_district` rows. Keep `DELETE FROM zip_district` + `INSERT` shape as `0003`.
- The race IDs `FL-{n}-general` keep their names but the *geography* moved. **Decided (founder 2026-09-07):** coverage becomes the districts that actually cover the four counties — **FL-7/8/9/10/11, 12/14/15/16, 20/22/24/25/26, 27/28** (16 districts) — not the current 10/15/23/28. Two consequences:
  1. `_TARGET_US_HOUSE` in `intake.py` widens from 4 districts to 16, which is what makes the `XTL`/`DEC` mapping load-bearing rather than latent (ties back to F3).
  2. `race` rows are not seeded by a migration — they arrive from the live DoE run — so until that run happens, a ZIP resolving to a newly covered district returns an empty race list from `racesForDistrict`. That degrades quietly rather than crashing, but it is a visible gap and belongs in §4.6.

### 4.3 Parser: map `XTL` and `DEC` before the next live run

This work is already done on `claude/intake-xtl-dec` (not yet merged).

`toollayer/cap_toollayer/intake.py` `_STATUS` (B2) — both ⇒ `excluded`. Add fixture rows and a mutation test (removing the mapping must fail on an `XTL` fixture). Update `data-ingest.md` §1 Q1 and the per-race tier table with the Senate row (3 / 0 / 11).

### 4.4 Read model: "not printed" state for unopposed races

`src/lib/briefs.ts` / race page: when a race has one `ballot`-tier candidate marked `UNO` and no write-in, render "Elected without opposition; this contest does not appear on the ballot" instead of the single-candidate view A4 built. Requires the `StatusCode` (`UNO` vs `QUA`) to survive into the read model — today `qualifying_status` may carry it; verify.

### 4.5 Retention and amendments (content)

- Three amendments: seed `ballot_measure` rows (Amendment 1 Budget Stabilization Fund; 2 agricultural tangible personal property exemption; 3 homestead exemption / non-homestead cap / local spending limit; all 60%). Official titles and summaries: `https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf` (needs a browser UA to download; 447 KB PDF).
- Retention: Justice Carlos G. Muñiz statewide; DCA judges by county from the `DCA` rows of the roster (3rd DCA Miami-Dade 5 judges, 4th DCA Broward 5, 2nd DCA Hillsborough 4, 6th DCA Orange none in 2026). No model exists for retention questions; `data-architecture.md` §6 deferred it. Founder call whether to show them.

### 4.6 Then the items the Data Streams page already lists

Official-site seed (B3, now for the 2026-map field), live DoE run into the database, outlet lean/feed gates, demo teardown. See the Data Streams artifact.

## 5. Gotchas that cost time this session

- Census ranged GETs return `520`; download whole files. The ZCTA↔block national file is 1.06 GB, streams in a few minutes; filter on the **10th** column (`GEOID_TABBLOCK_20`), not the 9th (`OID_`).
- `dos.fl.gov` returns 403 to curl without a browser UA; `WebFetch` works for it. Ballotpedia returns empty to `WebFetch`; curl with a UA works.
- `ugrep` (this Mac's `grep`) rejects long `.\{N\}` regexes; use Python for text extraction.
- The state DoE form's `office=All` value does not return data; fetch the six groups separately.
- The Browser pane cannot screenshot a `file://` page; publish the artifact and look there.

## 6. Paste-ready prompt

> "Continue the ballots-by-ZIP work. Read `docs/general-election/ballots-handoff.md` first, then `docs/general-election/ballots/README.md`. The derived data is committed under `docs/general-election/ballots/`, except `EOGPCRP2026_block_assignment.txt`, which is gitignored — re-fetch it from flsenate.gov if a task needs it. Take §4 in order: (4.1) if today is on or after 2026-09-24, fetch the four counties' general-election sample ballots and add the county contests to each ZIP's manifest; otherwise skip to (4.2) and rebuild `zip_district` from the enacted 2026 congressional plan (`EOGPCRP2026_block_assignment.txt` + Census ZCTA↔block), claiming a migration number in the ledger before writing the file. Never commit the raw DoE export. Remote sessions have no network; anything that fetches runs on this Mac with `/usr/bin/python3`."

---

## 7. Decisions, 2026-10-04: judicial retention and Amendment 1

**Recommended (pending founder confirmation).** These are the launch handoff's founder decisions 9 and 10 (`launch-handoff-2026-10-04.md` §4). The founder asked agents to take the best recommended path, build around it and leave the decision to them. Neither call below is the founder's decision yet, and each one flips in one place.

### 7.1 Decision 10, judicial retention: say it is out of scope, link to official pages

**Recommended (pending founder confirmation):** don't model retention for Nov 3. Say on the ballot list that the ballot also asks about judges, that Know Your Vote doesn't cover those questions, and link to the courts' and the Division of Elections' own pages.

**Why:** retention is on every ballot, so leaving it unmentioned makes the "Ballot questions" list read as the whole ballot. Modelling it properly (a table, a read path, a neutral source ladder for judges) is more than 30 days of work allows. The methodology page as rewritten in this same handoff lists judicial retention under "What we don't cover", so the note matches it.

**What was built:**

- `src/components/features/JudicialRetentionNote.tsx` (new, server component). It renders a short aside headed "Judges on your ballot". The aside names Justice Carlos G. Muñiz (on every ballot, linked to his page on the Supreme Court site) and gives the number of appeals court judges per covered county. Each count links to the Division of Elections' list, the one official page that names exactly who is up, grouped by district; a second link, "about this court's judges", goes to that court's own judges page for background. It closes with the Division of Elections' full list again and a line saying circuit judge races aren't covered either. It takes an optional `county`: with one, it shows only that county's appeals court line; without one, it shows all four counties, which is true for everyone.
- `src/components/features/BallotQuestions.tsx` renders the note after the amendments list, inside the same section, and accepts an optional `county` that it passes through. `SharedBallot` passes nothing. `YourRaces` could pass `result.county` (requested from that file's owner). Until it does, the four-county version shows there too.

**How to flip:** set `SHOW_JUDICIAL_RETENTION_NOTE = false` in `JudicialRetentionNote.tsx` and the note renders nothing. To remove it for good, delete that file and the one `<JudicialRetentionNote county={county} />` line in `BallotQuestions.tsx`. Choosing "model retention" instead is a new build: a retention-question table and a rule for which sources may be shown about a judge.

**What the ballot holds (checked 2026-10-04, official sources only):**

| County | Circuit (F.S. 26.021) | District court of appeal (F.S. ch. 35) | Retention questions | Circuit judge races on the general ballot |
|---|---|---|---|---|
| All | — | — | Justice Carlos G. Muñiz, Supreme Court (the only justice up) | — |
| Miami-Dade | 11th | 3rd (F.S. 35.04) | Gooden, Gordo, Lobree, Logue, Miller (5) | Group 5 (McNeil, Segura); Group 69 (Rita Maria Baez, Jones-Peabody) |
| Broward | 17th | 4th (F.S. 35.042) | Forst, Klingensmith, Lott, Shaw, Shepherd (5) | Group 52 (Fry, Hamilton) |
| Hillsborough | 13th | 2nd (F.S. 35.03) | Atkinson, Silberman, Sleet, Andrea Teves Smith (4) | none |
| Orange | 9th | **6th** since 2023-01-01 (F.S. 35.044, ch. 2022-163) | none: the state list has no 6th District retention this year | Group 1 (Hampton-Johnson, Hart) |

This matches §4.5 above. The other two districts on the state list (1st: 5 judges, 5th: 3) don't reach a covered county. The site names only Muñiz and the counts. It does not name the appeals court judges, so a late change on the bench can only make a count wrong, not a name.

**Review fixes (2026-10-04, adversarial review of this package):**

- The intro first said "The links go to the courts' own pages", but one link goes to the Division of Elections, which is not a court. It now reads "The links go to the state's list of who is up and to the courts' own pages."
- Each county's count ("5 judges of the 3rd District Court of Appeal") first linked to the court's judges page. Those pages list every sitting judge, not just the ones up for retention. On 2026-10-04 the rosters held 15 names (2nd), 10 (3rd) and 11 (4th) against 4, 5 and 5 on the ballot, so a voter could not tell who was on their ballot. The count now links to the Division of Elections' list, and the court page stays as a second link. The state list was re-read on 2026-10-04 (WebFetch; plain `curl` got a Cloudflare challenge, 403, which a normal browser passes): Supreme Court, Muñiz only; District 3, Gooden, Gordo, Lobree, Logue and Miller; District 4, Forst, Klingensmith, Lott, Shaw and Shepherd; District 6, none. District 2 (Atkinson, Silberman, Sleet and Smith) was re-read in the same session.

**URLs verified (GET, 2026-10-04):**

| URL | Publisher | What it showed | Linked from the site? |
|---|---|---|---|
| https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeGroup=JUD | Florida Division of Elections | Judicial offices only, 2026 general. Supreme Court Justice: Muñiz, Carlos G., Qualified (sole entry). DCA 1–5 retention lists as in the table; no DCA 6 entries. Circuit judge groups, including the runoffs above | Yes: each county's count, and the closing line |
| https://supremecourt.flcourts.gov/the-court/about-the-court/justices/justice-carlos-g.-muniz | Supreme Court of Florida | Page titled "Justice Carlos G. Muñiz", the court's own biography (appointed 2019) | Yes |
| https://supremecourt.flcourts.gov/Justices | Supreme Court of Florida | The court's justices page; Muñiz listed | No (the bio page is linked) |
| https://2dca.flcourts.gov/Judges | 2nd District Court of Appeal | Judges page, 15 judges listed; Atkinson, Silberman, Sleet and Smith among them | Yes, as the second link ("about this court's judges") |
| https://3dca.flcourts.gov/Judges | 3rd District Court of Appeal | Judges page, 10 judges listed; Gooden, Gordo, Lobree, Logue and Miller among them | Yes, as the second link |
| https://4dca.flcourts.gov/Judges | 4th District Court of Appeal | Judges page, 11 judges listed; Forst, Klingensmith, Lott, Shaw and Shepherd among them | Yes, as the second link |
| https://6dca.flcourts.gov/Judges | 6th District Court of Appeal | Judges page (loads) | No (Orange has no retention line) |
| https://2dca.flcourts.gov/ | 2nd District Court of Appeal | "The Sixth Judicial Circuit (Pinellas and Pasco counties), the Twelfth … and The Thirteenth Judicial Circuit (Hillsborough County)" | No |
| https://4dca.flcourts.gov/ | 4th District Court of Appeal | Appeals "from the Fifteenth, Seventeenth, and Nineteenth Judicial Circuits … Palm Beach, Broward, St. Lucie, Martin, Indian River, and Okeechobee Counties" | No |
| https://www.flsenate.gov/Laws/Statutes/2026/Chapter35/All | The Florida Senate (Florida Statutes) | 35.03: 2nd = 6th, 12th, 13th Circuits. 35.04: 3rd = 11th, 16th. 35.042: 4th = 15th, 17th, 19th. 35.044: 6th = 9th, 10th, 20th (s. 8, ch. 2022-163) | No |
| https://www.flsenate.gov/Session/Bill/2022/2522/Analyses/2022s02522.ap.PDF | The Florida Senate (staff analysis, SB 2522, 2022) | Creates the Sixth Appellate District (Ninth, Tenth and Twentieth Circuits), "effective January 1, 2023", and realigns the 1st, 2nd and 5th | No |
| https://www.flsenate.gov/Laws/Statutes/2026/26.021 | The Florida Senate (Florida Statutes) | 9th = Orange and Osceola; 11th = Miami-Dade; 13th = Hillsborough; 17th = Broward | No |
| https://dos.fl.gov/elections/candidates-committees/offices-up-for-election/ | Florida Division of Elections | "Offices Up for Election and Retention in 2026". Judicial Retention (Nonpartisan): Supreme Court justices and DCA judges "only those whose terms expire January 2027" | No |
| https://dos.fl.gov/elections/contacts/frequently-asked-questions/faq-elections/ | Florida Division of Elections | "Justices of the Supreme Court and Judges of the District Courts of Appeal are subject to retention voting. Circuit judges and county judges are subject to election" | No |
| https://www.miamidade.gov/elections/library/2026-11-03-general-election-master-ballot.pdf | Miami-Dade Supervisor of Elections | "FINAL Official General Election Ballot, November 3, 2026": "Shall Justice Carlos G. Muñiz of the Supreme Court be retained in office?", five 3rd District questions, and circuit Groups 5 and 69 | No |

Deliberately not linked: The Florida Bar's "The Vote's in Your Court" and its retention poll, Ballotpedia, LWV/Vote411, news voter guides and every advocacy page. The county Supervisor homepages already in `src/lib/notifications/config.ts` still resolve, but two of them redirect: `miamidade.gov/global/elections/home.page` goes to `votemiamidade.gov/elections/home.page`, and `ocfelections.gov` goes to `voteorangefl.gov`. Orange's `/sample-ballots/` page listed only municipal ballots when checked.

### 7.2 Decision 9, Amendment 1: keep the neutral-only page

**Recommended (pending founder confirmation):** keep `FL-AM1-general` `listed`, showing the official record and neutral material only, with no YES/NO columns.

**What voters see now (checked 2026-10-04):**

- A SELECT on production found AM1 `listed` with 10 `measure_resource` rows, all `neutral`: 4 official, 1 analysis (James Madison Institute) and 5 reporting (CBS Miami, WFLA, WUSF, Bradenton Times, Ocala Gazette). It has no sided rows. AM2 and AM3 are `published`.
- A GET of https://knowyour.vote/measures/FL-AM1-general returned 200. The page shows the 60% threshold, the verbatim ballot summary, a link to the full text, the "Understand it first" block (official documents, research, reporting) and the held note. It shows no YES/NO columns.

**Copy fixed:** the held note (`src/lib/measure-held-copy.ts`) said opponents "have so far only listed themselves as opposed, without giving their reasons". That was wrong. The reporting the same page links quotes opponents' reasons: CBS Miami and WUSF quote the governor's stated reasons from his 2026-09-14 post on X, and the Ocala Gazette quotes Florida AFL-CIO testimony. The note now says only what is true: both sides have given reasons and the reports above quote them. The site adds for/against columns only from each side's own case read at its own source, and that has been done for supporters (RPOF's release) but not yet for opponents. It names no one, and `updated` moved to 2026-10-04. `page.tsx` needed no change. Its "We look for new statements every week" is backed by the routine "Weekly amendment source re-check (FL AM1/AM2)", which is enabled and runs Mondays at 12:07 UTC.

**Why hold rather than publish:**

1. **The NO column would be the thin side.** What has been read at source is RPOF's release (support, with reasons), Florida TaxWatch (support, analysis) and one Substack each way. FEA and LWV Florida, on their own pages, list themselves as opposed with no reasons. A published page would set a party release and a think-tank analysis against two reasonless listings and one personal blog. It passes the ≤2× count and still reads lopsided.
2. **Voters can already read both sides' reasons.** The neutral reporting on the page quotes supporters and opponents in their own words.
3. **Publishing is a production write 30 days out.** It needs a new seeding migration and a status flip, for a column that one opponent's own statement would make solid.

**The case for flipping:** AM2 was published with the same two FEA/LWV bare listings in its NO column (founder call D2, 2026-09-26). Consistency would argue for publishing AM1 on the same footing. The difference is that AM2's NO side also had reasoned rows of its own.

**How to flip (publish AM1):** have an agent write a migration modelled on `supabase/migrations/0040_measure_resources_am2.sql`. Take the next free number in `supabase/migrations/README.md`; 0042 is being claimed by the news backfill in this same handoff. The migration seeds AM1's sided rows from `measure-resources-verified-2026-09-24.md`: the RPOF release, TaxWatch, the Freedom Vanguard Substack, the FEA toolkit, the LWV Vote411 page and the Amanda Informed Substack. It then sets `measure_publication` to `published` with an `admin_action` row. Run `node scripts/verify-measure-balance.ts` and `node scripts/verify-measure-resources.ts`, then read back as anon. The page switches to the YES/NO ladder by itself once a brief exists. Then delete the `"FL-AM1-general"` entry in `HELD_NOTES`, the clearly marked block in `src/lib/measure-held-copy.ts`; `scripts/verify-measure-held.ts` asserts that entry exists, so update that check in the same change.

**What would change the recommendation:** an opponent's own reasoned statement read at its source. The likeliest is the governor's 2026-09-14 post on X. No session has opened it at its source: it is known only as quoted in the reporting, and the founder could check it in a logged-in browser. Others are a Florida AFL-CIO, FEA or LWV Florida page that gives reasons, or a Florida Channel clip of the 2025 House Budget Committee testimony. The weekly routine is looking for these.
