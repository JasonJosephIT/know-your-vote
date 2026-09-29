# Ingest and policy run: FL-VF-DAD-3070 (Katrina Wilson), FL-DAD-SB1-general

Site: https://wilsonforeducation.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://wilsonforeducation.com/ --out docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/passages.jsonl --json docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/run.json > docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/run-report.txt 2> docs/general-election/brief-runs/FL-DAD-SB1/FL-VF-DAD-3070/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:27Z → 2026-09-29T11:44:29Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **1** (18 words) from 1 page(s); keyword crawl: 1 from 1 |
| Links | 4 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://wilsonforeducation.com/ | 1 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 1 of 1 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 3620 in, 458 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
