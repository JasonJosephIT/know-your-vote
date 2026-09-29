# Ingest report: FL-VF-HIL-2672 (Patricia "Patti" Rendon), FL-HIL-SB4-general

Site: https://www.votepattirendon.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672 && node scripts/candidate-site-ingest.ts --site https://www.votepattirendon.com/ \
  --out docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:48:45Z |
| End (UTC) | 2026-09-29T09:49:21Z |
| Wall-clock | 36 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **1** (37 words)
- Distinct page URLs (`jq -r .url | sort -u`): **1**
- Crawl: 4 links on the homepage, 1 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.votepattirendon.com/ | 1 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 179 characters of text, rendering in the browser: https://www.votepattirendon.com/about-patti
  rendered, but only 200 characters of text: https://www.votepattirendon.com/about-patti
  1 page(s) fetched in the browser
```

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
