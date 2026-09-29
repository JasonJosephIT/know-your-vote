# Ingest and policy run: FL-VF-HIL-2645 (Karen Perez), FL-HIL-SB6-general

Site: https://keepkarenperez.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://keepkarenperez.com/ --out docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/run.json > docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-SB6/FL-VF-HIL-2645/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:45:23Z → 2026-09-29T11:46:06Z (43 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **15** (272 words) from 1 page(s); keyword crawl: 15 from 1 |
| Links | 8 on the homepage, 1 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | https://keepkarenperez.com/about (0 passage(s)) |

| Page | Passages |
|---|---|
| https://keepkarenperez.com/ | 15 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.17 | 0.91 | about | /about | About |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got an HTML page in its place, HTTP 200)
  only 73 characters of text, rendering in the browser: https://keepkarenperez.com/
  only 73 characters of text, rendering in the browser: https://keepkarenperez.com/about
  rendered, but only 23 characters of text: https://keepkarenperez.com/about
  2 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 15 of 15 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 0 |
| …and match a taxonomy issue | 0 |
| Tokens | 52381 in, 6870 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
