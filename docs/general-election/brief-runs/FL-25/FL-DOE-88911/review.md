# Step 3 review: FL-DOE-88911 (Jared Moskowitz), FL-25-general

Reviewer: Step 3, under the Profiler constitution. This review reads `run.json`, `passages.jsonl` and `ingest.log` in this directory. For context it also reads `run.log`, `run-report.txt`, `links.jsonl`, `meta.tsv`, `ingest-report.md`, `attempt-1-keywords/` and `attempt-1-one-gate/`. No website was fetched.

- Official site: https://jaredforflorida.com/
- Run: `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, created 2026-09-30T01:58:25Z. This is the two-gate run: both `q_states_policy` and `q_own_commitment` must reach 0.85. 25 passages, 25 asked, 4 state a policy, 4 of those have an issue, 0 failed.
- Spine: undecided for this race. Check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (tax-7, 25 sub-issues) that has at least one passage over the threshold. Check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive | PASS (0 failing passages; 1 tag note on a703bf33) |
| 4 | Silence recorded, not filled | PASS (5 issues have tagged policy passages; KYV1 has 1 passage over the threshold that the gates leave out; the other 19 have 0). **Coverage caveat: `/priorities` gave 0 passages; see below** |
| 5 | Possible misses (information only) | 0 plain misses on a taxonomy issue; 1 borderline (537dd8df); 1 stated stance outside the taxonomy (f5d37765) |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every url:

- All 25 passages in `run.json.passages` have host `jaredforflorida.com`.
- All 25 rows in `passages.jsonl` have the same host.
- All 9 citation urls in `run.json.areas` have the same host.

No other host appears. The pages are `/` (16 passages) and `/about` (9). `run.json.site` is `https://jaredforflorida.com`.

`ingest.log` shows every fetch on the official host: `/`, `/priorities` and `/about`. All three went through the browser after an HTTP 202 bot challenge. The crawl honoured a Crawl-delay of 10s. The log shows no redirects. Jev judged 12 links, all on the same host (`links.jsonl`).

The log and the file agree. The log prints "13 passage(s)" for `/about`, and `passages.jsonl` holds 9 from that page. The ingest runs `dedupeAcrossPages` after it prints the per-page line (`scripts/candidate-site-ingest.ts:424`). The log also prints no per-page line for the homepage. 16 + 9 = 25, which matches the log's closing "25 passage(s)".

**Note on authorship (information, not a failure).** Six homepage passages are on the official host but are other people's words: news headlines and blurbs shown in the site's "Updates" feed. They are e1a53722, 43c487e2, 03a05350, 0ec1fb77, 4274228e and 2e201df5, and they include CBS Miami and third-person press copy. All six are marked `states_policy: false`, so none reaches a claim. If any of them ever cleared the gates, it should not be treated as the candidate's own statement.

### 2. Quotes verbatim: PASS

A node script (`Buffer.from(text).equals(...)`) compared the `text` of each passage in `run.json` with the passage of the same id in `passages.jsonl`. It also checked that `url` and `heading` are equal.

- `passages.jsonl` has 25 rows with 25 unique ids. Every id appears in both files.
- The 4 passages with `states_policy: true` are byte-identical, and their url and heading match: 94eddf37, ecb68ffe, d5daf97b and a703bf33.
- The 9 citation copies in `run.json.areas` are byte-identical to their passages, and their urls match: A4 (d5daf97b, 94eddf37), B2 (d5daf97b, 94eddf37), A1 (d5daf97b, 94eddf37), B7 (a703bf33), and B4 (ecb68ffe, d5daf97b).
- All 25 passages are identical. There are 0 mismatches.
- The run is internally consistent for all 25 passages:
  - `states_policy` is true exactly when `commitment >= 0.85` and `own_commitment >= 0.85`.
  - `issues` is exactly the set of scores at or above 0.85.
  - Each verdict carries all 25 scores.
  - `counts` match a recount: 4 passages state a policy and 4 have an issue.

### 3. No inferred motive: PASS

Each of the 4 passages marked as stating a policy contains a commitment in the candidate's own framing:

| id | commitment / own_commitment | First 20 words | Commitment in the text | Issues |
|---|---|---|---|---|
| 94eddf37 | 0.86 / 0.88 | "Cutting property insurance premiums, drug prices, and the everyday costs squeezing South Florida families." (the whole passage, under the heading "Lowering the Cost of Living") | A priority stated under an issue heading | A1, A4, B2 |
| ecb68ffe | 0.97 / 0.91 | "Fighting every effort to cut, weaken, or privatize the programs seniors earned." (the whole passage, under the heading "Protecting Social Security & Medicare") | A priority stated under an issue heading | B4 |
| d5daf97b | 0.96 / 0.86 | "In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation" | "he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs" | A1, A4, B2, B4 |
| a703bf33 | 0.97 / 0.87 | "What sets Jared apart is his willingness to stand up to both parties. He said no to Republicans when they" | "He supports banning members of Congress from trading stocks" | B7 |

None of the four is only biography, only an attack on an opponent, fundraising or event copy.

**Tag note on a703bf33 (information, not a failure).**

- The passage clears the gates because of its forward commitment on congressional stock trading. The taxonomy has no issue for that.
- Its only tag is B7, "Crime policy, policing and courts" (0.91). That tag rests on a clause about his record: "no to Democrats who wanted to defund the police".
- A Profiler claim under B7 from this passage should present that clause as the site's account of a past position, for example: "The campaign's About page says he said no to Democrats who wanted to defund the police". It should not present it as a forward commitment on policing.
- "Republicans when they threatened Medicare and Medicaid" is the campaign's description of its opponents. Any claim that uses it must attribute the wording to the site and must not restate it as fact.

94eddf37 and ecb68ffe are sentence fragments with no subject. Their meaning depends on the section heading, which the run keeps in `heading`. A claim should cite the heading with the text.

### 4. Silence recorded, not filled: PASS

This table counts passages at or above the 0.85 threshold. "Policy passages tagged" is what reaches `run.json.areas`: passages where `states_policy` is true and the issue is tagged. "Any passage over 0.85" counts every passage whose score for that issue is at or above 0.85.

| Issue | Label | Policy passages tagged | Any passage over 0.85 | Passage ids |
|---|---|---|---|---|
| A1 | Property insurance costs | 2 | 2 | 94eddf37, d5daf97b |
| A4 | Cost of living in Florida | 2 | 2 | 94eddf37, d5daf97b |
| B2 | Healthcare access and costs | 2 | 2 | 94eddf37, d5daf97b |
| B4 | Social Security and Medicare | 2 | 2 | ecb68ffe, d5daf97b |
| B7 | Crime policy, policing and courts | 1 | 1 | a703bf33 |
| KYV1 | Threats to democratic institutions | **0** (no_stated_position_found) | 1 | 537dd8df (KYV1 0.86, commitment 0.33, own_commitment 0.26, so the gates leave it out) |

The other 19 taxonomy issues have 0 passages over the threshold. Each is recorded as `no_stated_position_found`:

| Issue | Label |
|---|---|
| A2 | Housing affordability |
| A3 | Property taxes |
| A5 | Water quality and Everglades restoration |
| A6 | Public school funding and teachers |
| KYV9 | School choice and vouchers |
| KYV10 | Career, vocational and higher education |
| A7 | Elections administration and voting access |
| B1 | Economy, inflation, and jobs |
| B3 | Immigration and border enforcement |
| B5 | Abortion policy |
| B6 | Election integrity |
| B8 | Climate and environment (national) |
| KYV2 | Energy and utilities |
| KYV3 | Growth, development and land conservation |
| KYV4 | Storm resilience and flood protection |
| KYV5 | Water supply and drinking water |
| KYV6 | Renters and evictions |
| KYV7 | Homelessness |
| KYV8 | Condominium and HOA costs |

Nothing in `run.json` fills any of them, and `areas` holds exactly the five tagged issues above.

**Coverage caveat for the founder.** These zeros describe this corpus only. The corpus may not reflect the candidate's full site:

- Jev chose `/priorities` as the only policy page (policy score 0.94, link text "Priorities"). The ingest fetched it through the browser and logged `0 passage(s)  https://jaredforflorida.com/priorities`. So the run holds no text from the site's dedicated issues page.
- The earlier keyword crawl fetched the same page that morning. Its log (`attempt-1-keywords/ingest.log`) reads `16 passage(s)  https://jaredforflorida.com/priorities`, and 12 rows from that page remain in `attempt-1-keywords/passages.jsonl` after deduplication. This review has not established why the two ingests differ.
- Under the constitution, `no_stated_position_found` means the candidate has no stated position "after searching their sources". In this run the main policy source returned nothing. Re-ingest `/priorities` and get text from it before publishing any of these zeros as the candidate's silence. This review does not say what that page states on any issue.

### 5. Possible misses (information only)

These passages are marked as stating no policy. Each was checked against every taxonomy issue.

**Plain misses on a taxonomy issue: none.**

**Borderline (founder's call):**

- **537dd8df** (commitment 0.33, own_commitment 0.26, KYV1 0.86). First 20 words: "Congressman Jared Moskowitz has become one of the most effective checks on extremists in Washington, using his seat on the". The sentence continues "to demand accountability, defend the independence of the courts, and push back whenever Washington oversteps". That bears on KYV1 (threats to democratic institutions) and on B7 (courts). It is written as a record of work ("has become"), not as a forward commitment, so the gates' "no" is defensible.

**A stated stance outside the taxonomy (possible candidate-tier issue):**

- **f5d37765** (commitment 0.75, own_commitment 0.41). First 20 words: "Jared is also a strong and consistent supporter of Israel and one of Congress's most outspoken voices against rising antisemitism". This is a plain stance, but tax-7 has no issue for foreign policy or antisemitism. Several on-site updates listed in `links.jsonl` share the theme. It belongs under a candidate-tier issue, not as a miss on a spine issue.

**Considered and not listed.** These passages are biography, past record or campaign copy, with no commitment:

- 79669325: the MSD school safety law, a past act.
- 11e9522c: the Parkland Commission, public safety, the environment and a texting-while-driving ban, all past acts.
- 455e5b87: "work with and call out corruption", a statement of disposition that no taxonomy issue fits.
- 81fee1d4: fundraising copy.
- 43c487e2: a third-party blurb about an ad, not the candidate's commitment.

The stock-trading ban in a703bf33 is a commitment with no taxonomy issue. That passage is already marked as a policy passage; see check 3.

## Other notes

- **Same result as the one-gate run.** Against `attempt-1-one-gate/run.json` (`q-b2171346`), no passage changed its `states_policy` value or its `issues`, and no passage text changed. The second gate removed no passage here.
- **ingest-report.md is out of date.** Its "Step 2" table gives provenance `q-b2171346` and tokens 88,102 in and 11,450 out. Those figures belong to the one-gate run. The current `run.json` has `q-e7282116` and `usage` of 93,302 in and 11,975 out, matching `run.log`. The report was not edited, because this review writes only `review.md`.
- **Constitution wording.** The Profiler constitution's attribution example reads "Senator Jared Moskowitz says…". The candidate's own site calls him "Congressman" and "U.S. Rep." (537dd8df, 43c487e2, 2e201df5), and FL-25 is a House race. Claims must not use "Senator". Use "Rep. Jared Moskowitz" or "The campaign website states…".
- `meta.tsv` shows ingest exit 0 and policy exit 0.

VERDICT: PASS
