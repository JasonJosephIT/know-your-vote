# Ingest and policy run: FL-VF-HIL-2672 (Patricia "Patti" Rendon), FL-HIL-SB4-general

Site: https://www.votepattirendon.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.votepattirendon.com/ --out docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/run.json > docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-SB4/FL-VF-HIL-2672/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:13Z → 2026-09-29T11:45:48Z (35 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **1** (37 words) from 1 page(s); keyword crawl: 1 from 1 |
| Links | 4 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.votepattirendon.com/ | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.82 | 0.50 | policy | /about-patti | Patti's Priorities |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 179 characters of text, rendering in the browser: https://www.votepattirendon.com/about-patti
  rendered, but only 200 characters of text: https://www.votepattirendon.com/about-patti
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 1 of 1 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 3504 in, 458 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
