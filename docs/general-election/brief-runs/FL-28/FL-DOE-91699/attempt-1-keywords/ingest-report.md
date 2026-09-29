# Ingest report: FL-DOE-91699 (Phil "Felipe" Ehr), FL-28-general

Site: https://ehrforcongress.us/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-28/FL-DOE-91699 && node scripts/candidate-site-ingest.ts --site https://ehrforcongress.us/ \
  --out docs/general-election/brief-runs/FL-28/FL-DOE-91699/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-91699/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:44Z |
| End (UTC) | 2026-09-29T09:47:49Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **17** (642 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 56 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): https://ehrforcongress.us/meet-phil

| URL | Passages |
|---|---|
| https://ehrforcongress.us/ | 12 |
| https://ehrforcongress.us/meet-phil | 5 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
