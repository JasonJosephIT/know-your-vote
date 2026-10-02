# Ingest and policy run: FL-VF-ORA-1318 (Gloria Reina O'Neal), FL-ORA-SB2-general

Site: https://votegloriareina.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://votegloriareina.com/ --out docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/passages.jsonl 2> docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/passages.jsonl --json docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/run.json > docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/run-report.txt 2> docs/general-election/brief-runs/FL-ORA-SB2/FL-VF-ORA-1318/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:07Z → 2026-09-29T11:46:11Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **39** (1301 words) from 1 page(s); keyword crawl: 39 from 1 |
| Links | 12 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://votegloriareina.com/ | 39 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 47 characters of text, rendering in the browser: https://votegloriareina.com/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 39 of 39 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 9 |
| …and match a taxonomy issue | 1 |
| Tokens | 136917 in, 17862 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
