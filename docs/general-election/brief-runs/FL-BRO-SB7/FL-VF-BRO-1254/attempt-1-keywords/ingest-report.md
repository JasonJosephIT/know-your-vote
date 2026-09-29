# Ingest report: FL-VF-BRO-1254 (Cynthia Alceus Dominique), FL-BRO-SB7-general

Site: https://www.cynthiaforbrowardschools.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254 && node scripts/candidate-site-ingest.ts --site https://www.cynthiaforbrowardschools.com/ \
  --out docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB7/FL-VF-BRO-1254/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:13Z |
| End (UTC) | 2026-09-29T09:48:15Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **62** (1429 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 20 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.cynthiaforbrowardschools.com/ | 62 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
