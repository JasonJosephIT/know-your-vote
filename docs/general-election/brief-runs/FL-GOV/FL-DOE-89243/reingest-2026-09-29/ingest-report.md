# Ingest and policy run: FL-DOE-89243 (David Jolly), FL-GOV-general

Site: https://davidjolly.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://davidjolly.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-89243/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:53Z → 2026-09-29T11:48:41Z (108 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **190** (7192 words) from 10 page(s); keyword crawl: 215 from 9 |
| Links | 85 on the homepage, 27 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 8 (cap 8) |
| About page | https://davidjolly.com/about (10 passage(s)) |

| Page | Passages |
|---|---|
| https://davidjolly.com/ | 24 |
| https://davidjolly.com/about (About) | 10 |
| https://davidjolly.com/ending-the-culture-wars | 17 |
| https://davidjolly.com/homeowners-insurance | 28 |
| https://davidjolly.com/issues | 20 |
| https://davidjolly.com/issues/affordability | 18 |
| https://davidjolly.com/issues/health-care | 22 |
| https://davidjolly.com/issues/public-education | 19 |
| https://davidjolly.com/jolly-insurance-proposal-facts | 10 |
| https://davidjolly.com/where-david-stands | 22 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.02 | policy | /homeowners-insurance | The Insurance Crisis Floridians pay the highest home insuran |
| 0.91 | 0.02 | policy | /issues/affordability | Housing |
| 0.90 | 0.03 | policy | /issues/health-care | Healthcare |
| 0.89 | 0.03 | policy | /issues/public-education | Education |
| 0.63 | 0.03 | policy | /ending-the-culture-wars | Ending the Culture Wars We can't move forward together if we |
| 0.58 | 0.03 | policy | /issues | Issues |
| 0.56 | 0.03 | policy | /jolly-insurance-proposal-facts | September 17, 2026 Jolly Insurance Proposal Facts Read more  |
| 0.51 | 0.32 | policy | /where-david-stands | Where David Stands |
| 0.49 | 0.09 |  | /a-florida-for-everyone | A Florida for Everyone The people who make this state strong |
| 0.49 | 0.05 |  | /environment | The Reality We Can't Ignore You can see it. You can feel it. |
| 0.41 | 0.02 |  | /issues/data-centers | No data centers |
| 0.31 | 0.22 |  | /ht | HT |
| 0.29 | 0.14 |  | /es | ES |
| 0.28 | 0.04 |  | /florida-governor-race-2026 | The 2026 Race |
| 0.21 | 0.14 |  | /from-the-trail | From the Trail |
| 0.19 | 0.08 |  | /issues/republicans-for-jolly | Republicans for Jolly |
| 0.16 | 0.60 |  | /meet-gwen | Meet Gwen |
| 0.15 | 0.96 | about | /about | About David Jolly |
| 0.15 | 0.04 |  | /video | Video |
| 0.14 | 0.93 |  | /about-david | Meet David |
| 0.14 | 0.94 |  | /about-gwen | Get to know Gwen &rarr; |
| 0.13 | 0.02 |  | /commentary | More news &rarr; |
| 0.09 | 0.02 |  | /florida-governor-s-race-is-officially-a-toss-up | September 24, 2026 Florida Governor’s Race is Officially a T |
| 0.08 | 0.05 |  | /media | Media |
| 0.07 | 0.03 |  | /get-involved | Get Involved |
| 0.07 | 0.02 |  | /inside-elections-shifts-florida-governor-s-race-even-further-in-david-jolly-s-di | September 18, 2026 Inside Elections Shifts Florida Governor’ |
| 0.06 | 0.02 |  | /sabato-s-crystal-ball-shifts-governor-s-race-in-david-jolly-s-direction-now-rate | September 23, 2026 Sabato’s Crystal Ball Shifts Governor’s R |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 190 of 190 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 56 |
| …and match a taxonomy issue | 42 |
| Tokens | 670343 in, 87020 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
