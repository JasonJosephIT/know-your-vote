# Ingest and policy run: FL-DOE-91337 (Dan Green), FL-9-general

Site: https://dangreenfl.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://dangreenfl.com/ --out docs/general-election/brief-runs/FL-9/FL-DOE-91337/passages.jsonl 2> docs/general-election/brief-runs/FL-9/FL-DOE-91337/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-9/FL-DOE-91337/passages.jsonl --json docs/general-election/brief-runs/FL-9/FL-DOE-91337/run.json > docs/general-election/brief-runs/FL-9/FL-DOE-91337/run-report.txt 2> docs/general-election/brief-runs/FL-9/FL-DOE-91337/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T19:17:39Z → 2026-09-29T19:18:19Z (40 s) |
| Exit code | 0 |
| Attempt | **re-run** (founder rule: one identical re-run of every failure); the first attempt, FAILURE: the browser rendered the page with almost no text, is in `attempt-1-failed/` |
| Result | **SUCCESS** |
| Passages | **21** (744 words) from 3 page(s); keyword crawl: 11 from 2 |
| Links | 34 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://dangreenfl.com/meet-dan (10 passage(s)) |

| Page | Passages |
|---|---|
| https://dangreenfl.com/ | 10 |
| https://dangreenfl.com/meet-dan (About) | 10 |
| https://dangreenfl.com/on-the-issues | 1 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.94 | 0.05 | policy | /on-the-issues | Read More |
| 0.17 | 0.77 | about | /meet-dan | Meet Dan |
| 0.10 | 0.03 |  | /news | News |
| 0.08 | 0.05 |  | /media | Media |
| 0.05 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://dangreenfl.com/
  only 73 characters of text, rendering in the browser: https://dangreenfl.com/on-the-issues
  only 73 characters of text, rendering in the browser: https://dangreenfl.com/meet-dan
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 21 of 21 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 6 |
| …and match a taxonomy issue | 3 |
| Tokens | 73844 in, 9618 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
