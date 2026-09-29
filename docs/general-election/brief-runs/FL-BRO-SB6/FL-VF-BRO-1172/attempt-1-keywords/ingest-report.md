# Ingest report: FL-VF-BRO-1172 (Roberto Fernandez III), FL-BRO-SB6-general

Site: https://www.electroberto2026.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172 && node scripts/candidate-site-ingest.ts --site https://www.electroberto2026.com/ \
  --out docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB6/FL-VF-BRO-1172/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:07Z |
| End (UTC) | 2026-09-29T09:48:22Z |
| Wall-clock | 15 s |
| Exit code | 1 |

Result: **FAILURE: bot challenge; the browser rendered a page with no links and no text**

## Output

- Passage count (`wc -l passages.jsonl`): **0** (0 words)
- Distinct page URLs (`jq -r .url | sort -u`): **0**
- Crawl: 0 links on the homepage, 0 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://www.electroberto2026.com/
No passages from https://www.electroberto2026.com/. That is a finding about the fetch, not about the candidate: check whether the site renders its text client-side, or serves a bot challenge to non-browser clients.
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
