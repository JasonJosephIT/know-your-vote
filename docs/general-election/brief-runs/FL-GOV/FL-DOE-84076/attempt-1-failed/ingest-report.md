# Ingest report: FL-DOE-84076 (Scott Eckhard Jewett, FL-GOV-general)

**Result: FAILURE.** The script exited 1 and fetched no pages.

- Site: https://scottjewett.com/
- Command: `node scripts/candidate-site-ingest.ts --site https://scottjewett.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-84076/passages.jsonl` (default `--pages` and `--browser`, no other flags)
- Start: 2026-09-27T12:50:05Z
- End: 2026-09-27T12:50:16Z
- Wall-clock: 11 s
- Exit code: 1

## Passages

- Passage count: 0. `passages.jsonl` was never created, so `wc -l` reports "No such file or directory".
- Distinct page URLs: none.

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines (verbatim from ingest.log)

```
  browser Error: https://scottjewett.com/robots.txt
  WARNING robots.txt unreadable (plain fetch got a bot challenge, HTTP 202; the browser could not clear it either) at https://scottjewett.com/robots.txt — its policy is unknown; proceeding with no rules.
  bot challenge (HTTP 202), retrying in the browser: https://scottjewett.com/
  browser Error: https://scottjewett.com/
Could not fetch the homepage — stopping.
```

The log has no Crawl-delay line. The only other lines are Node's `MODULE_TYPELESS_PACKAGE_JSON` warning, which is unrelated.

## About / bio / "Who I am" page

None. No page was fetched.

## Notes

- The site serves a bot challenge (HTTP 202) on both robots.txt and the homepage. The browser fallback failed on both with a bare "browser Error" and no further detail.
- The script's policy when robots.txt is unreadable is to proceed with no rules. That had no effect here, because the homepage fetch also failed and the script stopped.
- As instructed, there was no retry, no other flags, no other tool and no other fetch.
