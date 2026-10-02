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
| Start / end (UTC) | 2026-09-29T19:17:39Z → 2026-09-29T19:18:02Z (23 s) |
| Exit code | 1 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: bot challenge did not clear (not solved, by rule), is in `attempt-1-failed/` |
| Result | **FAILURE: bot challenge; the browser rendered a page with no links and no text** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 42 from 1 |
| Links | 0 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://www.carylshuham.com/
No passages from https://www.carylshuham.com/. That is a finding about the fetch, not about the candidate: check whether the site renders its text client-side, or serves a bot challenge to non-browser clients.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
