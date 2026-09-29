# Ingest report: FL-DOE-92395 (Brian Lambert), FL-14-general

Site: https://www.brianlambertforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-14/FL-DOE-92395 && node scripts/candidate-site-ingest.ts --site https://www.brianlambertforcongress.com/ \
  --out docs/general-election/brief-runs/FL-14/FL-DOE-92395/passages.jsonl 2> docs/general-election/brief-runs/FL-14/FL-DOE-92395/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:56Z |
| End (UTC) | 2026-09-29T09:47:04Z |
| Wall-clock | 8 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **139** (2632 words)
- Distinct page URLs (`jq -r .url | sort -u`): **7**
- Crawl: 30 links on the homepage, 6 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://www.brianlambertforcongress.com/ | 33 |
| https://www.brianlambertforcongress.com/issues | 13 |
| https://www.brianlambertforcongress.com/issues/constitutional-government | 13 |
| https://www.brianlambertforcongress.com/issues/election-integrity | 19 |
| https://www.brianlambertforcongress.com/issues/fiscal-responsibility | 22 |
| https://www.brianlambertforcongress.com/issues/individual-liberty | 15 |
| https://www.brianlambertforcongress.com/issues/veterans | 24 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
