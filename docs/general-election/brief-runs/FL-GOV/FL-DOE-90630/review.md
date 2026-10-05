# Profiler review: FL-DOE-90630 (Charles Burkett, FL-GOV-general)

- Official site: https://burkettforgov.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 189 passages, 189 asked, 89 state a policy, 43 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye. Checks 3 and 5 are a reading of the full text of all 189 passages.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS: one host, `burkettforgov.com` |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS: 0 mismatches over 89 policy passages |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (4 borderline items listed below) |
| 4 | Silence recorded, not filled | PASS: A1 = 6, A3 = 10, A2 = 9, A4 = 2. No spine issue is 0. (3 of the 6 A1 passages are about health insurance; see note) |
| 5 | Possible misses (information only, not a fix) | 4 spine passages listed, plus 2 stance-only passages |

## 1. Candidate-controlled sources only: PASS

- All 189 passage URLs in `run.json` have host `burkettforgov.com`. There is only one distinct URL: `https://burkettforgov.com/`. All 64 citation copies inside `run.json.areas` are on the same host. `run.json.site` is `https://burkettforgov.com`. `passages.jsonl` also has 189 lines, all on that host. No other host appears.
- `ingest.log` has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines. It reads `47 links, 0 policy page(s) selected (cap 8)`, so only the homepage was fetched.
- Coverage note, not a failure: passage `fc5f1300` reads "You can read more about the views and positions I would put forward in the Governor's campaign at my political positions website:". The link target was not captured and no second site was fetched. This review makes no guess about what that site says.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 189 lines and 189 unique ids. `run.json` has 189 passages, with no duplicate ids. Every id is present in both files.
- All 89 passages with `states_policy: true` have `text` that is byte-identical (Buffer.compare over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 189 passages, and over all 64 citation copies in `run.json.areas`, found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)` (0 mismatches). `issues` equals the set of issue scores of 0.85 or more, in taxonomy order (0 mismatches). As `readVerdict` in `src/lib/policy-noul.ts` is written, `issues` is filled whether or not the gate cleared. So 13 passages with `states_policy: false` carry a non-empty `issues` list (for example `d8c863ac` A1, `c33cb06c` A2, `ed1ddc72` A3). `groupByArea` skips them, so they appear neither in `areas` nor in the `with_issue` count of 43. Anyone reading `issues` straight from `run.json` must apply the gate as well.

## 3. No inferred motive: PASS

None of the 89 policy passages is biography, fundraising or event copy, and none attacks a named opponent. The copy of that kind was all gated out: the biography passages (`836cb4dc` through `88b8e971`), the "Charles Burkett is like: Fishback without the Baggage..." comparison to named opponents (`71d712a3`, commitment 0.07), the "Not accepting contributions" line (`6037f1fe`, 0.59), and the cookie banner (`4030f6b2`).

Borderline items. These passed the gate and contain no commitment in their own text. None is biography, fundraising, event copy or an attack on an opponent, so none fails the check. They are listed for the founder:

- `450bbf6d` (commitment 0.94; A2 0.97, KYV3): "The failed “Live Local Act” and its clones are a disgrace: they deliver almost zero low-cost housing for struggling Floridians," This criticizes an existing law and "connected developers and politicians". It counts toward A2. The matching commitment ("Repeal the Live Local Act sham...") is in a separate passage, `1cb783af` (KYV3). Any claim built from `450bbf6d` should be attributed wording ("The campaign website states...") and not a commitment.
- `c7bbb2db` (commitment 0.93; no issue): "Enough is enough. We’re done subsidizing failure. We’re done watching good tax dollars vanish into programs that reward dependency and" This is rhetoric that opens the Oasis Act section. It reaches no issue.
- `8ddf2414` (commitment 0.85; no issue): "The Problem is that Florida’s current auto insurance system allows too many drivers to operate vehicles without continuous coverage. This" This is a statement of the problem. It reaches no issue.
- `01b71a91` (commitment 0.90; no issue): "Worse, forcing this scheme into a legitimate market/risk-based insurance system destroys the risk-based market that functioned for centuries hurting more" This criticizes current health-insurance mandates. It reaches no issue.

## 4. Silence recorded, not filled: PASS

A passage counts when it clears the gate (`states_policy: true`, commitment of 0.85 or more) AND its score for the issue is 0.85 or more. The counts match `run.json.areas`.

| Spine issue | Count | Passage ids (score) |
|---|---|---|
| A1 Property insurance costs | 6 | `5e207323` (0.96), `3789356c` (0.95), `c3353068` (0.94), `d32bacab` (0.90), `b75e6a8b` (0.88), `00936d49` (0.85) |
| A3 Property taxes | 10 | `d8e26a50` (0.99), `00936d49` (0.99), `dda1273f` (0.99), `fd46b755` (0.99), `dc21f1a6` (0.97), `3d79efe9` (0.97), `bff08e12` (0.96), `8723ad72` (0.96), `817144f0` (0.96), `b75e6a8b` (0.94) |
| A2 Housing affordability | 9 | `450bbf6d` (0.97), `d8e26a50` (0.96), `31817c6e` (0.94), `b75e6a8b` (0.91), `3d79efe9` (0.91), `8723ad72` (0.89), `9b27b43f` (0.87), `2e406d3c` (0.86), `dda1273f` (0.85) |
| A4 Cost of living in Florida | 2 | `00936d49` (0.94), `d8e26a50` (0.91) |

No spine issue has 0, so no `no_stated_position_found` Position is needed.

For the record, issue scores of 0.85 or more on passages that did NOT clear the gate (not counted): A1 `d8c863ac` 0.90, `1818bd78` 0.86; A3 `ed1ddc72` 0.97, `7212feff` 0.90; A2 `c33cb06c` 0.89, `3597aa8a` 0.94, `8bd97699` 0.88; A4 none.

Note on A1, for the founder. It does not change the check, because A1 still has property-insurance passages. Three of the six A1 passages sit inside the site's healthcare section: the numbered list that starts at `a86b4a41` "1) Restore real incentives for doctors", and the passages that follow it, which describe a plan for pre-existing conditions. They are:
- `5e207323` "4) Restore our insurance market back to pricing risk, reflected in policy premiums." (item 4 of the healthcare list)
- `d32bacab` "This plan keeps private insurers handling day-to-day administration and negotiation, uses loans instead of grants to reduce moral hazard, only" (the health loan fund / state pool plan)
- `3789356c` "In other words, this plan would bring back “ real ” insurance coverage and aggressive competition, which will see premiums" (same plan)

On a faithful reading, the property-insurance passages are `00936d49` ("Completely rewrite broken property and auto insurance laws"), `c3353068` ("allow radical competition between ALL legitimate and financially strong insurance carriers...") and `b75e6a8b` (the one-time homestead exemption for homes that "cannot buy affordable insurance"). A claim that files the three health-insurance passages under "Property insurance costs" would misstate the candidate's topic.

## 5. Possible misses (information only, not a fix)

Passages the run marks `states_policy: false` that state a commitment on a spine issue:

- `7212feff` (commitment 0.75; A3 0.90): "This change would mean the potential maximum tax rate on one’s property would be necessarily dramatically reduced thereby reducing revenue" This quantifies the property-tax commitment in `fd46b755` ("Immediately reduce the Florida Constitutional maximum property tax rate by 50%"), at up to $18B.
- `10f8a469` (commitment 0.78; A3 0.03): "5) Other miscellaneous State and municipal savings of $1B." This is item 5 of the numbered property-tax relief list (items 1 to 7 at `fd46b755`, `6c3f36c4`, `3aa6ee7c`, `481249e9`, this one, `7800031c`, `3d79efe9`). It reads as spine-relevant only in that context.
- `89511dae` (commitment 0.42; A2 0.40): "To begin, AWH should be located near to the communities they serve. However, some believe that AWH should be built" This is a stated position on where affordable and workforce housing should be sited.
- `8baf3a3a` (commitment 0.84, just under the gate; A1 0.53, KYV4 0.89): "Lawmakers must tell homeowners the truth; that not all homes and home locations can be made safe against hurricanes, and" This is a normative statement in the property-insurance / hurricane section. It is weak as a commitment.

Stance without a commitment (A2), listed for completeness:
- `c33cb06c` (commitment 0.67; A2 0.89): "Affordable and workforce housing (AWH) are critical components of any successful community."
- `3597aa8a` (commitment 0.79; A2 0.94): "Not everyone can afford market housing options, hence the need for AWH options."

Non-spine misses seen in passing: `e1f1385f` (commitment 0.65; auto insurance, which is not A1 property insurance): "Drivers must provide proof of a full 12-month auto insurance policy before receiving a new or renewed Florida license tag". There are also the pension-plan list items `ef56cf92` (0.84) and `e14368ce` (0.63).

Ingest artifacts, harmless: `5b068c74`, `c9c38276` and `3759c2a0` are truncated duplicates of `b0b4dd3a`, `0612798f` and `3fc5058b`. All are biography and gated out.

VERDICT: PASS
