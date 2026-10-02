# Ingest and policy run: FL-VF-ORA-1384 (Mike Crabb), FL-ORA-CC2-general

Site: https://ilikemikecrabb.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://ilikemikecrabb.com/ --out docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/run.json > docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1384/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:26Z → 2026-09-29T11:45:32Z (6 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **45** (835 words) from 3 page(s); keyword crawl: 36 from 2 |
| Links | 49 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://ilikemikecrabb.com/about (9 passage(s)) |

| Page | Passages |
|---|---|
| https://ilikemikecrabb.com/ | 25 |
| https://ilikemikecrabb.com/about (About) | 9 |
| https://ilikemikecrabb.com/issues | 11 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.63 | 0.03 | policy | /issues | Issues |
| 0.14 | 0.03 |  | /district2-map | District 2 on Map |
| 0.13 | 0.92 | about | /about | About Mike |
| 0.11 | 0.04 |  | /admin | Admin |
| 0.10 | 0.02 |  | /vote | Vote November 3 |
| 0.08 | 0.03 |  | /get-involved | Get Involved |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 45 of 45 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 12 |
| …and match a taxonomy issue | 6 |
| Tokens | 157283 in, 20610 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
