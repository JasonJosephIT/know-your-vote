# Ingest report: FL-DOE-91577 (Debbie Wasserman Schultz), FL-20-general

Site: https://debbiewassermanschultz.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-20/FL-DOE-91577 && node scripts/candidate-site-ingest.ts --site https://debbiewassermanschultz.com/ \
  --out docs/general-election/brief-runs/FL-20/FL-DOE-91577/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-91577/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:08Z |
| End (UTC) | 2026-09-29T09:47:18Z |
| Wall-clock | 10 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **11** (330 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 63 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://debbiewassermanschultz.com/ | 8 |
| https://debbiewassermanschultz.com/vote | 3 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://debbiewassermanschultz.com/
  only 73 characters of text, rendering in the browser: https://debbiewassermanschultz.com/vote
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
