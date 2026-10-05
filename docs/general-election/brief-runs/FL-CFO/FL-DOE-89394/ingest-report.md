# Ingest and policy run: FL-DOE-89394 (Blaise Ingoglia), FL-CFO-general

Site: https://blaiseforflorida.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://blaiseforflorida.com/ --out docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/passages.jsonl 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/passages.jsonl --json docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/run.json > docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/run-report.txt 2> docs/general-election/brief-runs/FL-CFO/FL-DOE-89394/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:14Z → 2026-09-29T11:44:34Z (20 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **50** (1796 words) from 3 page(s); keyword crawl: 43 from 2 |
| Links | 64 on the homepage, 9 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://blaiseforflorida.com/meet-blaise (7 passage(s)) |

| Page | Passages |
|---|---|
| https://blaiseforflorida.com/ | 7 |
| https://blaiseforflorida.com/issues | 36 |
| https://blaiseforflorida.com/meet-blaise (About) | 7 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.61 | 0.03 | policy | /issues | Issues |
| 0.18 | 0.87 | about | /meet-blaise | About |
| 0.11 | 0.02 |  | /scheduling | Scheduling |
| 0.10 | 0.02 |  | /press-releases | Media |
| 0.09 | 0.06 |  | /cfo-blaise-ingoglia-endorsed-by-72-state-lawmakers-and-leaders | READ MORE |
| 0.09 | 0.02 |  | /florida-governor-ron-desantis-endorses-blaise-ingoglia-for-florida-chief-financial-officer | READ MORE |
| 0.09 | 0.02 |  | /florida-state-attorneys-announce-endorsement-of-blaise-ingoglia-for-florida-chief-financial-officer | READ MORE |
| 0.04 | 0.03 |  | /endorsements | Endorsements |
| 0.04 | 0.03 |  | /contact-team-blaise | Contact |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://blaiseforflorida.com/
  only 73 characters of text, rendering in the browser: https://blaiseforflorida.com/issues
  only 73 characters of text, rendering in the browser: https://blaiseforflorida.com/meet-blaise
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 50 of 50 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 14 |
| …and match a taxonomy issue | 8 |
| Tokens | 176023 in, 22900 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
