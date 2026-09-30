# Step 3 review: FL-DOE-90630 (Charles Burkett), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29`
- OFFICIAL_SITE: https://burkettforgov.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json` (the two-gate re-run; the one-gate run and its review are in `attempt-1-one-gate/`). Schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85. 189 passages asked, 0 failed, 68 marked `states_policy`, 36 policy passages with an issue tag, 54 citations in `areas`.
- Method: a node script loaded `run.json` and `passages.jsonl` and compared them. It re-derived `states_policy` (commitment >= 0.85 AND own_commitment >= 0.85) from the stored scores: it matched the stored value for all 189 passages. `counts` (68 / 36) match the passages. Every `issues` tag has its score >= 0.85. 21 passages carry an issue tag while `states_policy: false`. None of them appears in `areas`.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | PASS |
| 4 | Silence recorded, not filled | PASS (no spine issue at 0; see the A1 topic note) |
| 5 | Possible misses (policy on a SPINE issue marked as no policy) | PASS (information only; 2 possible misses, 3 borderline) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 189 passage URLs in `run.json`, all 189 in `passages.jsonl`, and all 54 citation URLs in `areas` are on the host `burkettforgov.com`. No other host appears, and there are no redirects.

| URL | Passages |
|---|---|
| https://burkettforgov.com/ | 189 |

Notes for the founder (none of these changes the result):
- `ingest.log` says the chosen policy page `https://burkettforgov.com/more-on-where-i-stand` produced "2 passage(s)". No passage in `passages.jsonl` or `run.json` has that URL. All 189 are attributed to the homepage. The two passages were probably dropped as duplicates of homepage text. They are on the same host, but the log and the corpus disagree.
- Passage fc5f1300 ("You can read more about the views and positions I would put forward in the Governor's campaign at my political positions website:") points to a separate positions site. That site is not in the corpus and was not fetched here.
- `ingest-report.md` is stale. It shows the one-gate run's figures (provenance `q-b2171346`, 89 policy, 44 with issue), not this `run.json` (`q-e7282116`, 68 policy, 36 with issue).

### 2. Quotes verbatim: PASS

A node script compared, byte for byte (`Buffer.compare` on UTF-8), the `text` of each passage that `run.json` marks `states_policy: true` with the `passages.jsonl` passage that has the same id.

- All 68 policy passages were byte-identical. `url` and `heading` also matched.
- All 189 passages were identical. No ids were duplicated or missing on either side.
- All 54 `areas` citation texts were byte-identical to `passages.jsonl`, and every cited passage is `states_policy: true`.
- Mismatches: none.

### 3. No inferred motive: PASS

I read all 68 policy passages. Each one carries a commitment or a stated position by the candidate. None is only biography, only an attack on an opponent, fundraising copy or event copy. The bio section (ids 836cb4dc through fc5f1300), the "Charles Burkett is like:" comparison (71d712a3), "Not accepting contributions" (6037f1fe) and the cookie banner (4030f6b2) are all `states_policy: false`.

- The one-gate run failed this check on 450bbf6d ("The failed “Live Local Act” and its clones are a disgrace: they deliver almost zero low-cost housing for struggling Floridians,"). That passage now has own_commitment 0.52, so it is `states_policy: false` and is no longer cited under A2.
- Mixed passages that pass. Each contains pejorative wording but also a commitment:
  - 1cb783af: "Repeal the Live Local Act sham ... line the pockets of politicians" plus "Stop the Manhattanization", "Crush traffic ..."
  - 268f185d: "unconscious elected leaders", plus cutting budgets "by at least 5% and preferably 10%"
- Passages that pass but are thinner than a commitment (information only):
  - Section lead-ins: b3d626a2 ("Restore trust and ‘FedEx/UPS-style’ efficiency in government:"), 2176dc4d ("Radically Transform Florida’s Auto Insurance") and de25bb0e ("Goal: ...").
  - Predicted effects of the candidate's own plans: ebfb4ddd, c7faa02e, 24c22381 and d32bacab.

### 4. Silence recorded, not filled: PASS

Counts per spine issue. "Clear the threshold" means issue score >= 0.85. "Reach the brief" means the passage also passes both gates, which is what `areas` cites.

| Spine issue | Score >= 0.85 | Also `states_policy` (cited in `areas`) | Coverage |
|---|---|---|---|
| A1 Property insurance costs | 7 | 4: c3353068, b75e6a8b, 5e207323, d32bacab | stated |
| A3 Property taxes | 12 | 10: d8e26a50, 00936d49, bff08e12, b75e6a8b, dda1273f, dc21f1a6, 8723ad72, 817144f0, fd46b755, 3d79efe9 | stated |
| A2 Housing affordability | 11 | 6: d8e26a50, b75e6a8b, 9b27b43f, 8723ad72, 3d79efe9, 31817c6e | stated |
| A4 Cost of living in Florida | 2 | 2: d8e26a50, 00936d49 | stated |

No spine issue is at 0, so none should be `no_stated_position_found`.

Passages that clear the threshold but are `states_policy: false`, and so are correctly not cited:
- A1: d8c863ac, 1818bd78, 3789356c
- A3: ed1ddc72, 7212feff
- A2: c33cb06c, 3597aa8a, 8bd97699, 2e406d3c, 450bbf6d

A1 topic note, for the founder:
- Two of the four A1 citations are about health insurance, not property insurance. 5e207323 ("4) Restore our insurance market back to pricing risk, reflected in policy premiums.") is item 4 of the numbered healthcare list (a86b4a41 through c9563834). d32bacab ("This plan keeps private insurers handling day-to-day administration ...") sums up the pre-existing-conditions loan plan.
- A1 still has two property-insurance citations: c3353068 (radical competition between carriers and a menu of deductibles, directly before the hurricane-risk section) and b75e6a8b (the homestead-exemption incentive to buy a hurricane-proof home for owners who "cannot buy affordable insurance"). So A1 is not silent, and this is not a filled silence. It is a topic mis-tag that would put two healthcare lines under "Property insurance costs" in the brief.
- 00936d49 contains "Completely rewrite broken property and auto insurance laws". It is a policy passage, but its A1 score is 0.81, so it is not tagged A1.

### 5. Possible misses: PASS (information only)

These passages are marked `states_policy: false` but plainly state a position on a spine issue:

| id | Issue | Scores | First 20 words |
|---|---|---|---|
| 2e406d3c | A2 | c 0.94, own 0.82, A2 0.85 | "In short, AWH investment is desired and necessary. It should be used as a double-edged sword to both provide needed" |
| 89511dae | A2 | c 0.43, own 0.28, A2 0.35 | "To begin, AWH should be located near to the communities they serve. However, some believe that AWH should be built" |

Borderline. These are stances or effect statements rather than plain commitments, listed for completeness:

| id | Issue | Scores | First 20 words |
|---|---|---|---|
| 17620084 | A2 | c 0.86, own 0.41, A2 0.83 | "On the contrary, AWH built nearby, in blighted or lower income areas, has many benefits. Those benefits include the ability" |
| 8baf3a3a | A1 | c 0.84, own 0.45, A1 0.53 | "Lawmakers must tell homeowners the truth; that not all homes and home locations can be made safe against hurricanes, and" |
| 7212feff | A3 | c 0.77, own 0.76, A3 0.90 | "This change would mean the potential maximum tax rate on one’s property would be necessarily dramatically reduced thereby reducing revenue to" |

7212feff describes the effect of fd46b755 (cut the maximum property tax rate by 50%), and fd46b755 is already cited under A3.

VERDICT: PASS
