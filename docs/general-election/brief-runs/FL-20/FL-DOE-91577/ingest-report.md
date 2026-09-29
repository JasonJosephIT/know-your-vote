# Ingest and policy run: FL-DOE-91577 (Debbie Wasserman Schultz), FL-20-general

Site: https://debbiewassermanschultz.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://debbiewassermanschultz.com/ --out docs/general-election/brief-runs/FL-20/FL-DOE-91577/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-91577/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-20/FL-DOE-91577/passages.jsonl --json docs/general-election/brief-runs/FL-20/FL-DOE-91577/run.json > docs/general-election/brief-runs/FL-20/FL-DOE-91577/run-report.txt 2> docs/general-election/brief-runs/FL-20/FL-DOE-91577/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:31Z → 2026-09-29T11:42:38Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **8** (300 words) from 1 page(s); keyword crawl: 11 from 2 |
| Links | 63 on the homepage, 10 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://debbiewassermanschultz.com/ | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.14 | 0.02 |  | /2026/05/23/a-crossroads-moment-for-broward-democrats-editorial | A crossroads moment for Broward Democrats \| Editorial |
| 0.12 | 0.04 |  | /the-latest | The Latest |
| 0.11 | 0.03 |  | /2026/08/18/debbie-wasserman-schultz-wins-primary-this-time-in-floridas-20th-district | Debbie Wasserman Schultz wins primary — this time in Florida |
| 0.10 | 0.02 |  | /vote | Voting Information |
| 0.10 | 0.03 |  | /2026/09/18/two-for-congress-wasserman-schultz-dandiya-endorsement | Two for Congress: Wasserman Schultz, Dandiya \| Endorsement |
| 0.09 | 0.03 |  | /2026/07/09/for-u-s-house-district-20-wasserman-schultz-andersen-endorsement | District 20, the Sun Sentinel Editorial Board recommends Dem |
| 0.08 | 0.05 |  | /media | Media |
| 0.08 | 0.02 |  | /2026/07/29/herald-endorsement-u-s-house-district-20-democratic-primary-opinion | Herald endorsement: U.S. House District 20 Democratic primar |
| 0.07 | 0.02 |  | /2026/05/27/sun-sentinel-campaign-poll-shows-wasserman-schultz-viewed-favorably-by-black-voters-leading-primary-matchup | Sun-Sentinel: Campaign poll shows Wasserman Schultz viewed f |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://debbiewassermanschultz.com/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 8 of 8 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 1 |
| …and match a taxonomy issue | 1 |
| Tokens | 28290 in, 3664 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
