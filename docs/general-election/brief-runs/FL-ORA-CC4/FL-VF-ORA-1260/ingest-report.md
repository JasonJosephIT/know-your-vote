# Ingest and policy run: FL-VF-ORA-1260 (Brian Jones), FL-ORA-CC4-general

Site: https://brianhubertjones.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://brianhubertjones.com/ --out docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/run.json > docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-CC4/FL-VF-ORA-1260/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:31Z → 2026-09-29T11:45:36Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **6** (188 words) from 1 page(s); keyword crawl: 0 from 0 |
| Links | 21 on the homepage, 2 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://brianhubertjones.com/about (6 passage(s)) |

| Page | Passages |
|---|---|
| https://brianhubertjones.com/about (About) | 6 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.17 | 0.91 | about | /about | About |
| 0.14 | 0.03 |  | /vote | Voters |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 6 of 6 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 3 |
| …and match a taxonomy issue | 0 |
| Tokens | 21091 in, 2748 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
