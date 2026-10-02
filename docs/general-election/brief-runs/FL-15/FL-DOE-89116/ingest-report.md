# Ingest and policy run: FL-DOE-89116 (Robert People), FL-15-general

Site: https://www.peopleforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.peopleforcongress.com/ --out docs/general-election/brief-runs/FL-15/FL-DOE-89116/passages.jsonl 2> docs/general-election/brief-runs/FL-15/FL-DOE-89116/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-15/FL-DOE-89116/passages.jsonl --json docs/general-election/brief-runs/FL-15/FL-DOE-89116/run.json > docs/general-election/brief-runs/FL-15/FL-DOE-89116/run-report.txt 2> docs/general-election/brief-runs/FL-15/FL-DOE-89116/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:05Z → 2026-09-29T11:42:10Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **48** (1928 words) from 3 page(s); keyword crawl: 43 from 2 |
| Links | 23 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.peopleforcongress.com/about-8 (5 passage(s)) |

| Page | Passages |
|---|---|
| https://www.peopleforcongress.com/ | 15 |
| https://www.peopleforcongress.com/about-8 (About) | 5 |
| https://www.peopleforcongress.com/general-7 | 28 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.83 | 0.28 | policy | /general-7 | MY PLATFORM |
| 0.27 | 0.05 |  | /the-more-you-know | AND NOW YOU KNOW |
| 0.15 | 0.53 | about | /about-8 | ENDORSE ROBERT |
| 0.07 | 0.25 |  | /about-3 | UPCOMING EVENTS |
| 0.07 | 0.04 |  | /projects-6 | IN THE MEDIA |
| 0.04 | 0.02 |  | /get-involved | VOLUNTEER! |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 48 of 48 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 19 |
| …and match a taxonomy issue | 8 |
| Tokens | 169080 in, 21984 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
