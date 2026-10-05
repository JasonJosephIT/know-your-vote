# Ingest report: FL-DOE-90631 (Bale Dalton), FL-7-general

Site: https://baledalton.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-7/FL-DOE-90631 && node scripts/candidate-site-ingest.ts --site https://baledalton.com/ \
  --out docs/general-election/brief-runs/FL-7/FL-DOE-90631/passages.jsonl 2> docs/general-election/brief-runs/FL-7/FL-DOE-90631/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:46Z |
| End (UTC) | 2026-09-29T09:47:55Z |
| Wall-clock | 9 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **37** (2515 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 51 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://baledalton.com/ | 6 |
| https://baledalton.com/priorities | 31 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://baledalton.com/
  only 73 characters of text, rendering in the browser: https://baledalton.com/priorities
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
