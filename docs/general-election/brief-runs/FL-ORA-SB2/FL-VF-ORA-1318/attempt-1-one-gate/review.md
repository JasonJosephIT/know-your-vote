# Step 3 review: FL-VF-ORA-1318 (Gloria Reina O'Neal), FL-ORA-SB2-general

Reviewer role: I checked that the run could only produce claims the Profiler constitution allows. I wrote no claims and fetched no website.

- Official site: https://votegloriareina.com/
- Run: `run.json`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`. 39 passages asked, 0 failed, 9 marked `states_policy`, 1 with a taxonomy issue.
- Spine: not yet set for this race. Check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) with at least one passage over the threshold. Check 5 considers every taxonomy issue.
- Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 39 passages in `run.json` (and all 39 in `passages.jsonl`, and the one cited passage in `areas`, 8bbba21e) are on host `votegloriareina.com`. There are no other hosts and no redirects. |
| 2 | Quotes verbatim | **PASS** | For all 9 `states_policy` passages, the text is byte-identical to the passage with the same id in `passages.jsonl` (Buffer compare), and the url and heading match too: d4f98833, 9f1a2070, d2e00797, 8bbba21e, bcffc949, 02be0130, b24df191, 886d8647, ba52627b. All 39 of 39 passages match. The `areas` citation for 8bbba21e is identical too. |
| 3 | No inferred motive | **PASS** | None of the 9 policy-marked passages is only biography, an attack, fundraising or event copy. Each one states something the candidate will do or wants (list below). |
| 4 | Silence recorded, not filled | **PASS** | A6: 2 passages over 0.85 (8bbba21e is gated as policy; 027500d6 is not, see note). All other 24 taxonomy issues: 0, recorded as `no_stated_position_found`. |
| 5 | Possible misses (information only) | 5 noted | 1c544ab9, 5f783d85, 883b0bf5, dbd16096, 0600db47 (details below). |

## Evidence

### Check 1: hosts

| Host | Passages in run.json | Passages in passages.jsonl |
|---|---|---|
| votegloriareina.com | 39 | 39 |

Every passage came from the one URL `https://votegloriareina.com/`. `ingest.log` shows that the page was rendered in the browser because the raw HTML held only 47 characters of text. The ingest found 12 links, asked Jev about 0 of them, and chose 0 policy pages and no about page. `links.jsonl` is empty. The earlier `attempt-1-keywords/passages.jsonl` has the same 39 passages from the same URL. There are no off-host sources.

### Check 2: verbatim

Script result: `states_policy 9, mismatches []`, and `all-passages mismatches 0`. Byte lengths of the 9 policy passages: d4f98833 404, 9f1a2070 70, d2e00797 77, 8bbba21e 75, bcffc949 60, 02be0130 72, b24df191 54, 886d8647 60, ba52627b 79.

### Check 3: the 9 policy-marked passages (first 20 words)

| id | Heading | Gate | First 20 words | What it is |
|---|---|---|---|---|
| d4f98833 | Why She's Running | 0.91 | She believes our schools should be focused on what truly matters: strong academics, safe learning environments, and preparing students for | A stated priority ("Gloria is running to bring the focus back to student achievement, support for educators..."). General wording. It criticises no opponent. |
| 9f1a2070 | Put Students First | 0.93 | Ensure every child has access to strong academics and support services | Platform bullet |
| d2e00797 | Support & Retain Teachers | 0.90 | Advocate for the resources, respect, and working conditions educators deserve | Platform bullet |
| 8bbba21e | Support & Retain Teachers | 0.96 | Fight for competitive compensation that keeps great teachers in our schools | Platform bullet (tagged A6) |
| bcffc949 | Support & Retain Teachers | 0.90 | Reduce unnecessary burdens so teachers can focus on teaching | Platform bullet |
| 02be0130 | Accountability & Transparency | 0.88 | Ensure families understand how decisions are made and resources are used | Platform bullet |
| b24df191 | Strengthen School Safety | 0.89 | Ensure every student can learn in a secure environment | Platform bullet |
| 886d8647 | Strengthen School Safety | 0.95 | Prioritize safety upgrades and protocols across every school | Platform bullet |
| ba52627b | Strengthen School Safety | 0.85 | Create learning environments where students feel safe, respected, and supported | Platform bullet (exactly at the threshold) |

None of these to flag. Eight of the nine gate as policy but have no taxonomy issue over the threshold (`run-report.txt`: "8 state a policy the taxonomy has no question for"). A Profiler would record them as candidate-tier material, not under a taxonomy issue.

### Check 4: counts over the threshold (0.85)

| Issue | Passages ≥ 0.85 | Of which gated as policy | Coverage |
|---|---|---|---|
| A6 Public school funding and teachers | 2 (8bbba21e 0.96; 027500d6 0.94) | 1 (8bbba21e) | stated position: 8bbba21e |
| Every other taxonomy issue (A1–A5, A7, B1–B8, KYV1–KYV10) | 0 | 0 | `no_stated_position_found` |

Note on 027500d6: it clears A6 at 0.94, and its `issues` field in `run.json` reads `["A6"]`, but `states_policy` is false (gate 0.74). It is a quoted endorsement under "Trusted voices standing with Gloria." ("Our children deserve School Board members who will champion public education..."), so the text is not self-authored. The derived `areas` block leaves it out, because `groupByArea` skips passages that are not gated as policy, and the only A6 citation is 8bbba21e. That output is correct. Rule 4 of the constitution means that any consumer reading `passages[].verdict.issues` directly must also check `states_policy`, or it would attribute an endorser's words to the candidate.

Coverage caveat, not a finding: the corpus is one rendered homepage (see check 1). The zeros above describe that page, not the whole site.

### Check 5: passages gated as no policy that state a commitment (information for the founder)

| id | Heading | Gate | Closest taxonomy issue (score) | First 20 words |
|---|---|---|---|---|
| 1c544ab9 | Why She's Running | 0.74 | A6 (0.65) | Gloria is committed to ensuring every student feels safe, respected, and supported, and that every family, no matter their background, |
| 5f783d85 | Accountability & Transparency | 0.84 | B1 (0.26), A6 (0.09) | Demand efficiency and results from every dollar spent |
| 883b0bf5 | Put Students First | 0.82 | A6 (0.12) | Create real opportunities for student success across every school |
| dbd16096 | Put Students First | 0.73 | KYV10 (0.07), A6 (0.06) | Keep the focus on student achievement and outcomes that matter |
| 0600db47 | Accountability & Transparency | 0.79 | KYV1 (0.27), A6 (0.07) | Bring strong oversight and smart decision-making to the board |

1c544ab9 uses explicit commitment wording ("is committed to ensuring ... teachers deserve strong support") on public schools and teachers. The other four are platform bullets in the same form as bullets that did clear the gate (for example 9f1a2070 and 02be0130). They fell just below 0.85, and their fit to any taxonomy issue is weak. These are reported, not fixed.

Considered and not listed, because they are biography, belief, or third-party text rather than a commitment by the candidate: fa5aef2c, 980d65e5, 9e53835b, 5d25b154, 14f5df1d (biography and motivation). 027500d6, 71a8a181, 3fa2de55, a66ecc40, 18d7c662, cc13935a, 9412dca7, 0174eb9e, 316c9bcf, 64ab2a7a (endorser quotes). ca0e2f53, 8a46e51d, 9ee4c62b (press and endorsement links). d9dc59f0 (volunteer call).

VERDICT: PASS
