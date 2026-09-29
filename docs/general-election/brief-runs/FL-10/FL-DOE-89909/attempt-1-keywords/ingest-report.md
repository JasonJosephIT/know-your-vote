# Ingest report: FL-DOE-89909 (Maxwell Alejandro Frost), FL-10-general

Site: https://www.frostforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-10/FL-DOE-89909 && node scripts/candidate-site-ingest.ts --site https://www.frostforcongress.com/ \
  --out docs/general-election/brief-runs/FL-10/FL-DOE-89909/passages.jsonl 2> docs/general-election/brief-runs/FL-10/FL-DOE-89909/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:52Z |
| End (UTC) | 2026-09-29T09:46:54Z |
| Wall-clock | 2 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **4** (169 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 36 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.frostforcongress.com/ | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
