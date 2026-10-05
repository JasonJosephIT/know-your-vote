# Ingest and policy run: FL-VF-BRO-1172 (Roberto Fernandez III), FL-BRO-SB6-general

Site: https://www.electroberto2026.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.electroberto2026.com/ --out docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/run.json > docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:59Z → 2026-09-29T11:44:05Z (6 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **21** (322 words) from 1 page(s); keyword crawl: 0 from 0 |
| Links | 37 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.electroberto2026.com/ | 21 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://www.electroberto2026.com/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 21 of 21 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 73345 in, 9618 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
