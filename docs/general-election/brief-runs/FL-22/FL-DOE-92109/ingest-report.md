# Ingest report: FL-DOE-92109 (Casey Askar), FL-22-general

Site: https://www.caseyaskar.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-22/FL-DOE-92109 && node scripts/candidate-site-ingest.ts --site https://www.caseyaskar.com/ \
  --out docs/general-election/brief-runs/FL-22/FL-DOE-92109/passages.jsonl 2> docs/general-election/brief-runs/FL-22/FL-DOE-92109/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:10Z |
| End (UTC) | 2026-09-29T09:47:12Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **1** (48 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 21 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.caseyaskar.com/ | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
