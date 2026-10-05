# Step 3 review: FL-DOE-89231 (Jose Javier Rodriguez), FL-ATG-general

Reviewed 2026-09-30, read-only, against the Profiler constitution. Nothing was fetched from the web.

Inputs: `passages.jsonl` (17 passages), `run.json` (status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, 17 asked, 0 failed, 3 state a policy, 1 with a taxonomy issue), `ingest.log`.

The gate, per `src/lib/policy-noul.ts` lines 206-208: `states_policy` is true only when BOTH `commitment >= 0.85` AND `own_commitment >= 0.85`. Issue tags are computed on every passage whatever the gate says, but only passages with `states_policy: true` reach `areas` (line 246). So a tag on a gated-out passage never becomes a finding.

SPINE: not yet decided for this race. As instructed, check 4 lists every taxonomy issue (tax-7, 25 sub-issues) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked by script) | **PASS** |
| 3 | No inferred motive (no non-commitment passage marked as policy) | **PASS** (one note on 4fdf0cc1) |
| 4 | Silence recorded, not filled | **PASS** (B7 = 1; the other 24 issues = 0, `no_stated_position_found`) |
| 5 | Possible misses (information only) | **Reported**: 4 clear misses on taxonomy issues, plus 5 commitments with no clear issue |

## Evidence

### 1. Candidate-controlled sources only: PASS

OFFICIAL_SITE host: `www.jjr.vote`. A Node script collected `new URL(url).host` for every passage in `run.json`. Every passage is on one host, and no other host appears:

- `www.jjr.vote`: all 17. From `https://www.jjr.vote/`: c7830d38, 19195412, 8f919b11. From `https://www.jjr.vote/priorities`: 16e1a282, 782ad994, 6ee36adc, c1fc065e, d90e8b01, 2e2445d5, edc58216, bd7d4d2b, 2249eba7, d774b2ad. From `https://www.jjr.vote/about`: 8b3e8193, 7b9b3d2a, 4fdf0cc1, 76753caf.

No redirects are recorded. `ingest.log` has no robots, bot-challenge or unreachable lines. The run did not follow `/endorsements` or `/media`: Jev scored them 0.04 and 0.08 for policy in `links.jsonl`, so they were not chosen.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` row with the same id. It compared `text` byte for byte with `Buffer.equals` on the UTF-8 bytes, and it also compared `url` and `heading`.

- The id sets match: both files hold the same 17 ids, with none missing on either side.
- `text` is byte-identical for all 17. That covers the 3 passages marked `states_policy: true` (16e1a282, bd7d4d2b, 4fdf0cc1) and the one citation in `areas` (16e1a282, B7).
- `url` and `heading` are also identical for all 17.

### 3. No inferred motive: PASS

Passages marked `states_policy: true`:

| id | first 20 words | reading |
|---|---|---|
| 16e1a282 | Support law enforcement, advocate for victims, protect witnesses and address gun violence. | A commitment on the priorities page, under "crime." |
| bd7d4d2b | Root out corruption and fraud in government and business alike. | A commitment on the priorities page, under "Corruption." |
| 4fdf0cc1 | In 2020, FP&L approved and funded a criminal "ghost candidate" scheme to trick voters during my re-election to the State … | Mixed. See the note below. |

None of these is only biography, attack, fundraising or event copy. All three fundraising passages (c7830d38, 19195412, 8f919b11) and the purely biographical 8b3e8193 were correctly gated out: commitment ≤ 0.40 and own_commitment ≤ 0.17.

**Note on 4fdf0cc1 (not a failure).** The passage opens with the candidate's allegation that a named third party (FP&L) funded a "criminal" scheme. It closes with a jab, "not a hyper-political hack servant of the powerful". It does also contain a first-person commitment: "Now running for Attorney General, I'm committed to bringing stability back to the office and refocus it on a mission of fighting crime, costs and corruption. I will serve as a steady, professional and independent-minded enforcer of the law". So it clears the "only" test. It carries no taxonomy issue, so it enters no issue Position. If a stated_position claim is ever drawn from it as a candidate-tier item, the claim should quote only the commitment sentences, attributed to the candidate. It should not restate the FP&L allegation in the project's voice, which would breach constitution rules 3 and 4.

### 4. Silence recorded, not filled: PASS

The run's findings (`areas`) contain exactly one issue, B7, with one citation (16e1a282, score 0.95). That is the only passage that both passed the gate and cleared 0.85 on an issue. Nothing was placed in `areas` without a passage behind it.

Issues with at least one passage scoring ≥ 0.85, whatever the gate said:

| issue | label | passages ≥ 0.85 (any) | ids | of those, `states_policy: true` | coverage |
|---|---|---|---|---|---|
| B7 | Crime policy, policing and courts | 2 | 16e1a282 (0.95), 2e2445d5 (0.93) | **1** (16e1a282) | stated |
| A1 | Property insurance costs | 1 | d90e8b01 (0.90) | **0** | no_stated_position_found |
| KYV2 | Energy and utilities | 2 | d90e8b01 (0.92), 7b9b3d2a (0.88) | **0** | no_stated_position_found |

The other 22 taxonomy issues have **0** passages at or above 0.85. They are recorded as `no_stated_position_found`: A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B8, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

The "(any)" column counts gated-out passages only so the founder can see them. They are not findings. As the table shows, A1 and KYV2 count 0 for coverage, and they stay 0 here.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, yet each plainly states a commitment on a taxonomy issue. In every case the passage cleared the first gate (commitment ≥ 0.85) and was held back only by the second gate (own_commitment 0.81 to 0.83). These are bulleted imperatives on the candidate's own "Priorities" page. The second gate appears to read that verbless list style as not the candidate's own commitment.

| id | first 20 words | commitment / own | issue scores |
|---|---|---|---|
| d90e8b01 | Deliver real relief for homeowners and small businesses from skyrocketing insurance costs and electric bills. | 0.90 / 0.82 | KYV2 0.92, A1 0.90 (both over threshold) |
| 2e2445d5 | Crack down on scammers targeting Florida families, renters or homeowners. | 0.91 / 0.81 | B7 0.93 (over threshold) |
| 782ad994 | Get fentanyl and dangerous drugs off our streets. | 0.93 / 0.83 | B7 0.84 (just under) |
| c1fc065e | Protect seniors and veterans from exploitation and abuse. | 0.92 / 0.83 | B7 0.81 (just under) |

These are also commitments, all on the Priorities page, but no taxonomy issue plainly fits them. They would be candidate-tier at most:

| id | first 20 words | commitment / own | top issue score |
|---|---|---|---|
| 6ee36adc | Protect our children from emerging threats from technology online and via social media. | 0.91 / 0.81 | B7 0.41 |
| edc58216 | Stand up for Florida families against bad actors who cheat or take advantage of them. | 0.77 / 0.68 | B7 0.62 |
| 2249eba7 | Defend Floridians' constitutional and individual rights. | 0.85 / 0.75 | KYV1 0.48 |
| d774b2ad | Serve as a fair, independent advocate for all Floridians — not special interests. | 0.77 / 0.77 | KYV1 0.47 |
| 76753caf | I'm focused on keeping Floridians safe, fighting to lower costs, and rooting out corruption, all while serving as a fair, … | 0.82 / 0.81 | A4 0.84 |

Correctly gated out, recorded here for contrast: 7b9b3d2a ("I stood up to the most powerful special interests when they sought to take advantage of us as insurance policyholders, …") scores KYV2 0.88. It describes the candidate's past record, not a commitment (own_commitment 0.27), and the second gate kept it out as it should.

### Housekeeping observations (outside the five checks)

- **`ingest-report.md` is stale against `run.json`.** Its Step 2 table gives provenance `jev:jev-1.13.0/tax-7/q-b2171346` with 9 states-policy and 4 with an issue. The current `run.json` and `run-report.txt` give `q-e7282116` with 3 and 1. The report matches the earlier run kept in `attempt-1-one-gate/`, not this one. This review used `run.json`.
- **Per-page passage counts disagree in `ingest.log`.** The log shows 11 passages from /priorities and 5 from /about. `passages.jsonl` holds 10 and 4, which is what `ingest-report.md` shows. The total of 17 agrees across all files. The per-page lines in the log look like pre-dedup counts.

VERDICT: PASS
