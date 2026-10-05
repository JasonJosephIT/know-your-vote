# Ingest and policy run: FL-DOE-89933 (Eliott Rodriguez), FL-27-general

Site: https://eliottrodriguez.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://eliottrodriguez.com/ --out docs/general-election/brief-runs/FL-27/FL-DOE-89933/passages.jsonl 2> docs/general-election/brief-runs/FL-27/FL-DOE-89933/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-27/FL-DOE-89933/passages.jsonl --json docs/general-election/brief-runs/FL-27/FL-DOE-89933/run.json > docs/general-election/brief-runs/FL-27/FL-DOE-89933/run-report.txt 2> docs/general-election/brief-runs/FL-27/FL-DOE-89933/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:55Z → 2026-09-29T11:43:42Z (47 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **3** (86 words) from 1 page(s); keyword crawl: 53 from 2 |
| Links | 29 on the homepage, 3 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://eliottrodriguez.com/ | 3 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.61 | 0.03 | policy | /issues | Issues |
| 0.23 | 0.11 |  | /red-box | Red Box |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://eliottrodriguez.com/
  only 73 characters of text, rendering in the browser: https://eliottrodriguez.com/issues
  rendered, but only 23 characters of text: https://eliottrodriguez.com/issues
  2 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 3 of 3 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 10516 in, 1374 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
