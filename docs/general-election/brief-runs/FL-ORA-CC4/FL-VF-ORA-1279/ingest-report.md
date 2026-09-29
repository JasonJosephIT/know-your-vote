# Ingest report: FL-VF-ORA-1279 (Johanna Lopez), FL-ORA-CC4-general

Site: https://www.votejohannalopez.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279 && node scripts/candidate-site-ingest.ts --site https://www.votejohannalopez.com/ \
  --out docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:56Z |
| End (UTC) | 2026-09-29T09:49:00Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **41** (890 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 46 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.votejohannalopez.com/ | 12 |
| https://www.votejohannalopez.com/copy-of-results | 29 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
