# Ingest and policy run: FL-DOE-89041 (James Uthmeier), FL-ATG-general

Site: https://jamesforfl.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://jamesforfl.com/ --out docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/passages.jsonl 2> docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/passages.jsonl --json docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/run.json > docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/run-report.txt 2> docs/general-election/brief-runs/FL-ATG/FL-DOE-89041/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:43Z → 2026-09-29T11:43:47Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **2** (144 words) from 2 page(s); keyword crawl: 1 from 1 |
| Links | 25 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://jamesforfl.com/about (1 passage(s)) |

| Page | Passages |
|---|---|
| https://jamesforfl.com/ | 1 |
| https://jamesforfl.com/about (About) | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.17 | 0.92 | about | /about | ABOUT |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 2 of 2 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 7135 in, 916 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
