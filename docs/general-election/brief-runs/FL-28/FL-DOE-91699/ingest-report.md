# Ingest and policy run: FL-DOE-91699 (Phil "Felipe" Ehr), FL-28-general

Site: https://ehrforcongress.us/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://ehrforcongress.us/ --out docs/general-election/brief-runs/FL-28/FL-DOE-91699/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-91699/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-28/FL-DOE-91699/passages.jsonl --json docs/general-election/brief-runs/FL-28/FL-DOE-91699/run.json > docs/general-election/brief-runs/FL-28/FL-DOE-91699/run-report.txt 2> docs/general-election/brief-runs/FL-28/FL-DOE-91699/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:08Z → 2026-09-29T11:43:14Z (6 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **17** (642 words) from 2 page(s); keyword crawl: 17 from 2 |
| Links | 56 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://ehrforcongress.us/meet-phil (5 passage(s)) |

| Page | Passages |
|---|---|
| https://ehrforcongress.us/ | 12 |
| https://ehrforcongress.us/meet-phil (About) | 5 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.14 | 0.71 | about | /meet-phil | Meet Phil |
| 0.13 | 0.02 |  | /fl-28-debates | FL-28 Debate Request: Two Public Debates in Miami-Dade and M |
| 0.11 | 0.03 |  | /voter-information | Voter Information |
| 0.08 | 0.04 |  | /press | Press |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 17 of 17 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 7 |
| …and match a taxonomy issue | 6 |
| Tokens | 59924 in, 7786 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
