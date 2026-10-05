# Ingest and policy run: FL-VF-ORA-1314 (Diana Moore), FL-ORA-SB3-general

Site: https://www.votefordianamoore.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.votefordianamoore.com/ --out docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/run.json > docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1314/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:09Z → 2026-09-29T11:46:12Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **13** (895 words) from 1 page(s); keyword crawl: 13 from 1 |
| Links | 22 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.votefordianamoore.com/ | 13 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.17 | 0.32 |  | /home | Diana Moore |
| 0.16 | 0.04 |  | /groups | Groups |
| 0.11 | 0.03 |  | /news | News |
| 0.07 | 0.03 |  | /get-involved | Get Involved |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 13 of 13 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 5 |
| …and match a taxonomy issue | 2 |
| Tokens | 46108 in, 5954 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
