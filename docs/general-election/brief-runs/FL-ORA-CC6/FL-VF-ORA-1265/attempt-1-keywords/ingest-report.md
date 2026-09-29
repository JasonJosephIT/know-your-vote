# Ingest report: FL-VF-ORA-1265 (Michael "Mike" Scott), FL-ORA-CC6-general

Site: https://mymikescott.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265 && node scripts/candidate-site-ingest.ts --site https://mymikescott.com/ \
  --out docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC6/FL-VF-ORA-1265/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:57Z |
| End (UTC) | 2026-09-29T09:49:58Z |
| Wall-clock | 61 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **9** (232 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 28 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://mymikescott.com/ | 8 |
| https://mymikescott.com/case_study/affordable-and-attainable-housing | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://mymikescott.com/
  only 73 characters of text, rendering in the browser: https://mymikescott.com/case_study/affordable-and-attainable-housing
  only 73 characters of text, rendering in the browser: https://mymikescott.com/mike-scotts-priorities
  rendered, but only 23 characters of text: https://mymikescott.com/mike-scotts-priorities
  3 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
