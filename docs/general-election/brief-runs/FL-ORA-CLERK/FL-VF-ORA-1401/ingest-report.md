# Ingest and policy run: FL-VF-ORA-1401 (Roberta Walton Johnson), FL-ORA-CLERK-general

Site: https://voteroberta.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://voteroberta.com/ --out docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/run.json > docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1401/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:50Z → 2026-09-29T11:45:57Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **56** (1147 words) from 3 page(s); keyword crawl: 48 from 2 |
| Links | 41 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://voteroberta.com/meet-roberta (8 passage(s)) |

| Page | Passages |
|---|---|
| https://voteroberta.com/ | 37 |
| https://voteroberta.com/meet-roberta (About) | 8 |
| https://voteroberta.com/platform | 11 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.75 | 0.10 | policy | /platform | Platform |
| 0.47 | 0.13 |  | /service-leadership | Service & Leadership |
| 0.29 | 0.15 |  | /clerk-of-court-explained | Learn the Clerk |
| 0.14 | 0.73 | about | /meet-roberta | Meet Roberta |
| 0.12 | 0.10 |  | /legal-timeline | Record |
| 0.04 | 0.03 |  | /endorsements | Endorsements |
| 0.04 | 0.02 |  | /get-connected | Volunteer |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 56 of 56 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 10 |
| …and match a taxonomy issue | 0 |
| Tokens | 196065 in, 25648 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
