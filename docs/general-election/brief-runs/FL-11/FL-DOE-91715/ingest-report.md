# Ingest and policy run: FL-DOE-91715 (James Pericola), FL-11-general

Site: https://jamespericola.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://jamespericola.com/ --out docs/general-election/brief-runs/FL-11/FL-DOE-91715/passages.jsonl 2> docs/general-election/brief-runs/FL-11/FL-DOE-91715/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-11/FL-DOE-91715/passages.jsonl --json docs/general-election/brief-runs/FL-11/FL-DOE-91715/run.json > docs/general-election/brief-runs/FL-11/FL-DOE-91715/run-report.txt 2> docs/general-election/brief-runs/FL-11/FL-DOE-91715/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:42:11Z (26 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **18** (495 words) from 1 page(s); keyword crawl: 18 from 1 |
| Links | 42 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://jamespericola.com/ | 18 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.27 | 0.12 |  | /es | ES |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  honoring Crawl-delay: 10s
  bot challenge (HTTP 202), retrying in the browser: https://jamespericola.com/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 18 of 18 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 5 |
| …and match a taxonomy issue | 4 |
| Tokens | 63097 in, 8244 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
