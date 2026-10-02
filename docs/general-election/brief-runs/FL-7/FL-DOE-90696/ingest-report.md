# Ingest and policy run: FL-DOE-90696 (Ryan Elijah), FL-7-general

Site: https://elijahforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://elijahforcongress.com/ --out docs/general-election/brief-runs/FL-7/FL-DOE-90696/passages.jsonl 2> docs/general-election/brief-runs/FL-7/FL-DOE-90696/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-7/FL-DOE-90696/passages.jsonl --json docs/general-election/brief-runs/FL-7/FL-DOE-90696/run.json > docs/general-election/brief-runs/FL-7/FL-DOE-90696/run-report.txt 2> docs/general-election/brief-runs/FL-7/FL-DOE-90696/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:17Z → 2026-09-29T11:43:22Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **64** (1529 words) from 3 page(s); keyword crawl: 54 from 2 |
| Links | 51 on the homepage, 8 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://elijahforcongress.com/about.html (10 passage(s)) |

| Page | Passages |
|---|---|
| https://elijahforcongress.com/ | 28 |
| https://elijahforcongress.com/about.html (About) | 10 |
| https://elijahforcongress.com/issues.html | 26 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.65 | 0.02 | policy | /issues.html | Issues |
| 0.26 | 0.10 |  | /index.html |  |
| 0.18 | 0.90 | about | /about.html | About |
| 0.12 | 0.02 |  | /news.html | News |
| 0.10 | 0.02 |  | /vote.html | Vote |
| 0.04 | 0.03 |  | /endorsements.html | Endorsements |
| 0.04 | 0.02 |  | /volunteer.html | Volunteer |
| 0.04 | 0.02 |  | /contact.html | Contact |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 64 of 64 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 21 |
| …and match a taxonomy issue | 14 |
| Tokens | 224039 in, 29312 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
