# Ingest report: FL-DOE-89453 (Kimberly Overman), FL-12-general

Site: https://kimberlyoverman.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-12/FL-DOE-89453 && node scripts/candidate-site-ingest.ts --site https://kimberlyoverman.com/ \
  --out docs/general-election/brief-runs/FL-12/FL-DOE-89453/passages.jsonl 2> docs/general-election/brief-runs/FL-12/FL-DOE-89453/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:46:52Z |
| End (UTC) | 2026-09-29T09:46:59Z |
| Wall-clock | 7 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **47** (1431 words)
- Distinct page URLs (`jq -r .url | sort -u`): **4**
- Crawl: 140 links on the homepage, 3 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://kimberlyoverman.com/ | 18 |
| https://kimberlyoverman.com/issues | 10 |
| https://kimberlyoverman.com/issues/kimberly-on-substack | 14 |
| https://kimberlyoverman.com/news-and-events/endorsements/endorsements-florida-lgbtq-democratic-caucus-endorses-kimberly-overman-for-floridas-12th-congressional-district | 5 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
