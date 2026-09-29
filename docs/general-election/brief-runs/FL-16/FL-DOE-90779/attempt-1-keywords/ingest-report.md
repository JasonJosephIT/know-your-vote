# Ingest report: FL-DOE-90779 (Kelly Kirschner), FL-16-general

Site: https://kellykirschner.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-16/FL-DOE-90779 && node scripts/candidate-site-ingest.ts --site https://kellykirschner.com/ \
  --out docs/general-election/brief-runs/FL-16/FL-DOE-90779/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-90779/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:05Z |
| End (UTC) | 2026-09-29T09:47:08Z |
| Wall-clock | 3 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **73** (2317 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 39 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://kellykirschner.com/ | 73 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
