# Ingest and policy run: FL-DOE-91544 (Oliver G. Gilbert III), FL-24-general

Site: https://olivergilbert.vote/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://olivergilbert.vote/ --out docs/general-election/brief-runs/FL-24/FL-DOE-91544/passages.jsonl 2> docs/general-election/brief-runs/FL-24/FL-DOE-91544/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-24/FL-DOE-91544/passages.jsonl --json docs/general-election/brief-runs/FL-24/FL-DOE-91544/run.json > docs/general-election/brief-runs/FL-24/FL-DOE-91544/run-report.txt 2> docs/general-election/brief-runs/FL-24/FL-DOE-91544/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T19:17:39Z → 2026-09-29T19:18:25Z (46 s) |
| Exit code | 0 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: bot challenge; the browser rendered a page with no links and no text, is in `attempt-1-failed/` |
| Result | **SUCCESS** |
| Passages | **217** (5108 words) from 7 page(s); keyword crawl: 62 from 3 |
| Links | 89 on the homepage, 8 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 5 (cap 8) |
| About page | https://olivergilbert.vote/about (11 passage(s)) |

| Page | Passages |
|---|---|
| https://olivergilbert.vote/ | 19 |
| https://olivergilbert.vote/about (About) | 11 |
| https://olivergilbert.vote/build-act | 21 |
| https://olivergilbert.vote/build-business-act | 34 |
| https://olivergilbert.vote/care-act | 82 |
| https://olivergilbert.vote/es/home-act | 40 |
| https://olivergilbert.vote/issues | 10 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.75 | 0.07 | policy | /es/home-act | HOME Act |
| 0.73 | 0.09 | policy | /build-business-act | BUILD Business Act |
| 0.71 | 0.04 | policy | /care-act | CARE Act |
| 0.67 | 0.04 | policy | /build-act | BUILD Act |
| 0.63 | 0.03 | policy | /issues | Issues |
| 0.34 | 0.13 |  | /es/inicio | ES |
| 0.12 | 0.97 | about | /about | My Story |
| 0.10 | 0.03 |  | /media-kit | Media Kit |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/es/home-act
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/build-business-act
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/care-act
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/build-act
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/issues
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/about
  7 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 217 of 217 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 68 |
| …and match a taxonomy issue | 24 |
| Tokens | 760419 in, 99386 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
