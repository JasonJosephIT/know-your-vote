# Ingest and policy run: FL-DOE-88868 (Gus Michael Bilirakis), FL-12-general

Site: https://bilirakisforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://bilirakisforcongress.com/ --out docs/general-election/brief-runs/FL-12/FL-DOE-88868/passages.jsonl 2> docs/general-election/brief-runs/FL-12/FL-DOE-88868/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-12/FL-DOE-88868/passages.jsonl --json docs/general-election/brief-runs/FL-12/FL-DOE-88868/run.json > docs/general-election/brief-runs/FL-12/FL-DOE-88868/run-report.txt 2> docs/general-election/brief-runs/FL-12/FL-DOE-88868/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:41:51Z (6 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **53** (1299 words) from 3 page(s); keyword crawl: 49 from 2 |
| Links | 39 on the homepage, 8 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://bilirakisforcongress.com/bio.html (4 passage(s)) |

| Page | Passages |
|---|---|
| https://bilirakisforcongress.com/ | 30 |
| https://bilirakisforcongress.com/bio.html (About) | 4 |
| https://bilirakisforcongress.com/issues.html | 19 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.64 | 0.02 | policy | /issues.html | Issues |
| 0.32 | 0.05 |  | /index.html | Home |
| 0.19 | 0.02 |  | /videos.html | Videos |
| 0.15 | 0.03 |  | /take-action.html | Take Action |
| 0.11 | 0.93 | about | /bio.html | About Gus |
| 0.11 | 0.02 |  | /news.html | News |
| 0.10 | 0.02 |  | /vote.html | Vote |
| 0.08 | 0.04 |  | /media.html | Media |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 53 of 53 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 12 |
| …and match a taxonomy issue | 9 |
| Tokens | 185818 in, 24274 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
