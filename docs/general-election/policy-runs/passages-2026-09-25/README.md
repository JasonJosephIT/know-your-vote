# Candidate-site ingest, 2026-09-25

Passages from the campaign site of every ballot candidate who has an
`official_site` (97 of 106), produced by `scripts/candidate-site-ingest.ts`.
This is the input to the next pipeline step:

```bash
node scripts/candidate-policy-noul.ts --in docs/general-election/policy-runs/passages-2026-09-25/<candidate_id>.jsonl --dry-run
```

One file per candidate, `<candidate_id>.jsonl`, one passage per line:
`{id, url, heading, text, retrieved_at}`. **Every `text` is verbatim from the
page at `url`.** Nothing here is summarized or paraphrased, and nothing has been
scored. `index.json` records each candidate's outcome, which run produced it,
and with which ingest code.

**Result: 93 of 97 ingested, 4539 passages.**

## How it was run

`node scripts/candidate-site-ingest.ts --site <official_site> --pages 8 --out <candidate_id>.jsonl`, the default `--browser auto`.

- **Run 1:** all 97 candidates, six sites in parallel, ingest at `f736d8a (#89: browser fallback for bot challenges)`.
- **Run 2:** the 13 candidates run 1 did not ingest (other than the AI-crawler opt-out), one site at a time, ingest at
  `d635d40 (#92: adds client-rendered pages)`. Two causes: two sites are JavaScript-built, which #92 fixed; and
  SiteGround's challenges were harder to clear with six parallel runs coming from one IP.
- **Run 3:** the three candidates still unreachable after run 2 (Ingoglia, Taddeo, Abrams), one site at a time, ingest at
  `d7a2896 (Turnstile embed no longer read as a bot challenge)`. Ingoglia's homepage had never been a challenge: it
  dns-prefetches `challenges.cloudflare.com` for a Turnstile widget on its sign-up form, and the challenge check read
  that host name as Cloudflare's interstitial. d7a2896 stops counting the bare host name. Taddeo's SiteGround
  challenge cleared this time. Abrams's Cloudflare challenge did not.
- A candidate's file comes from the latest run that produced passages.

Every run honored robots.txt, including the rules for Anthropic's crawlers, and each site's `Crawl-delay`.
It sent an honest user agent (`KnowYourVote/1.0`, appended to the browser's own when a page needed the browser).
It solved no captchas, and it quoted nothing from a page that did not load.

Checked before commit:
- no passage contains challenge-page text;
- every passage's `url` is on the candidate's own site;
- every row has the same five fields.

## Not ingested (4)

| Candidate | Race | Why | What would change it |
|---|---|---|---|
| Rob Piper (`FL-VF-DAD-2998`) | `FL-DAD-CC5-general` | Cloudflare refuses any automated client, even a real browser | Another source for his positions |
| Brian Jones (`FL-VF-ORA-1260`) | `FL-ORA-CC4-general` | The page loads, but its builder puts the text in `<div>`s, which the extractor does not read (it reads `p`, `li`, `blockquote`, `dd`) | Extractor reading text in `<div>`s (see below) |
| Jeannette Quinones Hernandez (`FL-VF-ORA-1275`) | `FL-ORA-CC8-general` | Her robots.txt refuses ClaudeBot, anthropic-ai and Claude-Web. Honored, as designed | Nothing: this is the site owner's choice |
| Dean Abrams (`FL-DOE-90433`) | `FL-GOV-general` | Cloudflare's "Just a moment..." check (HTTP 403) did not clear in the browser on any of four attempts across three runs | Another source for his positions, as for Piper |

## Thin results (3 passages or fewer)

These ingested, but the extractor found little. The likely cause is the same
as Brian Jones's: a site builder that puts body text in `<div>`s rather than paragraphs.
Their briefs will look emptier than their sites are.
Teaching `extractPassages()` to read text-bearing `<div>`s (without re-quoting
navigation or footers) is the next ingest change worth making.

| Candidate | Race | Passages | Pages |
|---|---|---|---|
| Katrina Wilson | `FL-DAD-SB1-general` | 1 | 1 |
| Patricia "Patti" Rendon | `FL-HIL-SB4-general` | 1 | 1 |
| Lawanna Gelzer | `FL-ORA-CC6-general` | 1 | 1 |
| Casey Askar | `FL-22-general` | 1 | 1 |
| Brittany Lyssy | `FL-HIL-SB2-general` | 3 | 1 |
| Susanne Peña | `FL-ORA-SB3-general` | 3 | 1 |
| Brent Andersen | `FL-20-general` | 3 | 1 |

## Every candidate

| Candidate | Race | Status | Passages | Pages | Run | Notes |
|---|---|---|---|---|---|---|
| Caryl Sandler Shuham | `FL-BRO-CC6-general` | ingested | 42 | 1 | 1 | robots.txt read in the browser; 3 page(s) via the browser |
| Maura McCarthy Bulman | `FL-BRO-SB1-general` | ingested | 12 | 1 | 1 |  |
| Nicole Morst | `FL-BRO-SB4-general` | ingested | 9 | 1 | 1 |  |
| Roberto Fernandez III | `FL-BRO-SB6-general` | ingested | 21 | 1 | 2 | robots.txt read in the browser; 1 page(s) via the browser |
| Adam Cervera | `FL-BRO-SB6-general` | ingested | 19 | 1 | 1 |  |
| Cynthia Alceus Dominique | `FL-BRO-SB7-general` | ingested | 62 | 1 | 1 |  |
| Allen Zeman | `FL-BRO-SBAL8-general` | ingested | 7 | 1 | 1 |  |
| Marleine Bastien | `FL-DAD-CC2-general` | ingested | 18 | 1 | 2 | 1 page(s) via the browser |
| Vicki L. Lopez | `FL-DAD-CC5-general` | ingested | 9 | 1 | 1 | robots.txt read in the browser; 2 page(s) via the browser |
| Rob Piper | `FL-DAD-CC5-general` | unreachable: bot challenge did not clear | 0 | 0 | 1 | robots.txt unreadable, proceeded; 1 page(s) via the browser |
| Katrina Wilson | `FL-DAD-SB1-general` | ingested | 1 | 1 | 1 |  |
| Linda Cothiere | `FL-DAD-SB1-general` | ingested | 72 | 2 | 1 |  |
| Harry Cohen | `FL-HIL-CC1-general` | ingested | 42 | 2 | 1 | robots.txt read in the browser; 1 page(s) via the browser |
| Jackie Toledo | `FL-HIL-CC1-general` | ingested | 28 | 3 | 2 | 2 page(s) via the browser |
| Gwen Myers | `FL-HIL-CC3-general` | ingested | 9 | 2 | 1 |  |
| Luiz F. F. Garcia | `FL-HIL-CC3-general` | ingested | 23 | 2 | 1 |  |
| Neil Manimala | `FL-HIL-CC5-general` | ingested | 13 | 2 | 1 |  |
| Stacy Hahn | `FL-HIL-CC5-general` | ingested | 16 | 1 | 1 |  |
| Joshua Wostal | `FL-HIL-CC7-general` | ingested | 49 | 2 | 1 |  |
| Aileen Rodriguez | `FL-HIL-CC7-general` | ingested | 44 | 2 | 1 |  |
| Daniela Simic | `FL-HIL-SB2-general` | ingested | 4 | 1 | 1 |  |
| Brittany Lyssy | `FL-HIL-SB2-general` | ingested | 3 | 1 | 1 |  |
| Patricia "Patti" Rendon | `FL-HIL-SB4-general` | ingested | 1 | 1 | 1 |  |
| Kenneth "Ken" Gay | `FL-HIL-SB6-general` | ingested | 13 | 2 | 1 |  |
| Karen Perez | `FL-HIL-SB6-general` | ingested | 15 | 1 | 1 |  |
| Kamia Brown | `FL-ORA-CC2-general` | ingested | 37 | 2 | 1 |  |
| Mike Crabb | `FL-ORA-CC2-general` | ingested | 35 | 2 | 1 |  |
| Brian Jones | `FL-ORA-CC4-general` | no passages extracted | 0 | 0 | 1 | 1 page(s) via the browser |
| Johanna Lopez | `FL-ORA-CC4-general` | ingested | 41 | 2 | 1 |  |
| Michael "Mike" Scott | `FL-ORA-CC6-general` | ingested | 9 | 2 | 1 |  |
| Lawanna Gelzer | `FL-ORA-CC6-general` | ingested | 1 | 1 | 1 |  |
| Vicki Vargo | `FL-ORA-CC7-general` | ingested | 13 | 2 | 1 |  |
| Patricia Rumph | `FL-ORA-CC7-general` | ingested | 21 | 2 | 1 |  |
| Victor M. Torres Jr. | `FL-ORA-CC8-general` | ingested | 43 | 2 | 1 |  |
| Jeannette Quinones Hernandez | `FL-ORA-CC8-general` | refused: robots.txt opts out of AI crawlers | 0 | 0 | 1 |  |
| Terrell Thomas | `FL-ORA-CLERK-general` | ingested | 23 | 1 | 1 |  |
| Roberta Walton Johnson | `FL-ORA-CLERK-general` | ingested | 58 | 3 | 1 |  |
| Tiffany Moore Russell | `FL-ORA-MAYOR-general` | ingested | 79 | 3 | 1 | robots.txt read in the browser; 3 page(s) via the browser |
| Chris Messina | `FL-ORA-MAYOR-general` | ingested | 27 | 3 | 1 | Crawl-delay 20s |
| Melissa Lopez Marantes | `FL-ORA-SB1-general` | ingested | 5 | 1 | 1 |  |
| Gloria Reina O'Neal | `FL-ORA-SB2-general` | ingested | 39 | 1 | 2 | 1 page(s) via the browser |
| Susanne Peña | `FL-ORA-SB3-general` | ingested | 3 | 1 | 1 |  |
| Diana Moore | `FL-ORA-SB3-general` | ingested | 18 | 2 | 1 |  |
| Maxwell Alejandro Frost | `FL-10-general` | ingested | 73 | 2 | 1 |  |
| Ralph Groves | `FL-11-general` | ingested | 18 | 1 | 1 |  |
| James Pericola | `FL-11-general` | ingested | 18 | 1 | 1 | Crawl-delay 10s; 1 page(s) via the browser |
| Joe Strada | `FL-11-general` | ingested | 27 | 3 | 1 |  |
| Gus Michael Bilirakis | `FL-12-general` | ingested | 86 | 3 | 1 |  |
| Kimberly Overman | `FL-12-general` | ingested | 47 | 4 | 1 |  |
| Branden Scrivener | `FL-12-general` | ingested | 11 | 1 | 1 |  |
| Kathy Castor | `FL-14-general` | ingested | 7 | 4 | 1 | Crawl-delay 10s |
| Mike Beltran | `FL-14-general` | ingested | 34 | 3 | 1 | robots.txt read in the browser; 3 page(s) via the browser |
| Brian Lambert | `FL-14-general` | ingested | 139 | 7 | 1 |  |
| Robert People | `FL-15-general` | ingested | 41 | 2 | 1 |  |
| Laurel Lee | `FL-15-general` | ingested | 132 | 2 | 1 | Crawl-delay 10s |
| Mark Davis | `FL-16-general` | ingested | 34 | 2 | 1 |  |
| Sydney Gruters | `FL-16-general` | ingested | 27 | 2 | 1 |  |
| Kelly Kirschner | `FL-16-general` | ingested | 115 | 2 | 1 |  |
| Kedner Maxime | `FL-20-general` | ingested | 105 | 6 | 1 |  |
| Brent Andersen | `FL-20-general` | ingested | 3 | 1 | 2 | robots.txt read in the browser; 1 page(s) via the browser |
| Debbie Wasserman Schultz | `FL-20-general` | ingested | 64 | 3 | 1 |  |
| Pia Dandiya | `FL-22-general` | ingested | 62 | 3 | 2 | robots.txt read in the browser; 4 page(s) via the browser |
| Casey Askar | `FL-22-general` | ingested | 1 | 1 | 1 |  |
| Te Mayonna Brown | `FL-24-general` | ingested | 24 | 3 | 1 |  |
| Oliver G. Gilbert III | `FL-24-general` | ingested | 66 | 3 | 2 | robots.txt read in the browser; 3 page(s) via the browser |
| Jared Moskowitz | `FL-25-general` | ingested | 32 | 3 | 1 | 3 page(s) via the browser |
| Scott Singer | `FL-25-general` | ingested | 82 | 3 | 1 |  |
| Nicole Locklin | `FL-26-general` | ingested | 60 | 9 | 1 |  |
| Mario Diaz-Balart | `FL-26-general` | ingested | 80 | 1 | 1 |  |
| Eliott Rodriguez | `FL-27-general` | ingested | 69 | 3 | 1 |  |
| Maria Elvira Salazar | `FL-27-general` | ingested | 96 | 9 | 1 | Crawl-delay 10s |
| Eddy Rojas | `FL-28-general` | ingested | 4 | 1 | 1 |  |
| Carlos A. Gimenez | `FL-28-general` | ingested | 71 | 3 | 1 |  |
| Phil "Felipe" Ehr | `FL-28-general` | ingested | 29 | 3 | 1 |  |
| Bale Dalton | `FL-7-general` | ingested | 37 | 2 | 1 |  |
| Ryan Elijah | `FL-7-general` | ingested | 84 | 3 | 1 |  |
| Christopher Dennison | `FL-7-general` | ingested | 17 | 2 | 1 |  |
| Mike Haridopolos | `FL-8-general` | ingested | 49 | 3 | 1 |  |
| Jennifer Jenkins | `FL-8-general` | ingested | 72 | 3 | 1 | robots.txt read in the browser; 3 page(s) via the browser |
| Darren Soto | `FL-9-general` | ingested | 34 | 3 | 1 |  |
| Dan Green | `FL-9-general` | ingested | 10 | 1 | 1 |  |
| Ashley Moody | `FL-SEN-general` | ingested | 4 | 1 | 1 | Crawl-delay 10s |
| Neil J. Gillespie | `FL-SEN-general` | ingested | 80 | 1 | 1 |  |
| Angie Nixon | `FL-SEN-general` | ingested | 150 | 3 | 1 |  |
| Wilton Simpson | `FL-AGR-general` | ingested | 72 | 4 | 1 |  |
| Joey Mendoza Atkins | `FL-AGR-general` | ingested | 25 | 1 | 1 |  |
| James Uthmeier | `FL-ATG-general` | ingested | 110 | 2 | 1 |  |
| Jose Javier Rodriguez | `FL-ATG-general` | ingested | 13 | 2 | 1 |  |
| Blaise Ingoglia | `FL-CFO-general` | ingested | 80 | 3 | 3 | earlier runs misread a Turnstile embed as a challenge |
| Annette Taddeo | `FL-CFO-general` | ingested | 10 | 2 | 3 | robots.txt read in the browser; 2 page(s) via the browser |
| Scott Eckhard Jewett | `FL-GOV-general` | ingested | 389 | 4 | 2 | robots.txt read in the browser; 4 page(s) via the browser |
| Moliere "Moe" Dimanche | `FL-GOV-general` | ingested | 19 | 2 | 1 |  |
| Byron Donalds | `FL-GOV-general` | ingested | 58 | 7 | 1 |  |
| David Jolly | `FL-GOV-general` | ingested | 195 | 8 | 1 | Crawl-delay 10s |
| Frank J. Russo | `FL-GOV-general` | ingested | 201 | 9 | 1 |  |
| Dean Abrams | `FL-GOV-general` | unreachable: bot challenge did not clear | 0 | 0 | 3 | Cloudflare challenge, 4 attempts |
| Charles Burkett | `FL-GOV-general` | ingested | 189 | 1 | 1 | robots.txt read in the browser |
