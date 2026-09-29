# Ingest report: FL-VF-DAD-2998 (Rob Piper), FL-DAD-CC5-general

Site: https://www.robpiperheretoserve.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998 && node scripts/candidate-site-ingest.ts --site https://www.robpiperheretoserve.com/ \
  --out docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2998/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:22Z |
| End (UTC) | 2026-09-29T09:49:26Z |
| Wall-clock | 64 s |
| Exit code | 1 |

Result: **FAILURE: bot challenge did not clear (not solved, by rule)**

## Output

- Passage count (`wc -l passages.jsonl`): **0** (0 words)
- Distinct page URLs (`jq -r .url | sort -u`): **0**
- Crawl: no link-selection line in the log (the crawl stopped before it)
- About / bio page fetched (by URL): **no**

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  bot challenge did not clear in the browser: https://www.robpiperheretoserve.com/robots.txt
  WARNING robots.txt unreadable (plain fetch got a bot challenge, HTTP 403; the browser could not clear it either) at https://www.robpiperheretoserve.com/robots.txt — its policy is unknown; proceeding with no rules.
  bot challenge (HTTP 403), retrying in the browser: https://www.robpiperheretoserve.com/
  bot challenge did not clear in the browser: https://www.robpiperheretoserve.com/
Could not fetch the homepage — stopping.
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
