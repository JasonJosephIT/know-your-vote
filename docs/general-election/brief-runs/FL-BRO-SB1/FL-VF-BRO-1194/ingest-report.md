# Ingest and policy run: FL-VF-BRO-1194 (Maura McCarthy Bulman), FL-BRO-SB1-general

Site: https://www.mauraforbroward.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.mauraforbroward.com/ --out docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/run.json > docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:51Z → 2026-09-29T11:43:55Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **18** (977 words) from 2 page(s); keyword crawl: 12 from 1 |
| Links | 26 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.mauraforbroward.com/meetmaura (6 passage(s)) |

| Page | Passages |
|---|---|
| https://www.mauraforbroward.com/ | 12 |
| https://www.mauraforbroward.com/meetmaura (About) | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.18 | 0.86 | about | /meetmaura | Meet Maura |
| 0.05 | 0.03 |  | /endorsements-1 | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 18 of 18 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 3 |
| …and match a taxonomy issue | 1 |
| Tokens | 63667 in, 8244 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
