# Ingest and policy run: FL-DOE-90831 (Jennifer Jenkins), FL-8-general

Site: https://jenkinsforfl.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://jenkinsforfl.com/ --out docs/general-election/brief-runs/FL-8/FL-DOE-90831/passages.jsonl 2> docs/general-election/brief-runs/FL-8/FL-DOE-90831/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-8/FL-DOE-90831/passages.jsonl --json docs/general-election/brief-runs/FL-8/FL-DOE-90831/run.json > docs/general-election/brief-runs/FL-8/FL-DOE-90831/run-report.txt 2> docs/general-election/brief-runs/FL-8/FL-DOE-90831/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:33Z → 2026-09-29T11:43:54Z (21 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **30** (735 words) from 3 page(s); keyword crawl: 25 from 2 |
| Links | 109 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://jenkinsforfl.com/about (5 passage(s)) |

| Page | Passages |
|---|---|
| https://jenkinsforfl.com/ | 9 |
| https://jenkinsforfl.com/about (About) | 5 |
| https://jenkinsforfl.com/priorities | 16 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /priorities | Priorities |
| 0.13 | 0.92 | about | /about | Meet Jennifer |
| 0.13 | 0.78 |  | /es | Conozca al Jennifer |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://jenkinsforfl.com/
  bot challenge (HTTP 202), retrying in the browser: https://jenkinsforfl.com/priorities
  bot challenge (HTTP 202), retrying in the browser: https://jenkinsforfl.com/about
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 30 of 30 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 13 |
| …and match a taxonomy issue | 9 |
| Tokens | 105136 in, 13740 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
