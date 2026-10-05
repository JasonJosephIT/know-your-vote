# Ingest report: FL-VF-ORA-1290 (Kamia Brown), FL-ORA-CC2-general

Site: https://www.kamiafororangecounty.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290 && node scripts/candidate-site-ingest.ts --site https://www.kamiafororangecounty.com/ \
  --out docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC2/FL-VF-ORA-1290/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:50Z |
| End (UTC) | 2026-09-29T09:48:52Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **15** (116 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 18 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.kamiafororangecounty.com/ | 15 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
