# Ingest and policy run: FL-DOE-89801 (Scott Singer), FL-25-general

Site: https://www.scottsingerusa.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.scottsingerusa.com/ --out docs/general-election/brief-runs/FL-25/FL-DOE-89801/passages.jsonl 2> docs/general-election/brief-runs/FL-25/FL-DOE-89801/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-25/FL-DOE-89801/passages.jsonl --json docs/general-election/brief-runs/FL-25/FL-DOE-89801/run.json > docs/general-election/brief-runs/FL-25/FL-DOE-89801/run-report.txt 2> docs/general-election/brief-runs/FL-25/FL-DOE-89801/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:45Z → 2026-09-29T11:42:50Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **58** (2240 words) from 3 page(s); keyword crawl: 52 from 2 |
| Links | 65 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.scottsingerusa.com/about-scott-singer (6 passage(s)) |

| Page | Passages |
|---|---|
| https://www.scottsingerusa.com/ | 19 |
| https://www.scottsingerusa.com/about-scott-singer (About) | 6 |
| https://www.scottsingerusa.com/priorities | 33 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.03 | policy | /priorities | PRIORITIES |
| 0.14 | 0.93 | about | /about-scott-singer | ABOUT |
| 0.10 | 0.06 |  | /media | MEDIA |
| 0.04 | 0.03 |  | /endorsements | ENDORSEMENTS |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 58 of 58 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 30 |
| …and match a taxonomy issue | 16 |
| Tokens | 204258 in, 26564 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
