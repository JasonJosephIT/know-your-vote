# Ingest and policy run: FL-VF-HIL-2880 (Jackie Toledo), FL-HIL-CC1-general

Site: https://jackietoledo.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://jackietoledo.com/ --out docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/passages.jsonl 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/passages.jsonl --json docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/run.json > docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/run-report.txt 2> docs/general-election/brief-runs/FL-HIL-CC1/FL-VF-HIL-2880/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:44:43Z → 2026-09-29T11:44:58Z (15 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **45** (1021 words) from 3 page(s); keyword crawl: 33 from 2 |
| Links | 47 on the homepage, 4 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://jackietoledo.com/meet-jackie-toledo (12 passage(s)) |

| Page | Passages |
|---|---|
| https://jackietoledo.com/ | 21 |
| https://jackietoledo.com/issues | 12 |
| https://jackietoledo.com/meet-jackie-toledo (About) | 12 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.65 | 0.03 | policy | /issues | Issues |
| 0.47 | 0.20 |  | /the-choice | The Choice |
| 0.19 | 0.91 | about | /meet-jackie-toledo | About |
| 0.04 | 0.03 |  | /endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

```
  robots.txt read in the browser (plain fetch got a bot challenge, HTTP 202)
  bot challenge (HTTP 202), retrying in the browser: https://jackietoledo.com/
  bot challenge (HTTP 202), retrying in the browser: https://jackietoledo.com/issues
  bot challenge (HTTP 202), retrying in the browser: https://jackietoledo.com/meet-jackie-toledo
  3 page(s) fetched in the browser
```

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 45 of 45 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 7 |
| …and match a taxonomy issue | 4 |
| Tokens | 157639 in, 20610 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
