# Ingest report: FL-DOE-88868 (Gus Michael Bilirakis), FL-12-general

Site: https://bilirakisforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-12/FL-DOE-88868 && node scripts/candidate-site-ingest.ts --site https://bilirakisforcongress.com/ \
  --out docs/general-election/brief-runs/FL-12/FL-DOE-88868/passages.jsonl 2> docs/general-election/brief-runs/FL-12/FL-DOE-88868/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:52Z |
| End (UTC) | 2026-09-29T09:46:55Z |
| Wall-clock | 3 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **49** (1136 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 39 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://bilirakisforcongress.com/ | 30 |
| https://bilirakisforcongress.com/issues.html | 19 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
