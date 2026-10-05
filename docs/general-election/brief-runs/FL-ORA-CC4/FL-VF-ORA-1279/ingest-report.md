# Ingest and policy run: FL-VF-ORA-1279 (Johanna Lopez), FL-ORA-CC4-general

Site: https://www.votejohannalopez.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.votejohannalopez.com/ --out docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/run.json > docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1279/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:33Z → 2026-09-29T11:45:37Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **21** (783 words) from 2 page(s); keyword crawl: 41 from 2 |
| Links | 46 on the homepage, 6 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://www.votejohannalopez.com/meet-johanna (9 passage(s)) |

| Page | Passages |
|---|---|
| https://www.votejohannalopez.com/ | 12 |
| https://www.votejohannalopez.com/meet-johanna (About) | 9 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.16 | 0.81 | about | /meet-johanna | Meet Johanna |
| 0.15 | 0.02 |  | /vote | Vote |
| 0.11 | 0.03 |  | /copy-of-vote | Results |
| 0.11 | 0.03 |  | /news-articles | News |
| 0.08 | 0.03 |  | /get-involved | Get Involved |
| 0.04 | 0.02 |  | /copy-of-results | Privacy Policy, Terms & Conditions |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 21 of 21 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 74021 in, 9618 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
