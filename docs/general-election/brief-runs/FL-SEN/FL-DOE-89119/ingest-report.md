# Ingest and policy run: FL-DOE-89119 (Ashley Moody), FL-SEN-general

Site: https://ashleymoody.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://ashleymoody.com/ --out docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/passages.jsonl 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/passages.jsonl --json docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/run.json > docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/run-report.txt 2> docs/general-election/brief-runs/FL-SEN/FL-DOE-89119/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:13Z → 2026-09-29T11:46:36Z (23 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **12** (466 words) from 2 page(s); keyword crawl: 4 from 1 |
| Links | 37 on the homepage, 12 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://ashleymoody.com/about (8 passage(s)) |

| Page | Passages |
|---|---|
| https://ashleymoody.com/ | 4 |
| https://ashleymoody.com/about (About) | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.30 | 0.05 |  | /page/2 | 2 |
| 0.23 | 0.05 |  | /page/4 | 4 |
| 0.22 | 0.05 |  | /page/3 | 3 |
| 0.22 | 0.05 |  | /page/10 | 10 |
| 0.21 | 0.05 |  | /page/5 | 5 |
| 0.21 | 0.02 |  | /page/18 | Last &raquo; |
| 0.17 | 0.02 |  | /category/press-release | Press Release |
| 0.16 | 0.91 | about | /about | About |
| 0.12 | 0.03 |  | /sen-ashley-moody-deploys-leaders-in-all-67-counties-for-statewide-push-ahead-of-election-day | SEN. ASHLEY MOODY DEPLOYS LEADERS IN ALL 67 COUNTIES FOR STA |
| 0.10 | 0.02 |  | /news | News |
| 0.09 | 0.02 |  | /icymi-former-nicaraguan-political-prisoner-pens-op-ed-supporting-sen-ashley-moody-against-socialist-angie-nixon | ICYMI … FORMER NICARAGUAN POLITICAL PRISONER PENS OP-ED SUPP |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 12 of 12 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 0 |
| Tokens | 42312 in, 5496 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
