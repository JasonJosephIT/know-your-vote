# Ingest report: FL-VF-BRO-1191 (Nicole Morst), FL-BRO-SB4-general

Site: https://nicolemorst.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191 && node scripts/candidate-site-ingest.ts --site https://nicolemorst.com/ \
  --out docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:07Z |
| End (UTC) | 2026-09-29T09:48:09Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **9** (554 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 22 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://nicolemorst.com/ | 9 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
