# Ingest and policy run: FL-DOE-89339 (Darren Soto), FL-9-general

Site: https://www.darrensoto.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.darrensoto.com/ --out docs/general-election/brief-runs/FL-9/FL-DOE-89339/passages.jsonl 2> docs/general-election/brief-runs/FL-9/FL-DOE-89339/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-9/FL-DOE-89339/passages.jsonl --json docs/general-election/brief-runs/FL-9/FL-DOE-89339/run.json > docs/general-election/brief-runs/FL-9/FL-DOE-89339/run-report.txt 2> docs/general-election/brief-runs/FL-9/FL-DOE-89339/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:34Z → 2026-09-29T11:43:38Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **15** (566 words) from 1 page(s); keyword crawl: 19 from 2 |
| Links | 64 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.darrensoto.com/ | 15 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.59 | 0.03 | policy | /issues | Issues |
| 0.47 | 0.10 |  | /spanish | En Español |
| 0.14 | 0.03 |  | /support | Organizational Support |
| 0.11 | 0.03 |  | /new-map | New FL-9 District Map |
| 0.08 | 0.02 |  | /vote | Voting Information |
| 0.08 | 0.05 |  | /media | Media |
| 0.04 | 0.02 |  | /volunteer-1 | Phone Banking |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 15 of 15 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 7 |
| …and match a taxonomy issue | 4 |
| Tokens | 52823 in, 6870 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
