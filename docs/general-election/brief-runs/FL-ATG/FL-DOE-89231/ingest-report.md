# Ingest and policy run: FL-DOE-89231 (Jose Javier Rodriguez), FL-ATG-general

Site: https://www.jjr.vote/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://www.jjr.vote/ --out docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/passages.jsonl 2> docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/passages.jsonl --json docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/run.json > docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/run-report.txt 2> docs/general-election/brief-runs/FL-ATG/FL-DOE-89231/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:43:44Z → 2026-09-29T11:43:48Z (4 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **17** (463 words) from 3 page(s); keyword crawl: 13 from 2 |
| Links | 31 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://www.jjr.vote/about (4 passage(s)) |

| Page | Passages |
|---|---|
| https://www.jjr.vote/ | 3 |
| https://www.jjr.vote/about (About) | 4 |
| https://www.jjr.vote/priorities | 10 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /priorities | Priorities |
| 0.28 | 0.13 |  | /es | ES |
| 0.18 | 0.91 | about | /about | About |
| 0.08 | 0.05 |  | /media | Media |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 17 of 17 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 9 |
| …and match a taxonomy issue | 4 |
| Tokens | 59775 in, 7786 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
