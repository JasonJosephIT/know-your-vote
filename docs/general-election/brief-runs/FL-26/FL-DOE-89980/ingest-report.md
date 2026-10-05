# Ingest and policy run: FL-DOE-89980 (Nicole Locklin), FL-26-general

Site: https://locklinforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://locklinforcongress.com/ --out docs/general-election/brief-runs/FL-26/FL-DOE-89980/passages.jsonl 2> docs/general-election/brief-runs/FL-26/FL-DOE-89980/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-26/FL-DOE-89980/passages.jsonl --json docs/general-election/brief-runs/FL-26/FL-DOE-89980/run.json > docs/general-election/brief-runs/FL-26/FL-DOE-89980/run-report.txt 2> docs/general-election/brief-runs/FL-26/FL-DOE-89980/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:51Z → 2026-09-29T11:43:05Z (14 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **78** (5804 words) from 10 page(s); keyword crawl: 60 from 9 |
| Links | 57 on the homepage, 14 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 8 (cap 8) |
| About page | https://locklinforcongress.com/nicole-bio (8 passage(s)) |

| Page | Passages |
|---|---|
| https://locklinforcongress.com/ | 2 |
| https://locklinforcongress.com/corruption | 15 |
| https://locklinforcongress.com/issues-affordability | 6 |
| https://locklinforcongress.com/issues-cuba | 7 |
| https://locklinforcongress.com/issues-healthcare | 12 |
| https://locklinforcongress.com/issues-immigration | 6 |
| https://locklinforcongress.com/issues-iran-war | 8 |
| https://locklinforcongress.com/issues-palestine | 7 |
| https://locklinforcongress.com/issues-social-security | 7 |
| https://locklinforcongress.com/nicole-bio (About) | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.91 | 0.02 | policy | /issues-affordability | AFFORDABILITY |
| 0.91 | 0.02 | policy | /issues-immigration | IMMIGRATION |
| 0.90 | 0.03 | policy | /issues-healthcare | HEALTHCARE |
| 0.87 | 0.02 | policy | /issues-social-security | SENIORS |
| 0.82 | 0.03 | policy | /issues-palestine | PALESTINE |
| 0.80 | 0.02 | policy | /issues-iran-war | IRAN WAR |
| 0.71 | 0.05 | policy | /issues-cuba | CUBA |
| 0.53 | 0.04 | policy | /corruption | CORRUPTION |
| 0.34 | 0.79 |  | /about-nicole-locklin | OUR MISSION |
| 0.33 | 0.06 |  | /es-us | ESPA Ñ OL |
| 0.10 | 0.10 |  | /mario-diaz-balart | MY OPPONENT |
| 0.09 | 0.93 | about | /nicole-bio | BIOGRAPHY |
| 0.09 | 0.02 |  | /issues-epstein-files | EPSTEIN |
| 0.04 | 0.03 |  | /endorsements | ENDORSEMENTS |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 78 of 78 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 36 |
| …and match a taxonomy issue | 24 |
| Tokens | 278555 in, 35724 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
