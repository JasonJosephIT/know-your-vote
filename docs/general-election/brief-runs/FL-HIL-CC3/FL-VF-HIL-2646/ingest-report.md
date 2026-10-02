# Ingest and policy run: FL-VF-HIL-2646 (Luiz F. F. Garcia), FL-HIL-CC3-general

Site: https://www.electluizffgarcia.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.electluizffgarcia.com/ --out docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/run.json > docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC3/FL-VF-HIL-2646/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:54Z → 2026-09-29T11:44:59Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **30** (1613 words) from 3 page(s); keyword crawl: 23 from 2 |
| Links | 22 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.electluizffgarcia.com/about (7 passage(s)) |

| Page | Passages |
|---|---|
| https://www.electluizffgarcia.com/ | 12 |
| https://www.electluizffgarcia.com/about (About) | 7 |
| https://www.electluizffgarcia.com/issues | 11 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.60 | 0.03 | policy | /issues | Issues |
| 0.12 | 0.94 | about | /about | About Luiz |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 30 of 30 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 16 |
| …and match a taxonomy issue | 8 |
| Tokens | 106244 in, 13740 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
