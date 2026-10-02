# Ingest and policy run: FL-DOE-91278 (Brent Andersen), FL-20-general

Site: https://brentandersenfl.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://brentandersenfl.com/ --out docs/general-election/brief-runs/FL-20/FL-DOE-91278/passages.jsonl 2> docs/general-election/brief-runs/FL-20/FL-DOE-91278/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-20/FL-DOE-91278/passages.jsonl --json docs/general-election/brief-runs/FL-20/FL-DOE-91278/run.json > docs/general-election/brief-runs/FL-20/FL-DOE-91278/run-report.txt 2> docs/general-election/brief-runs/FL-20/FL-DOE-91278/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:30Z → 2026-09-29T11:42:43Z (13 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **11** (507 words) from 2 page(s); keyword crawl: 0 from 0 |
| Links | 52 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://brentandersenfl.com/meet-brent (8 passage(s)) |

| Page | Passages |
|---|---|
| https://brentandersenfl.com/ | 3 |
| https://brentandersenfl.com/meet-brent (About) | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.37 | 0.02 |  | /andersen-calls-on-white-house-to-grant-deferred-enforced-departure-for-venezuelan-families-in-broward-as-october-2-deadline-approaches | ANDERSEN CALLS ON WHITE HOUSE TO GRANT DEFERRED ENFORCED DEP |
| 0.25 | 0.08 |  | /conservative-businessman-brent-andersen-launches-campaign-for-congress-in-floridas-20th-district | Conservative Businessman Brent Andersen Launches Campaign fo |
| 0.14 | 0.65 | about | /meet-brent | Meet Brent |
| 0.11 | 0.03 |  | /news | News |
| 0.10 | 0.03 |  | /brent-andersen-declares-victory-in-floridas-20th | BRENT ANDERSEN DECLARES VICTORY IN FLORIDA’S 20TH |
| 0.09 | 0.02 |  | /sun-sentinel-endorses-brent-andersen-in-fl-20-gop-primary-for-congress | SUN SENTINEL ENDORSES BRENT ANDERSEN IN FL-20 GOP PRIMARY FO |
| 0.08 | 0.03 |  | /representative-chip-lamarca-endorses-brent-andersen-for-congress | REPRESENTATIVE CHIP LAMARCA ENDORSES BRENT ANDERSEN FOR CONG |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://brentandersenfl.com/
  bot challenge (HTTP 202), retrying in the browser: https://brentandersenfl.com/meet-brent
  2 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 11 of 11 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 1 |
| …and match a taxonomy issue | 1 |
| Tokens | 38855 in, 5038 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
