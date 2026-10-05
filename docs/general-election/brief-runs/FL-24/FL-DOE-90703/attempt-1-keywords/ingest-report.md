# Ingest report: FL-DOE-90703 (Te Mayonna Brown), FL-24-general

Site: https://tebrownforflorida.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-24/FL-DOE-90703 && node scripts/candidate-site-ingest.ts --site https://tebrownforflorida.com/ \
  --out docs/general-election/brief-runs/FL-24/FL-DOE-90703/passages.jsonl 2> docs/general-election/brief-runs/FL-24/FL-DOE-90703/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:12Z |
| End (UTC) | 2026-09-29T09:47:17Z |
| Wall-clock | 5 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **24** (876 words)
- Distinct page URLs (`jq -r .url | sort -u`): **3**
- Crawl: 61 links on the homepage, 2 policy page(s) selected (cap 8)
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://tebrownforflorida.com/ | 7 |
| https://tebrownforflorida.com/issues | 12 |
| https://tebrownforflorida.com/the-people-first-agenda | 5 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
