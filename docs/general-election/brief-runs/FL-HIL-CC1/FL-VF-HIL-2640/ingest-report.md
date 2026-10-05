# Ingest and policy run: FL-VF-HIL-2640 (Harry Cohen), FL-HIL-CC1-general

Site: https://harrycohen.vote/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://harrycohen.vote/ --out docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/run.json > docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:30Z → 2026-09-29T11:45:30Z (60 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **10** (159 words) from 1 page(s); keyword crawl: 0 from 0 |
| Links | 66 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://harrycohen.vote/about (0 passage(s)) |

| Page | Passages |
|---|---|
| https://harrycohen.vote/ | 10 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /plans | Plans |
| 0.35 | 0.05 |  | /es | Español |
| 0.14 | 0.91 | about | /about | Meet Harry |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  honoring Crawl-delay: 10s
  bot challenge (HTTP 202), retrying in the browser: https://harrycohen.vote/
  bot challenge (HTTP 202), retrying in the browser: https://harrycohen.vote/plans
  bot challenge (HTTP 202), retrying in the browser: https://harrycohen.vote/about
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 10 of 10 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 1 |
| Tokens | 34906 in, 4580 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
