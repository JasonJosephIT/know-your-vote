# Ingest and policy run: FL-DOE-84076 (Scott Eckhard Jewett), FL-GOV-general

Site: https://scottjewett.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://scottjewett.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:32Z → 2026-09-29T11:47:08Z (36 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **351** (8977 words) from 5 page(s); keyword crawl: 0 from 0 |
| Links | 67 on the homepage, 14 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 4 (cap 8) |
| About page | https://scottjewett.com/meet-scott (24 passage(s)) |

| Page | Passages |
|---|---|
| https://scottjewett.com/ | 21 |
| https://scottjewett.com/meet-scott (About) | 24 |
| https://scottjewett.com/our-mission | 22 |
| https://scottjewett.com/policies | 80 |
| https://scottjewett.com/the-issues | 204 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.02 | policy | /policies | Policies |
| 0.94 | 0.03 | policy | /the-issues | The Issues |
| 0.76 | 0.11 | policy | /platform | Platform |
| 0.51 | 0.09 | policy | /our-mission | Our Mission |
| 0.47 | 0.02 |  | /frequently-asked-questions | FAQs |
| 0.31 | 0.20 |  | /0424AH | BPW |
| 0.15 | 0.76 | about | /meet-scott | Meet Scott |
| 0.15 | 0.70 |  | /meet-nicole | Meet Nicole |
| 0.15 | 0.02 |  | /vote | Vote |
| 0.14 | 0.03 |  | /videos | Videos |
| 0.14 | 0.03 |  | /stay-informed | Stay Informed |
| 0.09 | 0.02 |  | /news-and-events | News & Events |
| 0.07 | 0.03 |  | /social-media | Social Media |
| 0.04 | 0.02 |  | /major-donors | Major Donors |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/policies
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/the-issues
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/platform
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/our-mission
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/meet-scott
  6 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 351 of 351 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 156 |
| …and match a taxonomy issue | 79 |
| Tokens | 1230640 in, 160758 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
