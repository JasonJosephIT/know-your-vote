# Step 3 review: FL-DOE-89042 (Byron Donalds), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29`
- OFFICIAL_SITE: https://byrondonalds.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json`, schema `kyv.policy-run/1`, status `complete`, created 2026-09-30T01:59:32Z, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85. It has two gates: `states_policy` requires `commitment` >= 0.85 and `own_commitment` >= 0.85 (`src/lib/policy-noul.ts` `readVerdict`). 58 passages asked, 31 marked `states_policy`, 19 with an issue tag, 0 failed.
- Method: a node script loaded `run.json` and `passages.jsonl`, compared them byte for byte, and re-derived both gates and the issue tags from the stored scores. The re-derived `states_policy` and `issues` matched the stored values for all 58 passages. `passages.jsonl` and `run.json` hold the same 58 ids.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | PASS |
| 4 | Silence recorded, not filled | PASS (A1 = 4; A3 = 0, A2 = 0, A4 = 0, each no_stated_position_found) |
| 5 | Possible misses (a SPINE commitment marked as no policy) | PASS (information only: 1 clear possible miss, 2 borderline) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 58 passage URLs in `run.json`, and all 58 in `passages.jsonl`, are on the host `byrondonalds.com`. No other host appears. No redirects are recorded.

| URL | Passages |
|---|---|
| https://byrondonalds.com/ | 8 (a6dd6069, 0c6e541c, 3e06693f, 43f49253, 55b7dc1c, e9147a5c, 29c7c58e, 034a4667) |
| https://byrondonalds.com/issues/law-and-order | 5 |
| https://byrondonalds.com/issues/education | 19 |
| https://byrondonalds.com/issues/affordability | 10 |
| https://byrondonalds.com/issues/space-and-tech | 5 |
| https://byrondonalds.com/issues/economy | 5 |
| https://byrondonalds.com/issues/healthcare | 6 |

- The four "... for Byron" coalition pages (`/vets`, `/latinos-for-byron`, `/businesswomen-for-byron`, `/faith-leaders-for-byron`) were judged but not chosen (policy 0.10 to 0.18), so none of their text is in the run.
- The site has no about page (`ingest.log`: "about page: none"). The only biography passages (29c7c58e, 034a4667) come from the homepage, and both are marked `states_policy: false`.
- The constitution template in the review header uses the attribution example "Senator Byron Donalds says…". The candidate's own site calls him a "Member of Congress" (034a4667) for "Florida's 19th Congressional District" (29c7c58e). No site source supports the title "Senator". Claim attribution should use a title the sources support, and the template should be corrected.

### 2. Quotes verbatim: PASS

The script compared, for each of the 31 passages marked `states_policy: true`, the UTF-8 bytes of `text` in `run.json` with the passage of the same id in `passages.jsonl` (`Buffer.compare`). It also compared `url` and `heading`. 0 mismatches. The same comparison over all 58 passages also gave 0 mismatches.

The 31 passages marked as stating a policy: 55b7dc1c, 7ada4c7b, 313a7d23, ccba2d60, db5027b7, 8ac14436, e8c2a0ed, 33c2929d, dd469f57, 69b72584, a2d97e27, 36c9a37c, 91baea04, a513063b, 13260f58, e76d6c8c, b9a05399, 1821943e, d4e685a7, 3aafe4d7, 6820b405, 882fad85, 6621e821, 22e46b35, 00ea54b4, 77b3ea9a, e9f051cd, b5b9e04e, e4a56182, aa862e35, f634468f.

### 3. No inferred motive: PASS

Each of the 31 passages marked `states_policy: true` states a commitment ("Require…", "Keep…", "Cut off…", "Provide…", "Work to move…", "We must…"). None is only biography, an attack on an opponent, fundraising, or event copy.

- The biography passages 29c7c58e ("A conservative warrior for Florida's 19th Congressional District.") and 034a4667 ("Born and raised in Brooklyn, New York, Byron Donalds is the product of a single-parent household…") are marked `false` (commitment 0.07 and 0.04).
- The homepage and issue-page teasers that contrast other states (3e06693f, 17fb524d: "California passes heavy regulations. New York sends you the bill. Florida puts out the welcome mat…") are marked `false` because they fail the second gate (own_commitment 0.35 and 0.43).
- Edge cases, noted but not failures: 55b7dc1c (homepage) and 7ada4c7b (the same sentence as a pull quote on `/issues/law-and-order`) are a general "We must secure our borders, keep local neighborhoods safe, stop taxpayer handouts to illegal immigration, and keep deadly drugs off our streets." It is a stated goal, not biography or attack copy, and it is tagged B3 only. It duplicates the page's own specific commitments (313a7d23, db5027b7, 8ac14436).

### 4. Silence recorded, not filled: PASS

"Clears the threshold" is counted two ways. "Tagged" means the issue score is >= 0.85. "Claimable" means the passage is tagged and also passes both `states_policy` gates, so only claimable passages can back a stated_position claim. `run.json` `areas` lists only claimable passages (`groupByArea` skips passages that do not state a policy), and no spine issue with 0 claimable passages appears there.

| Spine issue | Tagged (score >= 0.85) | Claimable (tagged + states_policy) | Position |
|---|---|---|---|
| A1 Property insurance costs | 4: e76d6c8c (0.95), 1821943e (0.97), d4e685a7 (0.98), 3aafe4d7 (0.95) | **4** | stated (area `insurance`) |
| A3 Property taxes | 1: 4ee02003 (0.97), fails gate 2 (own_commitment 0.76) | **0** | no_stated_position_found |
| A2 Housing affordability | 0 | **0** | no_stated_position_found |
| A4 Cost of living in Florida | 2: a6dd6069 (0.97), cff91837 (0.97), both fail gate 2 (own_commitment 0.37, 0.43) | **0** | no_stated_position_found |

A3, A2 and A4 are recorded as 0. This review does not suggest any passage that "probably" covers them. See check 5 for the passages the founder may want to look at.

### 5. Possible misses: PASS (information only, not a fix)

Passages marked `states_policy: false` that state a commitment on a SPINE issue:

- **4ee02003** (`/issues/affordability`, "Protect Homeowners & Utility Payers:"): "Keep property taxes in check so seniors and working families aren't taxed out of their homes." This is a plain commitment on A3 (score 0.97; A2 0.79, A4 0.73). It passed gate 1 (commitment 0.94) and failed gate 2 (own_commitment 0.76). It is the only passage on the site that is tagged A3, so this one gate decision is what turns A3 from a stated position into no_stated_position_found.
- Borderline, **44a9504f** (`/issues/affordability`, "Protect Homeowners & Utility Payers:"): "Stop giant industrial data centers from passing their massive electric and water bills onto everyday households." This is a commitment (commitment 0.94, own_commitment 0.74), but it is tagged KYV2 (0.98), not a spine issue. A4 scores 0.59, so a pass on the gate would still not have tagged it A4.
- Borderline, **a6dd6069** (homepage) and **cff91837** (the same text as a pull quote on `/issues/affordability`): "Florida cannot become too expensive for working families and seniors on fixed incomes. The status quo has a cost. Progress doesn't pay the bill…" This is tagged A4 (0.97) but is a general goal ("it's time to bring down costs") with no specific commitment, and it fails gate 2 (0.37, 0.43). Listed for completeness, not as a clear miss.

Related, not a spine miss under this check's definition: three passages marked `states_policy: true` on the "insurance" part of the affordability page carry no issue tag, so they do not count toward A1. They are b9a05399 "Lower costs by trimming down state fees when reserves are full… Pursue regulatory reforms that lower insurance premiums." (A1 0.54), 6820b405 "Create a simple online Scorecard where you can compare insurance companies side by side on price…" (A1 0.20) and 882fad85 "Require insurers to report accurate data or pay real fines…" (A1 0.20). A1 already has 4 claimable passages, so these do not change A1's coverage.

### Other notes

- `ingest-report.md` gives the Step 2 provenance as `jev:jev-1.13.0/tax-7/q-b2171346`. That is the single-gate run now kept in `attempt-1-one-gate/`. The run reviewed here is `q-e7282116` (two gates, 31 states_policy, not 45). The report's Step 2 section describes the earlier attempt.
- Compared with the single-gate attempt, gate 2 removed A3 (4ee02003) and A4 (a6dd6069, cff91837) from the claimable set. The A3 loss is the one to look at (check 5).

VERDICT: PASS
