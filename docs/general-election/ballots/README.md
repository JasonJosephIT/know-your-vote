# Ballots by ZIP — derived data for the 2026 general election

Built 2026-09-07 on the founder's machine (real network). Everything here is
derived from public files; the raw DoE candidate export (which carries
candidate addresses, phones and emails) is **not** in this folder and must
never be committed.

## Files

| File | What | Source |
|---|---|---|
| `zip_districts_2026.csv` | One row per covered ZIP × congressional district under the **enacted 2026 map**, with land-area share, the district the 2024-map seed had, state senate and state house districts, and a `changed` flag | Census 2020 ZCTA↔block relationship × `EOGPCRP2026` block assignment; Census ZCTA↔SLDU2024 / SLDL2024 for state districts |
| `ballots_by_zip.json` | Per-ZIP manifest: statewide contests, House contest(s) with candidates, state senate/house districts, amendments, retention questions, circuit-judge runoffs, county SOE link | DoE `20261103-GEN` candidate list (all office groups), plus the crosswalks above |
| `roster_2026gen_public.json` | Every `ballot`-tier candidate (QUA/UNO, not WRI) keyed `OFFICE|Juris1|Juris2`, name + party + status only | DoE `20261103-GEN` export, fetched 2026-09-07 via `extractCanList.asp` |
| `EOGPCRP2026_block_assignment.txt` | The enacted congressional plan, block → district | `flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt` |

## Findings that change the app

1. **Florida redrew its congressional map in May 2026** (HB 1-D, signed
   2026-05-04; Florida Supreme Court let it stand 2026-06-10; federal
   qualifying moved to June 12). `0003_zip_seed.sql` was built from the
   Census CD119 file, i.e. the **2024 map**. Under the enacted map,
   **133 of the 235 covered ZIPs map to a different district set**, and
   Broward now touches FL-20/22/24/25/26 instead of FL-20/23/24/25. The
   DoE export's `Juris1num` is already the new numbering.
2. **FL-10 is not printed on the ballot.** Its only qualified candidate is
   `UNO` with no write-in, and F.S. 101.151(7) keeps unopposed candidates
   off the general ballot. The race page should say "elected without
   opposition", not render a one-column comparison. Same for state senate
   districts 4 and 16 and 28 state house districts.
3. **Two status codes the parser has never seen**: `XTL` "Transferred to
   Local" (7 legislative filers) and `DEC` "Deceased" (1 circuit judge).
   B2's fail-closed parser will raise on the first one it meets; both map to
   `excluded`.
4. **Six party codes beyond the ones B1 recorded**, whole-file: `ASP`
   (American Solidarity Party) is new; `MGT` still ships with an empty
   description.
5. **County sample ballots are not published yet.** Orange lists the 2026
   general as "Not available"; Broward mails domestic vote-by-mail ballots
   2026-09-24 → 10-01, which is when counties normally post them. County
   commission, school board, county judge and municipal questions come only
   from those.

## Rebuilding

The one-off scripts lived in the session scratchpad; the recipe is:

1. POST to `https://dos.elections.myflorida.com/candidates/extractCanList.asp`
   with `elecID=20261103-GEN`, `status=All`, `cantype=ALL`, once per
   `office` in FED, CAB, ATT, LEG, JUD, SPD. Needs a browser user agent.
2. Stream `tab20_zcta520_tabblock20_natl.txt` (1.06 GB) keeping rows whose
   `GEOID_TABBLOCK_20` starts with `12`; join to `EOGPCRP2026.txt`; sum
   `AREALAND_PART` per ZIP × district; keep districts with ≥ 5% share (same
   rule as `scripts/build-zip-seed.mjs`).
3. Contest shape per office/jurisdiction: only `QUA`/`UNO` rows; `WRI`
   means a blank write-in line; a lone `UNO` with no write-in is not printed.
