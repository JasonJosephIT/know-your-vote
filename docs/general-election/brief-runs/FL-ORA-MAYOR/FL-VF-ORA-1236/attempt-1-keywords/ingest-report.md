# Ingest report: FL-VF-ORA-1236 (Tiffany Moore Russell), FL-ORA-MAYOR-general

Site: https://tiffanyformayor.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236 && node scripts/candidate-site-ingest.ts --site https://tiffanyformayor.com/ \
  --out docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:10Z |
| End (UTC) | 2026-09-29T09:49:31Z |
| Wall-clock | 21 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **11** (264 words)
- Distinct page URLs (`jq -r .url | sort -u`): **2**
- Crawl: 83 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://tiffanyformayor.com/ | 5 |
| https://tiffanyformayor.com/issues | 6 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://tiffanyformayor.com/
  bot challenge (HTTP 202), retrying in the browser: https://tiffanyformayor.com/issues
  2 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
