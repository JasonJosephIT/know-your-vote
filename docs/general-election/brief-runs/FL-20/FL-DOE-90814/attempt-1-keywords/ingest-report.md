# Ingest report: FL-DOE-90814 (Kedner Maxime), FL-20-general

Site: https://www.maximeforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-20/FL-DOE-90814 && node scripts/candidate-site-ingest.ts --site https://www.maximeforcongress.com/ \
  --out docs/general-election/brief-runs/FL-20/FL-DOE-90814/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-90814/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:07Z |
| End (UTC) | 2026-09-29T09:47:13Z |
| Wall-clock | 6 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **49** (1302 words)
- Distinct page URLs (`jq -r .url | sort -u`): **5**
- Crawl: 43 links on the homepage, 4 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.maximeforcongress.com/ | 12 |
| https://www.maximeforcongress.com/education | 9 |
| https://www.maximeforcongress.com/healthcare | 9 |
| https://www.maximeforcongress.com/immigration | 11 |
| https://www.maximeforcongress.com/jobs | 8 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
