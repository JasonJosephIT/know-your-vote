# Ingest report: FL-VF-HIL-2645 (Karen Perez), FL-HIL-SB6-general

Site: https://keepkarenperez.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645 && node scripts/candidate-site-ingest.ts --site https://keepkarenperez.com/ \
  --out docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:47Z |
| End (UTC) | 2026-09-29T09:48:57Z |
| Wall-clock | 10 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **15** (272 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 8 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://keepkarenperez.com/ | 15 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://keepkarenperez.com/
  1 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
