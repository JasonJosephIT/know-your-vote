# Ingest report: FL-DOE-91544 (Oliver G. Gilbert III), FL-24-general

Site: https://olivergilbert.vote/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-24/FL-DOE-91544 && node scripts/candidate-site-ingest.ts --site https://olivergilbert.vote/ \
  --out docs/general-election/brief-runs/FL-24/FL-DOE-91544/passages.jsonl 2> docs/general-election/brief-runs/FL-24/FL-DOE-91544/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:13Z |
| End (UTC) | 2026-09-29T09:47:39Z |
| Wall-clock | 26 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **62** (1393 words)
- Distinct page URLs (`jq -r .url | sort -u`): **3**
- Crawl: 72 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://olivergilbert.vote/ | 15 |
| https://olivergilbert.vote/build-business-act | 33 |
| https://olivergilbert.vote/issues | 14 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/issues
  bot challenge (HTTP 202), retrying in the browser: https://olivergilbert.vote/build-business-act
  3 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
