# Ingest report: FL-VF-BRO-1041 (Caryl Sandler Shuham), FL-BRO-CC6-general

Site: https://www.carylshuham.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041 && node scripts/candidate-site-ingest.ts --site https://www.carylshuham.com/ \
  --out docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-CC6/FL-VF-BRO-1041/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:03Z |
| End (UTC) | 2026-09-29T09:48:17Z |
| Wall-clock | 14 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **42** (934 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 53 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.carylshuham.com/ | 42 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://www.carylshuham.com/
  1 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
