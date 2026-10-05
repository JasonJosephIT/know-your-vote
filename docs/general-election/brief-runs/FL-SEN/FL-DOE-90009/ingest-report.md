# Ingest and policy run: FL-DOE-90009 (Angie Nixon), FL-SEN-general

Site: https://angienixon.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://angienixon.com/ --out docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/passages.jsonl --json docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/run.json > docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/run-report.txt 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-90009/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:18Z → 2026-09-29T11:46:31Z (13 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **133** (4136 words) from 3 page(s); keyword crawl: 162 from 5 |
| Links | 135 on the homepage, 13 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://angienixon.com/meet-angie (4 passage(s)) |

| Page | Passages |
|---|---|
| https://angienixon.com/ | 18 |
| https://angienixon.com/meet-angie (About) | 4 |
| https://angienixon.com/priorities | 111 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.03 | policy | /priorities | See All Priorities |
| 0.44 | 0.02 |  | /angie-nixon-condemns-ashley-moodys-hypocrisy-on-immigration-and-blind-support-for-trumps-mass-deportations | September 25, 2026 U.S. Senate Nominee Angie Nixon Condemns  |
| 0.31 | 0.02 |  | /rep-angie-nixon-condemns-trump-administration-decision-to-kick-750000-americans-off-health-insurance | September 26, 2026 Rep. Angie Nixon Condemns Trump Administr |
| 0.21 | 0.86 | about | /meet-angie | Meet Angie Nixon |
| 0.17 | 0.02 |  | /rep-angie-nixon-statement-on-nine-year-anniversary-of-hurricane-maria | September 20, 2026 Rep. Angie Nixon Statement on Nine-Year A |
| 0.16 | 0.03 |  | /u-s-senate-candidate-angie-nixon-reflects-on-the-25th-anniversary-of-9-11 | September 11, 2026 U.S. Senate Candidate Angie Nixon Reflect |
| 0.11 | 0.04 |  | /the-latest | The Latest |
| 0.10 | 0.02 |  | /printable-materials | Printable Materials |
| 0.09 | 0.03 |  | /leaders-we-deserve-endorses-angie-nixon-for-u-s-senate | September 10, 2026 Leaders We Deserve Endorses Angie Nixon f |
| 0.08 | 0.02 |  | /ashley-moody-refuses-to-debate-u-s-senate-candidate-angie-nixon-responds | September 9, 2026 Ashley Moody Refuses to Debate; U.S. Senat |
| 0.07 | 0.03 |  | /invite-angie | Invite Angie |
| 0.05 | 0.02 |  | /vote | CHECK YOUR REGISTRATION |
| 0.04 | 0.02 |  | /endorsements | See All Endorsements ⟶ |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 73 characters of text, rendering in the browser: https://angienixon.com/
  only 73 characters of text, rendering in the browser: https://angienixon.com/priorities
  only 73 characters of text, rendering in the browser: https://angienixon.com/meet-angie
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 133 of 133 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 102 |
| …and match a taxonomy issue | 50 |
| Tokens | 467605 in, 60914 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
