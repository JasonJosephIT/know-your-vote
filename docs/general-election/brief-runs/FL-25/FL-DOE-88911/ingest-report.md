# Ingest and policy run: FL-DOE-88911 (Jared Moskowitz), FL-25-general

Site: https://jaredforflorida.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://jaredforflorida.com/ --out docs/general-election/brief-runs/FL-25/FL-DOE-88911/passages.jsonl 2> docs/general-election/brief-runs/FL-25/FL-DOE-88911/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-25/FL-DOE-88911/passages.jsonl --json docs/general-election/brief-runs/FL-25/FL-DOE-88911/run.json > docs/general-election/brief-runs/FL-25/FL-DOE-88911/run-report.txt 2> docs/general-election/brief-runs/FL-25/FL-DOE-88911/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:40Z → 2026-09-29T11:43:34Z (54 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **25** (931 words) from 2 page(s); keyword crawl: 32 from 3 |
| Links | 90 on the homepage, 12 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://jaredforflorida.com/about (9 passage(s)) |

| Page | Passages |
|---|---|
| https://jaredforflorida.com/ | 16 |
| https://jaredforflorida.com/about (About) | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /priorities | Priorities |
| 0.39 | 0.03 |  | /updates/ive-seen-whats-possible-jared-moskowitzs-first-general | September 8, 2026 ‘I’ve seen what’s possible’: Jared Moskowi |
| 0.37 | 0.06 |  | /es | Español |
| 0.25 | 0.03 |  | /updates/democrat-asks-whether-partys-big-tent-includes-pro-israel | September 2, 2026 Democrat Asks Whether Party’s Big Tent Inc |
| 0.24 | 0.11 |  | /updates/moskowitz-leans-into-work-combating-antisemitism-as-he | September 14, 2026 Moskowitz leans into work combating antis |
| 0.15 | 0.04 |  | /updates | Updates |
| 0.15 | 0.05 |  | /updates/jared-moskowitz-named-ranking-democrat-on-house-middle-east | August 25, 2026 Jared Moskowitz named Ranking Democrat on Ho |
| 0.13 | 0.02 |  | /vote | Vote |
| 0.13 | 0.02 |  | /updates/rep-jared-moskowitz-pro-israel-democrats-are-being | September 8, 2026 Rep. Jared Moskowitz: Pro-Israel Democrats |
| 0.12 | 0.92 | about | /about | Meet Jared |
| 0.11 | 0.02 |  | /updates/jared-moskowitz-discusses-primary-win-democratic-party | August 30, 2026 Jared Moskowitz discusses primary win, Democ |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/priorities
  bot challenge (HTTP 202), retrying in the browser: https://jaredforflorida.com/about
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 25 of 25 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 4 |
| Tokens | 88102 in, 11450 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
