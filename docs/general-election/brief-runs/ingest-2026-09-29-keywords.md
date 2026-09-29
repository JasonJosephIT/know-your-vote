# Ingest, all remaining general-election races (2026-09-29, keyword links)

> **Superseded** by `ingest-jev-2026-09-29.md`, the same day. After reading findings 1 and 2 below, the founder had the link choice moved to Jev and every site re-ingested, FL-GOV included. This run's per-candidate files are kept in each folder's `attempt-1-keywords/`.

Session C2, Step 1 only, for every ballot candidate with an `official_site` outside FL-GOV. **Fetch and save only:** no Jev run, no database write, nothing published. Steps 2–6 wait on the founder.

## How it ran

- **Targets:** `ingest-targets-2026-09-29.tsv`, queried from Supabase on 2026-09-29: every `ballot_status = 'ballot'` candidate with a non-null `official_site` in a general race other than FL-GOV-general. That is 90 candidates in 46 races.
- **Command:** the exact one from `FL-GOV/ingest-prompt.md`, per candidate: default `--pages` (8) and `--browser` (auto), no other flag, no retry. Output goes to `<RACE>/<candidate_id>/` (`passages.jsonl`, `ingest.log`, `meta.tsv`, `ingest-report.md`).
- **Driver:** `ingest-driver-2026-09-29.sh` ran the command directly, six candidates at a time (each a different host), instead of dispatching one subagent per candidate as the FL-GOV run did. The command, flags and rules are identical; the subagent added only the report, which `ingest-reports-2026-09-29.mjs` now writes from the same files. This saves roughly 60k subagent tokens per candidate.
- **Politeness:** the script reads robots.txt (its own token and every Anthropic crawler token) and honours any Crawl-delay; requests to one host are serialized. No captcha was solved and no robots rule was bypassed. Chromium trusts the proxy CA (checked before the run), so a browser failure below is the site's, not the container's.
- **Wall-clock:** 2026-09-29T09:46:52Z → 2026-09-29T09:51:09Z (4 min) for the whole batch.

## Totals

| | Candidates |
|---|---|
| Readable (exit 0, passages > 0) | **81** |
| Bot challenge did not clear | 3 |
| robots.txt disallows | 1 |
| Bot challenge; browser rendered an empty page | 4 |
| Links but no text (client-side rendering, no challenge) | 1 |
| Homepage unreachable | 0 |
| Zero passages, other | 0 |
| Non-zero exit, other | 0 |
| **Total** | **90** |

Across the readable sites: 2345 passages (median 18, range 1–162); 2 hit the 8-page cap; 32 yielded the homepage only; 1 fetched an About or bio page; 7 set a Crawl-delay; 20 needed the browser for at least one page.

## Failures (reported as-is, not retried)

| Race | Candidate | Site | Result | Exit | Log (first noteworthy line) |
|---|---|---|---|---|---|
| FL-14-general | FL-DOE-91313 Mike Beltran | https://beltranforcongress.com/ | FAILURE: bot challenge; the browser rendered a page with no links and no text | 1 | `bot challenge (HTTP 202), retrying in the browser: https://beltranforcongress.com/` |
| FL-20-general | FL-DOE-91278 Brent Andersen | https://brentandersenfl.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | 1 | `robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)` |
| FL-22-general | FL-DOE-89301 Pia Dandiya | https://piaforcongress.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | 1 | `robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)` |
| FL-BRO-SB6-general | FL-VF-BRO-1172 Roberto Fernandez III | https://www.electroberto2026.com/ | FAILURE: bot challenge; the browser rendered a page with no links and no text | 1 | `robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)` |
| FL-DAD-CC5-general | FL-VF-DAD-2949 Vicki L. Lopez | https://vickilopez.vote/ | FAILURE: bot challenge; the browser rendered a page with no links and no text | 1 | `robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)` |
| FL-DAD-CC5-general | FL-VF-DAD-2998 Rob Piper | https://www.robpiperheretoserve.com/ | FAILURE: bot challenge did not clear (not solved, by rule) | 1 | `bot challenge did not clear in the browser: https://www.robpiperheretoserve.com/robots.txt` |
| FL-HIL-CC1-general | FL-VF-HIL-2640 Harry Cohen | https://harrycohen.vote/ | FAILURE: bot challenge; the browser rendered a page with no links and no text | 1 | `robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)` |
| FL-ORA-CC4-general | FL-VF-ORA-1260 Brian Jones | https://brianhubertjones.com/ | FAILURE: homepage fetched with links but no text (likely rendered client-side; no challenge, so no browser fallback) | 1 | `No passages from https://brianhubertjones.com/. That is a finding about the fetch, not about the candidate: check whether the site renders its text client-side, or serves a bot challenge to non-browser clients.` |
| FL-ORA-CC8-general | FL-VF-ORA-1275 Jeannette Quinones Hernandez | https://www.jeannette2026.com/ | FAILURE: robots.txt disallows the crawl (honoured) | 1 | `robots.txt disallows https://www.jeannette2026.com/ for ClaudeBot, Claude-Web, anthropic-ai — stopping.` |

Under D3/D4 each of these becomes **recorded silence** (`no_stated_position_found` on every spine issue) unless the founder decides otherwise. Full logs are in each folder.

## Findings for the founder (information only; nothing was re-run or edited)

1. **Most sites give the homepage only.** 32 of 81 readable sites had no link the policy selector recognises (`POLICY_PATH_HINTS`: issues, platform, priorities, plan, vision, where-i-stand and similar), so only the homepage was read. The ones left with 4 passages or fewer, statewide and congressional campaigns among them: Maxwell Alejandro Frost (4), Casey Askar (1), Joey Mendoza Atkins (2), James Uthmeier (1), Katrina Wilson (1), Daniela Simic (4), Brittany Lyssy (3), Susanne Peña (3), Ashley Moody (4). Their thin result is the selector's reach, not necessarily the candidate's silence. Changing the selector would change the ingest for every candidate, so it is a founder decision, and FL-GOV would need the same re-ingest to stay equal.
2. **The About page is almost never fetched.** 1 of 90 (Phil "Felipe" Ehr). The bio section (D1) still has no source for the self-description; this is FL-GOV's finding 4 at scale.
3. **The HTTP 202 challenge is one wall across many sites.** 6 of the 9 failures got an HTTP 202 bot challenge (Jewett's in FL-GOV was the same); Rob Piper got an HTTP 403 one (as Abrams did). On some, Chromium never cleared it; on others it "cleared" to a page with no links or text. Either way no candidate text was read. Solving or working around it is ruled out.
4. **One site blocks Anthropic crawlers by name in robots.txt** (Jeannette Quinones Hernandez, https://www.jeannette2026.com/). The script stopped, as it must.
5. **The 8-page cap bit only 2 site(s)** (Nicole Locklin, Maria Elvira Salazar), so the cap is not today's main source of unevenness; finding 1 is.

## Per race

| Race | Candidate | Passages | Pages | Links → selected | About page | Crawl-delay | Browser pages | Result |
|---|---|---|---|---|---|---|---|---|
| FL-10-general | [FL-DOE-89909](FL-10/FL-DOE-89909/attempt-1-keywords/ingest-report.md) Maxwell Alejandro Frost | 4 | 1 | 36 → 0 | no | — | — | ok |
| FL-11-general | [FL-DOE-88517](FL-11/FL-DOE-88517/attempt-1-keywords/ingest-report.md) Ralph Groves | 18 | 1 | 12 → 0 | no | — | — | ok |
|  | [FL-DOE-91715](FL-11/FL-DOE-91715/attempt-1-keywords/ingest-report.md) James Pericola | 18 | 1 | 42 → 0 | no | 10 s | 1 | ok |
|  | [FL-DOE-91717](FL-11/FL-DOE-91717/attempt-1-keywords/ingest-report.md) Joe Strada | 16 | 2 | 37 → 1 | no | — | — | ok |
| FL-12-general | [FL-DOE-88868](FL-12/FL-DOE-88868/attempt-1-keywords/ingest-report.md) Gus Michael Bilirakis | 49 | 2 | 39 → 1 | no | — | — | ok |
|  | [FL-DOE-89453](FL-12/FL-DOE-89453/attempt-1-keywords/ingest-report.md) Kimberly Overman | 47 | 4 | 140 → 3 | no | — | — | ok |
|  | [FL-DOE-89778](FL-12/FL-DOE-89778/attempt-1-keywords/ingest-report.md) Branden Scrivener | 11 | 1 | 5 → 0 | no | — | — | ok |
| FL-14-general | [FL-DOE-88870](FL-14/FL-DOE-88870/attempt-1-keywords/ingest-report.md) Kathy Castor | 7 | 4 | 66 → 3 | no | 10 s | — | ok |
|  | [FL-DOE-91313](FL-14/FL-DOE-91313/attempt-1-keywords/ingest-report.md) Mike Beltran | 0 | 0 | 0 → 0 | no | — | — | **challenge_empty** |
|  | [FL-DOE-92395](FL-14/FL-DOE-92395/attempt-1-keywords/ingest-report.md) Brian Lambert | 139 | 7 | 30 → 6 | no | — | — | ok |
| FL-15-general | [FL-DOE-89116](FL-15/FL-DOE-89116/attempt-1-keywords/ingest-report.md) Robert People | 43 | 2 | 23 → 1 | no | — | — | ok |
|  | [FL-DOE-89121](FL-15/FL-DOE-89121/attempt-1-keywords/ingest-report.md) Laurel Lee | 25 | 1 | 53 → 0 | no | 10 s | — | ok |
| FL-16-general | [FL-DOE-89623](FL-16/FL-DOE-89623/attempt-1-keywords/ingest-report.md) Mark Davis | 34 | 2 | 53 → 2 | no | — | — | ok |
|  | [FL-DOE-90251](FL-16/FL-DOE-90251/attempt-1-keywords/ingest-report.md) Sydney Gruters | 9 | 1 | 25 → 1 | no | — | — | ok |
|  | [FL-DOE-90779](FL-16/FL-DOE-90779/attempt-1-keywords/ingest-report.md) Kelly Kirschner | 73 | 1 | 39 → 0 | no | — | — | ok |
| FL-20-general | [FL-DOE-90814](FL-20/FL-DOE-90814/attempt-1-keywords/ingest-report.md) Kedner Maxime | 49 | 5 | 43 → 4 | no | — | — | ok |
|  | [FL-DOE-91278](FL-20/FL-DOE-91278/attempt-1-keywords/ingest-report.md) Brent Andersen | 0 | 0 | — | no | — | — | **bot_wall** |
|  | [FL-DOE-91577](FL-20/FL-DOE-91577/attempt-1-keywords/ingest-report.md) Debbie Wasserman Schultz | 11 | 2 | 63 → 1 | no | — | 2 | ok |
| FL-22-general | [FL-DOE-89301](FL-22/FL-DOE-89301/attempt-1-keywords/ingest-report.md) Pia Dandiya | 0 | 0 | — | no | — | — | **bot_wall** |
|  | [FL-DOE-92109](FL-22/FL-DOE-92109/attempt-1-keywords/ingest-report.md) Casey Askar | 1 | 1 | 21 → 0 | no | — | — | ok |
| FL-24-general | [FL-DOE-90703](FL-24/FL-DOE-90703/attempt-1-keywords/ingest-report.md) Te Mayonna Brown | 24 | 3 | 61 → 2 | no | — | — | ok |
|  | [FL-DOE-91544](FL-24/FL-DOE-91544/attempt-1-keywords/ingest-report.md) Oliver G. Gilbert III | 62 | 3 | 72 → 2 | no | — | 3 | ok |
| FL-25-general | [FL-DOE-88911](FL-25/FL-DOE-88911/attempt-1-keywords/ingest-report.md) Jared Moskowitz | 32 | 3 | 90 → 2 | no | 10 s | 3 | ok |
|  | [FL-DOE-89801](FL-25/FL-DOE-89801/attempt-1-keywords/ingest-report.md) Scott Singer | 52 | 2 | 65 → 1 | no | — | — | ok |
| FL-26-general | [FL-DOE-89980](FL-26/FL-DOE-89980/attempt-1-keywords/ingest-report.md) Nicole Locklin | 60 | 9 | 57 → 8 (cap) | no | — | — | ok |
|  | [FL-DOE-90330](FL-26/FL-DOE-90330/attempt-1-keywords/ingest-report.md) Mario Diaz-Balart | 80 | 1 | 40 → 0 | no | — | — | ok |
| FL-27-general | [FL-DOE-89933](FL-27/FL-DOE-89933/attempt-1-keywords/ingest-report.md) Eliott Rodriguez | 53 | 2 | 29 → 1 | no | — | 2 | ok |
|  | [FL-DOE-90721](FL-27/FL-DOE-90721/attempt-1-keywords/ingest-report.md) Maria Elvira Salazar | 96 | 9 | 81 → 8 (cap) | no | 10 s | — | ok |
| FL-28-general | [FL-DOE-90340](FL-28/FL-DOE-90340/attempt-1-keywords/ingest-report.md) Eddy Rojas | 4 | 1 | 6 → 1 | no | — | — | ok |
|  | [FL-DOE-91226](FL-28/FL-DOE-91226/attempt-1-keywords/ingest-report.md) Carlos A. Gimenez | 3 | 2 | 19 → 1 | no | — | — | ok |
|  | [FL-DOE-91699](FL-28/FL-DOE-91699/attempt-1-keywords/ingest-report.md) Phil "Felipe" Ehr | 17 | 2 | 56 → 1 | yes | — | — | ok |
| FL-7-general | [FL-DOE-90631](FL-7/FL-DOE-90631/attempt-1-keywords/ingest-report.md) Bale Dalton | 37 | 2 | 51 → 1 | no | — | 2 | ok |
|  | [FL-DOE-90696](FL-7/FL-DOE-90696/attempt-1-keywords/ingest-report.md) Ryan Elijah | 54 | 2 | 51 → 1 | no | — | — | ok |
|  | [FL-DOE-92377](FL-7/FL-DOE-92377/attempt-1-keywords/ingest-report.md) Christopher Dennison | 17 | 2 | 14 → 2 | no | — | — | ok |
| FL-8-general | [FL-DOE-89522](FL-8/FL-DOE-89522/attempt-1-keywords/ingest-report.md) Mike Haridopolos | 34 | 2 | 18 → 1 | no | — | — | ok |
|  | [FL-DOE-90831](FL-8/FL-DOE-90831/attempt-1-keywords/ingest-report.md) Jennifer Jenkins | 25 | 2 | 124 → 1 | no | — | 2 | ok |
| FL-9-general | [FL-DOE-89339](FL-9/FL-DOE-89339/attempt-1-keywords/ingest-report.md) Darren Soto | 19 | 2 | 64 → 2 | no | — | — | ok |
|  | [FL-DOE-91337](FL-9/FL-DOE-91337/attempt-1-keywords/ingest-report.md) Dan Green | 11 | 2 | 34 → 1 | no | — | 2 | ok |
| FL-AGR-general | [FL-DOE-90560](FL-AGR/FL-DOE-90560/attempt-1-keywords/ingest-report.md) Wilton Simpson | 72 | 4 | 41 → 3 | no | — | — | ok |
|  | [FL-DOE-92013](FL-AGR/FL-DOE-92013/attempt-1-keywords/ingest-report.md) Joey Mendoza Atkins | 2 | 1 | 44 → 0 | no | — | — | ok |
| FL-ATG-general | [FL-DOE-89041](FL-ATG/FL-DOE-89041/attempt-1-keywords/ingest-report.md) James Uthmeier | 1 | 1 | 25 → 0 | no | — | — | ok |
|  | [FL-DOE-89231](FL-ATG/FL-DOE-89231/attempt-1-keywords/ingest-report.md) Jose Javier Rodriguez | 13 | 2 | 31 → 1 | no | — | — | ok |
| FL-BRO-CC6-general | [FL-VF-BRO-1041](FL-BRO-CC6/FL-VF-BRO-1041/attempt-1-keywords/ingest-report.md) Caryl Sandler Shuham | 42 | 1 | 53 → 0 | no | — | 1 | ok |
| FL-BRO-SB1-general | [FL-VF-BRO-1194](FL-BRO-SB1/FL-VF-BRO-1194/attempt-1-keywords/ingest-report.md) Maura McCarthy Bulman | 12 | 1 | 26 → 0 | no | — | — | ok |
| FL-BRO-SB4-general | [FL-VF-BRO-1191](FL-BRO-SB4/FL-VF-BRO-1191/attempt-1-keywords/ingest-report.md) Nicole Morst | 9 | 1 | 22 → 0 | no | — | — | ok |
| FL-BRO-SB6-general | [FL-VF-BRO-1172](FL-BRO-SB6/FL-VF-BRO-1172/attempt-1-keywords/ingest-report.md) Roberto Fernandez III | 0 | 0 | 0 → 0 | no | — | — | **challenge_empty** |
|  | [FL-VF-BRO-1184](FL-BRO-SB6/FL-VF-BRO-1184/attempt-1-keywords/ingest-report.md) Adam Cervera | 19 | 1 | 19 → 0 | no | — | — | ok |
| FL-BRO-SB7-general | [FL-VF-BRO-1254](FL-BRO-SB7/FL-VF-BRO-1254/attempt-1-keywords/ingest-report.md) Cynthia Alceus Dominique | 62 | 1 | 20 → 0 | no | — | — | ok |
| FL-BRO-SBAL8-general | [FL-VF-BRO-1195](FL-BRO-SBAL8/FL-VF-BRO-1195/attempt-1-keywords/ingest-report.md) Allen Zeman | 7 | 1 | 8 → 0 | no | — | — | ok |
| FL-CFO-general | [FL-DOE-89394](FL-CFO/FL-DOE-89394/attempt-1-keywords/ingest-report.md) Blaise Ingoglia | 43 | 2 | 64 → 1 | no | — | 2 | ok |
|  | [FL-DOE-91310](FL-CFO/FL-DOE-91310/attempt-1-keywords/ingest-report.md) Annette Taddeo | 10 | 2 | 64 → 1 | no | — | 2 | ok |
| FL-DAD-CC2-general | [FL-VF-DAD-2964](FL-DAD-CC2/FL-VF-DAD-2964/attempt-1-keywords/ingest-report.md) Marleine Bastien | 18 | 1 | 21 → 0 | no | — | 1 | ok |
| FL-DAD-CC5-general | [FL-VF-DAD-2949](FL-DAD-CC5/FL-VF-DAD-2949/attempt-1-keywords/ingest-report.md) Vicki L. Lopez | 0 | 0 | 0 → 0 | no | — | — | **challenge_empty** |
|  | [FL-VF-DAD-2998](FL-DAD-CC5/FL-VF-DAD-2998/attempt-1-keywords/ingest-report.md) Rob Piper | 0 | 0 | — | no | — | — | **bot_wall** |
| FL-DAD-SB1-general | [FL-VF-DAD-3070](FL-DAD-SB1/FL-VF-DAD-3070/attempt-1-keywords/ingest-report.md) Katrina Wilson | 1 | 1 | 4 → 0 | no | — | — | ok |
|  | [FL-VF-DAD-3076](FL-DAD-SB1/FL-VF-DAD-3076/attempt-1-keywords/ingest-report.md) Linda Cothiere | 82 | 2 | 41 → 1 | no | — | — | ok |
| FL-HIL-CC1-general | [FL-VF-HIL-2640](FL-HIL-CC1/FL-VF-HIL-2640/attempt-1-keywords/ingest-report.md) Harry Cohen | 0 | 0 | 0 → 0 | no | — | — | **challenge_empty** |
|  | [FL-VF-HIL-2880](FL-HIL-CC1/FL-VF-HIL-2880/attempt-1-keywords/ingest-report.md) Jackie Toledo | 33 | 2 | 47 → 1 | no | — | 2 | ok |
| FL-HIL-CC3-general | [FL-VF-HIL-2621](FL-HIL-CC3/FL-VF-HIL-2621/attempt-1-keywords/ingest-report.md) Gwen Myers | 9 | 2 | 14 → 1 | no | — | — | ok |
|  | [FL-VF-HIL-2646](FL-HIL-CC3/FL-VF-HIL-2646/attempt-1-keywords/ingest-report.md) Luiz F. F. Garcia | 23 | 2 | 22 → 1 | no | — | — | ok |
| FL-HIL-CC5-general | [FL-VF-HIL-2636](FL-HIL-CC5/FL-VF-HIL-2636/attempt-1-keywords/ingest-report.md) Neil Manimala | 13 | 2 | 57 → 1 | no | — | — | ok |
|  | [FL-VF-HIL-2661](FL-HIL-CC5/FL-VF-HIL-2661/attempt-1-keywords/ingest-report.md) Stacy Hahn | 16 | 1 | 2 → 0 | no | — | — | ok |
| FL-HIL-CC7-general | [FL-VF-HIL-2620](FL-HIL-CC7/FL-VF-HIL-2620/attempt-1-keywords/ingest-report.md) Joshua Wostal | 7 | 1 | 29 → 0 | no | — | — | ok |
|  | [FL-VF-HIL-2660](FL-HIL-CC7/FL-VF-HIL-2660/attempt-1-keywords/ingest-report.md) Aileen Rodriguez | 14 | 1 | 36 → 0 | no | — | — | ok |
| FL-HIL-SB2-general | [FL-VF-HIL-2675](FL-HIL-SB2/FL-VF-HIL-2675/attempt-1-keywords/ingest-report.md) Daniela Simic | 4 | 1 | 14 → 0 | no | — | 1 | ok |
|  | [FL-VF-HIL-2677](FL-HIL-SB2/FL-VF-HIL-2677/attempt-1-keywords/ingest-report.md) Brittany Lyssy | 3 | 1 | 10 → 0 | no | — | — | ok |
| FL-HIL-SB4-general | [FL-VF-HIL-2672](FL-HIL-SB4/FL-VF-HIL-2672/attempt-1-keywords/ingest-report.md) Patricia "Patti" Rendon | 1 | 1 | 4 → 1 | no | — | 1 | ok |
| FL-HIL-SB6-general | [FL-VF-HIL-2610](FL-HIL-SB6/FL-VF-HIL-2610/attempt-1-keywords/ingest-report.md) Kenneth "Ken" Gay | 13 | 2 | 13 → 1 | no | — | — | ok |
|  | [FL-VF-HIL-2645](FL-HIL-SB6/FL-VF-HIL-2645/attempt-1-keywords/ingest-report.md) Karen Perez | 15 | 1 | 8 → 0 | no | — | 1 | ok |
| FL-ORA-CC2-general | [FL-VF-ORA-1290](FL-ORA-CC2/FL-VF-ORA-1290/attempt-1-keywords/ingest-report.md) Kamia Brown | 15 | 1 | 18 → 0 | no | — | — | ok |
|  | [FL-VF-ORA-1384](FL-ORA-CC2/FL-VF-ORA-1384/attempt-1-keywords/ingest-report.md) Mike Crabb | 36 | 2 | 49 → 1 | no | — | — | ok |
| FL-ORA-CC4-general | [FL-VF-ORA-1260](FL-ORA-CC4/FL-VF-ORA-1260/attempt-1-keywords/ingest-report.md) Brian Jones | 0 | 0 | 21 → 0 | no | — | — | **no_text** |
|  | [FL-VF-ORA-1279](FL-ORA-CC4/FL-VF-ORA-1279/attempt-1-keywords/ingest-report.md) Johanna Lopez | 41 | 2 | 46 → 1 | no | — | — | ok |
| FL-ORA-CC6-general | [FL-VF-ORA-1265](FL-ORA-CC6/FL-VF-ORA-1265/attempt-1-keywords/ingest-report.md) Michael "Mike" Scott | 9 | 2 | 28 → 2 | no | — | 3 | ok |
|  | [FL-VF-ORA-1295](FL-ORA-CC6/FL-VF-ORA-1295/attempt-1-keywords/ingest-report.md) Lawanna Gelzer | 1 | 1 | 30 → 1 | no | — | — | ok |
| FL-ORA-CC7-general | [FL-VF-ORA-1271](FL-ORA-CC7/FL-VF-ORA-1271/attempt-1-keywords/ingest-report.md) Vicki Vargo | 13 | 2 | 21 → 1 | no | — | — | ok |
|  | [FL-VF-ORA-1283](FL-ORA-CC7/FL-VF-ORA-1283/attempt-1-keywords/ingest-report.md) Patricia Rumph | 21 | 2 | 39 → 1 | no | — | — | ok |
| FL-ORA-CC8-general | [FL-VF-ORA-1272](FL-ORA-CC8/FL-VF-ORA-1272/attempt-1-keywords/ingest-report.md) Victor M. Torres Jr. | 16 | 1 | 26 → 0 | no | — | — | ok |
|  | [FL-VF-ORA-1275](FL-ORA-CC8/FL-VF-ORA-1275/attempt-1-keywords/ingest-report.md) Jeannette Quinones Hernandez | 0 | 0 | — | no | — | — | **robots_block** |
| FL-ORA-CLERK-general | [FL-VF-ORA-1364](FL-ORA-CLERK/FL-VF-ORA-1364/attempt-1-keywords/ingest-report.md) Terrell Thomas | 23 | 1 | 65 → 1 | no | — | — | ok |
|  | [FL-VF-ORA-1401](FL-ORA-CLERK/FL-VF-ORA-1401/attempt-1-keywords/ingest-report.md) Roberta Walton Johnson | 48 | 2 | 41 → 1 | no | — | — | ok |
| FL-ORA-MAYOR-general | [FL-VF-ORA-1236](FL-ORA-MAYOR/FL-VF-ORA-1236/attempt-1-keywords/ingest-report.md) Tiffany Moore Russell | 11 | 2 | 83 → 1 | no | — | 2 | ok |
|  | [FL-VF-ORA-1239](FL-ORA-MAYOR/FL-VF-ORA-1239/attempt-1-keywords/ingest-report.md) Chris Messina | 27 | 3 | 32 → 4 | no | 20 s | — | ok |
| FL-ORA-SB1-general | [FL-VF-ORA-1270](FL-ORA-SB1/FL-VF-ORA-1270/attempt-1-keywords/ingest-report.md) Melissa Lopez Marantes | 5 | 1 | 10 → 0 | no | — | — | ok |
| FL-ORA-SB2-general | [FL-VF-ORA-1318](FL-ORA-SB2/FL-VF-ORA-1318/attempt-1-keywords/ingest-report.md) Gloria Reina O'Neal | 39 | 1 | 12 → 0 | no | — | 1 | ok |
| FL-ORA-SB3-general | [FL-VF-ORA-1242](FL-ORA-SB3/FL-VF-ORA-1242/attempt-1-keywords/ingest-report.md) Susanne Peña | 3 | 1 | 38 → 0 | no | — | — | ok |
|  | [FL-VF-ORA-1314](FL-ORA-SB3/FL-VF-ORA-1314/attempt-1-keywords/ingest-report.md) Diana Moore | 13 | 1 | 22 → 0 | no | — | — | ok |
| FL-SEN-general | [FL-DOE-89119](FL-SEN/FL-DOE-89119/attempt-1-keywords/ingest-report.md) Ashley Moody | 4 | 1 | 37 → 0 | no | 10 s | — | ok |
|  | [FL-DOE-89955](FL-SEN/FL-DOE-89955/attempt-1-keywords/ingest-report.md) Neil J. Gillespie | 80 | 1 | 324 → 0 | no | — | — | ok |
|  | [FL-DOE-90009](FL-SEN/FL-DOE-90009/attempt-1-keywords/ingest-report.md) Angie Nixon | 162 | 5 | 135 → 4 | no | — | 5 | ok |

## Races where the candidates start uneven

Races where one candidate is readable and another is not, or where passage counts differ by 10× or more. These are the races whose `word_count` gate will need the founder's call, as FL-GOV's did.

- **FL-14-general:** Kathy Castor 7, Mike Beltran 0, Brian Lambert 139
- **FL-20-general:** Kedner Maxime 49, Brent Andersen 0, Debbie Wasserman Schultz 11
- **FL-22-general:** Pia Dandiya 0, Casey Askar 1
- **FL-AGR-general:** Wilton Simpson 72, Joey Mendoza Atkins 2
- **FL-ATG-general:** James Uthmeier 1, Jose Javier Rodriguez 13
- **FL-BRO-SB6-general:** Roberto Fernandez III 0, Adam Cervera 19
- **FL-DAD-CC5-general:** Vicki L. Lopez 0, Rob Piper 0
- **FL-DAD-SB1-general:** Katrina Wilson 1, Linda Cothiere 82
- **FL-HIL-CC1-general:** Harry Cohen 0, Jackie Toledo 33
- **FL-ORA-CC4-general:** Brian Jones 0, Johanna Lopez 41
- **FL-ORA-CC8-general:** Victor M. Torres Jr. 16, Jeannette Quinones Hernandez 0
- **FL-SEN-general:** Ashley Moody 4, Neil J. Gillespie 80, Angie Nixon 162

Races where some ballot candidates have no `official_site` at all are not visible here (this list covers only candidates with a site); they are silent under D3.

## Next, on the founder's go-ahead

1. Step 2 (Jev) for the readable candidates, with the FL-GOV flags (`--limit 100000`, threshold 0.85), then Step 3 reviews.
2. Each race's spine and `word_count` decision, as D1/D2 were for FL-GOV.
3. The open items from FL-GOV still apply to every race: the About-page fetch for the bio section, commitment-gate recall at 0.85, the A1 wording that catches health insurance, and the 8-page cap.
