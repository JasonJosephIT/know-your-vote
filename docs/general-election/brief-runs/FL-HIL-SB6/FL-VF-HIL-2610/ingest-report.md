# Ingest and policy run: FL-VF-HIL-2610 (Kenneth "Ken" Gay), FL-HIL-SB6-general

Site: https://votekennethgay.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://votekennethgay.com/ --out docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/run.json > docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:13Z → 2026-09-29T11:45:20Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **18** (458 words) from 3 page(s); keyword crawl: 13 from 2 |
| Links | 13 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://votekennethgay.com/meet-kenneth (5 passage(s)) |

| Page | Passages |
|---|---|
| https://votekennethgay.com/ | 7 |
| https://votekennethgay.com/meet-kenneth (About) | 5 |
| https://votekennethgay.com/priorities | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /priorities | Priorities |
| 0.16 | 0.71 | about | /meet-kenneth | Meet Kenneth |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 18 of 18 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 0 |
| Tokens | 63103 in, 8244 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
