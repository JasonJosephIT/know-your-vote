# Ingest and policy run: FL-DOE-90814 (Kedner Maxime), FL-20-general

Site: https://www.maximeforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.maximeforcongress.com/ --out docs/general-election/brief-runs/FL-20/FL-DOE-90814/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-90814/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-20/FL-DOE-90814/passages.jsonl --json docs/general-election/brief-runs/FL-20/FL-DOE-90814/run.json > docs/general-election/brief-runs/FL-20/FL-DOE-90814/run-report.txt 2> docs/general-election/brief-runs/FL-20/FL-DOE-90814/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:30Z → 2026-09-29T11:42:44Z (14 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **108** (2892 words) from 10 page(s); keyword crawl: 49 from 5 |
| Links | 43 on the homepage, 15 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 8 (cap 8) |
| About page | https://www.maximeforcongress.com/about (25 passage(s)) |

| Page | Passages |
|---|---|
| https://www.maximeforcongress.com/ | 12 |
| https://www.maximeforcongress.com/about (About) | 25 |
| https://www.maximeforcongress.com/education | 9 |
| https://www.maximeforcongress.com/healthcare | 9 |
| https://www.maximeforcongress.com/immigration | 11 |
| https://www.maximeforcongress.com/jobs | 8 |
| https://www.maximeforcongress.com/lower-costs | 9 |
| https://www.maximeforcongress.com/ownership-equity | 8 |
| https://www.maximeforcongress.com/small-business | 9 |
| https://www.maximeforcongress.com/students | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.92 | 0.02 | policy | /jobs | Jobs & Economic Security |
| 0.88 | 0.03 | policy | /immigration | Immigration |
| 0.86 | 0.04 | policy | /healthcare | Healthcare |
| 0.84 | 0.16 | policy | /education | Education |
| 0.83 | 0.02 | policy | /lower-costs | Lower Costs |
| 0.77 | 0.08 | policy | /small-business | Small Business |
| 0.63 | 0.06 | policy | /students | Students & Opportunity |
| 0.56 | 0.05 | policy | /ownership-equity | Ownership Equity |
| 0.40 | 0.08 |  | /accountability | Accountability |
| 0.36 | 0.06 |  | /civility-unity | Civility & Unity |
| 0.13 | 0.02 |  | /blog | News |
| 0.13 | 0.05 |  | /post/barbershop-series-kicks-off | Barbershop Series Kicks Off \| Dr. Kedner Maxime |
| 0.12 | 0.92 | about | /about | Meet Dr. Maxime |
| 0.10 | 0.02 |  | /post/responding-to-laura-loomers-attacks-on-black-women-in-politics | Responding to Laura Loomer's Attacks on Black Women in Polit |
| 0.04 | 0.02 |  | /event-list | Events |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 108 of 108 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 51 |
| …and match a taxonomy issue | 38 |
| Tokens | 379155 in, 49464 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
