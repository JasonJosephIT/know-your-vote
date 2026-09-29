# Ingest and policy run: FL-DOE-89571 (Frank J. Russo), FL-GOV-general

Site: https://russo2026.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://russo2026.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89571/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:47:02Z → 2026-09-29T11:47:18Z (16 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **204** (4332 words) from 9 page(s); keyword crawl: 199 from 8 |
| Links | 62 on the homepage, 21 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 7 (cap 8) |
| About page | https://russo2026.com/en/rachel (5 passage(s)) |

| Page | Passages |
|---|---|
| https://russo2026.com/ | 26 |
| https://russo2026.com/en/priorities | 8 |
| https://russo2026.com/en/priorities/affordability | 13 |
| https://russo2026.com/en/priorities/children-teachers-trades | 34 |
| https://russo2026.com/en/priorities/florida-9-9 | 31 |
| https://russo2026.com/en/priorities/immigration | 42 |
| https://russo2026.com/en/priorities/innovation | 10 |
| https://russo2026.com/en/priorities/medical-freedom | 35 |
| https://russo2026.com/en/rachel (About) | 5 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.97 | 0.03 | policy | /en/priorities/children-teachers-trades | View Frank’s Children, Teachers & Trades Plan |
| 0.97 | 0.02 | policy | /en/priorities/immigration | View Frank’s Immigration Plan |
| 0.96 | 0.03 | policy | /en/priorities | Priorities |
| 0.96 | 0.02 | policy | /en/priorities/affordability | View Frank’s Affordability Plans |
| 0.95 | 0.03 | policy | /en/priorities/innovation | View Frank’s Innovation Plans |
| 0.93 | 0.03 | policy | /en/priorities/medical-freedom | View Frank’s Medical Freedom Initiative |
| 0.93 | 0.03 | policy | /en/priorities/florida-9-9 | View the Florida 9.9 Plan |
| 0.31 | 0.16 |  | /en/ticket | Meet the Ticket |
| 0.31 | 0.02 |  | /en/videos | Watch Campaign Videos |
| 0.29 | 0.59 | about | /en/rachel | Rachel |
| 0.28 | 0.12 |  | /es | ES |
| 0.28 | 0.43 |  | /en/frank | Frank |
| 0.23 | 0.04 |  | /en | EN |
| 0.17 | 0.02 |  | /en/news | News & Articles |
| 0.15 | 0.06 |  | /en/trail | Campaign Trail |
| 0.10 | 0.03 |  | /en/vote | Voter Information |
| 0.08 | 0.03 |  | /en/ambassador | Ambassador Program |
| 0.07 | 0.02 |  | /en/involved | Get Involved |
| 0.07 | 0.02 |  | /en/consent-disclosures | Consent Disclosures |
| 0.06 | 0.02 |  | /en/contribution-rules | Contribution Rules |
| 0.05 | 0.02 |  | /en/media | Media inquiries |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 204 of 204 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 77 |
| …and match a taxonomy issue | 47 |
| Tokens | 715242 in, 93432 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
