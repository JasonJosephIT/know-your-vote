# Ingest and policy run: FL-VF-DAD-3076 (Linda Cothiere), FL-DAD-SB1-general

Site: https://lindaforschoolboard.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://lindaforschoolboard.com/ --out docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/passages.jsonl --json docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/run.json > docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/run-report.txt 2> docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3076/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:30Z → 2026-09-29T11:44:35Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **122** (3311 words) from 3 page(s); keyword crawl: 82 from 2 |
| Links | 41 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://lindaforschoolboard.com/meet-linda (8 passage(s)) |

| Page | Passages |
|---|---|
| https://lindaforschoolboard.com/ | 53 |
| https://lindaforschoolboard.com/es | 61 |
| https://lindaforschoolboard.com/meet-linda (About) | 8 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.50 | 0.08 | policy | /es | ¿Habla español? Vea esta página en español &rarr; |
| 0.36 | 0.03 |  | /compare-district-1-candidates | Compare the Candidates |
| 0.20 | 0.06 |  | /the-vote | The Vote |
| 0.19 | 0.58 | about | /meet-linda | Watch: Meet Linda Play video &rarr; |
| 0.10 | 0.02 |  | /vote | Voting |
| 0.09 | 0.05 |  | /watch | Film |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 122 of 122 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 29 |
| …and match a taxonomy issue | 12 |
| Tokens | 428674 in, 55876 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
