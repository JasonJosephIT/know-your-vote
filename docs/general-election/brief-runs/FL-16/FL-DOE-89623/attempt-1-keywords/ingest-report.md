# Ingest report: FL-DOE-89623 (Mark Davis), FL-16-general

Site: https://markdavisforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-16/FL-DOE-89623 && node scripts/candidate-site-ingest.ts --site https://markdavisforcongress.com/ \
  --out docs/general-election/brief-runs/FL-16/FL-DOE-89623/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-89623/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:00Z |
| End (UTC) | 2026-09-29T09:47:05Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **34** (911 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 53 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://markdavisforcongress.com/ | 16 |
| https://markdavisforcongress.com/issues | 18 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  HTTP 404 https://markdavisforcongress.com/privacy-1
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
