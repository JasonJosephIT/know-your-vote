# Step 3 review: FL-VF-ORA-1314 (Diana Moore), FL-ORA-SB3-general

Reviewer run under the Profiler constitution. Inputs read: `passages.jsonl` (13 passages), `run.json` (`status: complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `commitment` and `own_commitment`, 25 taxonomy issues), `ingest.log`. Official site: https://www.votefordianamoore.com/. SPINE: undecided, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts`.

Run summary: 13 asked, 0 failed. 3 passages `states_policy: true` (f6ceb676, 09572fc2, eddb2814), none with a taxonomy issue. `counts.with_issue` = 0 and `areas` = `[]`.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 13 run.json passages on `www.votefordianamoore.com`; no other host |
| 2 | Quotes verbatim | PASS | f6ceb676, 09572fc2, eddb2814 byte-identical (all 13 are) |
| 3 | No inferred motive | PASS | f6ceb676, 09572fc2, eddb2814 each carry a commitment; eddb2814 is weak (noted) |
| 4 | Silence recorded, not filled | PASS | 0 stated positions on all 25 issues; A6, B1 (a865722e) and KYV10 (44a5b1ff) score over the threshold but fail the own-commitment gate |
| 5 | Possible misses (information) | Reported | a865722e, 44a5b1ff (strong); a9ed59bd, 2d499b65, 8b703665 (weaker) |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

A node script parsed each `url` in `run.json` with `new URL()` and collected hosts. There is one host, `www.votefordianamoore.com`, which is the OFFICIAL_SITE host. All 13 passages have url `https://www.votefordianamoore.com/`, and each url matches the url of the same id in `passages.jsonl`. `ingest.log` shows one page read and no redirect. Other hosts: none.

### Check 2: quotes verbatim (PASS)

A node script compared `Buffer.from(text)` for each run.json passage against the passage with the same id in `passages.jsonl` using `Buffer.equals`. All 13 ids are in both files, and all 13 texts are byte-identical. That includes the three passages marked `states_policy: true`: f6ceb676, 09572fc2 and eddb2814.

### Check 3: no inferred motive (PASS)

The three passages marked as stating a policy:

- **f6ceb676** (commitment 0.89, own 0.87): "We can do a better job of advertising these options to the community and work to add additional ideas like micros schools." This continues her "Choice" plank. It states an action (advertise options, add micro-schools). It is a commitment, not biography.
- **09572fc2** (0.97, 0.96): "4) Transparency, Integrity and a Culture that doesn't threaten the livelihood of employees who speak up . I am personally…" It includes "I will ask for a Work Session to bring these concerns to light and improve the working conditions". That is a first-person commitment. The passage criticises the district's "Whistleblower Process" but does not attack a named opponent.
- **eddb2814** (0.86, 0.91): "*Disclaimer. There are great things happening in classrooms and schools every day. We don't hear about them enough. Let's do…" This is **borderline**. Most of it is reason-for-running and vote-ask copy ("I humbly ask for your vote for District 3"). It also contains "I will be an activist for public education and the rights of students in public education" and "always, ask the employees for their input". Those are general commitments, so it is not *only* campaign copy, and it does not fail the check. It matched no issue, so it produces no claim under any issue. The founder may still want to treat it as closer to slogan than policy.

No passage is marked as stating a policy while being only biography, an attack, fundraising or event copy.

### Check 4: silence recorded, not filled (PASS)

A passage counts as a stated position for an issue only when it clears both gates (`commitment` ≥ 0.85 and `own_commitment` ≥ 0.85) and its issue score is ≥ 0.85 (`policy-noul.ts` lines 206–211 and 246). By that rule, **every one of the 25 taxonomy issues has 0 passages**, so each is `no_stated_position_found`. This matches `counts.with_issue` = 0 and `areas: []`.

For completeness, these issues have a passage whose *issue score* alone is over the threshold. Neither passage passes the own-commitment gate, and the run correctly leaves both out of `areas`:

| Issue | Label | Issue score ≥ 0.85 | Passage (score) | Gates | Stated positions |
|---|---|---|---|---|---|
| A6 | Public school funding and teachers | 1 | a865722e (0.98) | commitment 0.95, own 0.84 | 0 |
| B1 | Economy, inflation, and jobs | 1 | a865722e (0.89) | commitment 0.95, own 0.84 | 0 |
| KYV10 | Career, vocational and higher education | 1 | 44a5b1ff (0.85) | commitment 0.93, own 0.81 | 0 |

Every other issue has 0 passages even on issue score alone: A1, A2, A3, A4, A5, A7, KYV9, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 (22 issues). All 25 issues: 0 stated positions, `no_stated_position_found`.

### Check 5: possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment in plain words.

Strong:

- **a865722e** (commitment 0.95, own 0.84, 0.01 under; A6 0.98, B1 0.89): "3) Professional Pay for Professional Work- Florida is ranked 50th in pay. How can we attract and keep the best". It goes on: "I can read the Comprehensive Annual Financial Report and look for the programs or "fat" in the budget… we can find solutions to pay our employees a living wage plus raise pay". This is the clearest stated position on the site, on A6 (teacher pay). The second gate is the only thing that keeps it out.
- **44a5b1ff** (commitment 0.93, own 0.81; KYV10 0.85, KYV9 0.70): "2) Choice - Ask parents and students why they are moving to other learning options? Is it the security? Is". It goes on: "We should survey parents and students for their needs… find other options to keep students learning in our public schools", and names Magnet and Career Technical Education programs. The issue fit is KYV10 and/or KYV9.

Weaker (the commitment is plain but the issue fit is uncertain or the stance is only a direction):

- **a9ed59bd** (commitment 0.84, 0.01 under; own 0.87; top issue A6 0.11): "A. We need to honestly review the research on the 1 to 1 computer devices and get feedback from teachers,"
- **2d499b65** (commitment 0.68, own 0.29; B7 0.66): "1) Safety -Students and employees need to know they are safe each and every day in their learning environment. We". It ends "We can always improve the security of our campuses." That states a direction, not a specific action.
- **8b703665** (commitment 0.82, own 0.76; top issue B1 0.16): "B. Ask staff for solutions. Maurice Draggon cut thousands of dollars in repair expenses by moving the laptops to a". It ends "Let's encourage the staff… with recognition and financial incentives."

Not misses: d840b499 (biography, with a value statement that students "deserve a qualified and certified teacher"), cfb55f52 (critique of board practice, no commitment), and ca35a4b8, bd93cfd5, 997a1021 (slogan, mission or vote copy).

### Other observations (not failures)

- `ingest-report.md` § "Step 2: policy run" is stale. It gives provenance `q-b2171346`, 5 states_policy, 2 with an issue and 46108/5954 tokens, which describes `attempt-1-one-gate/run.json`. The current `run.json` is `q-e7282116` (the added own-commitment gate), with 3 states_policy, 0 with an issue and 48812/6227 tokens. `run-report.txt` and `run.log` match the current run.
- The corpus is one homepage (895 words). Jev scored no internal link as a policy page (the highest was /home at 0.17), and no about page was found. The zeros in check 4 describe this one page only.
- Of the two passages that were stated positions in the one-gate run, a865722e (A6/B1) is now dropped by `own_commitment` 0.84, and the run lost KYV10 via 44a5b1ff (own 0.81). Both are first-person or "we" commitments on the candidate's own platform list, so the second gate looks too strict on this page. That is a calibration question for the founder, not a constitutional failure: the run under-reports and does not fabricate.

VERDICT: PASS
