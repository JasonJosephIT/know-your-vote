# Ingest and policy run: FL-DOE-89042 (Byron Donalds), FL-GOV-general

Site: https://byrondonalds.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://byrondonalds.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:42Z → 2026-09-29T11:46:52Z (10 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **58** (1233 words) from 7 page(s); keyword crawl: 58 from 7 |
| Links | 10 on the homepage, 10 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 6 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://byrondonalds.com/ | 8 |
| https://byrondonalds.com/issues/affordability | 10 |
| https://byrondonalds.com/issues/economy | 5 |
| https://byrondonalds.com/issues/education | 19 |
| https://byrondonalds.com/issues/healthcare | 6 |
| https://byrondonalds.com/issues/law-and-order | 5 |
| https://byrondonalds.com/issues/space-and-tech | 5 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.02 | policy | /issues/law-and-order | Law and Order We must secure our borders, keep local neighbo |
| 0.91 | 0.02 | policy | /issues/education | Education Reading by third grade is a basic promise every ch |
| 0.89 | 0.02 | policy | /issues/affordability | Affordability Florida cannot become too expensive for workin |
| 0.89 | 0.03 | policy | /issues/space-and-tech | Space and Tech Every American who walked on the Moon took of |
| 0.87 | 0.02 | policy | /issues/economy | Economy California passes heavy regulations. New York sends  |
| 0.81 | 0.02 | policy | /issues/healthcare | Healthcare You deserve to know what healthcare costs before  |
| 0.18 | 0.05 |  | /vets | Veterans for Byron → |
| 0.16 | 0.05 |  | /latinos-for-byron | Latinos for Byron → |
| 0.11 | 0.05 |  | /businesswomen-for-byron | Businesswomen for Byron → |
| 0.10 | 0.04 |  | /faith-leaders-for-byron | Faith Leaders for Byron → |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 58 of 58 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 45 |
| …and match a taxonomy issue | 28 |
| Tokens | 203163 in, 26564 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
