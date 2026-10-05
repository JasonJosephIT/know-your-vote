# Ingest and policy run: FL-DOE-92377 (Christopher Dennison), FL-7-general

Site: https://dennison4congress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://dennison4congress.com/ --out docs/general-election/brief-runs/FL-7/FL-DOE-92377/passages.jsonl 2> docs/general-election/brief-runs/FL-7/FL-DOE-92377/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-7/FL-DOE-92377/passages.jsonl --json docs/general-election/brief-runs/FL-7/FL-DOE-92377/run.json > docs/general-election/brief-runs/FL-7/FL-DOE-92377/run-report.txt 2> docs/general-election/brief-runs/FL-7/FL-DOE-92377/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:18Z → 2026-09-29T11:43:25Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **17** (773 words) from 2 page(s); keyword crawl: 17 from 2 |
| Links | 14 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://dennison4congress.com/ | 5 |
| https://dennison4congress.com/issues-2 | 12 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.58 | 0.03 | policy | /issues-2 | Issues |
| 0.14 | 0.04 |  | /issues | Help us reach District 7 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 17 of 17 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 8 |
| …and match a taxonomy issue | 6 |
| Tokens | 60014 in, 7786 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
