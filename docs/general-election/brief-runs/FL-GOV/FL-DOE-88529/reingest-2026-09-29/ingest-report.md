# Ingest and policy run: FL-DOE-88529 (Moliere "Moe" Dimanche), FL-GOV-general

Site: https://nomoecorruption.com/

Run by `jev-driver-2026-09-29.sh` (in `docs/general-election/brief-runs/`), from the repo root, with the ingest defaults (`--pages 8`, `--browser auto`, `--links jev`) and the policy run at the default threshold with no `--limit`:

```
node scripts/candidate-site-ingest.ts --site https://nomoecorruption.com/ --out docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/passages.jsonl 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/ingest.log
node scripts/candidate-policy-noul.ts --in docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/passages.jsonl --json docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/run.json > docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/run-report.txt 2> docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29/run.log
```

## Ingest

| Field | Value |
|---|---|
| Start / end (UTC) | 2026-09-29T11:46:38Z → 2026-09-29T11:46:45Z (7 s) |
| Exit code | 0 |
| Result | **SUCCESS** |
| Passages | **123** (7557 words) from 3 page(s); keyword crawl: 18 from 2 |
| Links | 91 on the homepage, 17 judged by Jev (`jev:jev-1.13.0/links/q-e03cabd0`) |
| Policy pages chosen | 2 (cap 8) |
| About page | **none** |

| Page | Passages |
|---|---|
| https://nomoecorruption.com/ | 12 |
| https://nomoecorruption.com/2024/12/06/judicial-cleanup | 29 |
| https://nomoecorruption.com/judicial-corruption | 82 |

### Every link Jev judged

Threshold 0.5. `policy` = likely to lead to stated positions; `about` = the candidate's own biography page.

| policy | about | chosen | link | text |
|---|---|---|---|---|
| 0.61 | 0.03 | policy | /2024/12/06/judicial-cleanup | Judicial Corruption |
| 0.53 | 0.02 | policy | /judicial-corruption | Lawfare |
| 0.34 | 0.31 |  | /constant-vigilance-what-made-moe | Constant Vigilance: What Made Moe? |
| 0.21 | 0.09 |  | /author/moliereexpressions | No MOE Corruption |
| 0.18 | 0.02 |  | /2026/07/09/byron-donalds-gets-sued-for-assault-but-fishbacks-racist-response-is-worse-why-voting-npa-is-the-best-option-for-governor-of-florida | Byron Donalds Gets Sued for Assault, but Fishback’s Racist R |
| 0.15 | 0.10 |  | /the-moe-dimanche-show | The Moe Dimanche Show |
| 0.15 | 0.04 |  | /2026/06/28/desantis-says-alligator-alcatraz-is-closed-tps-status-for-haitians-revoked-as-haitian-american-candidate-moe-dimanche-qualifies-for-florida-governor-race | DeSantis says Alligator Alcatraz is closed, TPS Status for H |
| 0.14 | 0.03 |  | /moe-war-room | Moe War Room |
| 0.12 | 0.02 |  | /2026/07/17/floridas-bad-cop-problem-why-moe-will-suspend-t-k-waters-from-office | Florida’s Bad Cop Problem: Why Moe Will Suspend T.K. Waters  |
| 0.11 | 0.07 |  | /connect | Connect |
| 0.11 | 0.02 |  | /2026/07/03/i-watched-the-republican-debate-so-you-didnt-have-to | I Watched the Republican Debate So You Didn’t Have To |
| 0.10 | 0.06 |  | /2026/02/11/the-day-santa-rosa-county-stood-up-for-kenlee-and-the-missing-piece-of-the-puzzle | The Day Santa Rosa County Stood Up for Kenlee, and the Missi |
| 0.08 | 0.02 |  | /2026/08/06/corruption-alert-why-voters-must-reject-tiffany-moore-russell-and-roberta-walton-roberts | CORRUPTION ALERT: Why Voters Must REJECT Tiffany Moore-Russe |
| 0.07 | 0.02 |  | /2026/08/04/judge-who-asked-black-woman-if-she-ever-chopped-cotton-has-plea-deal-rejected-by-supreme-court-after-florida-governor-candidate-reveals-judge-rigged-foreclosure | Judge who asked Black woman if she ever “chopped cotton” has |
| 0.07 | 0.02 |  | /2026/07/21/entire-federal-courthouse-recuses-after-public-corruption-lawsuit-by-florida-governor-candidate | Entire Federal Courthouse Recuses after Public Corruption La |
| 0.07 | 0.02 |  | /2026/07/12/the-passing-of-lindsey-graham-hurts-the-anti-corruption-movement | The Passing of Lindsey Graham hurts the Anti-Corruption Move |
| 0.06 | 0.02 |  | /2026/07/14/public-opinion-poll-how-likely-are-you-to-vote-no-party-affiliation-this-year | Public Opinion poll: How likely are you to vote No Party Aff |

### robots.txt / Crawl-delay / bot-challenge / browser / unreachable lines (verbatim)

None.

## Step 2: policy run (Jev)

| Field | Value |
|---|---|
| Status | complete (exit 0) |
| Provenance | `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 |
| Asked | 123 of 123 passages, 0 failed |
| State a policy (gate ≥ 0.85) | 10 |
| …and match a taxonomy issue | 8 |
| Tokens | 438473 in, 56334 out |

The per-passage verdicts are in `run.json`, and the printed report in `run-report.txt`.
