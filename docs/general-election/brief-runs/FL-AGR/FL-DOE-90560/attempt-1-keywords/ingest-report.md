# Ingest report: FL-DOE-90560 (Wilton Simpson), FL-AGR-general

Site: https://wiltonsimpson.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-AGR/FL-DOE-90560 && node scripts/candidate-site-ingest.ts --site https://wiltonsimpson.com/ \
  --out docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/passages.jsonl 2> docs/general-election/brief-runs/FL-AGR/FL-DOE-90560/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:57Z |
| End (UTC) | 2026-09-29T09:48:02Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **72** (2952 words)
- Distinct page URLs (`jq -r .url | sort -u`): **4**
- Crawl: 41 links on the homepage, 3 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://wiltonsimpson.com/ | 15 |
| https://wiltonsimpson.com/education | 12 |
| https://wiltonsimpson.com/environment | 27 |
| https://wiltonsimpson.com/public-safety | 18 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
