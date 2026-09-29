# Ingest and policy run: FL-VF-ORA-1239 (Chris Messina), FL-ORA-MAYOR-general

Site: https://www.chrismessina.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.chrismessina.com/ --out docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/run.json > docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-MAYOR/FL-VF-ORA-1239/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:59Z → 2026-09-29T11:47:59Z (120 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **35** (1343 words) from 4 page(s); keyword crawl: 27 from 3 |
| Links | 32 on the homepage, 7 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 3 (cap 8) |
| About page | https://www.chrismessina.com/about-chris (8 passage(s)) |

| Page | Passages |
|---|---|
| https://www.chrismessina.com/ | 4 |
| https://www.chrismessina.com/about-chris (About) | 8 |
| https://www.chrismessina.com/our-vision-2 | 7 |
| https://www.chrismessina.com/platform | 16 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.84 | 0.09 | policy | /our-vision-2026 | My Vision |
| 0.74 | 0.11 | policy | /platform | Platform |
| 0.70 | 0.07 | policy | /our-vision-2 | Vision |
| 0.29 | 0.13 |  | /es | ES |
| 0.12 | 0.93 | about | /about-chris | About |
| 0.10 | 0.05 |  | /news | My News |
| 0.08 | 0.05 |  | /media | Media |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 20s
  HTTP 404 https://www.chrismessina.com/our-vision-2026
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 35 of 35 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 16 |
| …and match a taxonomy issue | 10 |
| Tokens | 123287 in, 16030 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
