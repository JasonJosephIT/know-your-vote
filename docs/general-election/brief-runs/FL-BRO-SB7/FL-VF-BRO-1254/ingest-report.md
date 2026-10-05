# Ingest and policy run: FL-VF-BRO-1254 (Cynthia Alceus Dominique), FL-BRO-SB7-general

Site: https://www.cynthiaforbrowardschools.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.cynthiaforbrowardschools.com/ --out docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/run.json > docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:08Z → 2026-09-29T11:44:10Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **62** (1429 words) from 1 page(s); keyword crawl: 62 from 1 |
| Links | 20 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.cynthiaforbrowardschools.com/ | 62 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 62 of 62 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 33 |
| …and match a taxonomy issue | 5 |
| Tokens | 216964 in, 28396 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
