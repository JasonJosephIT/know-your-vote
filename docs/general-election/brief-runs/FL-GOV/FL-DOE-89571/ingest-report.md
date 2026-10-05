# Ingest report: FL-DOE-89571 (Frank J. Russo, FL-GOV-general)

Site: https://russo2026.com/
Command: `node scripts/candidate-site-ingest.ts --site https://russo2026.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/passages.jsonl` (default --pages and --browser, no other flags)

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-27T12:50:05Z |
| End (UTC) | 2026-09-27T12:50:23Z |
| Wall-clock | 18 s |
| Exit code | 0 |

## Output

- Passage count (`wc -l passages.jsonl`): **199**
- Distinct page URLs (`jq -r .url | sort -u`): **8**

| Passages in file | URL |
|---:|---|
| 26 | https://russo2026.com/ |
| 8 | https://russo2026.com/en/priorities |
| 13 | https://russo2026.com/en/priorities/affordability |
| 34 | https://russo2026.com/en/priorities/children-teachers-trades |
| 31 | https://russo2026.com/en/priorities/florida-9-9 |
| 42 | https://russo2026.com/en/priorities/immigration |
| 10 | https://russo2026.com/en/priorities/innovation |
| 35 | https://russo2026.com/en/priorities/medical-freedom |

Note: per-URL counts in passages.jsonl differ from the per-page counts printed in
ingest.log. The log lists 7 policy pages totalling 187 passages and has no line for
`https://russo2026.com/`; the file has 26 passages attributed to the home page,
8 (log: 19) for `/en/priorities` and 31 (log: 34) for `/en/priorities/florida-9-9`.
Both agree on the 199 total. Reported as observed; not investigated.

## robots.txt / Crawl-delay / bot-challenge / browser-fallback / unreachable lines

None. ingest.log contains no line matching robots, crawl, challenge, captcha,
browser, fallback, unreachable, error, fail or timeout. The complete log (15 lines)
is only a Node module-type warning plus these progress lines, verbatim:

```
site: https://russo2026.com/
  62 links, 7 policy page(s) selected (cap 8)
   19 passage(s)  https://russo2026.com/en/priorities
   13 passage(s)  https://russo2026.com/en/priorities/affordability
   34 passage(s)  https://russo2026.com/en/priorities/children-teachers-trades
   10 passage(s)  https://russo2026.com/en/priorities/innovation
   42 passage(s)  https://russo2026.com/en/priorities/immigration
   35 passage(s)  https://russo2026.com/en/priorities/medical-freedom
   34 passage(s)  https://russo2026.com/en/priorities/florida-9-9

199 passage(s) -> docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/passages.jsonl
```

## About / bio page

None, judging by URL only. Every fetched URL is the home page or under
`/en/priorities/`; no URL contains about, bio, meet, who-i-am or similar.
