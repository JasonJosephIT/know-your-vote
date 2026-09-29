# Ingest report: FL-DOE-92377 (Christopher Dennison), FL-7-general

Site: https://dennison4congress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-7/FL-DOE-92377 && node scripts/candidate-site-ingest.ts --site https://dennison4congress.com/ \
  --out docs/general-election/brief-runs/FL-7/FL-DOE-92377/passages.jsonl 2> docs/general-election/brief-runs/FL-7/FL-DOE-92377/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:49Z |
| End (UTC) | 2026-09-29T09:47:57Z |
| Wall-clock | 8 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **17** (773 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 14 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://dennison4congress.com/ | 5 |
| https://dennison4congress.com/issues-2 | 12 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  HTTP 404 https://dennison4congress.com/issues
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
