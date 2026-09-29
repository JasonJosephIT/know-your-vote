# Ingest report: FL-DOE-91337 (Dan Green), FL-9-general

Site: https://dangreenfl.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-9/FL-DOE-91337 && node scripts/candidate-site-ingest.ts --site https://dangreenfl.com/ \
  --out docs/general-election/brief-runs/FL-9/FL-DOE-91337/passages.jsonl 2> docs/general-election/brief-runs/FL-9/FL-DOE-91337/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:55Z |
| End (UTC) | 2026-09-29T09:48:13Z |
| Wall-clock | 18 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **11** (458 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 34 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://dangreenfl.com/ | 10 |
| https://dangreenfl.com/on-the-issues | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://dangreenfl.com/
  only 73 characters of text, rendering in the browser: https://dangreenfl.com/on-the-issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
