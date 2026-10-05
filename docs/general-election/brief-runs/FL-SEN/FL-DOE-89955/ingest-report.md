# Ingest and policy run: FL-DOE-89955 (Neil J. Gillespie), FL-SEN-general

Site: https://neilgillespie4senate.blogspot.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://neilgillespie4senate.blogspot.com/ --out docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/passages.jsonl --json docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/run.json > docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/run-report.txt 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89955/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:15Z → 2026-09-29T11:46:19Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **80** (3528 words) from 1 page(s); keyword crawl: 80 from 1 |
| Links | 324 on the homepage, 8 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://neilgillespie4senate.blogspot.com/ | 80 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.62 | 0.02 | policy | /2026/03/separation-of-powers.html | Separation of Powers |
| 0.48 | 0.23 |  | /2026/08/neil-j-gillespie-for-us-senate.html | Neil J Gillespie for U.S. Senate |
| 0.24 | 0.05 |  | /2026/07/press-release-no-party-neil-us-senate.html | PRESS RELEASE No Party Neil U.S. Senate Florida |
| 0.13 | 0.02 |  | /2026/07/notice-to-florida-bar-anti.html | Notice to The Florida Bar: Anti-Weaponization Fund Federal L |
| 0.12 | 0.03 |  | /2026/03 | March 2026 |
| 0.11 | 0.03 |  | /2026/07 | July 2026 |
| 0.10 | 0.03 |  | /2026/08 | August 2026 |
| 0.06 | 0.02 |  | /2026/07/exclusive-plaintiff-has-filed-160.html | email is forwarded below |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 80 of 80 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 283037 in, 36640 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
