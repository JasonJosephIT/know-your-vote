# Ingest report: FL-VF-ORA-1271 (Vicki Vargo), FL-ORA-CC7-general

Site: https://votevickivargo.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271 && node scripts/candidate-site-ingest.ts --site https://votevickivargo.com/ \
  --out docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1271/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:00Z |
| End (UTC) | 2026-09-29T09:49:06Z |
| Wall-clock | 6 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **13** (233 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 21 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://votevickivargo.com/ | 9 |
| https://votevickivargo.com/issues | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
