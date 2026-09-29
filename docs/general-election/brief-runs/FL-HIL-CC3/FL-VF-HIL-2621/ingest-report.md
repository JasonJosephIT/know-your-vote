# Ingest and policy run: FL-VF-HIL-2621 (Gwen Myers), FL-HIL-CC3-general

Site: https://www.votegwenmyers.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.votegwenmyers.com/ --out docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/run.json > docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2621/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:53Z → 2026-09-29T11:44:57Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **5** (128 words) from 2 page(s); keyword crawl: 9 from 2 |
| Links | 14 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.votegwenmyers.com/meet-gwen (4 passage(s)) |

| Page | Passages |
|---|---|
| https://www.votegwenmyers.com/ | 1 |
| https://www.votegwenmyers.com/meet-gwen (About) | 4 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.13 | 0.36 |  | /platform | ACCOMPLISHMENTS |
| 0.12 | 0.57 | about | /meet-gwen | MEET GWEN |
| 0.07 | 0.03 |  | /get-involved | GET INVOLVED |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 5 of 5 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 1 |
| …and match a taxonomy issue | 1 |
| Tokens | 17575 in, 2290 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
