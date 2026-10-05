# Ingest and policy run: FL-DOE-88870 (Kathy Castor), FL-14-general

Site: https://castorforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://castorforcongress.com/ --out docs/general-election/brief-runs/FL-14/FL-DOE-88870/passages.jsonl 2> docs/general-election/brief-runs/FL-14/FL-DOE-88870/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-14/FL-DOE-88870/passages.jsonl --json docs/general-election/brief-runs/FL-14/FL-DOE-88870/run.json > docs/general-election/brief-runs/FL-14/FL-DOE-88870/run-report.txt 2> docs/general-election/brief-runs/FL-14/FL-DOE-88870/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:55Z → 2026-09-29T11:42:29Z (34 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **12** (459 words) from 3 page(s); keyword crawl: 7 from 4 |
| Links | 66 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://castorforcongress.com/about (7 passage(s)) |

| Page | Passages |
|---|---|
| https://castorforcongress.com/ | 4 |
| https://castorforcongress.com/about (About) | 7 |
| https://castorforcongress.com/delivering-for-florida | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.71 | 0.15 | policy | /delivering-for-florida | Delivering for Florida |
| 0.15 | 0.01 |  | /what-is-redistricting-gerrymandering-florida-explain | (Tampa Bay Times) Make It Make Sense: What is redistricting? |
| 0.13 | 0.93 | about | /about | About Kathy |
| 0.11 | 0.03 |  | /news | News |
| 0.11 | 0.02 |  | /redistricting-congress-desantis-republican-primary-election-kathy-castor-midterms | (Tampa Bay Times) Can Tampa Bay’s lone Democratic representa |
| 0.11 | 0.02 |  | /crowded-field-of-republicans-vying-to-unseat-democrat-kathy-castor-after-20-years-in-congress | (WUSF) A crowded field of Republicans is vying to unseat Dem |
| 0.10 | 0.04 |  | /florida-politics-union-leaders-rally-around-kathy-castor-after-she-helps-save-700-jobs-at-tampa-international-airport | (Florida Politics) Union leaders rally around Kathy Castor a |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 12 of 12 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 2 |
| Tokens | 42195 in, 5496 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
