# Ingest and policy run: FL-DOE-90560 (Wilton Simpson), FL-AGR-general

Site: https://wiltonsimpson.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://wiltonsimpson.com/ --out docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/passages.jsonl 2> docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/passages.jsonl --json docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/run.json > docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/run-report.txt 2> docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:40Z → 2026-09-29T11:43:51Z (11 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **137** (5274 words) from 8 page(s); keyword crawl: 72 from 4 |
| Links | 41 on the homepage, 12 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 6 (cap 8) |
| About page | https://wiltonsimpson.com/about (9 passage(s)) |

| Page | Passages |
|---|---|
| https://wiltonsimpson.com/ | 15 |
| https://wiltonsimpson.com/about (About) | 9 |
| https://wiltonsimpson.com/agriculture | 20 |
| https://wiltonsimpson.com/economic-freedom | 24 |
| https://wiltonsimpson.com/education | 12 |
| https://wiltonsimpson.com/environment | 27 |
| https://wiltonsimpson.com/free-florida | 12 |
| https://wiltonsimpson.com/public-safety | 18 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.89 | 0.03 | policy | /public-safety | Public Safety |
| 0.86 | 0.03 | policy | /economic-freedom | Economic Freedom |
| 0.85 | 0.13 | policy | /education | Education |
| 0.82 | 0.05 | policy | /environment | Environment |
| 0.80 | 0.03 | policy | /agriculture | Agriculture |
| 0.60 | 0.07 | policy | /free-florida | Free Florida |
| 0.48 | 0.10 |  | /families | Families |
| 0.21 | 0.22 |  | /record | Record |
| 0.16 | 0.91 | about | /about | About |
| 0.11 | 0.03 |  | /news | News |
| 0.09 | 0.09 |  | /awards | Awards |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 137 of 137 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 30 |
| …and match a taxonomy issue | 19 |
| Tokens | 483184 in, 62746 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
