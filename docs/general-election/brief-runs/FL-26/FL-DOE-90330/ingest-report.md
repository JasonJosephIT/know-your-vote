# Ingest and policy run: FL-DOE-90330 (Mario Diaz-Balart), FL-26-general

Site: https://mariodiazbalart.org/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://mariodiazbalart.org/ --out docs/general-election/brief-runs/FL-26/FL-DOE-90330/passages.jsonl 2> docs/general-election/brief-runs/FL-26/FL-DOE-90330/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-26/FL-DOE-90330/passages.jsonl --json docs/general-election/brief-runs/FL-26/FL-DOE-90330/run.json > docs/general-election/brief-runs/FL-26/FL-DOE-90330/run-report.txt 2> docs/general-election/brief-runs/FL-26/FL-DOE-90330/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:52Z → 2026-09-29T11:42:54Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **80** (2858 words) from 1 page(s); keyword crawl: 80 from 1 |
| Links | 40 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://mariodiazbalart.org/ | 80 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 80 of 80 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 19 |
| …and match a taxonomy issue | 11 |
| Tokens | 282630 in, 36640 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
