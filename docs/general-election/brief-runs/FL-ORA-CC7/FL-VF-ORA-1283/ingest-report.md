# Ingest and policy run: FL-VF-ORA-1283 (Patricia Rumph), FL-ORA-CC7-general

Site: https://www.patriciarumph.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.patriciarumph.com/ --out docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/run.json > docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC7/FL-VF-ORA-1283/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:41Z → 2026-09-29T11:45:46Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **80** (1330 words) from 3 page(s); keyword crawl: 21 from 2 |
| Links | 39 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.patriciarumph.com/about (59 passage(s)) |

| Page | Passages |
|---|---|
| https://www.patriciarumph.com/ | 11 |
| https://www.patriciarumph.com/about (About) | 59 |
| https://www.patriciarumph.com/on-the-issues | 10 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.95 | 0.05 | policy | /on-the-issues | Patricia Speaks on the Issues |
| 0.17 | 0.91 | about | /about | About |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 80 of 80 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 10 |
| …and match a taxonomy issue | 4 |
| Tokens | 279821 in, 36640 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
