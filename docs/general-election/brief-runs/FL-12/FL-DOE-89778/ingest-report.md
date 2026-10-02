# Ingest and policy run: FL-DOE-89778 (Branden Scrivener), FL-12-general

Site: https://brandenscrivenerfl.info/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://brandenscrivenerfl.info/ --out docs/general-election/brief-runs/FL-12/FL-DOE-89778/passages.jsonl 2> docs/general-election/brief-runs/FL-12/FL-DOE-89778/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-12/FL-DOE-89778/passages.jsonl --json docs/general-election/brief-runs/FL-12/FL-DOE-89778/run.json > docs/general-election/brief-runs/FL-12/FL-DOE-89778/run-report.txt 2> docs/general-election/brief-runs/FL-12/FL-DOE-89778/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:51Z → 2026-09-29T11:41:54Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **11** (626 words) from 1 page(s); keyword crawl: 11 from 1 |
| Links | 5 on the homepage, 0 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://brandenscrivenerfl.info/ | 11 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 11 of 11 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 4 |
| …and match a taxonomy issue | 3 |
| Tokens | 38917 in, 5038 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
