# Ingest report: FL-DOE-88911 (Jared Moskowitz), FL-25-general

Site: https://jaredforflorida.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-25/FL-DOE-88911 && node scripts/candidate-site-ingest.ts --site https://jaredforflorida.com/ \
  --out docs/general-election/brief-runs/FL-25/FL-DOE-88911/passages.jsonl 2> docs/general-election/brief-runs/FL-25/FL-DOE-88911/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:17Z |
| End (UTC) | 2026-09-29T09:48:07Z |
| Wall-clock | 50 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **32** (1387 words)
- Distinct page URLs (`jq -r .url | sort -u`): **3**
- Crawl: 90 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://jaredforflorida.com/ | 16 |
| https://jaredforflorida.com/priorities | 12 |
| https://jaredforflorida.com/updates/jared-moskowitz-named-ranking-democrat-on-house-middle-east | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/priorities
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/updates/jared-moskowitz-named-ranking-democrat-on-house-middle-east
  3 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
