# Ingest report: FL-DOE-90251 (Sydney Gruters), FL-16-general

Site: https://grutersforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-16/FL-DOE-90251 && node scripts/candidate-site-ingest.ts --site https://grutersforcongress.com/ \
  --out docs/general-election/brief-runs/FL-16/FL-DOE-90251/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-90251/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:04Z |
| End (UTC) | 2026-09-29T09:47:07Z |
| Wall-clock | 3 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **9** (313 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 25 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://grutersforcongress.com/ | 9 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  HTTP 404 https://grutersforcongress.com/.*
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
