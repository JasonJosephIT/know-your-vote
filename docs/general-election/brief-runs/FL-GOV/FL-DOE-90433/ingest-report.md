# Ingest report: FL-DOE-90433 (Dean Ocean Abrams, FL-GOV-general)

**Result: FAILURE.** The script stopped at the homepage because the bot challenge did not clear. It produced no passages and exited with code 1.

- Site: https://www.deanabrams.com/
- Command: `node scripts/candidate-site-ingest.ts --site https://www.deanabrams.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-90433/passages.jsonl` (default `--pages` and `--browser`, no other flags)
- Start: 2026-09-27T12:52:40Z
- End: 2026-09-27T12:53:18Z
- Wall-clock: 38 s
- Exit code: 1

## Passages

- Passage count: 0. `passages.jsonl` was not created.
- Distinct page URLs: none.

## Relevant ingest.log lines (verbatim)

```
  bot challenge (HTTP 403), retrying in the browser: https://www.deanabrams.com/
  bot challenge did not clear in the browser: https://www.deanabrams.com/
Could not fetch the homepage — stopping.
```

The log has no robots.txt or Crawl-delay lines, because the run stopped before the crawl began. The only other lines are Node's `MODULE_TYPELESS_PACKAGE_JSON` warning and `site: https://www.deanabrams.com/`.

## About / bio page

None. No pages were fetched.

## Notes

- Following the run rules, there was no retry, no change of flags or tools, no captcha solving, and no other fetch of the site.
- A folder named `attempt-1-failed/` (containing `ingest-report.md` and `ingest.log`, timestamped 12:50) was already in this directory before this run started. This run did not touch it.
