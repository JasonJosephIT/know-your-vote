# Step 3 review: FL-DOE-88911 (Jared Moskowitz), FL-25-general

Reviewer: Step 3, under the Profiler constitution. This review reads `run.json`, `passages.jsonl` and `ingest.log` in this directory. It also reads `run.log`, `run-report.txt`, `links.jsonl`, `meta.tsv`, `ingest-report.md` and `attempt-1-keywords/` for context. No website was fetched.

- Official site: https://jaredforflorida.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`. 25 passages, 25 asked, 4 state a policy, 4 of those have an issue, 0 failed.
- Spine: undecided for this race. Check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (tax-7, 25 issues) that has at least one passage over the threshold. Check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive | PASS (0 failing passages; 1 tag note on a703bf33) |
| 4 | Silence recorded, not filled | PASS (5 issues have tagged policy passages; KYV1 has 1 passage over the threshold that is gated out; every other issue has 0). **Coverage caveat: `/priorities` returned 0 passages; see below** |
| 5 | Possible misses (information only) | 0 plain misses on a taxonomy issue; 1 borderline (537dd8df); 1 stated stance outside the taxonomy (f5d37765) |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every url. All 25 passages in `run.json.passages` have host `jaredforflorida.com`. So do all 25 rows in `passages.jsonl` and all 9 citation urls in `run.json.areas`. No other host appears. The pages are `/` (16 passages) and `/about` (9). `run.json.site` is `https://jaredforflorida.com`.

In `ingest.log`, every fetch is on the official host: `/`, `/priorities` and `/about`, all three through the browser after an HTTP 202 bot challenge, with Crawl-delay 10s honoured. The log has no redirects. Jev judged 12 links, all on-host (`links.jsonl`).

The log and the file reconcile. The log prints "13 passage(s)" for `/about`, and `passages.jsonl` holds 9 from that page. The ingest runs `dedupeAcrossPages` after the per-page line (`scripts/candidate-site-ingest.ts`, around line 424), and the log prints no per-page line for the homepage. The total is 16 + 9 = 25, which matches the log's "25 passage(s)".

### 2. Quotes verbatim: PASS

A node script compared `Buffer.from(text, "utf8")` for each passage in `run.json` against the passage with the same id in `passages.jsonl`. It also checked that `url` and `heading` are equal.

- `passages.jsonl` has 25 rows and 25 unique ids. Every id appears in both files.
- All 4 passages with `states_policy: true` are byte-identical, with matching url and heading: 94eddf37, ecb68ffe, d5daf97b, a703bf33.
- All 9 citation copies in `run.json.areas` are byte-identical to their passages, with matching urls: A4 (d5daf97b, 94eddf37), B2 (d5daf97b, 94eddf37), A1 (d5daf97b, 94eddf37), B7 (a703bf33), B4 (ecb68ffe, d5daf97b).
- All 25 passages are identical. Mismatches: 0.
- The run is internally consistent for all 25 passages. `states_policy` is true exactly when `commitment >= 0.85`. `issues` is exactly the set of scores at or above 0.85. Each verdict carries all 25 scores. `counts` match a recount: 4 state a policy and 4 have an issue.

### 3. No inferred motive: PASS

Each of the 4 passages marked as stating a policy contains a commitment in the candidate's own framing:

| id | First 20 words | Commitment in the text | Issues |
|---|---|---|---|
| 94eddf37 | "Cutting property insurance premiums, drug prices, and the everyday costs squeezing South Florida families." (whole passage, under the heading "Lowering the Cost of Living") | A priority stated under an issue heading | A1, A4, B2 |
| ecb68ffe | "Fighting every effort to cut, weaken, or privatize the programs seniors earned." (whole passage, under the heading "Protecting Social Security & Medicare") | A priority stated under an issue heading | B4 |
| d5daf97b | "In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation" | "he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs" | A1, A4, B2, B4 |
| a703bf33 | "What sets Jared apart is his willingness to stand up to both parties. He said no to Republicans when they" | "He supports banning members of Congress from trading stocks" | B7 |

None of the four is only biography, only an attack on an opponent, fundraising or event copy.

**Tag note on a703bf33 (information, not a failure).** The passage clears the gate because of its forward commitment on congressional stock trading, but the taxonomy has no issue for that. Its only tag, B7 "Crime policy, policing and courts" (0.90), rests on a record-and-contrast clause: "no to Democrats who wanted to defund the police". A Profiler claim under B7 from this passage should be attributed as the site's account of a past position ("The campaign's About page says he said no to Democrats who wanted to defund the police"). It should not be presented as a forward policing commitment. The clause "Republicans when they threatened Medicare and Medicaid" is the campaign's description of opponents, so any claim that uses it must be attributed as the site's wording and not restated as fact.

94eddf37 and ecb68ffe are sentence fragments with no subject. Their meaning depends on the section heading, which the run carries in `heading`. A claim should cite the heading together with the text.

### 4. Silence recorded, not filled: PASS

The run counts passages over the threshold of 0.85. The first count column is what reaches `run.json.areas`: passages where `states_policy` is true and the issue is tagged. The second column is any passage with that issue score at or above 0.85.

| Issue | Label | Policy passages tagged | Any passage over 0.85 | Passage ids |
|---|---|---|---|---|
| A1 | Property insurance costs | 2 | 2 | 94eddf37, d5daf97b |
| A4 | Cost of living in Florida | 2 | 2 | 94eddf37, d5daf97b |
| B2 | Healthcare access and costs | 2 | 2 | 94eddf37, d5daf97b |
| B4 | Social Security and Medicare | 2 | 2 | ecb68ffe, d5daf97b |
| B7 | Crime policy, policing and courts | 1 | 1 | a703bf33 |
| KYV1 | Threats to democratic institutions | **0** (no_stated_position_found) | 1 | 537dd8df (KYV1 0.86, but commitment 0.34, so the gate left it out) |

The other 19 taxonomy issues have 0 passages over the threshold, and each is recorded as `no_stated_position_found`: A2, A3, A5, A6, KYV9, KYV10, A7, B1, B3, B5, B6, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8. Nothing in `run.json` fills any of them. `areas` holds exactly the five tagged issues above.

**Coverage caveat for the founder.** These zeros describe this corpus only. The corpus may not reflect the candidate's full site:

- Jev chose `/priorities` as the single policy page, with a policy score of 0.94 and link text "Priorities". The final ingest fetched it through the browser and logged `0 passage(s)  https://jaredforflorida.com/priorities`. The run therefore holds no text from the site's dedicated issues page.
- The earlier keyword crawl in `attempt-1-keywords/ingest.log` logged `16 passage(s)  https://jaredforflorida.com/priorities` from the same site that morning. The two ingests fetched the same page and got different results. This review has not established why.
- Under the constitution, a Position with coverage "no_stated_position_found" means the candidate has no stated position "after searching their sources". For this run, the main policy source yielded nothing. A re-ingest that gets text from `/priorities` should come before any of these zeros is published as the candidate's silence. This review does not say what that page states on any issue.

### 5. Possible misses (information only)

The run marks these passages as stating no policy. They were checked against every taxonomy issue.

**Plain misses on a taxonomy issue: none.**

**Borderline (founder's call):**

- **537dd8df** (commitment 0.34, KYV1 0.86): "Congressman Jared Moskowitz has become one of the most effective checks on extremists in Washington, using his seat on the". The rest of the sentence is "to demand accountability, defend the independence of the courts, and push back whenever Washington oversteps". The passage describes ongoing committee work, which is relevant to KYV1 (checks and balances, rule of law) and B7 (court system). It is written as a record ("has become") rather than as a forward commitment, so the gate's decision is defensible.

**A stated stance outside the taxonomy (possible candidate-tier issue):**

- **f5d37765** (commitment 0.76): "Jared is also a strong and consistent supporter of Israel and one of Congress's most outspoken voices against rising antisemitism". This is a plain stance, but tax-7 has no foreign-policy or antisemitism issue. The run's own `links.jsonl` shows several on-site updates on this theme. It would be captured as a candidate-tier issue, not as a spine miss.

**Considered and not listed:** the following passages describe biography or record with no commitment:

- 79669325: the MSD school safety law, a past act.
- 11e9522c: Parkland Commission, public safety, the environment and a texting-while-driving ban, all past acts.
- 455e5b87: "work with and call out corruption", a disposition statement, and no taxonomy issue fits.
- 81fee1d4: fundraising copy.
- 43c487e2: a news blurb about an ad, not the candidate's commitment.

The stock-trading ban in a703bf33 is a commitment with no taxonomy issue. That passage is already marked as a policy passage; see check 3.

## Other notes

- **Constitution wording:** The Profiler constitution's attribution example reads "Senator Jared Moskowitz says…". The candidate's own site calls him "Congressman" and "U.S. Rep." (537dd8df, 43c487e2, 2e201df5), and he is running in FL-25, a House race. Claims must not use "Senator". Attribute as "Rep. Jared Moskowitz" or "The campaign website states…".
- Tokens: 88,102 in and 11,450 out. `meta.tsv` shows ingest exit 0 and policy exit 0.

VERDICT: PASS
