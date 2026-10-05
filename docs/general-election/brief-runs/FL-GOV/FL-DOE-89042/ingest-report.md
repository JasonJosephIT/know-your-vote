# Ingest report: FL-DOE-89042 (Byron Donalds), FL-GOV-general

Site: https://byrondonalds.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags):

```
mkdir -p docs/general-election/brief-runs/FL-GOV/FL-DOE-89042 && node scripts/candidate-site-ingest.ts --site https://byrondonalds.com/ \
  --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-27T12:50:05Z |
| End (UTC) | 2026-09-27T12:50:18Z |
| Wall-clock | 13 s |
| Exit code | 0 |

Result: SUCCESS (exit 0, non-zero passage count).

## Output

- Passage count (`wc -l passages.jsonl`): **58**
- Distinct page URLs (`jq -r .url | sort -u`): **7**

| URL | Passages |
|---|---|
| https://byrondonalds.com/ | 8 |
| https://byrondonalds.com/issues/affordability | 10 |
| https://byrondonalds.com/issues/economy | 5 |
| https://byrondonalds.com/issues/education | 19 |
| https://byrondonalds.com/issues/healthcare | 6 |
| https://byrondonalds.com/issues/law-and-order | 5 |
| https://byrondonalds.com/issues/space-and-tech | 5 |

Crawl summary line from the log, verbatim: `  10 links, 6 policy page(s) selected (cap 8)`

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines

None. `ingest.log` contains no line matching robots, Crawl-delay, challenge, captcha,
fallback, browser or unreachable. The script writes such lines only when something is
noteworthy (robots.txt unreadable or read in a browser, a Crawl-delay present, a page
disallowed, a bot challenge, a browser retry, an HTTP error), so their absence means:
robots.txt was read directly and allowed the crawl, it set no Crawl-delay, no page was
skipped by robots.txt, and no bot challenge or browser fallback occurred.

The only other log content is a Node `MODULE_TYPELESS_PACKAGE_JSON` warning about the
script being reparsed as an ES module (no effect on the crawl).

## About / bio / "Who I am" page (by URL only)

No. None of the 7 fetched URLs looks like an About, bio or "Who I am" page: they are the
homepage and six `/issues/*` policy pages. Whether the homepage carries bio material was
not checked (content was not read, per instructions).
