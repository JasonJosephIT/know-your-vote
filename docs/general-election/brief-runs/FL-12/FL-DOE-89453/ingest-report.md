# Ingest and policy run: FL-DOE-89453 (Kimberly Overman), FL-12-general

Site: https://kimberlyoverman.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://kimberlyoverman.com/ --out docs/general-election/brief-runs/FL-12/FL-DOE-89453/passages.jsonl 2> docs/general-election/brief-runs/FL-12/FL-DOE-89453/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-12/FL-DOE-89453/passages.jsonl --json docs/general-election/brief-runs/FL-12/FL-DOE-89453/run.json > docs/general-election/brief-runs/FL-12/FL-DOE-89453/run-report.txt 2> docs/general-election/brief-runs/FL-12/FL-DOE-89453/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:41:45Z → 2026-09-29T11:41:52Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **73** (1437 words) from 3 page(s); keyword crawl: 47 from 4 |
| Links | 140 on the homepage, 16 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 1 (cap 8) |
| About page | https://kimberlyoverman.com/meet-kimberly (45 passage(s)) |

| Page | Passages |
|---|---|
| https://kimberlyoverman.com/ | 18 |
| https://kimberlyoverman.com/issues | 10 |
| https://kimberlyoverman.com/meet-kimberly (About) | 45 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.84 | 0.03 | policy | /issues | The Issues |
| 0.37 | 0.05 |  | /es | Español |
| 0.24 | 0.11 |  | /issues/kimberly-on-substack | Kimberly On Substack |
| 0.18 | 0.02 |  | /news-and-events/press-releases | Press Releases |
| 0.17 | 0.74 | about | /meet-kimberly | Meet Kimberly |
| 0.10 | 0.02 |  | /news-and-events | News &#038; Events |
| 0.10 | 0.02 |  | /news-and-events/news | In the News |
| 0.07 | 0.02 |  | /news-and-events/endorsements/endorsements-democratic-veterans-caucus-of-florida | Democratic Veterans Caucus of Florida |
| 0.06 | 0.02 |  | /news-and-events/endorsements/endorsements-florida-lgbtq-democratic-caucus-endorses-kimberly-overman-for-floridas-12th-congressional-district | The Florida LGBTQ+ Democratic Caucus |
| 0.06 | 0.02 |  | /news-and-events/endorsements/endorsements-mdf-pac-22-endorses-kimberly-overman |  |
| 0.06 | 0.02 |  | /news-and-events/endorsements/endorsements-democratic-progressive-caucus-of-florida-endorses-kimberly-overman |  |
| 0.05 | 0.02 |  | /news-and-events/endorsements/endorsements-moms-demand-action-endorses-kimberly-overman | Moms Demand Action |
| 0.05 | 0.02 |  | /news-and-events/endorsements/endorsements-emgage-action-endorses-kimberly-overman-for-floridas-12th-congressional-district | Emgage Action |
| 0.05 | 0.02 |  | /news-and-events/endorsements/endorsements-national-womens-political-caucus-endorses-kimberly-overman |  |
| 0.05 | 0.02 |  | /news-and-events/endorsements/endorsements-equality-florida-endorses-kimberly-overman | Equality Florida |
| 0.04 | 0.02 |  | /news-and-events/endorsements | Endorsements |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 73 of 73 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 16 |
| …and match a taxonomy issue | 14 |
| Tokens | 255484 in, 33434 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
