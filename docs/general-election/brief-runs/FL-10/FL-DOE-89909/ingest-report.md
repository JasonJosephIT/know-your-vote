# Ingest and policy run: FL-DOE-89909 (Maxwell Alejandro Frost), FL-10-general

Site: https://www.frostforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.frostforcongress.com/ --out docs/general-election/brief-runs/FL-10/FL-DOE-89909/passages.jsonl 2> docs/general-election/brief-runs/FL-10/FL-DOE-89909/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-10/FL-DOE-89909/passages.jsonl --json docs/general-election/brief-runs/FL-10/FL-DOE-89909/run.json > docs/general-election/brief-runs/FL-10/FL-DOE-89909/run-report.txt 2> docs/general-election/brief-runs/FL-10/FL-DOE-89909/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:41:49Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **12** (434 words) from 2 page(s); keyword crawl: 4 from 1 |
| Links | 36 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.frostforcongress.com/meet-maxwell (8 passage(s)) |

| Page | Passages |
|---|---|
| https://www.frostforcongress.com/ | 4 |
| https://www.frostforcongress.com/meet-maxwell (About) | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.18 | 0.07 |  | /organize | Organize |
| 0.13 | 0.91 | about | /meet-maxwell | Hear My Story |
| 0.11 | 0.07 |  | /democracysummer | Fellowships |
| 0.09 | 0.04 |  | /media | Media Center |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 12 of 12 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 1 |
| …and match a taxonomy issue | 1 |
| Tokens | 42266 in, 5496 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
