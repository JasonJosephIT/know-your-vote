# Ingest and policy run: FL-VF-ORA-1271 (Vicki Vargo), FL-ORA-CC7-general

Site: https://votevickivargo.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://votevickivargo.com/ --out docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/run.json > docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:40Z → 2026-09-29T11:45:48Z (8 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **34** (868 words) from 3 page(s); keyword crawl: 13 from 2 |
| Links | 21 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://votevickivargo.com/meet-vicki (21 passage(s)) |

| Page | Passages |
|---|---|
| https://votevickivargo.com/ | 9 |
| https://votevickivargo.com/issues | 4 |
| https://votevickivargo.com/meet-vicki (About) | 21 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.58 | 0.03 | policy | /issues | Issues |
| 0.15 | 0.73 | about | /meet-vicki | Meet Vicki |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 34 of 34 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 6 |
| …and match a taxonomy issue | 2 |
| Tokens | 119246 in, 15572 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
