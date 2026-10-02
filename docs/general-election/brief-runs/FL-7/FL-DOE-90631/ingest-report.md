# Ingest and policy run: FL-DOE-90631 (Bale Dalton), FL-7-general

Site: https://baledalton.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://baledalton.com/ --out docs/general-election/brief-runs/FL-7/FL-DOE-90631/passages.jsonl 2> docs/general-election/brief-runs/FL-7/FL-DOE-90631/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-7/FL-DOE-90631/passages.jsonl --json docs/general-election/brief-runs/FL-7/FL-DOE-90631/run.json > docs/general-election/brief-runs/FL-7/FL-DOE-90631/run-report.txt 2> docs/general-election/brief-runs/FL-7/FL-DOE-90631/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:14Z → 2026-09-29T11:43:27Z (13 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **44** (2897 words) from 3 page(s); keyword crawl: 37 from 2 |
| Links | 51 on the homepage, 10 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 2 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://baledalton.com/ | 6 |
| https://baledalton.com/bale-dalton-calls-for-an-end-to-the-iran-war-on-the-six-month-anniversary-of-the-conflict | 7 |
| https://baledalton.com/priorities | 31 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.03 | policy | /priorities | Priorities |
| 0.54 | 0.02 | policy | /bale-dalton-calls-for-an-end-to-the-iran-war-on-the-six-month-anniversary-of-the-conflict | Bale Dalton Calls for an End to the Iran War On the Six-Mont |
| 0.40 | 0.03 |  | /bale-dalton-calls-for-prison-time-for-corrupt-politicians-who-stole-from-floridians | Bale Dalton Calls for Prison Time for Corrupt Politicians Wh |
| 0.10 | 0.02 |  | /news | The Latest |
| 0.10 | 0.02 |  | /as-casualties-in-the-iran-war-climb-and-costs-rise-tv-anchor-ryan-elijah-quips-there-is-a-cost-of-freedom | As Casualties In The Iran War Climb, And Costs Rise, TV Anch |
| 0.09 | 0.03 |  | /florida-congresswoman-lois-frankel-endorses-bale-dalton-in-campaign-to-unseat-rep-cory-mills | Florida Congresswoman Lois Frankel Endorses Bale Dalton in C |
| 0.08 | 0.05 |  | /media | Media |
| 0.06 | 0.04 |  | /former-tv-anchor-ryan-elijah-gets-stage-fright-dodges-debates-and-wont-answer-to-voter | Former TV Anchor Ryan Elijah Gets Stage Fright: Dodges Debat |
| 0.06 | 0.02 |  | /nate-silver-rates-bale-daltons-race-against-cory-mills-a-toss-up-and-second-most-competitive-house-race-in-the-country | Nate Silver Rates Bale Dalton’s Race Against Cory Mills A “T |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://baledalton.com/
  only 73 characters of text, rendering in the browser: https://baledalton.com/priorities
  only 73 characters of text, rendering in the browser: https://baledalton.com/bale-dalton-calls-for-an-end-to-the-iran-war-on-the-six-month-anniversary-of-the-conflict
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 44 of 44 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 18 |
| …and match a taxonomy issue | 9 |
| Tokens | 156587 in, 20152 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
