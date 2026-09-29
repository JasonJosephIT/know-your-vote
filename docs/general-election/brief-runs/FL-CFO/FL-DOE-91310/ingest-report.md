# Ingest report: FL-DOE-91310 (Annette Taddeo), FL-CFO-general

Site: https://annettetaddeo.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-CFO/FL-DOE-91310 && node scripts/candidate-site-ingest.ts --site https://annettetaddeo.com/ \
  --out docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/passages.jsonl 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:15Z |
| End (UTC) | 2026-09-29T09:48:46Z |
| Wall-clock | 31 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **10** (382 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 64 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://annettetaddeo.com/ | 5 |
| https://annettetaddeo.com/issues | 5 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://annettetaddeo.com/
  bot challenge (HTTP 202), retrying in the browser: https://annettetaddeo.com/issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
