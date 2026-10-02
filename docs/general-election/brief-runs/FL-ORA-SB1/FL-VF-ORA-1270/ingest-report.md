# Ingest and policy run: FL-VF-ORA-1270 (Melissa Lopez Marantes), FL-ORA-SB1-general

Site: https://www.melissaforkids.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.melissaforkids.com/ --out docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/run.json > docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-SB1/FL-VF-ORA-1270/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:02Z → 2026-09-29T11:46:05Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **9** (387 words) from 2 page(s); keyword crawl: 5 from 1 |
| Links | 10 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.melissaforkids.com/meet-melissa (4 passage(s)) |

| Page | Passages |
|---|---|
| https://www.melissaforkids.com/ | 5 |
| https://www.melissaforkids.com/meet-melissa (About) | 4 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.15 | 0.71 | about | /meet-melissa | Meet Melissa |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 9 of 9 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 3 |
| …and match a taxonomy issue | 0 |
| Tokens | 31736 in, 4122 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
