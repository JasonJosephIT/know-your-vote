# Re-ingest with Jev link picking, and Step 2 (2026-09-29)

Founder, 2026-09-29, after `ingest-2026-09-29-keywords.md`: pick the links to follow with Jev instead of a word list, remove the Step 2 `--limit`, and re-ingest FL-GOV the same way so every candidate gets the same crawl. **No database write and nothing published.** FL-GOV's published brief is unchanged; its new files are in each candidate's `reingest-2026-09-29/`.

## What changed

- **Links:** `--links jev` (the new default, `src/lib/link-noul.ts`, tested by `scripts/verify-link-noul.ts`). Every on-site content link on the homepage is put to Jev as its path and anchor text with two questions: does it lead to stated positions, and is it the candidate's own About page. Links at or above 0.5 are followed, strongest first, up to the unchanged 8-page cap, **plus the strongest About page**. Donate, cart, contact, login, legal and site-plumbing links are never offered. News and press posts are, and Jev decides. Every judgement is saved in the candidate's `links.jsonl`.
- **Step 2:** `--limit` is gone from `scripts/candidate-policy-noul.ts`; every passage is always asked, and passing `--limit` is now an error so an old command cannot look capped.
- **Unchanged:** robots.txt (our token and every Anthropic token), Crawl-delay, one request at a time per site, the browser fallback, no captcha solving, the 8-page cap, and the 0.85 commitment threshold.

## How it ran

- **Targets:** `jev-targets-2026-09-29.tsv`: the 90 candidates of the first 2026-09-29 ingest plus FL-GOV's 7 sites, **97 in total**. Datto (FL-GOV) has no site and stays silent under D3.
- **Driver:** `jev-driver-2026-09-29.sh`, six candidates at a time, each a different host. For each one it runs the ingest, then, when that produced passages, the policy run. Same flags for everyone, no retries with other flags.
- **Wall-clock:** 2026-09-29T11:41:45Z → 2026-09-29T11:49:12Z (7 min).
- **Provenance:** every policy run is `jev:jev-1.13.0/tax-7/q-b2171346` (identical across all runs); every link judgement is `jev:jev-1.13.0/links/q-e03cabd0`.

## Totals

| | Keyword crawl | Jev links |
|---|---|---|
| Readable sites | 86 | **90** |
| Passages | 3024 | **4331** (median 23) |
| Pages read (incl. homepages) | 187 | **251** |
| Homepage only | 38 | **31** |
| About page read | 1 | **56** |
| Hit the 8-page cap | 2 + Jolly | **3** (none left out) |

Of the 37 sites the keyword crawl read only at the homepage, 13 now reach more pages. The rest are one-page sites, or sites whose only other links Jev judged not to hold positions (their `links.jsonl` shows each score).

## Two runs of the same site can differ

1. **Bot walls are intermittent.** The same homepage fetch, two hours apart, gave different results on the same hosts. Readable in the keyword run and not now: Caryl Sandler Shuham, Annette Taddeo. Failed in the keyword run and readable now: Brent Andersen, Roberto Fernandez III, Vicki L. Lopez, Harry Cohen, Brian Jones, Scott Eckhard Jewett. The fetch code for the homepage did not change between the runs, so this is the sites' HTTP 202/403 challenge behaving differently from one visit to the next, not the link picker. Nothing was retried (rule: report as-is). A uniform rule, such as one identical re-run of every failure an hour later, would be a founder decision.
2. **Jev's link scores move by a few hundredths between runs.** Jolly's `/environment` scored 0.52 in the pilot and 0.49 here, so a link near the 0.5 line can be followed in one run and not the next. Every judgement is saved in `links.jsonl`, so which pages a brief rests on is always on record.

## Step 2 (Jev policy run)

- **Runs:** 90 (every readable site), 90 complete with 0 failed requests.
- **Passages asked:** 4331; state a policy at 0.85: 1376; and match a taxonomy issue: 722.
- **Cost:** 15.24M input tokens, about **$0.64** at $0.042/MTok (input only). The link judgements are not in this total: about 482 small requests.

## The re-run of failures

Founder rule (2026-09-29): every candidate whose ingest failed gets **one** identical re-run, the same command, later. 9 were re-run at 2026-09-29T19:17:39Z: Oliver G. Gilbert III, Dan Green read this time; Mike Beltran, Pia Dandiya, Caryl Sandler Shuham, Annette Taddeo, Rob Piper, Jeannette Quinones Hernandez, Dean Ocean Abrams failed again. Each first attempt is in its folder's `attempt-1-failed/`. There is no second re-run.

## Failures after the re-run

| Race | Candidate | Site | Result | Keyword crawl |
|---|---|---|---|---|
| FL-14-general | [FL-DOE-91313](FL-14/FL-DOE-91313/ingest-report.md) Mike Beltran | https://beltranforcongress.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | also failed |
| FL-22-general | [FL-DOE-89301](FL-22/FL-DOE-89301/ingest-report.md) Pia Dandiya | https://piaforcongress.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | also failed |
| FL-BRO-CC6-general | [FL-VF-BRO-1041](FL-BRO-CC6/FL-VF-BRO-1041/ingest-report.md) Caryl Sandler Shuham | https://www.carylshuham.com/ | FAILURE: bot challenge; the browser rendered a page with no links and no text | 42 passages |
| FL-CFO-general | [FL-DOE-91310](FL-CFO/FL-DOE-91310/ingest-report.md) Annette Taddeo | https://annettetaddeo.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | 10 passages |
| FL-DAD-CC5-general | [FL-VF-DAD-2998](FL-DAD-CC5/FL-VF-DAD-2998/ingest-report.md) Rob Piper | https://www.robpiperheretoserve.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | also failed |
| FL-ORA-CC8-general | [FL-VF-ORA-1275](FL-ORA-CC8/FL-VF-ORA-1275/ingest-report.md) Jeannette Quinones Hernandez | https://www.jeannette2026.com/ | FAILURE: robots.txt disallows the crawl (honoured) | also failed |
| FL-GOV-general | [FL-DOE-90433](FL-GOV/FL-DOE-90433/reingest-2026-09-29/ingest-report.md) Dean Ocean Abrams | https://www.deanabrams.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | also failed |

Under D3/D4 each becomes **recorded silence** unless the founder decides otherwise.

## Per race

| Race | Candidate | Passages (before → now) | Pages | Links judged → chosen | About | States a policy | Matches an issue | Result |
|---|---|---|---|---|---|---|---|---|
| FL-10-general | [FL-DOE-89909](FL-10/FL-DOE-89909/ingest-report.md) Maxwell Alejandro Frost | 4 → **12** | 1 → 2 | 4 → 0 | yes | 1 | 1 | ok |
| FL-11-general | [FL-DOE-88517](FL-11/FL-DOE-88517/ingest-report.md) Ralph Groves | 18 → **150** | 1 → 4 | 7 → 3 | yes | 31 | 9 | ok |
|  | [FL-DOE-91715](FL-11/FL-DOE-91715/ingest-report.md) James Pericola | 18 → **18** | 1 → 1 | 1 → 0 | no | 5 | 4 | ok |
|  | [FL-DOE-91717](FL-11/FL-DOE-91717/ingest-report.md) Joe Strada | 16 → **30** | 2 → 3 | 3 → 1 | yes | 4 | 0 | ok |
| FL-12-general | [FL-DOE-88868](FL-12/FL-DOE-88868/ingest-report.md) Gus Michael Bilirakis | 49 → **53** | 2 → 3 | 8 → 1 | yes | 12 | 9 | ok |
|  | [FL-DOE-89453](FL-12/FL-DOE-89453/ingest-report.md) Kimberly Overman | 47 → **73** | 4 → 3 | 16 → 1 | yes | 16 | 14 | ok |
|  | [FL-DOE-89778](FL-12/FL-DOE-89778/ingest-report.md) Branden Scrivener | 11 → **11** | 1 → 1 | 0 → 0 | no | 4 | 3 | ok |
| FL-14-general | [FL-DOE-88870](FL-14/FL-DOE-88870/ingest-report.md) Kathy Castor | 7 → **12** | 4 → 3 | 7 → 1 | yes | 2 | 2 | ok |
|  | [FL-DOE-91313](FL-14/FL-DOE-91313/ingest-report.md) Mike Beltran | 0 → **0** | 0 → 0 | 0 → — (cap) | no | — | — | **bot_wall** |
|  | [FL-DOE-92395](FL-14/FL-DOE-92395/ingest-report.md) Brian Lambert | 139 → **171** | 7 → 9 | 10 → 7 | yes | 51 | 12 | ok |
| FL-15-general | [FL-DOE-89116](FL-15/FL-DOE-89116/ingest-report.md) Robert People | 43 → **48** | 2 → 3 | 6 → 1 | yes | 19 | 8 | ok |
|  | [FL-DOE-89121](FL-15/FL-DOE-89121/ingest-report.md) Laurel Lee | 25 → **25** | 1 → 1 | 1 → 0 | no | 6 | 5 | ok |
| FL-16-general | [FL-DOE-89623](FL-16/FL-DOE-89623/ingest-report.md) Mark Davis | 34 → **84** | 2 → 3 | 6 → 2 | no | 11 | 5 | ok |
|  | [FL-DOE-90251](FL-16/FL-DOE-90251/ingest-report.md) Sydney Gruters | 9 → **9** | 1 → 1 | 2 → 0 | no | 7 | 6 | ok |
|  | [FL-DOE-90779](FL-16/FL-DOE-90779/ingest-report.md) Kelly Kirschner | 73 → **73** | 1 → 1 | 5 → 0 | no | 28 | 20 | ok |
| FL-20-general | [FL-DOE-90814](FL-20/FL-DOE-90814/ingest-report.md) Kedner Maxime | 49 → **108** | 5 → 10 | 15 → 8 (cap) | yes | 51 | 38 | ok |
|  | [FL-DOE-91278](FL-20/FL-DOE-91278/ingest-report.md) Brent Andersen | 0 → **11** | 0 → 2 | 7 → 0 | yes | 1 | 1 | ok |
|  | [FL-DOE-91577](FL-20/FL-DOE-91577/ingest-report.md) Debbie Wasserman Schultz | 11 → **8** | 2 → 1 | 10 → 0 | no | 1 | 1 | ok |
| FL-22-general | [FL-DOE-89301](FL-22/FL-DOE-89301/ingest-report.md) Pia Dandiya | 0 → **0** | 0 → 0 | 0 → — (cap) | no | — | — | **bot_wall** |
|  | [FL-DOE-92109](FL-22/FL-DOE-92109/ingest-report.md) Casey Askar | 1 → **1** | 1 → 1 | 0 → 0 | no | 1 | 1 | ok |
| FL-24-general | [FL-DOE-90703](FL-24/FL-DOE-90703/ingest-report.md) Te Mayonna Brown | 24 → **27** | 3 → 4 | 5 → 2 | yes | 17 | 15 | ok |
|  | [FL-DOE-91544](FL-24/FL-DOE-91544/ingest-report.md) Oliver G. Gilbert III | 62 → **217** | 3 → 7 | 8 → 5 | yes | 68 | 24 | ok |
| FL-25-general | [FL-DOE-88911](FL-25/FL-DOE-88911/ingest-report.md) Jared Moskowitz | 32 → **25** | 3 → 2 | 12 → 1 | yes | 4 | 4 | ok |
|  | [FL-DOE-89801](FL-25/FL-DOE-89801/ingest-report.md) Scott Singer | 52 → **58** | 2 → 3 | 4 → 1 | yes | 30 | 16 | ok |
| FL-26-general | [FL-DOE-89980](FL-26/FL-DOE-89980/ingest-report.md) Nicole Locklin | 60 → **78** | 9 → 10 | 14 → 8 (cap) | yes | 36 | 24 | ok |
|  | [FL-DOE-90330](FL-26/FL-DOE-90330/ingest-report.md) Mario Diaz-Balart | 80 → **80** | 1 → 1 | 0 → 0 | no | 19 | 11 | ok |
| FL-27-general | [FL-DOE-89933](FL-27/FL-DOE-89933/ingest-report.md) Eliott Rodriguez | 53 → **3** | 2 → 1 | 3 → 1 | no | 0 | 0 | ok |
|  | [FL-DOE-90721](FL-27/FL-DOE-90721/ingest-report.md) Maria Elvira Salazar | 96 → **104** | 9 → 9 | 14 → 7 | yes | 23 | 9 | ok |
| FL-28-general | [FL-DOE-90340](FL-28/FL-DOE-90340/ingest-report.md) Eddy Rojas | 4 → **3** | 1 → 1 | 3 → 0 | yes | 0 | 0 | ok |
|  | [FL-DOE-91226](FL-28/FL-DOE-91226/ingest-report.md) Carlos A. Gimenez | 3 → **9** | 2 → 3 | 4 → 1 | yes | 0 | 0 | ok |
|  | [FL-DOE-91699](FL-28/FL-DOE-91699/ingest-report.md) Phil "Felipe" Ehr | 17 → **17** | 2 → 2 | 4 → 0 | yes | 7 | 6 | ok |
| FL-7-general | [FL-DOE-90631](FL-7/FL-DOE-90631/ingest-report.md) Bale Dalton | 37 → **44** | 2 → 3 | 10 → 2 | no | 18 | 9 | ok |
|  | [FL-DOE-90696](FL-7/FL-DOE-90696/ingest-report.md) Ryan Elijah | 54 → **64** | 2 → 3 | 8 → 1 | yes | 21 | 14 | ok |
|  | [FL-DOE-92377](FL-7/FL-DOE-92377/ingest-report.md) Christopher Dennison | 17 → **17** | 2 → 2 | 2 → 1 | no | 8 | 6 | ok |
| FL-8-general | [FL-DOE-89522](FL-8/FL-DOE-89522/ingest-report.md) Mike Haridopolos | 34 → **39** | 2 → 3 | 6 → 1 | yes | 18 | 11 | ok |
|  | [FL-DOE-90831](FL-8/FL-DOE-90831/ingest-report.md) Jennifer Jenkins | 25 → **30** | 2 → 3 | 3 → 1 | yes | 13 | 9 | ok |
| FL-9-general | [FL-DOE-89339](FL-9/FL-DOE-89339/ingest-report.md) Darren Soto | 19 → **15** | 2 → 1 | 7 → 1 | no | 7 | 4 | ok |
|  | [FL-DOE-91337](FL-9/FL-DOE-91337/ingest-report.md) Dan Green | 11 → **21** | 2 → 3 | 5 → 1 | yes | 6 | 3 | ok |
| FL-AGR-general | [FL-DOE-90560](FL-AGR/FL-DOE-90560/ingest-report.md) Wilton Simpson | 72 → **137** | 4 → 8 | 12 → 6 | yes | 30 | 19 | ok |
|  | [FL-DOE-92013](FL-AGR/FL-DOE-92013/ingest-report.md) Joey Mendoza Atkins | 2 → **2** | 1 → 1 | 0 → 0 | no | 0 | 0 | ok |
| FL-ATG-general | [FL-DOE-89041](FL-ATG/FL-DOE-89041/ingest-report.md) James Uthmeier | 1 → **2** | 1 → 2 | 1 → 0 | yes | 0 | 0 | ok |
|  | [FL-DOE-89231](FL-ATG/FL-DOE-89231/ingest-report.md) Jose Javier Rodriguez | 13 → **17** | 2 → 3 | 5 → 1 | yes | 9 | 4 | ok |
| FL-BRO-CC6-general | [FL-VF-BRO-1041](FL-BRO-CC6/FL-VF-BRO-1041/ingest-report.md) Caryl Sandler Shuham | 42 → **0** | 1 → 0 | 0 → 0 | no | — | — | **challenge_empty** |
| FL-BRO-SB1-general | [FL-VF-BRO-1194](FL-BRO-SB1/FL-VF-BRO-1194/ingest-report.md) Maura McCarthy Bulman | 12 → **18** | 1 → 2 | 2 → 0 | yes | 3 | 1 | ok |
| FL-BRO-SB4-general | [FL-VF-BRO-1191](FL-BRO-SB4/FL-VF-BRO-1191/ingest-report.md) Nicole Morst | 9 → **9** | 1 → 1 | 2 → 0 | no | 4 | 1 | ok |
| FL-BRO-SB6-general | [FL-VF-BRO-1172](FL-BRO-SB6/FL-VF-BRO-1172/ingest-report.md) Roberto Fernandez III | 0 → **21** | 0 → 1 | 0 → 0 | no | 0 | 0 | ok |
|  | [FL-VF-BRO-1184](FL-BRO-SB6/FL-VF-BRO-1184/ingest-report.md) Adam Cervera | 19 → **19** | 1 → 1 | 0 → 0 | no | 1 | 0 | ok |
| FL-BRO-SB7-general | [FL-VF-BRO-1254](FL-BRO-SB7/FL-VF-BRO-1254/ingest-report.md) Cynthia Alceus Dominique | 62 → **62** | 1 → 1 | 0 → 0 | no | 33 | 5 | ok |
| FL-BRO-SBAL8-general | [FL-VF-BRO-1195](FL-BRO-SBAL8/FL-VF-BRO-1195/ingest-report.md) Allen Zeman | 7 → **11** | 1 → 2 | 5 → 0 | yes | 0 | 0 | ok |
| FL-CFO-general | [FL-DOE-89394](FL-CFO/FL-DOE-89394/ingest-report.md) Blaise Ingoglia | 43 → **50** | 2 → 3 | 9 → 1 | yes | 14 | 8 | ok |
|  | [FL-DOE-91310](FL-CFO/FL-DOE-91310/ingest-report.md) Annette Taddeo | 10 → **0** | 2 → 0 | 0 → — (cap) | no | — | — | **bot_wall** |
| FL-DAD-CC2-general | [FL-VF-DAD-2964](FL-DAD-CC2/FL-VF-DAD-2964/ingest-report.md) Marleine Bastien | 18 → **18** | 1 → 1 | 0 → 0 | no | 4 | 3 | ok |
| FL-DAD-CC5-general | [FL-VF-DAD-2949](FL-DAD-CC5/FL-VF-DAD-2949/ingest-report.md) Vicki L. Lopez | 0 → **9** | 0 → 1 | 1 → 0 | no | 6 | 3 | ok |
|  | [FL-VF-DAD-2998](FL-DAD-CC5/FL-VF-DAD-2998/ingest-report.md) Rob Piper | 0 → **0** | 0 → 0 | 0 → — (cap) | no | — | — | **bot_wall** |
| FL-DAD-SB1-general | [FL-VF-DAD-3070](FL-DAD-SB1/FL-VF-DAD-3070/ingest-report.md) Katrina Wilson | 1 → **1** | 1 → 1 | 0 → 0 | no | 0 | 0 | ok |
|  | [FL-VF-DAD-3076](FL-DAD-SB1/FL-VF-DAD-3076/ingest-report.md) Linda Cothiere | 82 → **122** | 2 → 3 | 6 → 1 | yes | 29 | 12 | ok |
| FL-HIL-CC1-general | [FL-VF-HIL-2640](FL-HIL-CC1/FL-VF-HIL-2640/ingest-report.md) Harry Cohen | 0 → **10** | 0 → 1 | 4 → 1 | yes | 2 | 1 | ok |
|  | [FL-VF-HIL-2880](FL-HIL-CC1/FL-VF-HIL-2880/ingest-report.md) Jackie Toledo | 33 → **45** | 2 → 3 | 4 → 1 | yes | 7 | 4 | ok |
| FL-HIL-CC3-general | [FL-VF-HIL-2621](FL-HIL-CC3/FL-VF-HIL-2621/ingest-report.md) Gwen Myers | 9 → **5** | 2 → 2 | 3 → 0 | yes | 1 | 1 | ok |
|  | [FL-VF-HIL-2646](FL-HIL-CC3/FL-VF-HIL-2646/ingest-report.md) Luiz F. F. Garcia | 23 → **30** | 2 → 3 | 2 → 1 | yes | 16 | 8 | ok |
| FL-HIL-CC5-general | [FL-VF-HIL-2636](FL-HIL-CC5/FL-VF-HIL-2636/ingest-report.md) Neil Manimala | 13 → **17** | 2 → 3 | 4 → 1 | yes | 3 | 2 | ok |
|  | [FL-VF-HIL-2661](FL-HIL-CC5/FL-VF-HIL-2661/ingest-report.md) Stacy Hahn | 16 → **16** | 1 → 1 | 0 → 0 | no | 4 | 2 | ok |
| FL-HIL-CC7-general | [FL-VF-HIL-2620](FL-HIL-CC7/FL-VF-HIL-2620/ingest-report.md) Joshua Wostal | 7 → **50** | 1 → 6 | 7 → 4 | yes | 16 | 5 | ok |
|  | [FL-VF-HIL-2660](FL-HIL-CC7/FL-VF-HIL-2660/ingest-report.md) Aileen Rodriguez | 14 → **14** | 1 → 1 | 0 → 0 | no | 4 | 3 | ok |
| FL-HIL-SB2-general | [FL-VF-HIL-2675](FL-HIL-SB2/FL-VF-HIL-2675/ingest-report.md) Daniela Simic | 4 → **10** | 1 → 2 | 2 → 0 | yes | 2 | 1 | ok |
|  | [FL-VF-HIL-2677](FL-HIL-SB2/FL-VF-HIL-2677/ingest-report.md) Brittany Lyssy | 3 → **3** | 1 → 1 | 0 → 0 | no | 2 | 0 | ok |
| FL-HIL-SB4-general | [FL-VF-HIL-2672](FL-HIL-SB4/FL-VF-HIL-2672/ingest-report.md) Patricia "Patti" Rendon | 1 → **1** | 1 → 1 | 1 → 1 | no | 0 | 0 | ok |
| FL-HIL-SB6-general | [FL-VF-HIL-2610](FL-HIL-SB6/FL-VF-HIL-2610/ingest-report.md) Kenneth "Ken" Gay | 13 → **18** | 2 → 3 | 2 → 1 | yes | 2 | 0 | ok |
|  | [FL-VF-HIL-2645](FL-HIL-SB6/FL-VF-HIL-2645/ingest-report.md) Karen Perez | 15 → **15** | 1 → 1 | 1 → 0 | yes | 0 | 0 | ok |
| FL-ORA-CC2-general | [FL-VF-ORA-1290](FL-ORA-CC2/FL-VF-ORA-1290/ingest-report.md) Kamia Brown | 15 → **39** | 1 → 2 | 3 → 0 | yes | 14 | 7 | ok |
|  | [FL-VF-ORA-1384](FL-ORA-CC2/FL-VF-ORA-1384/ingest-report.md) Mike Crabb | 36 → **45** | 2 → 3 | 6 → 1 | yes | 12 | 6 | ok |
| FL-ORA-CC4-general | [FL-VF-ORA-1260](FL-ORA-CC4/FL-VF-ORA-1260/ingest-report.md) Brian Jones | 0 → **6** | 0 → 1 | 2 → 0 | yes | 3 | 0 | ok |
|  | [FL-VF-ORA-1279](FL-ORA-CC4/FL-VF-ORA-1279/ingest-report.md) Johanna Lopez | 41 → **21** | 2 → 2 | 6 → 0 | yes | 0 | 0 | ok |
| FL-ORA-CC6-general | [FL-VF-ORA-1265](FL-ORA-CC6/FL-VF-ORA-1265/ingest-report.md) Michael "Mike" Scott | 9 → **19** | 2 → 3 | 7 → 3 | yes | 0 | 0 | ok |
|  | [FL-VF-ORA-1295](FL-ORA-CC6/FL-VF-ORA-1295/ingest-report.md) Lawanna Gelzer | 1 → **23** | 1 → 2 | 3 → 1 | yes | 0 | 0 | ok |
| FL-ORA-CC7-general | [FL-VF-ORA-1271](FL-ORA-CC7/FL-VF-ORA-1271/ingest-report.md) Vicki Vargo | 13 → **34** | 2 → 3 | 3 → 1 | yes | 6 | 2 | ok |
|  | [FL-VF-ORA-1283](FL-ORA-CC7/FL-VF-ORA-1283/ingest-report.md) Patricia Rumph | 21 → **80** | 2 → 3 | 2 → 1 | yes | 10 | 4 | ok |
| FL-ORA-CC8-general | [FL-VF-ORA-1272](FL-ORA-CC8/FL-VF-ORA-1272/ingest-report.md) Victor M. Torres Jr. | 16 → **16** | 1 → 1 | 0 → 0 | no | 4 | 3 | ok |
|  | [FL-VF-ORA-1275](FL-ORA-CC8/FL-VF-ORA-1275/ingest-report.md) Jeannette Quinones Hernandez | 0 → **0** | 0 → 0 | 0 → — (cap) | no | — | — | **robots_block** |
| FL-ORA-CLERK-general | [FL-VF-ORA-1364](FL-ORA-CLERK/FL-VF-ORA-1364/ingest-report.md) Terrell Thomas | 23 → **43** | 1 → 2 | 2 → 1 | yes | 3 | 0 | ok |
|  | [FL-VF-ORA-1401](FL-ORA-CLERK/FL-VF-ORA-1401/ingest-report.md) Roberta Walton Johnson | 48 → **56** | 2 → 3 | 7 → 1 | yes | 10 | 0 | ok |
| FL-ORA-MAYOR-general | [FL-VF-ORA-1236](FL-ORA-MAYOR/FL-VF-ORA-1236/ingest-report.md) Tiffany Moore Russell | 11 → **23** | 2 → 3 | 5 → 1 | yes | 4 | 2 | ok |
|  | [FL-VF-ORA-1239](FL-ORA-MAYOR/FL-VF-ORA-1239/ingest-report.md) Chris Messina | 27 → **35** | 3 → 4 | 7 → 3 | yes | 16 | 10 | ok |
| FL-ORA-SB1-general | [FL-VF-ORA-1270](FL-ORA-SB1/FL-VF-ORA-1270/ingest-report.md) Melissa Lopez Marantes | 5 → **9** | 1 → 2 | 1 → 0 | yes | 3 | 0 | ok |
| FL-ORA-SB2-general | [FL-VF-ORA-1318](FL-ORA-SB2/FL-VF-ORA-1318/ingest-report.md) Gloria Reina O'Neal | 39 → **39** | 1 → 1 | 0 → 0 | no | 9 | 1 | ok |
| FL-ORA-SB3-general | [FL-VF-ORA-1242](FL-ORA-SB3/FL-VF-ORA-1242/ingest-report.md) Susanne Peña | 3 → **10** | 1 → 2 | 4 → 0 | yes | 2 | 0 | ok |
|  | [FL-VF-ORA-1314](FL-ORA-SB3/FL-VF-ORA-1314/ingest-report.md) Diana Moore | 13 → **13** | 1 → 1 | 4 → 0 | no | 5 | 2 | ok |
| FL-SEN-general | [FL-DOE-89119](FL-SEN/FL-DOE-89119/ingest-report.md) Ashley Moody | 4 → **12** | 1 → 2 | 12 → 0 | yes | 2 | 0 | ok |
|  | [FL-DOE-89955](FL-SEN/FL-DOE-89955/ingest-report.md) Neil J. Gillespie | 80 → **80** | 1 → 1 | 8 → 1 | no | 0 | 0 | ok |
|  | [FL-DOE-90009](FL-SEN/FL-DOE-90009/ingest-report.md) Angie Nixon | 162 → **133** | 5 → 3 | 13 → 1 | yes | 102 | 50 | ok |
| FL-GOV-general | [FL-DOE-84076](FL-GOV/FL-DOE-84076/reingest-2026-09-29/ingest-report.md) Scott Eckhard Jewett | 0 → **351** | 0 → 5 | 14 → 4 | yes | 156 | 79 | ok |
|  | [FL-DOE-88529](FL-GOV/FL-DOE-88529/reingest-2026-09-29/ingest-report.md) Moliere "Moe" Dimanche | 18 → **123** | 2 → 3 | 17 → 2 | no | 10 | 8 | ok |
|  | [FL-DOE-89042](FL-GOV/FL-DOE-89042/reingest-2026-09-29/ingest-report.md) Byron Donalds | 58 → **58** | 7 → 7 | 10 → 6 | no | 45 | 28 | ok |
|  | [FL-DOE-89243](FL-GOV/FL-DOE-89243/reingest-2026-09-29/ingest-report.md) David Jolly | 215 → **190** | 9 → 10 | 27 → 8 (cap) | yes | 56 | 42 | ok |
|  | [FL-DOE-89571](FL-GOV/FL-DOE-89571/reingest-2026-09-29/ingest-report.md) Frank J. Russo | 199 → **204** | 8 → 9 | 21 → 7 | yes | 77 | 47 | ok |
|  | [FL-DOE-90433](FL-GOV/FL-DOE-90433/reingest-2026-09-29/ingest-report.md) Dean Ocean Abrams | 0 → **0** | 0 → 0 | 0 → — (cap) | no | — | — | **bot_wall** |
|  | [FL-DOE-90630](FL-GOV/FL-DOE-90630/reingest-2026-09-29/ingest-report.md) Charles Burkett | 189 → **189** | 1 → 1 | 5 → 1 | no | 89 | 44 | ok |

## Races that still start uneven

Multi-candidate races where a candidate is unreadable, or where the count of passages that state a policy differs 10× or more. Their `word_count` gate will need the founder's call, as FL-GOV's did.

- **FL-14-general:** Kathy Castor 2, Mike Beltran unreadable, Brian Lambert 51
- **FL-20-general:** Kedner Maxime 51, Brent Andersen 1, Debbie Wasserman Schultz 1
- **FL-22-general:** Pia Dandiya unreadable, Casey Askar 1
- **FL-27-general:** Eliott Rodriguez 0, Maria Elvira Salazar 23
- **FL-28-general:** Eddy Rojas 0, Carlos A. Gimenez 0, Phil "Felipe" Ehr 7
- **FL-AGR-general:** Wilton Simpson 30, Joey Mendoza Atkins 0
- **FL-ATG-general:** James Uthmeier 0, Jose Javier Rodriguez 9
- **FL-BRO-SB6-general:** Roberto Fernandez III 0, Adam Cervera 1
- **FL-CFO-general:** Blaise Ingoglia 14, Annette Taddeo unreadable
- **FL-DAD-CC5-general:** Vicki L. Lopez 6, Rob Piper unreadable
- **FL-DAD-SB1-general:** Katrina Wilson 0, Linda Cothiere 29
- **FL-HIL-CC3-general:** Gwen Myers 1, Luiz F. F. Garcia 16
- **FL-HIL-SB6-general:** Kenneth "Ken" Gay 2, Karen Perez 0
- **FL-ORA-CC4-general:** Brian Jones 3, Johanna Lopez 0
- **FL-ORA-CC6-general:** Michael "Mike" Scott 0, Lawanna Gelzer 0
- **FL-ORA-CC8-general:** Victor M. Torres Jr. 4, Jeannette Quinones Hernandez unreadable
- **FL-SEN-general:** Ashley Moody 2, Neil J. Gillespie 0, Angie Nixon 102
- **FL-GOV-general:** Scott Eckhard Jewett 156, Moliere "Moe" Dimanche 10, Byron Donalds 45, David Jolly 56, Frank J. Russo 77, Dean Ocean Abrams unreadable, Charles Burkett 89

## Next, on the founder's go-ahead

1. Step 3: Profiler reviews of each run (a reviewer subagent per candidate, as FL-GOV had).
2. Each race's spine and `word_count` decision, then Step 4 plans and `brief.sql`, as D1/D2 were for FL-GOV.
3. FL-GOV: decide whether to rebuild its brief from `reingest-2026-09-29/` (the published one came from the keyword crawl).
4. The bio section can now quote the About pages read here (self-description); the Recorder facts are still to do.
