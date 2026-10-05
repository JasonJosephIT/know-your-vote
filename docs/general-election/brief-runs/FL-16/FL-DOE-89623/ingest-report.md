# Ingest and policy run: FL-DOE-89623 (Mark Davis), FL-16-general

Site: https://markdavisforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://markdavisforcongress.com/ --out docs/general-election/brief-runs/FL-16/FL-DOE-89623/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-89623/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-16/FL-DOE-89623/passages.jsonl --json docs/general-election/brief-runs/FL-16/FL-DOE-89623/run.json > docs/general-election/brief-runs/FL-16/FL-DOE-89623/run-report.txt 2> docs/general-election/brief-runs/FL-16/FL-DOE-89623/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:18Z → 2026-09-29T11:42:23Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **84** (1598 words) from 3 page(s); keyword crawl: 34 from 2 |
| Links | 53 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 2 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://markdavisforcongress.com/ | 16 |
| https://markdavisforcongress.com/issues | 18 |
| https://markdavisforcongress.com/more-about-why | 50 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.64 | 0.03 | policy | /issues | Issues |
| 0.58 | 0.18 | policy | /more-about-why | More About Why |
| 0.16 | 0.07 |  | /organize | Organize |
| 0.08 | 0.03 |  | /store-1 | Store |
| 0.06 | 0.02 |  | /home | SUBCRIBE TO OUR NEWSLETTER |
| 0.03 | 0.02 |  | /privacy-1 | Terms & Privacy Policy |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 84 of 84 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 11 |
| …and match a taxonomy issue | 5 |
| Tokens | 293645 in, 38472 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
