# Ingest report: FL-DOE-89339 (Darren Soto), FL-9-general

Site: https://www.darrensoto.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-9/FL-DOE-89339 && node scripts/candidate-site-ingest.ts --site https://www.darrensoto.com/ \
  --out docs/general-election/brief-runs/FL-9/FL-DOE-89339/passages.jsonl 2> docs/general-election/brief-runs/FL-9/FL-DOE-89339/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:54Z |
| End (UTC) | 2026-09-29T09:47:59Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **19** (634 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 64 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.darrensoto.com/ | 15 |
| https://www.darrensoto.com/vote | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
