# Ingest report: FL-VF-ORA-1318 (Gloria Reina O'Neal), FL-ORA-SB2-general

Site: https://votegloriareina.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318 && node scripts/candidate-site-ingest.ts --site https://votegloriareina.com/ \
  --out docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:49:16Z |
| End (UTC) | 2026-09-29T09:49:21Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **39** (1301 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 12 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://votegloriareina.com/ | 39 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 47 characters of text, rendering in the browser: https://votegloriareina.com/
  1 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
