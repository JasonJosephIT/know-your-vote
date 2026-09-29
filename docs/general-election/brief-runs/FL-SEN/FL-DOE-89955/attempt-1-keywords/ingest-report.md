# Ingest report: FL-DOE-89955 (Neil J. Gillespie), FL-SEN-general

Site: https://neilgillespie4senate.blogspot.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-SEN/FL-DOE-89955 && node scripts/candidate-site-ingest.ts --site https://neilgillespie4senate.blogspot.com/ \
  --out docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:23Z |
| End (UTC) | 2026-09-29T09:49:24Z |
| Wall-clock | 1 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **80** (3528 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 324 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://neilgillespie4senate.blogspot.com/ | 80 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
