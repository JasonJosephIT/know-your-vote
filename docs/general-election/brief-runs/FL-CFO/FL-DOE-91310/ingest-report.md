# Ingest and policy run: FL-DOE-91310 (Annette Taddeo), FL-CFO-general

Site: https://annettetaddeo.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://annettetaddeo.com/ --out docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/passages.jsonl 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/passages.jsonl --json docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/run.json > docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/run-report.txt 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-91310/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:20Z → 2026-09-29T11:45:13Z (53 s) |
| Exit code | 1 |
| Result | **FAILURE: the browser rendered the page with almost no text** |
| Passages | **0** (0 words) from 0 page(s); keyword crawl: 10 from 2 |
| Links | 0 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://annettetaddeo.com/
  rendered, but only 23 characters of text: https://annettetaddeo.com/
No passages from https://annettetaddeo.com/. That is a finding about the fetch, not about the candidate: check whether the site renders its text client-side, or serves a bot challenge to non-browser clients.
```

## Step 2: policy run (Jev)

Not run: the ingest produced no passages.
