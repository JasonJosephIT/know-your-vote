# Ingest and policy run: FL-VF-ORA-1295 (Lawanna Gelzer), FL-ORA-CC6-general

Site: https://www.lawannagelzer.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.lawannagelzer.com/ --out docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/run.json > docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1295/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:38Z → 2026-09-29T11:45:42Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **23** (986 words) from 2 page(s); keyword crawl: 1 from 1 |
| Links | 30 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.lawannagelzer.com/about-lawanna (22 passage(s)) |

| Page | Passages |
|---|---|
| https://www.lawannagelzer.com/ | 1 |
| https://www.lawannagelzer.com/about-lawanna (About) | 22 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /copy-of-priorities | PRIORITIES |
| 0.16 | 0.95 | about | /about-lawanna | ABOUT LAWANNA |
| 0.07 | 0.02 |  | /get-involved | GET INVOLVED |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 23 of 23 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 81254 in, 10534 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
