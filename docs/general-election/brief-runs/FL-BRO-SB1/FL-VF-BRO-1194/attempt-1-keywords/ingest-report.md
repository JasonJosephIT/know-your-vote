# Ingest report: FL-VF-BRO-1194 (Maura McCarthy Bulman), FL-BRO-SB1-general

Site: https://www.mauraforbroward.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194 && node scripts/candidate-site-ingest.ts --site https://www.mauraforbroward.com/ \
  --out docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB1/FL-VF-BRO-1194/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:05Z |
| End (UTC) | 2026-09-29T09:48:07Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **12** (617 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 26 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.mauraforbroward.com/ | 12 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
