# Ingest report: FL-DOE-90340 (Eddy Rojas), FL-28-general

Site: https://www.eddyrojas.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-28/FL-DOE-90340 && node scripts/candidate-site-ingest.ts --site https://www.eddyrojas.com/ \
  --out docs/general-election/brief-runs/FL-28/FL-DOE-90340/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-90340/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:42Z |
| End (UTC) | 2026-09-29T09:47:46Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **4** (135 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 6 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.eddyrojas.com/events-1 | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
