# Ingest and policy run: FL-VF-ORA-1275 (Jeannette Quinones Hernandez), FL-ORA-CC8-general

Site: https://www.jeannette2026.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.jeannette2026.com/ --out docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/run.json > docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T19:18:20Z → 2026-09-29T19:18:21Z (1 s) |
| Exit code | 1 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: robots.txt disallows the crawl (honoured), is in `attempt-1-failed/` |
| Result | **FAILURE: robots.txt disallows the crawl (honoured)** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 0 from 0 |
| Links | — on the homepage, 0 judged by Jev |
| Policy pages chosen | — (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
robots.txt disallows https://www.jeannette2026.com/ for ClaudeBot, Claude-Web, anthropic-ai — stopping.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
