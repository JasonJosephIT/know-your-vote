# Ingest report: FL-VF-HIL-2661 (Stacy Hahn), FL-HIL-CC5-general

Site: https://www.votestacyhahn.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661 && node scripts/candidate-site-ingest.ts --site https://www.votestacyhahn.com/ \
  --out docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:41Z |
| End (UTC) | 2026-09-29T09:48:45Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **16** (831 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 2 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.votestacyhahn.com/ | 16 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
