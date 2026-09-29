# Ingest and policy run: FL-VF-ORA-1242 (Susanne Peña), FL-ORA-SB3-general

Site: https://www.vote4pena.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.vote4pena.com/ --out docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/run.json > docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-SB3/FL-VF-ORA-1242/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:07Z → 2026-09-29T11:46:11Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **10** (483 words) from 2 page(s); keyword crawl: 3 from 1 |
| Links | 38 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.vote4pena.com/about (7 passage(s)) |

| Page | Passages |
|---|---|
| https://www.vote4pena.com/ | 3 |
| https://www.vote4pena.com/about (About) | 7 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.12 | 0.04 |  | /sign | Request a Sign |
| 0.12 | 0.92 | about | /about | Meet Susanne |
| 0.07 | 0.03 |  | /get-involved | Folder: Get Involved |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 10 of 10 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 0 |
| Tokens | 35576 in, 4580 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
