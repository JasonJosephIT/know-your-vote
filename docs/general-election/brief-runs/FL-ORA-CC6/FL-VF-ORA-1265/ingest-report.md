# Ingest and policy run: FL-VF-ORA-1265 (Michael "Mike" Scott), FL-ORA-CC6-general

Site: https://mymikescott.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://mymikescott.com/ --out docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/run.json > docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:33Z → 2026-09-29T11:47:06Z (93 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **19** (615 words) from 3 page(s); keyword crawl: 9 from 2 |
| Links | 28 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 3 (cap 8) |
| About page | https://mymikescott.com/about-us (10 passage(s)) |

| Page | Passages |
|---|---|
| https://mymikescott.com/ | 8 |
| https://mymikescott.com/about-us (About) | 10 |
| https://mymikescott.com/case_study/affordable-and-attainable-housing | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.05 | policy | /mike-scotts-priorities | PRIORITIES |
| 0.87 | 0.02 | policy | /case_study/affordable-and-attainable-housing | Learn More |
| 0.79 | 0.04 | policy | /case_study/business-and-economic-development | Learn More |
| 0.22 | 0.05 |  | /results | RESULTS |
| 0.18 | 0.03 |  | /case_study/community-engagement | Learn More |
| 0.15 | 0.89 | about | /about-us | MEET “MIKE” SCOTT |
| 0.04 | 0.02 |  | /getinvolved | Volunteer Sign Up |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://mymikescott.com/
  only 73 characters of text, rendering in the browser: https://mymikescott.com/mike-scotts-priorities
  only 73 characters of text, rendering in the browser: https://mymikescott.com/case_study/affordable-and-attainable-housing
  only 73 characters of text, rendering in the browser: https://mymikescott.com/case_study/business-and-economic-development
  rendered, but only 23 characters of text: https://mymikescott.com/case_study/business-and-economic-development
  only 73 characters of text, rendering in the browser: https://mymikescott.com/about-us
  5 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 19 of 19 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 66783 in, 8702 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
