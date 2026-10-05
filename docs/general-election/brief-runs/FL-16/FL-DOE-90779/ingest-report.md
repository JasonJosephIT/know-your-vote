# Ingest and policy run: FL-DOE-90779 (Kelly Kirschner), FL-16-general

Site: https://kellykirschner.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://kellykirschner.com/ --out docs/general-election/brief-runs/FL-16/FL-DOE-90779/passages.jsonl 2> docs/general-election/brief-runs/FL-16/FL-DOE-90779/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-16/FL-DOE-90779/passages.jsonl --json docs/general-election/brief-runs/FL-16/FL-DOE-90779/run.json > docs/general-election/brief-runs/FL-16/FL-DOE-90779/run-report.txt 2> docs/general-election/brief-runs/FL-16/FL-DOE-90779/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:42:22Z → 2026-09-29T11:42:25Z (3 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **73** (2317 words) from 1 page(s); keyword crawl: 73 from 1 |
| Links | 39 on the homepage, 5 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 0 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://kellykirschner.com/ | 73 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.31 | 0.05 |  | /press/even-republican-senators-reject-trumps-taxpayer-funded-ads-does-congressional-candidate-sydney-gruters | Even Republican Senators Reject Trump’s Taxpayer Funded Ads. |
| 0.08 | 0.03 |  | /press/republicans-for-kirschner | Prominent Republicans Cross Party Lines to Endorse Democrat  |
| 0.08 | 0.05 |  | /media | Media |
| 0.07 | 0.03 |  | /press/congressional-candidate-kelly-kirschner-raises-over-100000-in-the-first-week-0-from-corporate-pacs | two dozen current and former elected officials |
| 0.06 | 0.02 |  | /press/new-poll-kirschner-and-gruters-dead-heat-fl-16 | Poll: Kirschner & Gruters in Dead Heat in FL-16 |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 73 of 73 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 28 |
| …and match a taxonomy issue | 20 |
| Tokens | 257147 in, 33434 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
