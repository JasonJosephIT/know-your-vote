# Ingest and policy run: FL-VF-DAD-2949 (Vicki L. Lopez), FL-DAD-CC5-general

Site: https://vickilopez.vote/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://vickilopez.vote/ --out docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/passages.jsonl --json docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/run.json > docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/run-report.txt 2> docs/general-election/brief-runs/FL-DAD-CC5/FL-VF-DAD-2949/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:21Z → 2026-09-29T11:44:28Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **9** (158 words) from 1 page(s); keyword crawl: 0 from 0 |
| Links | 39 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://vickilopez.vote/ | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.39 | 0.37 |  | /inicio | Vicki Lopez ES |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://vickilopez.vote/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 9 of 9 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 6 |
| …and match a taxonomy issue | 3 |
| Tokens | 31435 in, 4122 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
