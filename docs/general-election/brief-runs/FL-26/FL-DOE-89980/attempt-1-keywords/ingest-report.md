# Ingest report: FL-DOE-89980 (Nicole Locklin), FL-26-general

Site: https://locklinforcongress.com/

Command (from repo root, script defaults for `--pages` and `--browser`, no other flags; run by `../ingest-driver-2026-09-29.sh`):

```
mkdir -p docs/general-election/brief-runs/FL-26/FL-DOE-89980 && node scripts/candidate-site-ingest.ts --site https://locklinforcongress.com/ \
  --out docs/general-election/brief-runs/FL-26/FL-DOE-89980/passages.jsonl 2> docs/general-election/brief-runs/FL-26/FL-DOE-89980/ingest.log
```

## Run

| Field | Value |
|---|---|
| Start (UTC) | 2026-09-29T09:47:22Z |
| End (UTC) | 2026-09-29T09:47:34Z |
| Wall-clock | 12 s |
| Exit code | 0 |

Result: **SUCCESS**

## Output

- Passage count (`wc -l passages.jsonl`): **60** (4360 words)
- Distinct page URLs (`jq -r .url | sort -u`): **9**
- Crawl: 57 links on the homepage, 8 policy page(s) selected (cap 8) — **cap reached**
- About / bio page fetched (by URL): **no**

| URL | Passages |
|---|---|
| https://locklinforcongress.com/ | 2 |
| https://locklinforcongress.com/issues-affordability | 6 |
| https://locklinforcongress.com/issues-cuba | 7 |
| https://locklinforcongress.com/issues-epstein-files | 5 |
| https://locklinforcongress.com/issues-healthcare | 12 |
| https://locklinforcongress.com/issues-immigration | 6 |
| https://locklinforcongress.com/issues-iran-war | 8 |
| https://locklinforcongress.com/issues-palestine | 7 |
| https://locklinforcongress.com/issues-social-security | 7 |

## robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None: robots.txt was read directly and allowed the crawl with no Crawl-delay, no page was skipped, and no bot challenge, browser fallback or HTTP error occurred.

The Node `MODULE_TYPELESS_PACKAGE_JSON` warning in `ingest.log` is omitted here; it has no effect on the crawl.
