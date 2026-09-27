# Ingest report: FL-DOE-90630 (Charles Burkett, FL-GOV-general)

- Site: https://burkettforgov.com/
- Start: 2026-09-27T12:50:05Z
- End: 2026-09-27T12:50:11Z
- Wall-clock: 6 seconds
- Exit code: 0
- Command: `node scripts/candidate-site-ingest.ts --site https://burkettforgov.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/passages.jsonl` (default --pages and --browser)

## Output

- Passages: 189 (`wc -l passages.jsonl`)
- Distinct page URLs: 1
  - https://burkettforgov.com/

## Robots / Crawl-delay / bot-challenge / browser-fallback / unreachable lines

None. ingest.log contains no line of any of these kinds. Its non-warning lines, verbatim:

```
site: https://burkettforgov.com/
  47 links, 0 policy page(s) selected (cap 8)

189 passage(s) -> docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/passages.jsonl
```

(The rest of the log is a Node MODULE_TYPELESS_PACKAGE_JSON warning about scripts/candidate-site-ingest.ts.)

## About / bio page

No. The only fetched URL is the homepage. No About / bio / "Who I am" URL was fetched. The script found 47 links but selected 0 policy pages.
