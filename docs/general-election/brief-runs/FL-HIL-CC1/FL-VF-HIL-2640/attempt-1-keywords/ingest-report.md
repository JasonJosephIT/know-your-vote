# Ingest report: FL-VF-HIL-2640 (Harry Cohen), FL-HIL-CC1-general

Site: https://harrycohen.vote/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640 && node scripts/candidate-site-ingest.ts --site https://harrycohen.vote/ \
  --out docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2640/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:28Z |
| End (UTC) | 2026-09-29T09:48:44Z |
| Wall-clock | 16 s |
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
  bot challenge (HTTP 202), retrying in the browser: https://harrycohen.vote/
No passages from https://harrycohen.vote/. That is a finding about the fetch, not about the candidate: check whether the site renders its text client-side, or serves a bot challenge to non-browser clients.
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
