# Step 3 review: FL-VF-ORA-1314 (Diana Moore), FL-ORA-SB3-general

Reviewer, acting under the Profiler constitution. This is a read-only review of the machine run in this directory. No website was fetched. Every finding below comes from `passages.jsonl`, `run.json` and `ingest.log`. I also read `run-report.txt`, `run.log`, `ingest-report.md`, `links.jsonl`, `src/lib/policy-run.ts`, `src/lib/policy-noul.ts` and `src/lib/news-issues.ts` for context.

- Official site: https://www.votefordianamoore.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 13 asked, 0 failed
- Counts: 13 passages, 5 `states_policy`, 2 of them with a taxonomy issue
- Spine: not yet decided for this race. Check 4 reports every taxonomy issue with at least one passage over the threshold (tax-7 has 25 sub-issues, and all 25 were asked). Check 5 covers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 13 passage urls, and all 3 citations in `areas`, are on host `www.votefordianamoore.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | A script checked all 5 `states_policy` passages (44a5b1ff, f6ceb676, a865722e, 09572fc2, eddb2814). Each is byte-identical to `passages.jsonl` on `text`, `url` and `heading`. The 3 `areas` citations are identical too. |
| 3 | No inferred motive | **PASS** | None of the 5 `states_policy` passages is only biography, an attack, fundraising or event copy. eddb2814 is borderline, as noted below. |
| 4 | Silence recorded, not filled | **PASS** | 3 issues have passages over the threshold: A6 = 1, B1 = 1, KYV10 = 1. The other 22 are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | **3 reported** | a9ed59bd (1:1 devices review), 2d499b65 (campus security), 8b703665 (staff financial incentives). In all three, the fit to a taxonomy issue is uncertain. |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

Script output (node, over `run.json`):

```
hosts: [ 'www.votefordianamoore.com' ]
```

- There is no `OFFHOST` line for any of the 13 passages or any of the 3 `areas` citations. `run.json` `site` = `https://www.votefordianamoore.com`.
- All 13 passages come from one page, `https://www.votefordianamoore.com/`. `ingest.log` shows that 0 policy pages were selected and there was no about page.
- The 4 links Jev judged (`links.jsonl`) are all on the same host: /home, /news, /get-involved and /groups. None was chosen, so none was read.
- The set of passage ids in `passages.jsonl` (13) is the same as the set in `run.json` (13). No redirect is needed or recorded.

### Check 2: quotes verbatim (PASS)

The script compares, for each passage with `verdict.states_policy === true`, `Buffer.from(text, "utf8")` in `run.json` against the passage with the same id in `passages.jsonl`. It also compares `url` and `heading`.

```
44a5b1ff IDENTICAL url-ok heading-ok 696
f6ceb676 IDENTICAL url-ok heading-ok 161
a865722e IDENTICAL url-ok heading-ok 572
09572fc2 IDENTICAL url-ok heading-ok 473
eddb2814 IDENTICAL url-ok heading-ok 677
area B1 a865722e IDENTICAL
area A6 a865722e IDENTICAL
area KYV10 44a5b1ff IDENTICAL
ids in run not in passages: []
ids in passages not in run: []
```

Three passages contain non-ASCII characters: 2d499b65, f6ceb676 and 09572fc2. Each has a trailing zero-width space (U+200B). f6ceb676 and 09572fc2 are `states_policy`, and both still compare byte-identical. Every `heading` except two is a single U+200B character (bytes `e2 80 8b`), not null. Only bd93cfd5 and 997a1021 have a real heading. This is not a failure, but a renderer should treat that heading as empty.

### Check 3: no inferred motive (PASS)

Each of the 5 `states_policy` passages contains a commitment or stated position by the candidate. Gate scores are in brackets. First 20 words of each:

- 44a5b1ff (0.94): "2) Choice - Ask parents and students why they are moving to other learning options? Is it the security? Is"
  - The commitment comes later: "We should survey parents and students for their needs … and find other options to keep students learning in our public schools."
- f6ceb676 (0.88): "We can do a better job of advertising these options to the community and work to add additional ideas like"
  - The passage continues "micros schools". It states an intent to advertise programs and to add options.
- a865722e (0.95): "3) Professional Pay for Professional Work- Florida is ranked 50th in pay. How can we attract and keep the best"
  - The commitment comes later: "we can find solutions to pay our employees a living wage plus raise pay so they stay".
- 09572fc2 (0.97): "4) Transparency, Integrity and a Culture that doesn't threaten the livelihood of employees who speak up . I am personally"
  - The commitment comes later: "I will ask for a Work Session to bring these concerns to light and improve the working conditions".
- eddb2814 (0.87, **borderline**): "*Disclaimer. There are great things happening in classrooms and schools every day. We don't hear about them enough. Let's do"
  - This passage is mostly the candidate's reason for running plus a request for votes ("I humbly ask for your vote for District 3"). It does contain first-person commitments: "always, ask the employees for their input" and "I will be an activist for public education and the rights of students in public education." So it is not *only* biography or vote copy.
  - It cleared the gate by 0.02 and matched no taxonomy issue (top score A6 = 0.34). It therefore produces no issue-tagged claim, only a possible candidate-tier item.
  - A human should decide whether "I will be an activist for public education" is specific enough to write as a stated_position claim.

None of the following passages was marked `states_policy`, and that is correct:

- biography: d840b499
- the critique of sitting board members' "consent agenda" votes, with no commitment: cfb55f52
- slogan copy: ca35a4b8
- mission and vote-date copy: bd93cfd5, 997a1021

Candidate-tier note: 3 of the 5 `states_policy` passages matched no taxonomy issue: f6ceb676, 09572fc2 and eddb2814. `run.log` reports this as "3 state a policy the taxonomy has no question for". Under the constitution these would be candidate-tier issues for this candidate only. For example, 09572fc2 covers whistleblower protection and district culture.

### Check 4: silence recorded, not filled (PASS)

A passage "clears the threshold" for an issue when its issue score is at least 0.85. I counted two ways:

- by raw score over all 13 passages
- by the run's own rule, which also requires the `states_policy` gate (commitment ≥ 0.85) and is what `groupByArea` puts into `areas`

The two counts agree for every issue.

For every passage, `states_policy` agrees with commitment ≥ 0.85, and `issues` agrees with the scores ≥ 0.85 rule. The script printed no `INCONSISTENT` lines.

| Issue | Label | Passages ≥ 0.85 | Passage ids |
|---|---|---|---|
| A6 | Public school funding and teachers | 1 | a865722e (0.98) |
| B1 | Economy, inflation, and jobs | 1 | a865722e (0.88) |
| KYV10 | Career, vocational and higher education | 1 | 44a5b1ff (0.86) |

Every other taxonomy issue has **0** passages, so each is `no_stated_position_found`:

- A1, A2, A3, A4, A5, A7
- KYV9
- B2, B3, B4, B5, B6, B7, B8
- KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8

That is 22 issues.

The count is 3 issues with at least one passage, from 2 distinct passages. This matches `counts.with_issue` = 2 and the `areas` block: Economy / B1, and Education / A6 and KYV10.

### Check 5: possible misses (information only, not a fix)

These are passages the run marks `states_policy: false` that state a commitment in plain words. In each case the matching taxonomy issue is not clear, so the founder should judge both the commitment and the fit. This is not a count for check 4.

- **a9ed59bd** (gate 0.84, 0.01 below the threshold): "A. We need to honestly review the research on the 1 to 1 computer devices and get feedback from teachers,"
  - This is a direct call to review the district's 1:1 device program. Its highest issue score is A6 = 0.10. The fit to A6 ("Public school funding and teachers") is arguable.
- **2d499b65** (gate 0.69): "1) Safety -Students and employees need to know they are safe each and every day in their learning environment. We"
  - This is the first plank of her numbered platform. It ends "We can always improve the security of our campuses."
  - Its highest issue score is B7 = 0.67 ("Crime policy, policing and courts"). The passage mentions School Resource Officers. It states a direction rather than a specific action.
- **8b703665** (gate 0.81): "B. Ask staff for solutions. Maurice Draggon cut thousands of dollars in repair expenses by moving the laptops to a"
  - It ends "Let's encourage the staff when they come up with such solutions with recognition and financial incentives."
  - Its highest issue score is B1 = 0.15. The fit to A6 or B1 is uncertain.

Not listed as misses, for the record:

- d840b499: biography. It includes a value statement that students "deserve a qualified and certified teacher" (A6 = 0.80), but no commitment by the candidate.
- cfb55f52: it says "there are several issues that need more review", but that is critique, not a commitment.
- ca35a4b8, bd93cfd5, 997a1021: slogan, mission or vote copy.

### Other observations (not failures)

- `attempt-1-keywords/passages.jsonl` is an earlier ingest. On `id`, `url` and `text` it holds the same 13 passages as the current `passages.jsonl`.
- The whole corpus is one homepage of 895 words. Jev scored no internal link as a policy page (the highest was /home at 0.17), so no issues page was read. The zeros in check 4 describe this homepage only.

VERDICT: PASS
