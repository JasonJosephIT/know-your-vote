# Ingest report: FL-DOE-90433 (Dean Ocean Abrams, FL-GOV-general)

**Result: FAILURE.** Exit code was non-zero and no passages were written.

- Site: https://www.deanabrams.com/
- Command: `node scripts/candidate-site-ingest.ts --site https://www.deanabrams.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-90433/passages.jsonl` (defaults for --pages and --browser)
- Start: 2026-09-27T12:50:05Z
- End: 2026-09-27T12:50:15Z
- Wall-clock: ~10 s
- Exit code: 1

## Passages

- Passage count: 0. `passages.jsonl` was not created.
- Distinct page URLs: none.

## Log lines (verbatim from ingest.log)

Bot challenge, browser fallback and unreachable lines:

```
  bot challenge (HTTP 403), retrying in the browser: https://www.deanabrams.com/
  browser Error: https://www.deanabrams.com/
Could not fetch the homepage — stopping.
```

The log has no robots.txt or Crawl-delay line. The script stopped at the homepage before any such line appeared. The rest of the log is a Node `MODULE_TYPELESS_PACKAGE_JSON` warning and the line `site: https://www.deanabrams.com/`.

## About / bio page

No pages were fetched, so there is no About, bio or "Who I am" page.

## Notes

As the run rules require, nothing was retried, no other flags or tools were used, and the site was not fetched any other way.
