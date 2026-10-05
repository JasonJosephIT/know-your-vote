# Ingest and policy run: FL-VF-HIL-2620 (Joshua Wostal), FL-HIL-CC7-general

Site: https://www.joshuawostal.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.joshuawostal.com/ --out docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/run.json > docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2620/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:06Z → 2026-09-29T11:45:14Z (8 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **50** (2362 words) from 6 page(s); keyword crawl: 7 from 1 |
| Links | 29 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 4 (cap 8) |
| About page | https://www.joshuawostal.com/about (10 passage(s)) |

| Page | Passages |
|---|---|
| https://www.joshuawostal.com/ | 7 |
| https://www.joshuawostal.com/about (About) | 10 |
| https://www.joshuawostal.com/infrastructure | 7 |
| https://www.joshuawostal.com/spending | 10 |
| https://www.joshuawostal.com/taxes | 7 |
| https://www.joshuawostal.com/the-boring-budget-guy | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.90 | 0.02 | policy | /infrastructure | Fix Our Crumbling Infrastructure |
| 0.88 | 0.02 | policy | /spending | End Wasteful Spending |
| 0.87 | 0.02 | policy | /taxes | Stop the Tax Hikes |
| 0.62 | 0.27 | policy | /the-boring-budget-guy | The 'Boring' Budget Guy |
| 0.14 | 0.03 |  | /vote | Vote |
| 0.13 | 0.92 | about | /about | Meet Josh |
| 0.07 | 0.03 |  | /get-involved | Get Involved |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 50 of 50 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 16 |
| …and match a taxonomy issue | 5 |
| Tokens | 176751 in, 22900 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
