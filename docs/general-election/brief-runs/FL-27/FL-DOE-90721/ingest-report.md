# Ingest and policy run: FL-DOE-90721 (Maria Elvira Salazar), FL-27-general

Site: https://mariaelvirasalazar.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://mariaelvirasalazar.com/ --out docs/general-election/brief-runs/FL-27/FL-DOE-90721/passages.jsonl 2> docs/general-election/brief-runs/FL-27/FL-DOE-90721/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-27/FL-DOE-90721/passages.jsonl --json docs/general-election/brief-runs/FL-27/FL-DOE-90721/run.json > docs/general-election/brief-runs/FL-27/FL-DOE-90721/run-report.txt 2> docs/general-election/brief-runs/FL-27/FL-DOE-90721/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:00Z → 2026-09-29T11:44:37Z (97 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **104** (3773 words) from 9 page(s); keyword crawl: 96 from 9 |
| Links | 81 on the homepage, 14 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 7 (cap 8) |
| About page | https://mariaelvirasalazar.com/bio (10 passage(s)) |

| Page | Passages |
|---|---|
| https://mariaelvirasalazar.com/ | 4 |
| https://mariaelvirasalazar.com/bio (About) | 10 |
| https://mariaelvirasalazar.com/issues | 11 |
| https://mariaelvirasalazar.com/issues/economy | 11 |
| https://mariaelvirasalazar.com/issues/environment | 15 |
| https://mariaelvirasalazar.com/issues/fight_socialism | 10 |
| https://mariaelvirasalazar.com/issues/healthcare | 11 |
| https://mariaelvirasalazar.com/issues/infrastructure | 20 |
| https://mariaelvirasalazar.com/issues/public_safety | 12 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.92 | 0.02 | policy | /issues/environment | Protecting the Environment and our Natural Resources |
| 0.90 | 0.02 | policy | /issues/public_safety | Public Safety |
| 0.89 | 0.02 | policy | /issues/economy | Small Business and the Economy |
| 0.89 | 0.03 | policy | /issues/healthcare | Healthcare |
| 0.76 | 0.02 | policy | /issues/infrastructure | Infrastructure |
| 0.72 | 0.02 | policy | /issues/fight_socialism | Fighting Socialism |
| 0.66 | 0.03 | policy | /issues | Issues |
| 0.49 | 0.06 |  | /es | En Español |
| 0.13 | 0.02 |  | /mail | Vote-by-Mail |
| 0.11 | 0.92 | about | /bio | Bio |
| 0.11 | 0.03 |  | /news | News |
| 0.09 | 0.02 |  | /election_day | Voting on Election Day |
| 0.07 | 0.02 |  | /earlyvoting | Early Voting |
| 0.03 | 0.02 |  | /fl27-volunteer | Become a Volunteer |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 104 of 104 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 23 |
| …and match a taxonomy issue | 9 |
| Tokens | 367187 in, 47632 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
