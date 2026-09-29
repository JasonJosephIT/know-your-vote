# Ingest and policy run: FL-VF-ORA-1290 (Kamia Brown), FL-ORA-CC2-general

Site: https://www.kamiafororangecounty.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.kamiafororangecounty.com/ --out docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/run.json > docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:23Z → 2026-09-29T11:45:27Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **39** (563 words) from 2 page(s); keyword crawl: 15 from 1 |
| Links | 18 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.kamiafororangecounty.com/meet-kamia (24 passage(s)) |

| Page | Passages |
|---|---|
| https://www.kamiafororangecounty.com/ | 15 |
| https://www.kamiafororangecounty.com/meet-kamia (About) | 24 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.14 | 0.84 | about | /meet-kamia | MEET KAMIA |
| 0.07 | 0.03 |  | /get-involved | GET INVOLVED |
| 0.04 | 0.02 |  | /donation | DONATE |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 39 of 39 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 14 |
| …and match a taxonomy issue | 7 |
| Tokens | 136497 in, 17862 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
