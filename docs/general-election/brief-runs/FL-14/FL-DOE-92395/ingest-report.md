# Ingest and policy run: FL-DOE-92395 (Brian Lambert), FL-14-general

Site: https://www.brianlambertforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.brianlambertforcongress.com/ --out docs/general-election/brief-runs/FL-14/FL-DOE-92395/passages.jsonl 2> docs/general-election/brief-runs/FL-14/FL-DOE-92395/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-14/FL-DOE-92395/passages.jsonl --json docs/general-election/brief-runs/FL-14/FL-DOE-92395/run.json > docs/general-election/brief-runs/FL-14/FL-DOE-92395/run-report.txt 2> docs/general-election/brief-runs/FL-14/FL-DOE-92395/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:00Z → 2026-09-29T11:42:12Z (12 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **171** (3270 words) from 9 page(s); keyword crawl: 139 from 7 |
| Links | 30 on the homepage, 10 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 7 (cap 8) |
| About page | https://www.brianlambertforcongress.com/about-brian (5 passage(s)) |

| Page | Passages |
|---|---|
| https://www.brianlambertforcongress.com/ | 33 |
| https://www.brianlambertforcongress.com/about-brian (About) | 5 |
| https://www.brianlambertforcongress.com/issues | 13 |
| https://www.brianlambertforcongress.com/issues/constitutional-government | 13 |
| https://www.brianlambertforcongress.com/issues/election-integrity | 19 |
| https://www.brianlambertforcongress.com/issues/fiscal-responsibility | 22 |
| https://www.brianlambertforcongress.com/issues/individual-liberty | 15 |
| https://www.brianlambertforcongress.com/issues/veterans | 24 |
| https://www.brianlambertforcongress.com/why-libertarian | 27 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.96 | 0.02 | policy | /issues/fiscal-responsibility | Read Brian's Fiscal Responsibility Plan → |
| 0.96 | 0.03 | policy | /issues/veterans | Veterans Veterans earned their benefits through service and  |
| 0.95 | 0.03 | policy | /issues/election-integrity | Read Brian's Election Integrity Position → |
| 0.94 | 0.03 | policy | /issues/constitutional-government | Constitutional Government Government must operate within its |
| 0.92 | 0.04 | policy | /issues/individual-liberty | See Brian's Individual Liberty Position → |
| 0.64 | 0.03 | policy | /issues | Issues |
| 0.61 | 0.06 | policy | /why-libertarian | Why Libertarian |
| 0.38 | 0.27 |  | /why-im-running | Read Why I'm Running → |
| 0.15 | 0.04 |  | /updates | Updates |
| 0.14 | 0.93 | about | /about-brian | About Brian |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 171 of 171 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 51 |
| …and match a taxonomy issue | 12 |
| Tokens | 598004 in, 78318 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
