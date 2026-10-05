# Ingest report: FL-DOE-89933 (Eliott Rodriguez), FL-27-general

Site: https://eliottrodriguez.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-27/FL-DOE-89933 && node scripts/candidate-site-ingest.ts --site https://eliottrodriguez.com/ \
  --out docs/general-election/brief-runs/FL-27/FL-DOE-89933/passages.jsonl 2> docs/general-election/brief-runs/FL-27/FL-DOE-89933/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:36Z |
| End (UTC) | 2026-09-29T09:47:54Z |
| Wall-clock | 18 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **53** (1233 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 29 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://eliottrodriguez.com/ | 3 |
| https://eliottrodriguez.com/issues | 50 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://eliottrodriguez.com/
  only 73 characters of text, rendering in the browser: https://eliottrodriguez.com/issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
