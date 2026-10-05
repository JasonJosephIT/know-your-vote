# Ingest and policy run: FL-DOE-90340 (Eddy Rojas), FL-28-general

Site: https://www.eddyrojas.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.eddyrojas.com/ --out docs/general-election/brief-runs/FL-28/FL-DOE-90340/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-90340/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-28/FL-DOE-90340/passages.jsonl --json docs/general-election/brief-runs/FL-28/FL-DOE-90340/run.json > docs/general-election/brief-runs/FL-28/FL-DOE-90340/run-report.txt 2> docs/general-election/brief-runs/FL-28/FL-DOE-90340/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:03Z → 2026-09-29T11:43:06Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **3** (111 words) from 1 page(s); keyword crawl: 4 from 1 |
| Links | 6 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.eddyrojas.com/about (3 passage(s)) |

| Page | Passages |
|---|---|
| https://www.eddyrojas.com/about (About) | 3 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.20 | 0.03 |  | /events-1 | ISSUES |
| 0.18 | 0.92 | about | /about | ABOUT |
| 0.07 | 0.03 |  | /get-involved | GET INVOLVED |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 3 of 3 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 10565 in, 1374 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
