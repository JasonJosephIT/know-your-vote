# Ingest report: FL-VF-HIL-2610 (Kenneth "Ken" Gay), FL-HIL-SB6-general

Site: https://votekennethgay.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610 && node scripts/candidate-site-ingest.ts --site https://votekennethgay.com/ \
  --out docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2610/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:46Z |
| End (UTC) | 2026-09-29T09:48:50Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **13** (248 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 13 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://votekennethgay.com/ | 7 |
| https://votekennethgay.com/priorities | 6 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
