# Ingest and policy run: FL-VF-BRO-1195 (Allen Zeman), FL-BRO-SBAL8-general

Site: https://electallenzeman.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://electallenzeman.com/ --out docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/passages.jsonl 2> docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/passages.jsonl --json docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/run.json > docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/run-report.txt 2> docs/general-election/brief-runs/FL-BRO-SBAL8/FL-VF-BRO-1195/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:09Z → 2026-09-29T11:44:18Z (9 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **11** (423 words) from 2 page(s); keyword crawl: 7 from 1 |
| Links | 8 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://electallenzeman.com/dr-allen-zeman (4 passage(s)) |

| Page | Passages |
|---|---|
| https://electallenzeman.com/ | 7 |
| https://electallenzeman.com/dr-allen-zeman (About) | 4 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.19 | 0.91 | about | /dr-allen-zeman | About |
| 0.09 | 0.05 |  | /endorsement | Read More |
| 0.06 | 0.03 |  | /host-committee | Host Committee |
| 0.05 | 0.02 |  | /latest-news | Neighbors Band Together to Share Their Support for Dr. Zeman |
| 0.03 | 0.02 |  | /join-our-team-of-volunteers | Volunteer Opps |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 11 of 11 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 38759 in, 5038 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
