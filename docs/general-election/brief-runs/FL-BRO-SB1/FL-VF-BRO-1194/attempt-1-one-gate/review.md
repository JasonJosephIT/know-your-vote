# Step 3 review: FL-VF-BRO-1194 (Maura McCarthy Bulman), FL-BRO-SB1-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. `ingest-report.md`, `links.jsonl`, `run-report.txt` and `run.log` were read for context. Nothing was fetched from the web.

Run under review: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`. 18 passages were read and 18 asked. 3 state a policy, 1 of those matches an issue, and 0 failed.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) that has a passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 18 passages are on `www.mauraforbroward.com`: `/` 12, `/meetmaura` 6. No other host. |
| 2 | Quotes verbatim | **PASS** | All 3 `states_policy: true` passages (0e2f3328, 3e471db4, 0e45e163) are byte-identical to `passages.jsonl`. So are all 18 run passages, including url and heading. |
| 3 | No inferred motive | **FAIL** | 0e45e163 is gated in (commitment 0.91) but is biography plus past record, with no commitment by the candidate. 0e2f3328 and 3e471db4 pass. |
| 4 | Silence recorded, not filled | **PASS** | Gated count: A6 1 (0e2f3328). A6 raw count: 2 (adds 3eaa5ec7 at exactly 0.85, not gated). The other 24 issues are 0. Nothing was filled. |
| 5 | Possible misses (information only) | reported | abe548ed (A6) is listed below. |

## Evidence

### Check 1: hosts

A node script parsed every `url` in `run.json` and `passages.jsonl`. The only host is `www.mauraforbroward.com`, which is the OFFICIAL_SITE host. No redirects were involved. Both links Jev judged (`links.jsonl`: `/meetmaura`, `/endorsements-1`) are on the same host. The 12 passages in `attempt-1-keywords/passages.jsonl` are on that host too.

| url | passages |
|---|---|
| https://www.mauraforbroward.com/ | 12 |
| https://www.mauraforbroward.com/meetmaura | 6 |

`ingest.log` says "8 passage(s) https://www.mauraforbroward.com/meetmaura" and has no line for the homepage. This is not a discrepancy. The per-page line (`scripts/candidate-site-ingest.ts:420`) is printed before `dedupeAcrossPages` (`src/lib/candidate-site.ts`) runs at line 424. The count works out as 12 + 8 = 20 before deduplication and 18 after, which matches the log's final line, `passages.jsonl` and `run.json`. `ingest-report.md` gives the post-dedupe figure, 6 for `/meetmaura`.

**For the founder:** the site has no policy page. Jev chose 0 policy pages (`/meetmaura` policy 0.18, `/endorsements-1` 0.05). Every passage comes from the homepage or the bio page. Two homepage passages are contact details: f25f43bc (an email address and phone number) and 699bd756 (a street address). Both were correctly marked as stating no policy (commitment 0.02).

### Check 2: verbatim

A node script compared `Buffer.from(text, "utf8")` for each run passage against the `passages.jsonl` row with the same id. It also compared url and heading.

- `states_policy: true` passages: 3 checked (0e2f3328 364 bytes, 3e471db4 584 bytes, 0e45e163 663 bytes), 0 mismatches.
- All run passages: 18 checked, 0 mismatches in text, url or heading.
- Id sets are the same in both files: 18 unique ids in each.

The only citation in `run.json` `areas`, A6 → 0e2f3328, is byte-identical to its `passages.jsonl` row.

### Check 3: the 3 passages marked as stating a policy

For every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores at or above 0.85 (`applyThreshold`, `src/lib/news-characterize.ts`). `counts` (3 state a policy, 1 with an issue) matches the passages.

- **0e2f3328** (homepage, "Join our campaign!", commitment 0.94, A6 0.97). First 20 words: "I believe in creating a nurturing, safe learning environment for all students, where they can explore diverse ideas and perspectives." This is a first-person commitment ("Our teachers deserve competitive pay and the resources they need to succeed… I will fight for them"). It passes.
- **3e471db4** (homepage, "Join our campaign!", commitment 0.87, no issue tag). First 20 words: "Our public schools offer incredible programs, but we need to better communicate their value and successes to parents and the". It contains commitments in the first person plural: "We must build a robust communication strategy…" and "We must continue to work to hold School Board staff accountable". It passes. It carries no taxonomy issue (A6 0.26), so it could only surface as a candidate-tier item (school-district communication and accountability).
- **0e45e163** (`/meetmaura`, "Believes in Public Schooling", commitment 0.91, no issue tag). **Fails.** First 20 words: "Maura was inspired to run for office because of her own experience as the mother of four wonderful children attending". The passage is a third-person account of why she ran ("inspired to run for office because of her own experience as the mother…", "fully invested in making sure our schools work for everyone"). It then gives her past record ("she has fought to keep our District 1 schools open, increase programming in arts and sciences, and provide watchful oversight of taxpayer dollars"). It closes with a general prediction ("Her continued leadership will help our A rated Broward County Public Schools to continue to grow and thrive"). It has no "will", "must" or "I believe", and no forward commitment on any issue. The gate is also inconsistent here. c8df7a87 (0.38) and 3eaa5ec7 (0.56) state the same record (keeping District 1 schools open, arts and science programming, oversight of taxpayer money) and were gated out.
  - Impact: it carries no taxonomy issue (A6 0.82, under the threshold), so it is not in `areas` and reaches no taxonomy Position. It would reach the brief only if the Profiler wrote it as a candidate-tier stated_position. It should not be written as a stated position. If her record is used at all, it must be attributed ("The campaign website states she has fought to keep District 1 schools open…") and never presented as a commitment. The sentence about why she ran is the candidate's own stated reason and must not be restated as motive.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Gated" means the passage also passes the `states_policy` gate. Only gated passages reach `areas` and Positions. "Raw" counts any issue score of 0.85 or more.

| Issue | Label | Gated | Gated passage ids | Raw | Raw only (not gated) |
|---|---|---|---|---|---|
| A6 | Public school funding and teachers | 1 | 0e2f3328 (0.97) | 2 | 3eaa5ec7 (0.85, exactly at threshold; gate 0.56) |

Every other taxonomy issue has 0 passages over the threshold, raw or gated, and is recorded as `no_stated_position_found`: A1, A2, A3, A4, A5, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8. The highest score among these is B1 0.63, on 0e2f3328.

The run did not fill silence. `areas` contains only A6, backed by the single gated passage 0e2f3328. 3eaa5ec7 is tagged A6 in its own verdict but is correctly kept out of `areas` because it failed the gate.

### Check 5: possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that plainly state a commitment on a taxonomy issue:

- **abe548ed** (homepage, "Meet Maura"; commitment 0.55; A6 0.65). First 20 words: "Throughout her life, Maura has answered the call. As a lawyer, activist, School Board member, and mother, she has proven". It continues "She is committed to fighting for the resources, support, and respect that our families and school staff [sic]. She looks forward to continue working to ensure that our schools are the best they can be…". That is a stated commitment on resources for school staff (A6). A6 is already covered by 0e2f3328, so gating this passage in would add a second citation, not change a 0 to a 1.

Considered and not listed:
- 3eaa5ec7 (A6 0.85) and c8df7a87 (A6 0.75) describe past record (school maintenance and renovation, accountability for the superintendent, keeping schools open), not commitments.
- 5de798d6 ("efforts to weaken our public schools will damage the future of our home") is a view with no commitment.
- fba0f36d, 63bd5265, 2aca8693, 601a29a2 and 228283a8 are general campaign copy ("running for re-election to continue to serve", "we will not [let] them down", "make our schools the best they can be").
- 2ba030c6 (school recycling) is past record, B8 0.06.
- The remaining passages are biography or contact details.

VERDICT: FAIL (check 3)
