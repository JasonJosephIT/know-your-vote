# Ingest and policy run: FL-DOE-89522 (Mike Haridopolos), FL-8-general

Site: https://www.mike4congress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.mike4congress.com/ --out docs/general-election/brief-runs/FL-8/FL-DOE-89522/passages.jsonl 2> docs/general-election/brief-runs/FL-8/FL-DOE-89522/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-8/FL-DOE-89522/passages.jsonl --json docs/general-election/brief-runs/FL-8/FL-DOE-89522/run.json > docs/general-election/brief-runs/FL-8/FL-DOE-89522/run-report.txt 2> docs/general-election/brief-runs/FL-8/FL-DOE-89522/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:28Z → 2026-09-29T11:43:33Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **39** (1775 words) from 3 page(s); keyword crawl: 34 from 2 |
| Links | 18 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.mike4congress.com/about (5 passage(s)) |

| Page | Passages |
|---|---|
| https://www.mike4congress.com/ | 16 |
| https://www.mike4congress.com/about (About) | 5 |
| https://www.mike4congress.com/issues | 18 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.63 | 0.02 | policy | /issues | Issues |
| 0.17 | 0.91 | about | /about | About |
| 0.08 | 0.02 |  | /recipes | News |
| 0.08 | 0.05 |  | /media | Media |
| 0.07 | 0.04 |  | /join-the-team | Join the Team |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 39 of 39 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 18 |
| …and match a taxonomy issue | 11 |
| Tokens | 137565 in, 17862 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
