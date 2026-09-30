# Step 3 review: FL-DOE-89121 (Laurel Lee), FL-15-general

Reviewer: Step 3, working under the Profiler constitution. This is a read-only review of `passages.jsonl`, `run.json` and `ingest.log`. For context I also read `links.jsonl`, `run-report.txt`, `run.log` and `ingest-report.md`. No site was fetched.

The run under review is `run.json` (schema `kyv.policy-run/1`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, created 2026-09-30T01:58:09Z). All 25 of 25 passages were asked and 0 failed. The run uses two gates: `states_policy` is true only when `commitment` ≥ 0.85 **and** `own_commitment` ≥ 0.85. The earlier one-gate run (`q-b2171346`) and its review are in `attempt-1-one-gate/` and are not reviewed here.

SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue with a passage over the threshold, and lists the zeros. Check 5 considers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 25 run.json passages, all 25 passages.jsonl passages, all 6 `areas` citations and the 1 judged link are on `votelaurel.com`. There is no other host and no redirect. |
| 2 | Quotes verbatim | **PASS** | The 3 `states_policy` passages (d3bb1b7b, 39102209, 590ba88e) are byte-identical to passages.jsonl. So are all 25 passages and all 6 `areas` citations. Checked by a node script. |
| 3 | No inferred motive / no non-commitment marked as policy | **FAIL** | d3bb1b7b is marked `states_policy: true` (own_commitment 0.90), but it is the body of a quoted third-party endorsement. It is not the candidate's own commitment. |
| 4 | Silence recorded, not filled | **PASS** | Counts are below. Every issue with no gated passage is 0 (`no_stated_position_found`), and the run fills no gap. B3 and KYV2 rest only on d3bb1b7b (see check 3). |
| 5 | Possible misses (information only) | **PASS** (info) | 8 passages the gates rejected read as plain stances on taxonomy issues: c1055bd7 (B1); 6a10881e, 101df4cf, de4bccb8 (B3); 595a86f7, c87f4035, 743cba0a (B7); 827a7472 (A7/B6). |

A node script also checked internal consistency:
- For all 25 passages, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`.
- `issues` equals exactly the score keys `>= 0.85`.
- `areas` cites only `states_policy: true` passages.
- The passage ids and their order are the same in run.json and passages.jsonl.

Note that `issues` is filled even when `states_policy` is false (for example 6a10881e: `issues: [B3]`). Anything downstream must gate on `states_policy`, not on `issues`.

## Evidence

### Check 1: hosts

A node script parsed `new URL(url).host`:

- run.json passages: `votelaurel.com`, 25 of 25. `site` is `https://votelaurel.com`.
- passages.jsonl: `votelaurel.com`, 25 of 25.
- `areas[].subIssues[].citations[].passage.url`: `votelaurel.com`, 6 of 6.
- links.jsonl: `https://votelaurel.com/media-assets`, 1 of 1 (policy 0.05, not chosen).

Every passage comes from one page, `https://votelaurel.com/`.

Coverage note, not a failure. `ingest.log` says "53 links, 0 policy page(s) selected (cap 8), about page: none", and Jev judged only 1 of the 53 links. Everything below therefore describes the homepage only.

### Check 2: verbatim

The script compared `Buffer.from(text, "utf8").equals(...)` by id between run.json and passages.jsonl:

| id | byte-identical | url match | heading match | bytes |
|---|---|---|---|---|
| d3bb1b7b | true | true | true | 431 |
| 39102209 | true | true | true | 394 |
| 590ba88e | true | true | true | 345 |

All 25 run.json passages had 0 mismatches. All 6 `areas` citation texts had 0 mismatches.

### Check 3: marked as policy with no commitment by the candidate

**d3bb1b7b** (heading "LAUREL'S RECORD"; commitment 0.97, own_commitment 0.90; issues B1 0.93, B3 0.93, KYV2 0.89). First 20 words:
> Laurel served as Florida’s Secretary of State for three years, and delivered strong results for families, and businesses. In Congress,

Why it is flagged: in page order (the same in passages.jsonl and run.json), this passage sits between a1209c4b and 4b321b56, and the three form one quoted endorsement.
- a1209c4b opens with a quotation mark: "“Congresswoman Laurel Lee is an incredible Representative of Florida’s 15th Congressional District!"
- d3bb1b7b speaks about "Laurel" in the third person, in the endorser's register ("our now very Secure Border", "our always under siege Second Amendment").
- 4b321b56 closes in the endorser's first person: "Laurel Lee has my Complete and Total Endorsement".

So d3bb1b7b is endorsement copy reposted on her site. It is not a commitment the candidate states. The constitution requires every stated_position claim to be `attributed=true` ("the candidate said it") and excludes endorsers as sources. The second gate (`own_commitment`) was added to reject exactly this kind of passage, and it passed it at 0.90.

If d3bb1b7b is excluded:
- B3 (Immigration and border enforcement) drops from 1 gated passage to 0.
- KYV2 (Energy and utilities) drops from 1 gated passage to 0.
- B1 (Economy, inflation, and jobs) keeps only 39102209.

The other 2 `states_policy` passages each contain a commitment the candidate states. Neither is only biography, attack, fundraising or event copy.
- 39102209: "Recognizing the value of skilled trades and hands-on careers, Laurel supports the PELL Act, expanding Pell grants…" (KYV10 0.98). The B1 tag (0.88) rests on "supported efforts to cut unnecessary government spending". That is a fair match, and not an inference.
- 590ba88e: "Laurel co-introduced the Supporting Military Voters Act…" and "She supports expanding access to mental health care, improving veteran job placement programs…" (A7 0.96).

Observation for the founder: the second gate scored the candidate's own third-person site copy low and the endorser's copy high. For example, c1055bd7 "Laurel is committed to…" got own_commitment 0.48, 595a86f7 got 0.19, 101df4cf got 0.19, and d3bb1b7b got 0.90. On this site the gate seems to separate by something other than who is speaking.

### Check 4: passages clearing the 0.85 threshold, per taxonomy issue

- "Score ≥ 0.85" counts raw issue scores.
- "Gated" counts the passages that also pass both `states_policy` gates. Only these are in `areas` and could become claims.
- In the Ids column, an asterisk marks a gated passage.

| Issue | Label | Score ≥ 0.85 | Gated (in areas) | Ids |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 3 | 2 | *d3bb1b7b, c1055bd7, *39102209 |
| B3 | Immigration and border enforcement | 4 | 1 | *d3bb1b7b, 6a10881e, 101df4cf, de4bccb8 |
| A7 | Elections administration and voting access | 2 | 1 | *590ba88e, 827a7472 |
| KYV10 | Career, vocational and higher education | 1 | 1 | *39102209 |
| KYV2 | Energy and utilities | 1 | 1 | *d3bb1b7b (endorsement copy, see check 3) |
| B7 | Crime policy, policing and courts | 3 | 0 | 743cba0a, 595a86f7, c87f4035 |
| B6 | Election integrity | 1 | 0 | 827a7472 |

The following issues have 0 passages over the threshold and are recorded as `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, B2, B4, B5, KYV1, B8, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

B7 and B6 each have passages over the threshold on score, but none passes the gates. The run therefore records them as `no_stated_position_found` as well. With the check 3 finding applied, the gated count for B3 and KYV2 is also 0.

### Check 5: possible misses (`states_policy: false`, but a plain stance on a taxonomy issue)

This is information for the founder, not a fix. Each entry gives the first 20 words.

- **c1055bd7**: B1 0.98, commitment 0.92, own 0.48. "Laurel is committed to building an economy that rewards work, empowers small businesses, and prepares the next generation of American". It is an explicit first-party commitment and was rejected only by the second gate.
- **595a86f7**: B7 0.99, commitment 0.94, own 0.19. "She has voted to overturn soft-on-crime policies like the D.C. criminal code overhaul, and co-sponsored a resolution opposing efforts to". It gives her voting record and the bills she championed. Drafting note: "soft-on-crime" and "defund the police" are the site's own wording. A claim may quote and attribute them but must not adopt them.
- **101df4cf**: B3 0.99, commitment 0.82, own 0.19. "In Congress, Laurel voted for legislation that invests over $46 billion to finish the border wall and dramatically expands the". This is her stated voting record.
- **6a10881e**: B3 0.98, commitment 0.80, own 0.25. "Congresswoman Laurel Lee is a strong voice for securing the southern border and defending American communities from the consequences of". The rest criticizes the prior DHS leadership.
- **de4bccb8**: B3 0.93, commitment 0.72, own 0.47. "Whether confronting human smuggling or drug trafficking, Laurel Lee is fighting to protect the safety and sovereignty of our nation." The wording is general.
- **c87f4035**: B7 0.93, commitment 0.68, own 0.43. "As a leader in the Second Chances Task Force, Laurel also works to ensure that America’s criminal justice system provides". It continues "opportunities for rehabilitation where appropriate".
- **827a7472**: A7 0.94, B6 0.96, commitment 0.86, own 0.70. "Before her election to Congress in 2022, Laurel served as Florida Secretary of State, where she modernized the state’s election". It continues "In Congress, she continues to advocate for clear, consistent election laws…".
- **743cba0a**: B7 0.85, commitment 0.56, own 0.11. "But Laurel’s work doesn’t stop at the border. She is tackling the crime and exploitation that stem from an unsecured". It names bills she introduced on trafficking reporting and online exploitation.

Not listed, because the passage has no taxonomy issue over the threshold: 05c039fa (national defense), 29e764ba (AI and tech policy) and eb56ad99 (veterans). Each could be a candidate-tier issue, but none is a spine miss. 9ac916b9 (B7 0.63, KYV1 0.57) and 86341c1e (KYV1 0.61) are also left out: they are mainly committee and task-force biography, not a stated stance.

### Housekeeping (not a check)

`ingest-report.md` § "Step 2: policy run" still describes the earlier one-gate run: provenance `q-b2171346`, "State a policy 6", "match a taxonomy issue 5". The current `run.json`, `run-report.txt` and `run.log` say `q-e7282116`, 3 and 3. The report section is stale and should be regenerated before anyone reads it as describing this run.

VERDICT: FAIL (check 3)
