# Ingest report: FL-DOE-89394 (Blaise Ingoglia), FL-CFO-general

Site: https://blaiseforflorida.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-CFO/FL-DOE-89394 && node scripts/candidate-site-ingest.ts --site https://blaiseforflorida.com/ \
  --out docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/passages.jsonl 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:15Z |
| End (UTC) | 2026-09-29T09:48:28Z |
| Wall-clock | 13 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **43** (1457 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 64 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://blaiseforflorida.com/ | 7 |
| https://blaiseforflorida.com/issues | 36 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://blaiseforflorida.com/
  only 73 characters of text, rendering in the browser: https://blaiseforflorida.com/issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
