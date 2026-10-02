# Ingest report: FL-DOE-89121 (Laurel Lee), FL-15-general

Site: https://votelaurel.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-15/FL-DOE-89121 && node scripts/candidate-site-ingest.ts --site https://votelaurel.com/ \
  --out docs/general-election/brief-runs/FL-15/FL-DOE-89121/passages.jsonl 2> docs/general-election/brief-runs/FL-15/FL-DOE-89121/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:59Z |
| End (UTC) | 2026-09-29T09:47:10Z |
| Wall-clock | 11 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **25** (1299 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 53 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://votelaurel.com/ | 25 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
