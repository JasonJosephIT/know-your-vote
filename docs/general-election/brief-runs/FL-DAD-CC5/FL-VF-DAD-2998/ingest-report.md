# Ingest and policy run: FL-VF-DAD-2998 (Rob Piper), FL-DAD-CC5-general

Site: https://www.robpiperheretoserve.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.robpiperheretoserve.com/ --out docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/passages.jsonl --json docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/run.json > docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/run-report.txt 2> docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T19:18:02Z → 2026-09-29T19:19:06Z (64 s) |
| Exit code | 1 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: bot challenge did not clear (not solved, by rule), is in `attempt-1-failed/` |
| Result | **FAILURE: bot challenge did not clear (not solved, by rule)** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 0 from 0 |
| Links | — on the homepage, 0 judged by Jev |
| Policy pages chosen | — (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  bot challenge did not clear in the browser: https://www.robpiperheretoserve.com/robots.txt
  WARNING robots.txt unreadable (plain fetch got a bot challenge, HTTP 403; the browser could not clear it either) at https://www.robpiperheretoserve.com/robots.txt — its policy is unknown; proceeding with no rules.
  bot challenge (HTTP 403), retrying in the browser: https://www.robpiperheretoserve.com/
  bot challenge did not clear in the browser: https://www.robpiperheretoserve.com/
Could not fetch the homepage — stopping.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
