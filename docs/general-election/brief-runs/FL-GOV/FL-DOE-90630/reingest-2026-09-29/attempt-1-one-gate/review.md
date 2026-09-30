# Step 3 review: FL-DOE-90630 (Charles Burkett), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-90630/reingest-2026-09-29`
- OFFICIAL_SITE: https://burkettforgov.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json`, schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85. 189 passages asked, 89 marked `states_policy`, 44 policy passages with an issue tag, 0 failed.
- Method: a node script loaded `run.json` and `passages.jsonl` and compared them. It also re-derived `states_policy` (commitment >= 0.85) and `issues` (score >= 0.85) from the stored scores. Both matched the stored values for all 189 passages. `counts.with_issue` = 44 counts policy passages only; 13 further passages carry issue tags but are `states_policy: false`, so they never reach `areas`.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | FAIL (1 passage: 450bbf6d, cited under spine A2) |
| 4 | Silence recorded, not filled | PASS (no spine issue at 0; see the A1 topic note below) |
| 5 | Possible misses (policy on a SPINE issue marked as no policy) | PASS (information only; 2 possible misses reported) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 189 passage URLs in `run.json` are on the host `burkettforgov.com`. So are all 64 citations in `areas`. No other host appears, and there are no redirects.

| URL | Passages |
|---|---|
| https://burkettforgov.com/ | 189 |

- `ingest.log` says the chosen policy page `https://burkettforgov.com/more-on-where-i-stand` produced "2 passage(s)". No passage in `passages.jsonl` or `run.json` has that URL. All 189 are attributed to the homepage. The two passages were probably dropped as duplicates of homepage text. This is still the same host, so check 1 passes, but the log and the corpus disagree.
- The site has no about page (`ingest.log`: "about page: none"). The biography passages ("My Personal Story", "My Political Story") come from the homepage.
- Passage fc5f1300 ("You can read more about the views and positions I would put forward in the Governor's campaign at my political positions website:") points to a separate "political positions website" that the run did not ingest. For the founder: that site may be a second candidate-controlled source, but it is not in the corpus. It was not fetched here.

### 2. Quotes verbatim: PASS

A node script compared the `text` of each passage `run.json` marks `states_policy: true` with the passage of the same id in `passages.jsonl`, byte for byte (`Buffer.compare` on UTF-8).

- 89 of 89 policy passages were byte-identical. `url` and `heading` also matched.
- All 189 passages were identical, and so was the id order.
- All 64 `areas` citation texts were identical to `passages.jsonl`, and every cited passage is `states_policy: true`.
- Mismatches: none.

### 3. No inferred motive: FAIL

One passage marked as stating a policy is attack copy with no commitment by the candidate. The run then cites it as evidence for spine issue A2:

| id | Issues | First 20 words |
|---|---|---|
| 450bbf6d | A2, KYV3 (cited in `areas` under A2) | The failed "Live Local Act" and its clones are a disgrace: they deliver almost zero low-cost housing for struggling Floridians, |

The rest of the passage reads "...bulldoze historic neighborhoods, and stuff millions into the pockets of connected developers and politicians. It's corporate welfare dressed up as compassion." It attacks a law and its "connected developers and politicians," and it states no action the candidate would take. The candidate's commitment on this topic is in a different passage: 1cb783af ("Repeal the Live Local Act sham..."), tagged KYV3 only. A claim built from 450bbf6d under A2 would show the candidate's housing position as attack language rather than as a commitment.

Borderline passages, listed for the founder but not counted as failures:
- 01b71a91 (no issue tag, so not in `areas`): "Worse, forcing this scheme into a legitimate market/risk-based insurance system destroys the risk-based market that functioned for centuries hurting more". This criticizes the pre-existing-conditions mandate and states no commitment.
- c7bbb2db (no issue tag): "Enough is enough. We're done subsidizing failure. We're done watching good tax dollars vanish into programs that reward dependency and". This is rhetoric. "We're done subsidizing" is at most an implied commitment.
- 8ddf2414 (no issue tag): "The Problem is that Florida's current auto insurance system allows too many drivers to operate vehicles without continuous coverage. This". This is a problem statement, not a commitment.

Biography, opponent-comparison and fundraising copy was correctly marked `states_policy: false`. That includes 71d712a3 ("Fishback without the Baggage..."), 6037f1fe ("Not accepting contributions..."), 8d5059f7, baeb6761, the "My Personal Story" and "My Political Story" passages, and the cookie banner 4030f6b2.

### 4. Silence recorded, not filled: PASS

Counted: passages with `states_policy: true` and a score >= 0.85 for the issue. These are the passages `areas` cites. Passages that clear the issue score but not the policy gate are shown separately.

| Spine issue | Clear threshold (policy + issue) | Passage ids | Issue score >= 0.85 but no policy (not counted) |
|---|---|---|---|
| A1 Property insurance costs | 5 | c3353068, b75e6a8b, 5e207323, d32bacab, 3789356c | d8c863ac, 1818bd78 |
| A3 Property taxes | 10 | d8e26a50, 00936d49, bff08e12, b75e6a8b, dda1273f, dc21f1a6, 8723ad72, 817144f0, fd46b755, 3d79efe9 | ed1ddc72, 7212feff |
| A2 Housing affordability | 8 | d8e26a50, b75e6a8b, 2e406d3c, 9b27b43f, 8723ad72, 3d79efe9, 450bbf6d, 31817c6e | c33cb06c, 3597aa8a, 8bd97699 |
| A4 Cost of living in Florida | 3 | d8e26a50, 00936d49, decdfa05 | none |

No spine issue is at 0, so none is recorded as `no_stated_position_found`.

**A1 topic note (outside the five checks, for the founder).** Three of the five A1 passages are about health insurance, not property insurance. They sit in the healthcare section, between "'Healthcare' has become a meaningless term" (8be95aa4) and the affordable-housing section (c33cb06c):
- 5e207323 "4) Restore our insurance market back to pricing risk, reflected in policy premiums." This is item 4 of the numbered healthcare list (a86b4a41, e520b94b, 826eae7a, 5e207323, c9563834).
- d32bacab "This plan keeps private insurers handling day-to-day administration and negotiation, uses loans instead of grants to reduce moral hazard, only" This describes the pre-existing-conditions loan-fund plan.
- 3789356c "In other words, this plan would bring back " real " insurance coverage and aggressive competition, which will see premiums" This refers to the same healthcare plan.

Only c3353068 (the competition and deductibles passage just before the hurricane-home section) and b75e6a8b (the hurricane-proof home exemption) are about property insurance. That makes 2 passages, not 5. A1 is not silent either way. However, A1 claims built from the three health-insurance passages would file the candidate's healthcare statements under property insurance, which does not represent his framing faithfully.

### 5. Possible misses: PASS (information only)

These passages are marked `states_policy: false` but state a position on a spine issue:

| id | Commitment | Spine score | First 20 words |
|---|---|---|---|
| 89511dae | 0.39 | A2 0.35 | To begin, AWH should be located near to the communities they serve. However, some believe that AWH should be built |
| 7212feff | 0.76 | A3 0.90 | This change would mean the potential maximum tax rate on one's property would be necessarily dramatically reduced thereby reducing revenue |

- 89511dae is a normative stance on where affordable and workforce housing should go.
- 7212feff spells out the property-tax rate cut that fd46b755 commits to ("Immediately reduce the Florida Constitutional maximum property tax rate by 50%"). fd46b755 is already counted under A3.

Also seen, but not counted as misses because they state no commitment: ed1ddc72 (a diagnosis of property taxes), 25193ef0 (the expected results of the property-tax steps), c33cb06c, 3597aa8a and 8bd97699 (statements about the need for affordable and workforce housing), and d8c863ac and 1818bd78 (analysis of the property-insurance market).

VERDICT: FAIL (check 3: 450bbf6d, attack copy with no commitment, marked as policy and cited under A2)
