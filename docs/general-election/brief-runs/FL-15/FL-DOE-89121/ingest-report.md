# Ingest and policy run: FL-DOE-89121 (Laurel Lee), FL-15-general

Site: https://votelaurel.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://votelaurel.com/ --out docs/general-election/brief-runs/FL-15/FL-DOE-89121/passages.jsonl 2> docs/general-election/brief-runs/FL-15/FL-DOE-89121/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-15/FL-DOE-89121/passages.jsonl --json docs/general-election/brief-runs/FL-15/FL-DOE-89121/run.json > docs/general-election/brief-runs/FL-15/FL-DOE-89121/run-report.txt 2> docs/general-election/brief-runs/FL-15/FL-DOE-89121/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:14Z → 2026-09-29T11:42:25Z (11 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **25** (1299 words) from 1 page(s); keyword crawl: 25 from 1 |
| Links | 53 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://votelaurel.com/ | 25 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.05 | 0.02 |  | /media-assets | Media Assets |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  honoring Crawl-delay: 10s
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 25 of 25 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 6 |
| …and match a taxonomy issue | 5 |
| Tokens | 88440 in, 11450 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
