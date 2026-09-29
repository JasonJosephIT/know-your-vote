# Ingest report: FL-DOE-90831 (Jennifer Jenkins), FL-8-general

Site: https://jenkinsforfl.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-8/FL-DOE-90831 && node scripts/candidate-site-ingest.ts --site https://jenkinsforfl.com/ \
  --out docs/general-election/brief-runs/FL-8/FL-DOE-90831/passages.jsonl 2> docs/general-election/brief-runs/FL-8/FL-DOE-90831/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:53Z |
| End (UTC) | 2026-09-29T09:48:15Z |
| Wall-clock | 22 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **25** (552 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 124 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://jenkinsforfl.com/ | 9 |
| https://jenkinsforfl.com/priorities | 16 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://jenkinsforfl.com/
  bot challenge (HTTP 202), retrying in the browser: https://jenkinsforfl.com/priorities
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
