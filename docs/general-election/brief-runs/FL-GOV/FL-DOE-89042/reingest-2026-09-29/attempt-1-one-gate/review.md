# Step 3 review: FL-DOE-89042 (Byron Donalds), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-89042/reingest-2026-09-29`
- OFFICIAL_SITE: https://byrondonalds.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json`, schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85. 58 passages asked, 45 marked `states_policy`, 28 with an issue tag, 0 failed.
- Method: a node script loaded `run.json` and `passages.jsonl` and compared them. It also re-derived `states_policy` (commitment >= 0.85) and `issues` (score >= 0.85) from the stored scores. Both matched the stored values for all 58 passages.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | PASS |
| 4 | Silence recorded, not filled | PASS (A2 = 0, no_stated_position_found) |
| 5 | Possible misses (policy on a SPINE issue marked as no policy) | PASS (none found; information only) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 58 passage URLs in `run.json` are on the host `byrondonalds.com`. No other host appears, and there are no redirects.

| URL | Passages |
|---|---|
| https://byrondonalds.com/ | 8 (a6dd6069, 0c6e541c, 3e06693f, 43f49253, 55b7dc1c, e9147a5c, 29c7c58e, 034a4667) |
| https://byrondonalds.com/issues/law-and-order | 5 |
| https://byrondonalds.com/issues/education | 19 |
| https://byrondonalds.com/issues/affordability | 10 |
| https://byrondonalds.com/issues/space-and-tech | 5 |
| https://byrondonalds.com/issues/economy | 5 |
| https://byrondonalds.com/issues/healthcare | 6 |

Other hosts: none. `links.jsonl` lists only same-host links. The four supporter-coalition pages (`/vets`, `/latinos-for-byron`, `/businesswomen-for-byron`, `/faith-leaders-for-byron`) were not chosen and did not produce passages.

### 2. Quotes verbatim: PASS

The script compared the UTF-8 bytes of `text` (`Buffer.compare`), plus `url` and `heading`, for each of the 45 passages marked `states_policy: true` against the passage with the same id in `passages.jsonl`.

- Mismatches: 0 of 45.
- Extended to all 58 passages: 0 mismatches. There are no ids in `passages.jsonl` that are missing from `run.json`, no ids in `run.json` that are missing from `passages.jsonl`, and no duplicate ids.
- The curly quotes around the issue-page lead passages (for example cff91837, 7ada4c7b, c45a38db and 17fb524d) are in `passages.jsonl` too, so they are not added by the run.

### 3. No inferred motive: PASS

None of the 45 `states_policy: true` passages is only biography, an attack on an opponent, fundraising or event copy. The site's biography and event passages are all marked `states_policy: false`:

- 034a4667 (bio, c=0.04): "Born and raised in Brooklyn, New York, Byron Donalds is the product of a single-parent household. Throughout his life, his"
- 29c7c58e (tagline, c=0.07): "A conservative warrior for Florida's 19th Congressional District."
- 5f460e85 (summit/event, c=0.73): "Bring leading private aerospace innovators and engineers together to ensure Florida stays the world's top launchpad."

The run also has no fundraising copy, and no passage names an opponent.

These passages are marked as policy but are mostly slogan or framing. Each still ends in a general commitment, so none is a failure. They are listed so the founder can decide whether to use them as quotes:

- a6dd6069 (c=0.86, A4): "Florida cannot become too expensive for working families and seniors on fixed incomes. The status quo has a cost. Progress doesn't"
- cff91837 (c=0.89, A4): the same text as a6dd6069, taken from /issues/affordability.
- 17fb524d (c=0.86, B1): "“California passes heavy regulations. New York sends you the bill. Florida puts out the welcome mat. Bureaucratic delays shouldn't stop honest people" This passage contrasts Florida with other states and does not attack an opponent. Its homepage duplicate, 3e06693f, scored c=0.81 and is marked `states_policy: false`, so the same words fall on opposite sides of the gate.

### 4. Silence recorded, not filled: PASS

This counts passages that clear 0.85 for each SPINE issue. Every tagged passage below is also `states_policy: true`, so every one appears in `run.json` `areas`.

| SPINE issue | Passages clearing threshold | Ids (score) | Coverage |
|---|---|---|---|
| A1 Property insurance costs | 4 | e76d6c8c (0.94), 1821943e (0.97), d4e685a7 (0.98), 3aafe4d7 (0.95) | stated |
| A3 Property taxes | 1 | 4ee02003 (0.98) | stated |
| A2 Housing affordability | 0 | none | no_stated_position_found |
| A4 Cost of living in Florida | 2 | a6dd6069 (0.97), cff91837 (0.97) | stated. Both passages are the same sentence, from the homepage and from /issues/affordability, so they are one statement. |

`run.json` `areas` has no A2 entry. Nothing was added to fill that gap.

### 5. Possible misses: none found (information only)

13 passages are marked `states_policy: false`: 0c6e541c, 3e06693f, 43f49253, 29c7c58e, 034a4667, 01e3897b, 1911fef8, 79ff5e43, a23109ad, d69a7bd2, 1769d07b, 5f460e85, a27541d1. They cover healthcare, the economy and regulation, education and careers, aerospace training, biography and an event. None states a commitment on A1, A2, A3 or A4. Every one of them scores 0.06 or less on each SPINE issue.

Outside this check's scope, for the founder: b9a05399 is marked `states_policy: true` (c=0.96) but has no issue tag (A1 0.55, A4 0.63). It is under the heading "Bring Down Your Insurance Bill:" and begins "Lower costs by trimming down state fees when reserves are full so those extra dollars stay in your wallet. Pursue regulatory". It is not a Check 5 miss, and it does not change the A1 count above.

## Other notes (not scored)

- The constitution template in the review header gives the attribution example "Senator Byron Donalds says…". The candidate's own site calls him a "Member of Congress" (034a4667) for "Florida's 19th Congressional District" (29c7c58e). No site source supports the title "Senator". Any claim attribution should use a title the sources support, and the template should be corrected so it does not produce a title with no source.
- The site has no about page (`ingest.log`: "about page: none"). The only biography passages come from the homepage.

VERDICT: PASS
