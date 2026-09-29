# Ingest and policy run: FL-VF-HIL-2660 (Aileen Rodriguez), FL-HIL-CC7-general

Site: https://voteaileen2026.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://voteaileen2026.com/ --out docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/run.json > docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC7/FL-VF-HIL-2660/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:06Z → 2026-09-29T11:45:08Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **14** (498 words) from 1 page(s); keyword crawl: 14 from 1 |
| Links | 36 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://voteaileen2026.com/ | 14 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 14 of 14 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 3 |
| Tokens | 49231 in, 6412 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
