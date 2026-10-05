# Ingest report: FL-VF-ORA-1239 (Chris Messina), FL-ORA-MAYOR-general

Site: https://www.chrismessina.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239 && node scripts/candidate-site-ingest.ts --site https://www.chrismessina.com/ \
  --out docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:12Z |
| End (UTC) | 2026-09-29T09:51:09Z |
| Wall-clock | 117 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **27** (1157 words)
- Distinct page URLs (`jq -r .url | sort -u`): **3**
- Crawl: 32 links on the homepage, 4 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.chrismessina.com/ | 4 |
| https://www.chrismessina.com/our-vision-2 | 7 |
| https://www.chrismessina.com/platform | 16 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 20s
  HTTP 404 https://www.chrismessina.com/our-vision-2026
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
