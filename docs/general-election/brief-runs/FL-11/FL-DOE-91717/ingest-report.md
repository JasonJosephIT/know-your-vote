# Ingest and policy run: FL-DOE-91717 (Joe Strada), FL-11-general

Site: https://votestrada.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://votestrada.com/ --out docs/general-election/brief-runs/FL-11/FL-DOE-91717/passages.jsonl 2> docs/general-election/brief-runs/FL-11/FL-DOE-91717/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-11/FL-DOE-91717/passages.jsonl --json docs/general-election/brief-runs/FL-11/FL-DOE-91717/run.json > docs/general-election/brief-runs/FL-11/FL-DOE-91717/run-report.txt 2> docs/general-election/brief-runs/FL-11/FL-DOE-91717/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:41:50Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **30** (953 words) from 3 page(s); keyword crawl: 16 from 2 |
| Links | 37 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://votestrada.com/meet-joe (14 passage(s)) |

| Page | Passages |
|---|---|
| https://votestrada.com/ | 12 |
| https://votestrada.com/meet-joe (About) | 14 |
| https://votestrada.com/priorities | 4 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.03 | policy | /priorities | Priorities |
| 0.13 | 0.86 | about | /meet-joe | About Joe |
| 0.05 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 30 of 30 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 0 |
| Tokens | 105438 in, 13740 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
