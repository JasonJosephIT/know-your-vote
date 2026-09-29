# Ingest and policy run: FL-VF-HIL-2636 (Neil Manimala), FL-HIL-CC5-general

Site: https://www.neilmanimala.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.neilmanimala.com/ --out docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/run.json > docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2636/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:58Z → 2026-09-29T11:45:03Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **17** (575 words) from 3 page(s); keyword crawl: 13 from 2 |
| Links | 57 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.neilmanimala.com/meetneil (4 passage(s)) |

| Page | Passages |
|---|---|
| https://www.neilmanimala.com/ | 7 |
| https://www.neilmanimala.com/meetneil (About) | 4 |
| https://www.neilmanimala.com/priorities | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.03 | policy | /priorities | Priorities |
| 0.16 | 0.78 | about | /meetneil | Meet Neil |
| 0.08 | 0.03 |  | /in-the-news | In The News |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 17 of 17 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 3 |
| …and match a taxonomy issue | 2 |
| Tokens | 59779 in, 7786 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
