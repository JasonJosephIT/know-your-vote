# Ingest and policy run: FL-VF-HIL-2661 (Stacy Hahn), FL-HIL-CC5-general

Site: https://www.votestacyhahn.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.votestacyhahn.com/ --out docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/run.json > docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC5/FL-VF-HIL-2661/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:04Z → 2026-09-29T11:45:08Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **16** (831 words) from 1 page(s); keyword crawl: 16 from 1 |
| Links | 2 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://www.votestacyhahn.com/ | 16 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 16 of 16 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 2 |
| Tokens | 56611 in, 7328 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
