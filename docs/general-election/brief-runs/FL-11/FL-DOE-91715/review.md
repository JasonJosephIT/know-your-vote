# Step 3 review: FL-DOE-91715 (James Pericola), FL-11-general

Reviewer, working under the Profiler constitution. Read-only apart from this file. Inputs: `passages.jsonl` (18 passages), `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:02Z), `ingest.log`. OFFICIAL_SITE: https://jamespericola.com/. SPINE: undecided for this race, so check 4 reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`) and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | 0 reported |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and in `passages.jsonl` and tallied hosts:

- `run.json`: `jamespericola.com` × 18
- `passages.jsonl`: `jamespericola.com` × 18

All 18 passages (ids below) come from one page, `https://jamespericola.com/`. No other host appears, and no redirect was needed. `ingest.log` shows a bot challenge (HTTP 202) that was retried in a browser on the same URL, and `robots.txt` Crawl-delay 10s was honored. The only link Jev judged (`links.jsonl`) is `https://jamespericola.com/es`, on the same host, and it was not chosen.

### 2. Quotes verbatim: PASS

The script (node, `Buffer.equals` on UTF-8 bytes) compared each `run.json` passage with the `passages.jsonl` passage of the same id. The two files hold the same 18 ids: none is missing from either side and there are no duplicates. For all 18 passages, the text is byte-identical and the `url` and `heading` match. That includes the five marked `states_policy: true`:

| id | bytes | identical |
|---|---|---|
| dea2f60c | 143 | yes |
| 13681d0d | 91 | yes |
| eea5ccf0 | 87 | yes |
| 3b4a6b48 | 114 | yes |
| 044f25bf | 122 | yes |

Curly quotes, apostrophes and em dashes (for example in 4924c2d3, 5c677490 and 5d63b0a7) survive unchanged.

### 3. No inferred motive: PASS

Five passages are marked `states_policy: true`. Each one sits under a platform heading and states a commitment in the candidate's own words. None of them is only biography, an opponent attack, fundraising or event copy:

| id | heading | first 20 words | commitment |
|---|---|---|---|
| dea2f60c | Protect Social Security & Medicare | "Oppose any cuts or privatization of Social Security and Medicare, and push to let Medicare negotiate lower prescription drug" | 0.99 / own 0.96 |
| 13681d0d | Protect Affordable Healthcare | "Expand access to affordable, high-quality healthcare by protecting the Affordable Care Act." | 0.97 / own 0.93 |
| eea5ccf0 | Lower Housing & Insurance Costs | "Secure federal funding to combat our housing crisis and lower property insurance costs." | 0.97 / own 0.93 |
| 3b4a6b48 | Cut Taxes for Working Families | "Work to eliminate income taxes for those making less than $100,000 a year and cut taxes for middle-class families." | 0.98 / own 0.96 |
| 044f25bf | Protecting Our Democracy | "James will fight to end gerrymandering, pass the John Lewis Voting Rights Act, and defend our democracy from MAGA" | 0.98 / own 0.97 |

Notes for the Profiler write-up, not failures:
- 044f25bf ends with "defend our democracy from MAGA attacks." This is partisan framing by the campaign, but the passage also makes two concrete commitments: end gerrymandering and pass the John Lewis Voting Rights Act. Any claim built from it must attribute the wording to the campaign ("The campaign website states…") and must not paraphrase the opponent language as fact.
- 3b4a6b48 states a policy but has `issues: []`. No taxonomy issue reached 0.85; the closest is B1 at 0.65. Under the constitution this becomes a **candidate-tier issue** (federal income-tax relief). It must not be forced into B1 or A4.

The 13 passages marked `states_policy: false` are all biography, values or process copy, fundraising copy, or form-confirmation text. They are 4924c2d3, 5c677490, 5d63b0a7, 1d66a79b, a2443d10, ab66e4a5, eaaf01e7, b3e62982, ff228014, ebaf2b50, 58e6a106, 5af1299d and f8b21742. Excluding them is correct.

### 4. Silence recorded, not filled: PASS

Counts are passages scoring at least 0.85 for the issue. Every passage over the threshold also passed the `states_policy` gate, so the gated and ungated counts are the same.

| Issue | Label | Passages ≥ 0.85 | ids |
|---|---|---|---|
| A1 | Property insurance costs | 1 | eea5ccf0 (0.97) |
| A2 | Housing affordability | 1 | eea5ccf0 (0.96) |
| A7 | Elections administration and voting access | 1 | 044f25bf (0.98) |
| B2 | Healthcare access and costs | 2 | 13681d0d (0.98), dea2f60c (0.96) |
| B4 | Social Security and Medicare | 1 | dea2f60c (0.99) |
| KYV1 | Threats to democratic institutions | 1 | 044f25bf (0.90) |

Every other taxonomy issue has **0** passages, so each gets `coverage="no_stated_position_found"`: A3, A4, A5, A6, KYV9, KYV10, B1, B3, B5, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

The run did not fill any of these gaps. Its `areas` hold only the six issues above, and no zero-count issue has a citation. Context: the whole corpus is one page (the homepage). The site had 42 links, 1 of them was judged, 0 policy pages were selected and no about page was found. So each zero means "not stated on the homepage as crawled", and that is how it should be recorded.

### 5. Possible misses: none reported

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. I considered and rejected these, because they express goals or motivation without a specific commitment:
- 5d63b0a7, "Over more than 30 years, James Pericola has built a career in public service — as a Presidential appointee in…". This is biography. The "lower costs" goal in it is general.
- ab66e4a5, "For James, the fight to lower costs is personal. Helping his aging mother navigate an increasingly costly and complex…". This is a personal story ending in "a determination to fix what's broken", with no stated measure.
- eaaf01e7, "James Pericola has the experience to not just talk, but get things done for our district. He's already…". This is a record and experience claim that names no issue.

### Other observations (information for the founder, outside the five checks)

- `ingest-report.md` is out of date compared with `run.json`. Its Step 2 section gives provenance `q-b2171346` and 63097 / 8244 tokens. `run.json` and `run-report.txt` give `q-e7282116` and 66841 / 8622 tokens. The 5 / 4 counts match. This review used `run.json`.
- dea2f60c (Social Security & Medicare) is cited under both B4 and B2, because of the prescription-drug clause. Both scores clear 0.85, so the double citation is consistent with the threshold.

VERDICT: PASS
