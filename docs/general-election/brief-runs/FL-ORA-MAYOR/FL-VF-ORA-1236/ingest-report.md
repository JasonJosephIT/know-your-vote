# Ingest and policy run: FL-VF-ORA-1236 (Tiffany Moore Russell), FL-ORA-MAYOR-general

Site: https://tiffanyformayor.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://tiffanyformayor.com/ --out docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/run.json > docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1236/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:53Z → 2026-09-29T11:46:38Z (45 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **23** (609 words) from 3 page(s); keyword crawl: 11 from 2 |
| Links | 83 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://tiffanyformayor.com/about (12 passage(s)) |

| Page | Passages |
|---|---|
| https://tiffanyformayor.com/ | 5 |
| https://tiffanyformayor.com/about (About) | 12 |
| https://tiffanyformayor.com/issues | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.96 | 0.03 | policy | /issues | On the Issues |
| 0.23 | 0.11 |  | /horizon-west-happenings-local-leadership-horizon-west-resident-clerk-russell-runs-for-mayor | Horizon West Happenings: Local Leadership: Horizon West Resi |
| 0.14 | 0.02 |  | /vote | Vote |
| 0.12 | 0.92 | about | /about | Meet Tiffany |
| 0.05 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://tiffanyformayor.com/
  bot challenge (HTTP 202), retrying in the browser: https://tiffanyformayor.com/issues
  bot challenge (HTTP 202), retrying in the browser: https://tiffanyformayor.com/about
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 23 of 23 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 2 |
| Tokens | 80843 in, 10534 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
