# Ingest and policy run: FL-VF-HIL-2675 (Daniela Simic), FL-HIL-SB2-general

Site: https://danielaforschools.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://danielaforschools.com/ --out docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/run.json > docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-SB2/FL-VF-HIL-2675/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:10Z → 2026-09-29T11:45:31Z (21 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **10** (412 words) from 2 page(s); keyword crawl: 4 from 1 |
| Links | 14 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://danielaforschools.com/about (6 passage(s)) |

| Page | Passages |
|---|---|
| https://danielaforschools.com/ | 4 |
| https://danielaforschools.com/about (About) | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.18 | 0.91 | about | /about | About |
| 0.11 | 0.03 |  | /news | News |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://danielaforschools.com/
  only 73 characters of text, rendering in the browser: https://danielaforschools.com/about
  2 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 10 of 10 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 2 |
| …and match a taxonomy issue | 1 |
| Tokens | 35215 in, 4580 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
