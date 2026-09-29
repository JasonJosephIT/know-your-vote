# Ingest report: FL-VF-HIL-2660 (Aileen Rodriguez), FL-HIL-CC7-general

Site: https://voteaileen2026.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660 && node scripts/candidate-site-ingest.ts --site https://voteaileen2026.com/ \
  --out docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:43Z |
| End (UTC) | 2026-09-29T09:48:45Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **14** (498 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 36 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://voteaileen2026.com/ | 14 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
