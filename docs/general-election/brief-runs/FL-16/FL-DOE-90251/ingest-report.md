# Ingest and policy run: FL-DOE-90251 (Sydney Gruters), FL-16-general

Site: https://grutersforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://grutersforcongress.com/ --out docs/general-election/brief-runs/FL-16/FL-DOE-90251/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-90251/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-16/FL-DOE-90251/passages.jsonl --json docs/general-election/brief-runs/FL-16/FL-DOE-90251/run.json > docs/general-election/brief-runs/FL-16/FL-DOE-90251/run-report.txt 2> docs/general-election/brief-runs/FL-16/FL-DOE-90251/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:18Z → 2026-09-29T11:42:20Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **9** (313 words) from 1 page(s); keyword crawl: 9 from 1 |
| Links | 25 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://grutersforcongress.com/ | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.18 | 0.16 |  | /.* | .*? )/g); parts.forEach(function (part) { if (!part) { retur |
| 0.08 | 0.04 |  | /media | Media |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 9 of 9 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 7 |
| …and match a taxonomy issue | 6 |
| Tokens | 31612 in, 4122 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
