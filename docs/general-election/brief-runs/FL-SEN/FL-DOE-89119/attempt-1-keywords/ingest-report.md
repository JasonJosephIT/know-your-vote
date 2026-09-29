# Ingest report: FL-DOE-89119 (Ashley Moody), FL-SEN-general

Site: https://ashleymoody.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-SEN/FL-DOE-89119 && node scripts/candidate-site-ingest.ts --site https://ashleymoody.com/ \
  --out docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:22Z |
| End (UTC) | 2026-09-29T09:49:34Z |
| Wall-clock | 12 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **4** (127 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 37 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://ashleymoody.com/ | 4 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
