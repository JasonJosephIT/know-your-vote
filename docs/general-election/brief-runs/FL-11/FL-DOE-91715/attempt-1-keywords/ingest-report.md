# Ingest report: FL-DOE-91715 (James Pericola), FL-11-general

Site: https://jamespericola.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-11/FL-DOE-91715 && node scripts/candidate-site-ingest.ts --site https://jamespericola.com/ \
  --out docs/general-election/brief-runs/FL-11/FL-DOE-91715/passages.jsonl 2> docs/general-election/brief-runs/FL-11/FL-DOE-91715/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:52Z |
| End (UTC) | 2026-09-29T09:47:07Z |
| Wall-clock | 15 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **18** (495 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 42 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://jamespericola.com/ | 18 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  honoring Crawl-delay: 10s
  bot challenge (HTTP 202), retrying in the browser: https://jamespericola.com/
  1 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
