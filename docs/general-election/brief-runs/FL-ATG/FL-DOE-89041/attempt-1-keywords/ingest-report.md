# Ingest report: FL-DOE-89041 (James Uthmeier), FL-ATG-general

Site: https://jamesforfl.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ATG/FL-DOE-89041 && node scripts/candidate-site-ingest.ts --site https://jamesforfl.com/ \
  --out docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/passages.jsonl 2> docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:01Z |
| End (UTC) | 2026-09-29T09:48:03Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **1** (95 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 25 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://jamesforfl.com/ | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
