# Profiler review: FL-DOE-89243 (David Jolly, FL-GOV-general), reingest 2026-09-29

- Official site: https://davidjolly.com/
- Run: `run.json` status `complete`, model `jev-1.13.0`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 190 passages, 190 asked, 56 state a policy, 42 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye. Checks 3 and 5 are a reading of every one of the 190 passages.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | FAIL: 3 biography passages from `/about` marked as policy (`c4035c09`, `266196cf`, `8ffb3fca`); none is tagged to a spine issue |
| 4 | Silence recorded, not filled | PASS: A1 = 13, A3 = 0 (no_stated_position_found), A2 = 6, A4 = 5 |
| 5 | Possible misses (information only, not a fix) | 10 reported, 3 borderline; plus 7 gated insurance passages with no issue tag |

## 1. Candidate-controlled sources only: PASS

Every one of the 190 passage URLs in `run.json` has host `davidjolly.com`, and so do all 58 citation copies inside `run.json.areas`. All 190 URLs in `passages.jsonl` are on the same host. No other host appears. `run.json.site` is `https://davidjolly.com`.

The 10 distinct URLs, with passage counts: `/` (24), `/homeowners-insurance` (28), `/issues/affordability` (18), `/issues/health-care` (22), `/issues/public-education` (19), `/ending-the-culture-wars` (17), `/issues` (20), `/jolly-insurance-proposal-facts` (10), `/where-david-stands` (22), `/about` (10). The nine non-homepage pages and their counts match `ingest.log` exactly. The homepage is the crawl root (`site: https://davidjolly.com/`), so it has no per-page line; 24 + 166 = 190 matches the log's total. `ingest.log` has no redirect, bot-challenge, browser-fallback or unreachable lines, so no redirect needed documenting.

Passages on the candidate's host that name third parties (`28518451` citing Insure.com and the State Board of Administration; `fbd1ce09` naming advocacy organizations) are the candidate's own copy, so they stay in scope. The sources they name were not fetched.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 190 unique ids. `run.json` has 190 passages, and every id is present in both.
- All 56 passages with `states_policy: true` have `text` that is byte-identical (`Buffer.equals` over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 190 passages, and over all 58 citation copies in `run.json.areas`, also found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)` and `issues` equals exactly the set of scores >= 0.85. `counts.states_policy` (56) and `counts.with_issue` (42) recompute exactly. No inconsistencies.

Script core (run from RUN_DIR):

```js
const run = JSON.parse(fs.readFileSync('run.json','utf8'));
const byId = new Map(fs.readFileSync('passages.jsonl','utf8').split('\n').filter(Boolean).map(l => { const p = JSON.parse(l); return [p.id, p]; }));
const bad = run.passages.filter(p => p.verdict.states_policy)
  .filter(p => { const q = byId.get(p.id); return !q || !Buffer.from(p.text,'utf8').equals(Buffer.from(q.text,'utf8')); });
// bad.length === 0
```

## 3. No inferred motive: FAIL

This reingest added the `/about` page, which the earlier run did not fetch. Three of its passages are biography or self-description with no commitment by the candidate, and all three cleared the gate:

- `c4035c09` (`/about`, commitment 0.90, tagged B1): "Today, David is a proud Florida Democrat, fighting for the values he sees rooted in democratic tradition, that the economy". Party identity and a statement of values. It commits to nothing.
- `266196cf` (`/about`, commitment 0.96, tagged B2): "David Jolly is a former Member of Congress, attorney, and fifth-generation Floridian running for Florida Governor in 2026. His campaign". Biography, then a list of the campaign's focus areas and a belief. There is no commitment in it.
- `8ffb3fca` (`/about`, commitment 0.94, tagged A6): "David has focused his campaign on historic groundbreaking homeowner’s insurance reform, the expansion of primary healthcare services, and investing in". It names focus areas, then gives family biography ("son of a minister, David and his wife Laura are raising their young family in Pinellas County").

Impact: none of the three is tagged to a spine issue, so the spine counts in check 4 are unaffected. Each adds one citation to a non-spine issue: B1, B2 and A6. The biography passages on the same page that are closest to them were correctly gated out: `bc9db370` (0.61), `6615842f` (0.72), `62cd6727` (0.05) and `610e318c` (0.02). So were homepage biography `d523fcbc` (0.61) and `22d36f31` (0.81), event copy `a4fcb985`, `daf27781`, `52b59360`, `703b0ed1` and `5b68622b`, fundraising `e1137b9a` (0.02) and `96caf63f` (0.83), and the attack-only passages `322c1aea` (0.40), `43a58dfd` (0.08) and `8e826070` (0.13).

Borderline items that do not fail the check, listed for the founder:

- `33b2854f` (A1, counts toward A1): "Byron Donalds is lying to scare people with invented numbers. There is no “$1,000 hurricane tax” in the plan. Here". It opens with an attack on the opponent, then states what the plan contains and its stated aim of cutting premiums by 60 to 70 percent. It carries a commitment, so it passes. A claim written from it should attribute the plan statement and must not carry "lying" in the Profiler's own voice.
- `6a350c19` (A1, counts toward A1) and `b64de3ec`, `cdf1441f`: link-card teasers on `/where-david-stands` whose text is cut off with "…". The words are the candidate's, but each is a fragment of a page that is quoted elsewhere at full length.
- `8d79a86d` (A1): "Instead of forcing every Florida family to pay a private insurer to take on that enormous hurricane risk, Jolly's proposal does four things, in order." A lead-in sentence. It counts toward A1.
- `af7822f3` (KYV9): "Florida doesn't need to abandon public education." and `998c6863` (A6): "That starts with schools we are willing to invest in." Slogan lines with little concrete commitment.

## 4. Silence recorded, not filled: PASS

A passage counts when it cleared the gate (`states_policy: true`) and carries the issue id (score >= 0.85). That is the set `groupByArea` rolls into `run.json.areas`, and the areas agree with these counts.

| Spine issue | Passages | Ids |
|---|---|---|
| A1 Property insurance costs | 13 | `1d5f9a9f`, `af5004c7`, `15728f6b`, `8d79a86d`, `a0bbb4d3`, `0f2d6744`, `18010427`, `0fa9eba0`, `f91f38b0`, `33b2854f`, `8abc635f`, `5dba0489`, `6a350c19` |
| A3 Property taxes | **0: no_stated_position_found** | none |
| A2 Housing affordability | 6 | `18010427`, `c85b00c4`, `8cb9558f`, `9841ab56`, `56a17ea7`, `f91f38b0` |
| A4 Cost of living in Florida | 5 | `18010427`, `1552aa29`, `8cb9558f`, `9841ab56`, `f91f38b0` |

A3 has no passage with an A3 score at or above 0.85, gated or not. The highest A3 score in the run is 0.58. The run records the silence and fills nothing.

For the record, the ungated tag counts (issue score >= 0.85, `states_policy` false) are A1 +6, A2 +4, A4 +6, A3 +0. Those passages are not in `areas`, and the misses among them are listed in check 5.

## 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but they plainly state a commitment on a SPINE issue. First 20 words, then commitment score, then tags:

- `5d9e0ab9` (`/`, 0.79, [A1]): "Floridians pay the highest home insurance prices in America. Here is the plan to cut them by 60 to 70"
- `9f5f0a83` (`/issues/affordability`, 0.81, [A1]): "Read the full plan: how a state-backed catastrophe fund cuts Florida homeowners insurance by 60 to 70 percent." A link line, but it states the plan and its aim.
- `cde8755c` (`/issues/affordability`, 0.73, [A1, A2]): "No, it is a risk-pooling mechanism that lowers costs for everyone by spreading hurricane exposure across all Florida homes. Homeowners"
- `c65836a7` (`/jolly-insurance-proposal-facts`, 0.76, [A1]): "Byron Donalds thinks you should pay an extra $4,500 a year for insurance. A state catastrophic fund would lift the". Opens with an attack; the rest states the plan and its savings.
- `39c90fa5` (`/issues/affordability`, 0.80, [A2, A4, KYV2]): "The plan specifically calls for scaling workforce housing based on income and proximity to work, deliberately targeting tourism corridors rather"
- `99397a78` (`/issues/affordability`, 0.52, [A2, A4, KYV8]): "Retirees face acute pressures from condo special assessments and rising property insurance. The no-interest state-backed condo loan is targeted directly"
- `dd261a7f` (`/homeowners-insurance`, 0.62, []): "David Jolly's plan takes a structure Florida has already proven and directs it to the people who actually pay the" (A1 score 0.78)
- `39e5b792` (`/homeowners-insurance`, 0.62, []): "The fund is rolled out responsibly. Coverage becomes available only after a fiscally sound amount of money is set aside" (A1 score 0.46)
- `edaa05d2` (`/homeowners-insurance`, 0.33, []): "Yes. The Florida Hurricane Catastrophe Fund has existed since 1993. Today it reimburses insurance companies for a share of their". Its last sentence states the plan: "The plan applies a structure Florida has already proven to the people who pay the bills."
- `6d9d038d` (`/issues/affordability`, 0.65, [KYV2]): "The cap would bring Florida's authorized utility return in line with the national average of roughly 9 to 10 percent." A4 score 0.63; the matching utility-cap passage `1552aa29` is tagged A4.

Borderline (a statement about the plan that is closer to rebuttal, outcome or goal than to commitment):

- `7d167a89` (`/homeowners-insurance`, 0.14, []): "No. There is no $1,000 fee, tax or assessment on homeowners in the plan. The claim comes from a Byron"
- `e2c091f2` (`/homeowners-insurance`, 0.11, []): "Hurricane and wind risk can be 60 to 70 percent of a Florida homeowners bill. Based on Insure.com's Florida home"
- `e983526d` (`/issues/affordability`, 0.59, [A4]): "When most people can't cover a surprise bill without going into debt, the whole economy is one storm away from"

Also for the founder: these cleared the gate as policy, but no issue was tagged, and each plainly describes the A1 insurance plan. Their A1 scores run from 0.49 to 0.81, below the 0.85 cut. They are not in the A1 count above: `b80c7018` (0.77), `23c2f5ab` (0.71), `b243bfec` (0.72), `cc1ca7ba` (0.80), `4cbd001d` (0.49), `96ef8495` (0.73), `5b7a1d33` (0.81).

## Notes

- `run.log`: "190 asked, 56 state a policy, 14 state a policy the taxonomy has no question for, 134 state no policy, 0 failed". This matches `counts` (56 − 42 = 14).
- The About page was fetched this time (`ingest.log`: "about page: https://davidjolly.com/about"). That is the source of the check 3 failures. The earlier run in the parent directory did not fetch it.

VERDICT: FAIL (check 3: No inferred motive)
