# Ingest and policy run: FL-VF-BRO-1184 (Adam Cervera), FL-BRO-SB6-general

Site: https://www.adamcervera.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.adamcervera.com/ --out docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/run.json > docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1184/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:03Z → 2026-09-29T11:44:06Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **19** (554 words) from 1 page(s); keyword crawl: 19 from 1 |
| Links | 19 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.adamcervera.com/ | 19 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 19 of 19 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 1 |
| …and match a taxonomy issue | 0 |
| Tokens | 66605 in, 8702 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
