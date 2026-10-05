# Ingest report: FL-DOE-91717 (Joe Strada), FL-11-general

Site: https://votestrada.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-11/FL-DOE-91717 && node scripts/candidate-site-ingest.ts --site https://votestrada.com/ \
  --out docs/general-election/brief-runs/FL-11/FL-DOE-91717/passages.jsonl 2> docs/general-election/brief-runs/FL-11/FL-DOE-91717/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:52Z |
| End (UTC) | 2026-09-29T09:46:56Z |
| Wall-clock | 4 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **16** (503 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 37 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://votestrada.com/ | 12 |
| https://votestrada.com/priorities | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
