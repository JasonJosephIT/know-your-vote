# Step 3 review: FL-DOE-89121 (Laurel Lee), FL-15-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` (schema `kyv.policy-run/1`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 25 of 25 asked, 0 failed), `ingest.log`, plus `links.jsonl`, `run-report.txt` and `ingest-report.md` for context. No site was fetched.

SPINE: undecided for this race, so check 4 covers every taxonomy issue with a passage over the threshold (and lists the zeros), and check 5 considers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 25 run.json passages (and all 25 in passages.jsonl, and the 1 judged link) are on `votelaurel.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | All 6 `states_policy` passages (d3bb1b7b, c1055bd7, 39102209, 595a86f7, 590ba88e, 05c039fa) are byte-identical to passages.jsonl, and so are all 25 passages and all 8 `areas` citations. Checked by a node script. |
| 3 | No inferred motive / no non-commitment marked as policy | **FAIL** | d3bb1b7b is marked `states_policy: true`, but it sits inside a quoted third-party endorsement. It is not the candidate's own commitment. |
| 4 | Silence recorded, not filled | **PASS** | Counts below. Every issue with no passage over the threshold is reported as 0 (`no_stated_position_found`). The run does not fill any gap. KYV2's one gated passage is d3bb1b7b (see check 3). |
| 5 | Possible misses (information only) | **PASS** (info) | 6 passages the gate rejected read as plain stances on taxonomy issues: 6a10881e, 101df4cf, de4bccb8 (B3); c87f4035, 743cba0a (B7); 827a7472 (A7/B6). None of these is a constitution violation. They are listed for the founder, not as a fix. |

Internal consistency (also scripted): for every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals exactly the score keys `>= 0.85`. `areas` cites only `states_policy: true` passages.

## Evidence

### Check 1: hosts

A node script parsed `new URL(url).host` for every passage:

- run.json: `votelaurel.com`, 25 of 25.
- passages.jsonl: `votelaurel.com`, 25 of 25.
- links.jsonl (links Jev judged): `votelaurel.com/media-assets`, 1 of 1, not chosen.

All passages come from one page, `https://votelaurel.com/`. No redirect is involved.

Coverage note, not a failure: the ingest picked 0 policy pages and no about page ("53 links, 0 policy page(s) selected (cap 8), about page: none"), and Jev judged only 1 link. Every count in this review therefore describes the homepage alone.

### Check 2: verbatim

The script compared `Buffer.from(text, "utf8").equals(...)` between run.json and passages.jsonl by id:

| id | byte-identical | url match | heading match | bytes |
|---|---|---|---|---|
| d3bb1b7b | true | true | true | 431 |
| c1055bd7 | true | true | true | 658 |
| 39102209 | true | true | true | 394 |
| 595a86f7 | true | true | true | 434 |
| 590ba88e | true | true | true | 345 |
| 05c039fa | true | true | true | 254 |

All 25 passages: 0 mismatches. All 8 `areas[].subIssues[].citations[].passage.text`: 0 mismatches.

### Check 3: marked as policy with no commitment by the candidate

**d3bb1b7b** (heading "LAUREL'S RECORD", commitment 0.97, issues B1 / B3 / KYV2). First 20 words:
> Laurel served as Florida’s Secretary of State for three years, and delivered strong results for families, and businesses. In Congress,

Why it is flagged: in page order this passage sits between a1209c4b and 4b321b56, and the three form one quoted endorsement:

- a1209c4b opens with a quotation mark: "“Congresswoman Laurel Lee is an incredible Representative of Florida’s 15th Congressional District!"
- d3bb1b7b speaks about Laurel in the third person.
- 4b321b56 closes in the endorser's first person: "Laurel Lee has my Complete and Total Endorsement".

So d3bb1b7b is endorsement copy, meaning an endorser's biography of and praise for the candidate, reposted on her site. It is not a commitment the candidate states herself. Under the constitution, every stated_position claim is `attributed=true` ("the candidate said it"), and endorsers are excluded as sources. A claim written from this passage as "The campaign website states Laurel is fighting to…" would be accurate, but it could not honestly be attributed to the candidate's own words.

Effect if the passage is excluded:
- KYV2 (Energy and utilities) drops from 1 gated passage to 0.
- B3 (Immigration) drops from 1 gated passage to 0.
- B1 keeps c1055bd7 and 39102209.

The other 5 `states_policy` passages each contain a commitment the candidate states. None is only biography, attack, fundraising or event copy:
- c1055bd7: "Laurel is committed to building an economy that…"
- 39102209: "Laurel supports the PELL Act…"
- 595a86f7: votes and bills she "championed"
- 590ba88e: "She supports expanding access to mental health care…"
- 05c039fa: "focused on ensuring a strong national defense—backing policies…" (no taxonomy match, so it is a candidate-tier issue, as run-report.txt shows: "1 state a policy the taxonomy has no question for")

Drafting note: 595a86f7 contains the site's own loaded wording ("soft-on-crime", "defund the police"). Any claim built from it must quote and attribute that wording, not adopt it.

### Check 4: passages clearing the 0.85 threshold, per taxonomy issue

"Score ≥ 0.85" counts raw issue scores. "Gated" counts those that also pass the states_policy gate, which are the only ones the run puts in `areas`.

| Issue | Label | Score ≥ 0.85 | Gated (in areas) | Ids (gated in bold) |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 3 | 3 | **d3bb1b7b**, **c1055bd7**, **39102209** |
| B3 | Immigration and border enforcement | 4 | 1 | **d3bb1b7b**, 6a10881e, 101df4cf, de4bccb8 |
| A7 | Elections administration and voting access | 2 | 1 | **590ba88e**, 827a7472 |
| B7 | Crime policy, policing and courts | 2 | 1 | **595a86f7**, c87f4035 |
| KYV10 | Career, vocational and higher education | 1 | 1 | **39102209** |
| KYV2 | Energy and utilities | 1 | 1 | **d3bb1b7b** (endorsement copy, check 3) |
| B6 | Election integrity | 1 | 0 | 827a7472 |

0, `no_stated_position_found` (no passage over the threshold): A1, A2, A3, A4, A5, A6, KYV9, B2, B4, B5, KYV1, B8, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

B6 has a passage over the threshold on score, but none passes the gate, so the run records it as `no_stated_position_found` too.

If the check 3 finding is accepted, the gated counts for B3 and KYV2 are 0 as well.

### Check 5: possible misses (`states_policy: false`, but a plain stance on a taxonomy issue)

This is information for the founder, not a fix. Each entry gives the first 20 words, then the scores.

- **6a10881e** (B3 0.98, commitment 0.80): "Congresswoman Laurel Lee is a strong voice for securing the southern border and defending American communities from the consequences of". The rest of the passage criticizes the prior DHS leadership.
- **101df4cf** (B3 0.99, commitment 0.81): "In Congress, Laurel voted for legislation that invests over $46 billion to finish the border wall and dramatically expands the". This is a stated voting record, the same kind of content the run accepted for 595a86f7.
- **de4bccb8** (B3 0.93, commitment 0.72): "Whether confronting human smuggling or drug trafficking, Laurel Lee is fighting to protect the safety and sovereignty of our nation." This is general wording.
- **c87f4035** (B7 0.93, commitment 0.70): "As a leader in the Second Chances Task Force, Laurel also works to ensure that America’s criminal justice system provides". It continues "opportunities for rehabilitation where appropriate".
- **827a7472** (A7 0.94, B6 0.96, commitment 0.84, 0.01 under the gate): "Before her election to Congress in 2022, Laurel served as Florida Secretary of State, where she modernized the state’s election". It continues "In Congress, she continues to advocate for clear, consistent election laws…".
- **743cba0a** (B7 0.84, commitment 0.50; borderline, below the threshold on both): "But Laurel’s work doesn’t stop at the border. She is tackling the crime and exploitation that stem from an unsecured". It names bills she introduced on trafficking and online exploitation.

Not listed, because the passage has no taxonomy issue: 29e764ba (AI and tech policy) and eb56ad99 (veterans). Each could be a candidate-tier issue, but neither is a spine miss.

VERDICT: FAIL (check 3)
