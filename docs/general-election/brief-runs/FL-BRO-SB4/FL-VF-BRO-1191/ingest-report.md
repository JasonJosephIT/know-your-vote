# Ingest and policy run: FL-VF-BRO-1191 (Nicole Morst), FL-BRO-SB4-general

Site: https://nicolemorst.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://nicolemorst.com/ --out docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/run.json > docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SB4/FL-VF-BRO-1191/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:59Z → 2026-09-29T11:44:01Z (2 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **9** (554 words) from 1 page(s); keyword crawl: 9 from 1 |
| Links | 22 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://nicolemorst.com/ | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.10 | 0.04 |  | /Home | CONTRIBUTE |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 9 of 9 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 1 |
| Tokens | 31880 in, 4122 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
