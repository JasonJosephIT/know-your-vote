# Ingest report: FL-VF-ORA-1275 (Jeannette Quinones Hernandez), FL-ORA-CC8-general

Site: https://www.jeannette2026.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275 && node scripts/candidate-site-ingest.ts --site https://www.jeannette2026.com/ \
  --out docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC8/FL-VF-ORA-1275/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:06Z |
| End (UTC) | 2026-09-29T09:49:07Z |
| Wall-clock | 1 s |
| Exit code | 1 |

Result: **FAILURE: robots.txt disallows the crawl (honoured)**

## Output

- Passage count (`wc -l passages.jsonl`): **0** (0 words)
- Distinct page URLs (`jq -r .url | sort -u`): **0**
- Crawl: no link-selection line in the log (the crawl stopped before it)
- About / bio page fetched (by URL): **no**

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
robots.txt disallows https://www.jeannette2026.com/ for ClaudeBot, Claude-Web, anthropic-ai — stopping.
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
