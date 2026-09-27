# Ingest report: FL-DOE-89243 (David Jolly, FL-GOV-general)

- Site: https://davidjolly.com/
- Command: `node scripts/candidate-site-ingest.ts --site https://davidjolly.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/ingest.log` (default --pages and --browser)
- Start: 2026-09-27T12:35:23Z
- End: 2026-09-27T12:37:03Z
- Wall-clock: 100 s
- Exit code: 0
- Result: SUCCESS

## Passages

- Passage count (`wc -l passages.jsonl`): 215
- Distinct page URLs: 9

1. https://davidjolly.com/
2. https://davidjolly.com/environment
3. https://davidjolly.com/homeowners-insurance
4. https://davidjolly.com/issues
5. https://davidjolly.com/issues/affordability
6. https://davidjolly.com/issues/data-centers
7. https://davidjolly.com/issues/health-care
8. https://davidjolly.com/issues/public-education
9. https://davidjolly.com/issues/republicans-for-jolly

Per-page counts from the log sum to 189 across the 8 policy pages; the remaining 26 passages
carry the homepage URL (the log has no per-page line for the homepage).

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

No robots.txt disallow, bot-challenge, browser-fallback or unreachable lines appear in ingest.log.
Other log context: `85 links, 8 policy page(s) selected (cap 8)` (the page cap was reached).

## About / bio page (by URL only)

None. No fetched URL looks like an About / bio / "Who I am" page. The closest is
`/issues/republicans-for-jolly`, which by URL is an endorsement/coalition page, not a bio.
