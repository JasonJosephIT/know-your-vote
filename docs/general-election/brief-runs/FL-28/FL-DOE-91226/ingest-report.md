# Ingest and policy run: FL-DOE-91226 (Carlos A. Gimenez), FL-28-general

Site: https://carlosgimenezforcongress.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://carlosgimenezforcongress.com/ --out docs/general-election/brief-runs/FL-28/FL-DOE-91226/passages.jsonl 2> docs/general-election/brief-runs/FL-28/FL-DOE-91226/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-28/FL-DOE-91226/passages.jsonl --json docs/general-election/brief-runs/FL-28/FL-DOE-91226/run.json > docs/general-election/brief-runs/FL-28/FL-DOE-91226/run-report.txt 2> docs/general-election/brief-runs/FL-28/FL-DOE-91226/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:07Z → 2026-09-29T11:43:12Z (5 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **9** (478 words) from 3 page(s); keyword crawl: 3 from 2 |
| Links | 19 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://carlosgimenezforcongress.com/meet-carlos (6 passage(s)) |

| Page | Passages |
|---|---|
| https://carlosgimenezforcongress.com/ | 2 |
| https://carlosgimenezforcongress.com/meet-carlos (About) | 6 |
| https://carlosgimenezforcongress.com/take-now-issue-priority-surveyvv | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.76 | 0.02 | policy | /take-now-issue-priority-surveyvv | Issues |
| 0.16 | 0.03 |  | /take-action | Take Action |
| 0.15 | 0.67 | about | /meet-carlos | Meet Carlos |
| 0.13 | 0.02 |  | /resources-for-voters | Vote |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 9 of 9 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 31898 in, 4122 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
