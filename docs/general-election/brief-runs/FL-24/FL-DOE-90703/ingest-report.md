# Ingest and policy run: FL-DOE-90703 (Te Mayonna Brown), FL-24-general

Site: https://tebrownforflorida.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://tebrownforflorida.com/ --out docs/general-election/brief-runs/FL-24/FL-DOE-90703/passages.jsonl 2> docs/general-election/brief-runs/FL-24/FL-DOE-90703/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-24/FL-DOE-90703/passages.jsonl --json docs/general-election/brief-runs/FL-24/FL-DOE-90703/run.json > docs/general-election/brief-runs/FL-24/FL-DOE-90703/run-report.txt 2> docs/general-election/brief-runs/FL-24/FL-DOE-90703/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:39Z → 2026-09-29T11:42:46Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **27** (1157 words) from 4 page(s); keyword crawl: 24 from 3 |
| Links | 61 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 2 (cap 8) |
| About page | https://tebrownforflorida.com/meet-te-brown (3 passage(s)) |

| Page | Passages |
|---|---|
| https://tebrownforflorida.com/ | 7 |
| https://tebrownforflorida.com/issues | 12 |
| https://tebrownforflorida.com/meet-te-brown (About) | 3 |
| https://tebrownforflorida.com/the-people-first-agenda | 5 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.03 | policy | /the-people-first-agenda | Policies |
| 0.57 | 0.03 | policy | /issues | Issues |
| 0.15 | 0.88 | about | /meet-te-brown | Meet Te Brown |
| 0.15 | 0.06 |  | /career-center | Career Center |
| 0.09 | 0.02 |  | /news | Latest News |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 27 of 27 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 17 |
| …and match a taxonomy issue | 15 |
| Tokens | 95282 in, 12366 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
