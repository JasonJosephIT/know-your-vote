# Ingest and policy run: FL-DOE-91313 (Mike Beltran), FL-14-general

Site: https://beltranforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://beltranforcongress.com/ --out docs/general-election/brief-runs/FL-14/FL-DOE-91313/passages.jsonl 2> docs/general-election/brief-runs/FL-14/FL-DOE-91313/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-14/FL-DOE-91313/passages.jsonl --json docs/general-election/brief-runs/FL-14/FL-DOE-91313/run.json > docs/general-election/brief-runs/FL-14/FL-DOE-91313/run-report.txt 2> docs/general-election/brief-runs/FL-14/FL-DOE-91313/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T19:17:39Z → 2026-09-29T19:18:21Z (42 s) |
| Exit code | 1 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: bot challenge did not clear (not solved, by rule), is in `attempt-1-failed/` |
| Result | **FAILURE: bot challenge did not clear (not solved, by rule)** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 0 from 0 |
| Links | — on the homepage, 0 judged by Jev |
| Policy pages chosen | — (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://beltranforcongress.com/
  bot challenge did not clear in the browser: https://beltranforcongress.com/
Could not fetch the homepage — stopping.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
