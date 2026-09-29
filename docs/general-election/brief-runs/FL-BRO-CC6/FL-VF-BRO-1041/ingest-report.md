# Ingest and policy run: FL-VF-BRO-1041 (Caryl Sandler Shuham), FL-BRO-CC6-general

Site: https://www.carylshuham.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.carylshuham.com/ --out docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/run.json > docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:47Z → 2026-09-29T11:44:22Z (35 s) |
| Exit code | 1 |
| Result | **FAILURE: bot challenge did not clear (not solved, by rule)** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 42 from 1 |
| Links | — on the homepage, 0 judged by Jev |
| Policy pages chosen | — (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://www.carylshuham.com/
  bot challenge did not clear in the browser: https://www.carylshuham.com/
Could not fetch the homepage — stopping.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
