# Ingest report: FL-DOE-91278 (Brent Andersen), FL-20-general

Site: https://brentandersenfl.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-20/FL-DOE-91278 && node scripts/candidate-site-ingest.ts --site https://brentandersenfl.com/ \
  --out docs/general-election/brief-runs/FL-20/FL-DOE-91278/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-91278/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:07Z |
| End (UTC) | 2026-09-29T09:47:42Z |
| Wall-clock | 35 s |
| Exit code | 1 |

Result: **FAILURE: bot challenge did not clear (not solved, by rule)**

## Output

- Passage count (`wc -l passages.jsonl`): **0** (0 words)
- Distinct page URLs (`jq -r .url | sort -u`): **0**
- Crawl: no link-selection line in the log (the crawl stopped before it)
- About / bio page fetched (by URL): **no**

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://brentandersenfl.com/
  bot challenge did not clear in the browser: https://brentandersenfl.com/
Could not fetch the homepage — stopping.
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
