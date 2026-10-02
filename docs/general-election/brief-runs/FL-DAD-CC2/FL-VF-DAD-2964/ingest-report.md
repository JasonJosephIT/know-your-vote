# Ingest and policy run: FL-VF-DAD-2964 (Marleine Bastien), FL-DAD-CC2-general

Site: https://reelectbastien.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://reelectbastien.com/ --out docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/passages.jsonl 2> docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/passages.jsonl --json docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/run.json > docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/run-report.txt 2> docs/general-election/brief-runs/FL-DAD-CC2/FL-VF-DAD-2964/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:20Z → 2026-09-29T11:44:24Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **18** (481 words) from 1 page(s); keyword crawl: 18 from 1 |
| Links | 21 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://reelectbastien.com/ | 18 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  only 64 characters of text, rendering in the browser: https://reelectbastien.com/
  1 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 18 of 18 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 3 |
| Tokens | 63103 in, 8244 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
