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
