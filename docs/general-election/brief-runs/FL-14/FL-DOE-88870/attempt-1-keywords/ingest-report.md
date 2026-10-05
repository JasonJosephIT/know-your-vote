# Ingest report: FL-DOE-88870 (Kathy Castor), FL-14-general

Site: https://castorforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-14/FL-DOE-88870 && node scripts/candidate-site-ingest.ts --site https://castorforcongress.com/ \
  --out docs/general-election/brief-runs/FL-14/FL-DOE-88870/passages.jsonl 2> docs/general-election/brief-runs/FL-14/FL-DOE-88870/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:55Z |
| End (UTC) | 2026-09-29T09:47:42Z |
| Wall-clock | 47 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **7** (138 words)
- Distinct page URLs (`jq -r .url | sort -u`): **4**
- Crawl: 66 links on the homepage, 3 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://castorforcongress.com/ | 4 |
| https://castorforcongress.com/florida-politics-union-leaders-rally-around-kathy-castor-after-she-helps-save-700-jobs-at-tampa-international-airport | 1 |
| https://castorforcongress.com/redistricting-congress-desantis-republican-primary-election-kathy-castor-midterms | 1 |
| https://castorforcongress.com/what-is-redistricting-gerrymandering-florida-explain | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
