# Ingest and policy run: FL-VF-ORA-1364 (Terrell Thomas), FL-ORA-CLERK-general

Site: https://thomasforclerk.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://thomasforclerk.com/ --out docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/run.json > docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CLERK/FL-VF-ORA-1364/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:49Z → 2026-09-29T11:45:54Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **43** (1207 words) from 2 page(s); keyword crawl: 23 from 1 |
| Links | 65 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://thomasforclerk.com/meet-terrell (20 passage(s)) |

| Page | Passages |
|---|---|
| https://thomasforclerk.com/ | 23 |
| https://thomasforclerk.com/meet-terrell (About) | 20 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.62 | 0.08 | policy | /vision | See The Impact |
| 0.15 | 0.79 | about | /meet-terrell | Meet Terrell |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 43 of 43 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 3 |
| …and match a taxonomy issue | 0 |
| Tokens | 150814 in, 19694 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
