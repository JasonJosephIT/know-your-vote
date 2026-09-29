# Ingest report: FL-VF-HIL-2880 (Jackie Toledo), FL-HIL-CC1-general

Site: https://jackietoledo.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880 && node scripts/candidate-site-ingest.ts --site https://jackietoledo.com/ \
  --out docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:28Z |
| End (UTC) | 2026-09-29T09:48:41Z |
| Wall-clock | 13 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **33** (827 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 47 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://jackietoledo.com/ | 21 |
| https://jackietoledo.com/issues | 12 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://jackietoledo.com/
  bot challenge (HTTP 202), retrying in the browser: https://jackietoledo.com/issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
