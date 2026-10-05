# Ingest and policy run: FL-DOE-88517 (Ralph Groves), FL-11-general

Site: https://www.grovesforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.grovesforcongress.com/ --out docs/general-election/brief-runs/FL-11/FL-DOE-88517/passages.jsonl 2> docs/general-election/brief-runs/FL-11/FL-DOE-88517/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-11/FL-DOE-88517/passages.jsonl --json docs/general-election/brief-runs/FL-11/FL-DOE-88517/run.json > docs/general-election/brief-runs/FL-11/FL-DOE-88517/run-report.txt 2> docs/general-election/brief-runs/FL-11/FL-DOE-88517/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:41:53Z (8 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **150** (8397 words) from 4 page(s); keyword crawl: 18 from 1 |
| Links | 12 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 3 (cap 8) |
| About page | https://www.grovesforcongress.com/meet-ralph-groves (13 passage(s)) |

| Page | Passages |
|---|---|
| https://www.grovesforcongress.com/ | 18 |
| https://www.grovesforcongress.com/meet-ralph-groves (About) | 13 |
| https://www.grovesforcongress.com/my-mission | 10 |
| https://www.grovesforcongress.com/position-papers | 109 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.02 | policy | /position-papers | Position Papers |
| 0.83 | 0.03 | policy | /libertarian-resolutions | Resolutions |
| 0.73 | 0.17 | policy | /my-mission | Mission |
| 0.20 | 0.08 |  | /my-letters | Letters |
| 0.18 | 0.02 |  | /press-releases | Press Releases |
| 0.16 | 0.71 | about | /meet-ralph-groves | Meet Ralph Groves |
| 0.04 | 0.03 |  | /gallery | Gallery |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 150 of 150 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 31 |
| …and match a taxonomy issue | 9 |
| Tokens | 532830 in, 68700 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
