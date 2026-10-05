# Ingest report: FL-DOE-84076 (Scott Eckhard Jewett), FL-GOV-general

**Result: FAILURE** (non-zero exit, zero passages)

- Site: https://scottjewett.com/
- Command: `node scripts/candidate-site-ingest.ts --site https://scottjewett.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/passages.jsonl` (default --pages and --browser)
- Start: 2026-09-27T12:52:39Z
- End: 2026-09-27T12:53:18Z
- Wall-clock: 39 s
- Exit code: 1

## Passages

- Passage count: 0. The script did not create `passages.jsonl`.
- Distinct page URLs: none

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines (verbatim from ingest.log)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/
  bot challenge did not clear in the browser: https://scottjewett.com/
Could not fetch the homepage — stopping.
```

The log has no Crawl-delay line. Its other lines are a Node `MODULE_TYPELESS_PACKAGE_JSON` warning and `site: https://scottjewett.com/`.

## About / bio / "Who I am" page

None. The script fetched no pages.

## Notes

- The site answered with a bot challenge (HTTP 202). The script fell back to the browser, and the challenge did not clear there. The run was not retried and nothing was bypassed, as the rules require.
- This directory already had an `attempt-1-failed/` folder (dated 12:50Z) from an earlier run, with its own `ingest.log` and `ingest-report.md`. This run did not touch it.
