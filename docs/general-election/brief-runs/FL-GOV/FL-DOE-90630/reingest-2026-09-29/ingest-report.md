# Ingest and policy run: FL-DOE-90630 (Charles Burkett), FL-GOV-general

Site: https://burkettforgov.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://burkettforgov.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:47:09Z → 2026-09-29T11:47:13Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **189** (5346 words) from 1 page(s); keyword crawl: 189 from 1 |
| Links | 47 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://burkettforgov.com/ | 189 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.80 | 0.14 | policy | /more-on-where-i-stand | More on where I stand |
| 0.28 | 0.05 |  | /my-pick-for-lt-governor | My pick for Lt. Governor |
| 0.17 | 0.03 |  | /m/orders | Orders |
| 0.08 | 0.05 |  | /m/account | Sign In |
| 0.07 | 0.02 |  | /m/create-account | Create Account |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 189 of 189 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 89 |
| …and match a taxonomy issue | 44 |
| Tokens | 664247 in, 86562 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
