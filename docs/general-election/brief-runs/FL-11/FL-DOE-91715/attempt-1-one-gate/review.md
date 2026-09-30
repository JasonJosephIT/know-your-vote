# Step 3 review: FL-DOE-91715 (James Pericola), FL-11-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. No website was fetched.

Run under review: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 18 passages asked, 5 state a policy, 4 with an issue, 0 failed.

SPINE: undecided for this race. Check 4 reports every taxonomy issue (`src/lib/news-issues.ts`) with at least one passage over the threshold; check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | None found |

## Evidence

### 1. Candidate-controlled sources only: PASS

OFFICIAL_SITE host: `jamespericola.com`. Every one of the 18 passage urls in `run.json` (and in `passages.jsonl`) is `https://jamespericola.com/`. Distinct hosts found by script: `jamespericola.com` only. No other host.

`ingest.log`: one page fetched (the homepage, in the browser after an HTTP 202 bot challenge); Crawl-delay 10s honored; 42 links, 1 judged (`/es`, policy 0.27), 0 policy pages chosen, no about page. No redirect off the host.

### 2. Quotes verbatim: PASS

Checked with node (`Buffer.equals` on UTF-8 bytes of `text`, plus string equality on `heading` and `url`) for every passage `run.json` marks `states_policy: true`, and for every citation in `run.json.areas`:

| id | text byte-identical | heading | url | bytes |
|---|---|---|---|---|
| dea2f60c | yes | yes | yes | 143 |
| 13681d0d | yes | yes | yes | 91 |
| eea5ccf0 | yes | yes | yes | 87 |
| 3b4a6b48 | yes | yes | yes | 114 |
| 044f25bf | yes | yes | yes | 122 |

Area citations (B2: 13681d0d, dea2f60c; A2: eea5ccf0; A1: eea5ccf0; A7: 044f25bf; KYV1: 044f25bf; B4: dea2f60c): all byte-identical. Mismatches: 0.

### 3. No inferred motive: PASS

All five passages marked as stating a policy carry a commitment by the candidate (commitment score 0.97 to 0.99):

- dea2f60c: "Oppose any cuts or privatization of Social Security and Medicare, and push to let Medicare negotiate lower prescription drug costs for seniors."
- 13681d0d: "Expand access to affordable, high-quality healthcare by protecting the Affordable Care Act."
- eea5ccf0: "Secure federal funding to combat our housing crisis and lower property insurance costs."
- 3b4a6b48: "Work to eliminate income taxes for those making less than $100,000 a year and cut taxes for middle-class families."
- 044f25bf: "James will fight to end gerrymandering, pass the John Lewis Voting Rights Act, and defend our democracy from MAGA attacks."

None is only biography, an attack on an opponent, fundraising, or event copy. Note on 044f25bf: its last clause ("defend our democracy from MAGA attacks") is partisan framing in the candidate's own words, but the passage also carries two concrete commitments (end gerrymandering; pass the John Lewis Voting Rights Act). Any claim written from it must be attributed ("The campaign website states…") and must not restate the "MAGA attacks" framing as fact.

Biography, fundraising and form copy were all marked `states_policy: false`: 5d63b0a7, 1d66a79b, a2443d10, ab66e4a5, eaaf01e7, b3e62982, ff228014, ebaf2b50, 58e6a106 (biography/record), 5af1299d (fundraising), 5c677490 and f8b21742 (form thank-you copy), 4924c2d3 (slogan quote).

### 4. Silence recorded, not filled: PASS

Passages clearing 0.85 per taxonomy issue (computed from `scores`, not from `issues`; the two agree for every passage, and no passage marked `states_policy: false` has any issue score at or above 0.85):

| Issue | Label | Passages over 0.85 | ids |
|---|---|---|---|
| A1 | Property insurance costs | 1 | eea5ccf0 (0.97) |
| A2 | Housing affordability | 1 | eea5ccf0 (0.96) |
| A7 | Elections administration and voting access | 1 | 044f25bf (0.98) |
| B2 | Healthcare access and costs | 2 | 13681d0d (0.98), dea2f60c (0.96) |
| B4 | Social Security and Medicare | 1 | dea2f60c (0.99) |
| KYV1 | Threats to democratic institutions | 1 | 044f25bf (0.88) |

Every other taxonomy issue has 0 passages over the threshold and, if it enters the spine, is `no_stated_position_found`: A3, A4, A5, A6, KYV9, KYV10, B1, B3, B5, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 (0 each).

Related information: 3b4a6b48 (income-tax cut) clears the policy gate (0.98) but no issue (highest B1 at 0.65). `run.log` records it as "1 state a policy the taxonomy has no question for". The taxonomy has no federal income-tax issue (A3 is property taxes), so under the constitution this is a candidate-tier issue, not a spine hit. It was not forced onto B1 or A4.

Coverage limit: the site yielded one page (homepage, 18 passages, 495 words) and no policy or about page. The zeros above describe this page only.

### 5. Possible misses: none found

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. Highest-scoring non-policy passages, recorded for the founder and not listed as misses:

- 5d63b0a7 (commitment 0.76), first 20 words: "Over more than 30 years, James Pericola has built a career in public service — as a Presidential appointee in the". Biography; the closing "running for Congress to … lower costs" is a general aim with no specific commitment.
- ab66e4a5 (commitment 0.34, B2 0.76), first 20 words: "For James, the fight to lower costs is personal. Helping his aging mother navigate an increasingly costly and complex healthcare". Personal story; "a determination to fix what's broken" names no action. The healthcare commitment appears in 13681d0d and dea2f60c, both captured.

VERDICT: PASS
