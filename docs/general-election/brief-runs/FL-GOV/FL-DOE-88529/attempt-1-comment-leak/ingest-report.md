# Ingest report: FL-DOE-88529 (Moliere "Moe" Dimanche), FL-GOV-general

Site: https://nomoecorruption.com/

## Run

- Start: 2026-09-27T12:50:05Z
- End: 2026-09-27T12:50:13Z
- Wall-clock: 9 s (epoch 1790513405 to 1790513414)
- Exit code: 0
- Command: `node scripts/candidate-site-ingest.ts --site https://nomoecorruption.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/passages.jsonl` (default --pages and --browser, no other flags)

## Output

- Passages (`wc -l passages.jsonl`): 19
- Distinct page URLs: 2
  - https://nomoecorruption.com/ (12 passages)
  - https://nomoecorruption.com/2026/07/09/byron-donalds-gets-sued-for-assault-but-fishbacks-racist-response-is-worse-why-voting-npa-is-the-best-option-for-governor-of-florida (7 passages)

Log summary (verbatim): `94 links, 1 policy page(s) selected (cap 8)`

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines

None. `ingest.log` contains no line matching robots, Crawl-delay, challenge, captcha, browser, fallback or unreachable. The only other log content is Node's `[MODULE_TYPELESS_PACKAGE_JSON]` warning about the script being reparsed as an ES module.

## About / bio / "Who I am" page

No. Judging by URL alone, neither fetched page is an About, bio or "Who I am" page. One is the homepage and the other is a dated blog post (2026/07/09). The crawler selected 1 policy page out of 94 links, and it was that blog post.
