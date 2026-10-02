# Step 3 review: FL-VF-ORA-1318 (Gloria Reina O'Neal), FL-ORA-SB2-general

Reviewer role: I checked that the run could only produce claims the Profiler constitution allows. I wrote no claims, fetched no website and edited no other file.

- Official site: https://votegloriareina.com/
- Run: `run.json`, schema `kyv.policy-run/1`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`. 39 passages asked, 0 failed, 6 marked `states_policy` (both gates, `q_states_policy` and `q_own_commitment`), 1 of them with a taxonomy issue.
- Spine: not yet set for this race. Check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues, all 25 asked in this run) with at least one passage over the threshold. Check 5 considers every taxonomy issue.
- Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 39 passages in `run.json`, all 39 in `passages.jsonl`, and the one `areas` citation (8bbba21e) are on host `votegloriareina.com`. No other host, no redirect. |
| 2 | Quotes verbatim | **PASS** | All 6 `states_policy` passages are byte-identical (Buffer compare) to the same id in `passages.jsonl`, with matching url and heading: 9f1a2070, 8bbba21e, bcffc949, 02be0130, b24df191, 886d8647. All 39 of 39 passages match, and so does the `areas` citation for 8bbba21e. |
| 3 | No inferred motive | **PASS** | All 6 policy-marked passages are the candidate's own platform bullets. None is biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | A6: 2 passages over 0.85 (8bbba21e is gated as policy; 027500d6 is an endorser's quote and is not gated, see the note). The other 24 taxonomy issues: 0, recorded as `no_stated_position_found`. |
| 5 | Possible misses (information only) | 3 noted | d2e00797, 1c544ab9, d4f98833 (all on A6). Details below. |

## Evidence

### Check 1: hosts

| Host | run.json | passages.jsonl | areas |
|---|---|---|---|
| votegloriareina.com | 39 | 39 | 1 |

Every passage comes from the single URL `https://votegloriareina.com/`, and `run.json` `site` is `https://votegloriareina.com`. `ingest.log` shows the page was rendered in the browser because the raw HTML held only 47 characters of text. The ingest found 12 links, asked Jev about 0 of them, and chose 0 policy pages and no about page. `links.jsonl` is empty. `attempt-1-keywords/passages.jsonl` has the same 39 passage ids.

### Check 2: verbatim

Script result: `states_policy 6, mismatches []`, `all mismatches 0`, 39 ids in each file, none only on one side. Byte lengths of the 6 policy passages: 9f1a2070 70, 8bbba21e 75, bcffc949 60, 02be0130 72, b24df191 54, 886d8647 60.

### Check 3: the 6 policy-marked passages (first 20 words)

| id | Heading | Gate / own | First 20 words | What it is |
|---|---|---|---|---|
| 9f1a2070 | Put Students First | 0.93 / 0.88 | Ensure every child has access to strong academics and support services | Platform bullet |
| 8bbba21e | Support & Retain Teachers | 0.95 / 0.90 | Fight for competitive compensation that keeps great teachers in our schools | Platform bullet, tagged A6 |
| bcffc949 | Support & Retain Teachers | 0.90 / 0.85 | Reduce unnecessary burdens so teachers can focus on teaching | Platform bullet |
| 02be0130 | Accountability & Transparency | 0.88 / 0.87 | Ensure families understand how decisions are made and resources are used | Platform bullet |
| b24df191 | Strengthen School Safety | 0.89 / 0.85 | Ensure every student can learn in a secure environment | Platform bullet |
| 886d8647 | Strengthen School Safety | 0.95 / 0.92 | Prioritize safety upgrades and protocols across every school | Platform bullet |

None to flag. Five of the six gate as policy but match no taxonomy issue over the threshold (`run-report.txt`: "5 state a policy the taxonomy has no question for"). A Profiler would record them as candidate-tier material, not under a taxonomy issue. All 10 endorsement quotes under "Trusted voices standing with Gloria." and the 3 press-link blurbs are gated as no policy.

### Check 4: counts over the threshold (0.85)

| Issue | Passages ≥ 0.85 | Of which gated as policy | Coverage |
|---|---|---|---|
| A6 Public school funding and teachers | 2 (8bbba21e 0.95; 027500d6 0.94) | 1 (8bbba21e) | stated position: 8bbba21e |
| A1, A2, A3, A4, A5, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 | 0 each | 0 | `no_stated_position_found` |

Note on 027500d6: it clears A6 at 0.94, and its `issues` field in `run.json` reads `["A6"]`, but `states_policy` is false (gate 0.73, own 0.26). It is a quoted endorsement ("Our children deserve School Board members who will champion public education and always put students first. I trust Gloria Reina..."), so the words are not the candidate's. `readVerdict` in `src/lib/policy-noul.ts` sets `issueIds` from the scores whether or not the gates clear. `groupByArea` skips passages not gated as policy, so the `areas` block correctly cites only 8bbba21e. Under rule 4, any consumer that reads `passages[].verdict.issues` directly must also check `states_policy`, or it would attribute an endorser's words to the candidate. The script also confirmed that every passage's `issues` equals its scores at or over 0.85, so there are no other such cases.

Coverage caveat, not a finding: the corpus is one rendered homepage (see check 1). The zeros describe that page, not the whole site.

### Check 5: gated as no policy, but plainly a commitment on a taxonomy issue (information for the founder)

| id | Heading | Gate / own | A6 score | First 20 words |
|---|---|---|---|---|
| d2e00797 | Support & Retain Teachers | 0.90 / 0.78 | 0.83 | Advocate for the resources, respect, and working conditions educators deserve |
| 1c544ab9 | Why She's Running | 0.72 / 0.59 | 0.65 | Gloria is committed to ensuring every student feels safe, respected, and supported, and that every family, no matter their background, |
| d4f98833 | Why She's Running | 0.90 / 0.60 | 0.53 | She believes our schools should be focused on what truly matters: strong academics, safe learning environments, and preparing students for |

- d2e00797 is the clearest miss. It is a platform bullet in the candidate's own voice, about resources and conditions for teachers, which is A6's subject. It fails only the second gate (0.78) and scores just under the threshold on A6.
- 1c544ab9 ("Gloria is committed to ensuring ... teachers deserve strong support") and d4f98833 ("Gloria is running to bring the focus back to student achievement, support for educators...") state commitments in the third person on the campaign's own page. The wording is general, and both fail the second gate.

Also for the founder, not spine misses: these platform bullets gate as no policy, and no taxonomy issue covers them. They would be candidate-tier material: 883b0bf5 "Create real opportunities for student success across every school" (0.83 / 0.81), dbd16096 "Keep the focus on student achievement and outcomes that matter" (0.74 / 0.51), 0600db47 "Bring strong oversight and smart decision-making to the board" (0.80 / 0.69), 5f783d85 "Demand efficiency and results from every dollar spent" (0.84 / 0.62), and ba52627b "Create learning environments where students feel safe, respected, and supported" (0.84 / 0.82). The taxonomy has no school-safety issue, since B7 is crime policy, policing and courts.

### Other observations (not check failures)

- Compared with `attempt-1-one-gate/run.json` (`q-b2171346`, one gate, 9 policy passages), this run drops d4f98833, d2e00797 and ba52627b. All three are the candidate's own words. The second gate cost recall on this site and removed no false positive: the previous run had nothing to flag under check 3 either. ba52627b moved from 0.85 to 0.84 on the first gate, which is noise at the threshold.
- `ingest-report.md`, "Step 2: policy run", is stale. It describes the earlier run (`q-b2171346`, 9 policy passages, 136917 in / 17862 out tokens). It does not describe the current `run.json` (`q-e7282116`, 6 policy passages, 145029 in / 18681 out, matching `run.log`).

VERDICT: PASS
