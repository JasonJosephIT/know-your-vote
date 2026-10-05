# Profiler review: FL-DOE-89243 (David Jolly, FL-GOV-general), reingest 2026-09-29, two-gate run

- Official site: https://davidjolly.com/
- Run: `run.json` status `complete`, model `jev-1.13.0`, provenance `jev:jev-1.13.0/tax-7/q-e7282116` (the two-gate question set), threshold 0.85, created 2026-09-30T01:59:59Z
- Counts (run.json): 190 passages, 190 asked, 28 state a policy (both gates at or above 0.85), 23 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye. Checks 3 and 5 are a reading of all 190 passages. The one-gate run and its review are kept in `attempt-1-one-gate/`.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | FAIL: 1 biography passage from `/about` still marked as policy (`266196cf`, tagged B2, not a spine issue) |
| 4 | Silence recorded, not filled | PASS: A1 = 11, A3 = 0 (no_stated_position_found), A2 = 3, A4 = 3 |
| 5 | Possible misses (information only, not a fix) | 16 reported, 5 borderline; plus 4 gated insurance passages with no issue tag |

## 1. Candidate-controlled sources only: PASS

Every one of the 190 passage URLs in `run.json` has host `davidjolly.com`, and so do all 31 citation copies inside `run.json.areas`. All 190 URLs in `passages.jsonl` and all 27 judged links in `links.jsonl` are on the same host. No other host appears. `run.json.site` is `https://davidjolly.com`.

The 10 distinct URLs, with passage counts: `/` (24), `/homeowners-insurance` (28), `/issues/affordability` (18), `/issues/health-care` (22), `/issues/public-education` (19), `/ending-the-culture-wars` (17), `/issues` (20), `/jolly-insurance-proposal-facts` (10), `/where-david-stands` (22), `/about` (10). The nine non-homepage counts match `ingest.log` exactly; the homepage is the crawl root (`site: https://davidjolly.com/`), and 24 + 166 = 190 matches the log's total. `ingest.log` has no redirect, bot-challenge, browser-fallback or unreachable line, so there is no redirect to document.

Passages on the candidate's host that name third parties (`28518451` citing Insure.com; `fbd1ce09` and `78536bfb` naming advocacy organizations; `62cd6727` quoting newspapers) are the candidate's own copy and stay in scope. None of them is marked as policy, and the sources they name were not fetched.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 190 unique ids (no duplicates). `run.json` has 190 passages; every id is in both, and no verdict is null.
- All 28 passages with `states_policy: true` have `text` byte-identical (`Buffer.equals` over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 190 passages, and over all 31 citation copies in `run.json.areas`, found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85 && own_commitment >= 0.85)`, and `issues` equals exactly the set of scores >= 0.85. `counts.states_policy` (28) and `counts.with_issue` (23) recompute exactly. No inconsistencies.

Script core (run from RUN_DIR; full script at the reviewer's scratchpad `jolly-check.mjs`):

```js
const run = JSON.parse(fs.readFileSync('run.json','utf8'));
const byId = new Map(fs.readFileSync('passages.jsonl','utf8').split('\n').filter(Boolean).map(l => { const p = JSON.parse(l); return [p.id, p]; }));
const bad = run.passages.filter(p => p.verdict.states_policy)
  .filter(p => { const q = byId.get(p.id); return !q || !Buffer.from(p.text,'utf8').equals(Buffer.from(q.text,'utf8')) || q.url !== p.url; });
// bad.length === 0
```

## 3. No inferred motive: FAIL

The second gate removed two of the three `/about` passages flagged in the one-gate review: `c4035c09` (own_commitment 0.65) and `8ffb3fca` (0.83) now state no policy. One is still marked as policy:

- `266196cf` (`/about`, commitment 0.96, own_commitment 0.89, tagged B2): "David Jolly is a former Member of Congress, attorney, and fifth-generation Floridian running for Florida Governor in 2026. His campaign". It is biography, then a list of the campaign's focus areas ("historic homeowner's insurance reform, expanding primary healthcare services, and investing in community public schools") and a belief ("Jolly believes everyone deserves access to work, wages, and wealth"). It names topics but commits the candidate to nothing specific. It is one of the 19 flagged passages that `gate2-2026-09-30.md` reports as still passing (pilot: own 0.44 on the first draft wording, 0.89 on the final).

Impact: `266196cf` is not tagged to a spine issue, so the spine counts in check 4 are unaffected. It adds one citation to B2 (Healthcare access and costs), next to two real B2 plan passages (`25649216`, `4b8e7730`).

Correctly gated out in this run: `/about` biography `bc9db370`, `6615842f`, `62cd6727`, `610e318c`, `c4035c09`, `8ffb3fca`; homepage biography `d523fcbc`, `e2217ca5`, `22d36f31`; event copy `a4fcb985`, `daf27781`, `52b59360`, `6e65fc4d`, `703b0ed1`, `5b68622b`; fundraising and sign-up `e1137b9a`, `96caf63f`, `12023e10`, `ce15c11a`; and the attack-only passages `322c1aea`, `43a58dfd`, `8e826070`, `965f2170`, `6eebb1ba`.

Borderline items that do not fail the check, listed for the founder:

- `6a350c19` (`/where-david-stands`, A1, counts toward A1): "David Jolly’s Plan to Cut Florida Homeowners Insurance by 60 to 70 Percent THE PLAN, IN PLAIN ENGLISH David Jolly's Plan to Cut Florida Homeowners Insurance by 60 to 70 Percent…". A link-card teaser cut off with "…". It is not biography, attack, fundraising or event copy, and it names the plan, but it is a fragment of a page quoted at full length elsewhere in the run.
- `8d79a86d` (`/homeowners-insurance`, A1, counts toward A1): "Instead of forcing every Florida family to pay a private insurer to take on that enormous hurricane risk, Jolly's proposal does four things, in order." A lead-in sentence with no content of its own.
- `dffc5228` (`/issues`, A7) and `5bf101e1` (`/issues`, B1) each open with criticism ("Tallahassee politicians preempt the will of the voters based on selfish ideological whims"; "hindered by short-term political thinking") and then state commitments, so they pass. A claim written from them should attribute the criticism to the candidate and not carry it in the Profiler's voice.
- `96ef8495` (`/jolly-insurance-proposal-facts`, gated, no tag): "This is a model that works. We know it works because Florida already created a catastrophic fund, and Republican legislatures have run it for thirty years." Mostly argument for the plan, but it ends in a commitment ("We want it to cover actual Floridians"), so it passes.

## 4. Silence recorded, not filled: PASS

A passage counts when it cleared both gates (`states_policy: true`) and carries the issue id (score >= 0.85). That is the set `groupByArea` rolls into `run.json.areas`, and the areas agree with these counts.

| Spine issue | Passages | Ids |
|---|---|---|
| A1 Property insurance costs | 11 | `1d5f9a9f`, `af5004c7`, `15728f6b`, `8d79a86d`, `a0bbb4d3`, `0f2d6744`, `18010427`, `0fa9eba0`, `8abc635f`, `5dba0489`, `6a350c19` |
| A3 Property taxes | **0: no_stated_position_found** | none |
| A2 Housing affordability | 3 | `18010427`, `c85b00c4`, `9841ab56` |
| A4 Cost of living in Florida | 3 | `18010427`, `1552aa29`, `9841ab56` |

A3 has no passage with an A3 score at or above 0.85, gated or not. The highest A3 score in the run is 0.61. The run records the silence and fills nothing.

Against the one-gate run: A1 13 → 11 (`f91f38b0`, `33b2854f` dropped), A2 6 → 3 (`8cb9558f`, `56a17ea7`, `f91f38b0` dropped), A4 5 → 3 (`8cb9558f`, `f91f38b0` dropped). Each dropped passage failed only the second gate; all are listed in check 5.

For the record, the ungated tag counts (issue score >= 0.85 but `states_policy` false) are A1 +8, A2 +7, A4 +7, A3 +0. Those passages are not in `areas`.

## 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but they plainly state a commitment on a SPINE issue. Id, page, commitment / own_commitment, tags, then the first 20 words:

- `f91f38b0` (`/issues`, 0.97 / 0.80, [A1, A2, A4, KYV8]): "The property insurance crisis is the primary reason so many people in Florida are struggling to afford a place to". It goes on: "A state catastrophic fund ... would dramatically reduce property and car insurance rates" and "Allowing condominium associations and owners access to a no-interest state-backed loan program would likewise address". The strongest miss: it was counted under A1, A2 and A4 in the one-gate run.
- `8cb9558f` (`/issues/affordability`, 0.89 / 0.77, [A2, A4, KYV6, KYV8]): "Half of Florida renters now hand over more than a third of their income just to keep a roof overhead,". Ends: "We will stand with renters and long-time owners so the fine print doesn't force them out of their own homes."
- `56a17ea7` (`/issues/affordability`, 0.86 / 0.78, [A2, KYV8]): "Older coastal condos have been hit hardest by new inspection requirements, with many owners facing assessments of $50,000 or more". Ends: "The plan offers no-interest state-backed loans so associations can spread costs over time".
- `39c90fa5` (`/issues/affordability`, 0.81 / 0.82, [A2, A4, KYV2]): "The plan specifically calls for scaling workforce housing based on income and proximity to work, deliberately targeting tourism corridors rather"
- `99397a78` (`/issues/affordability`, 0.55 / 0.42, [A2, A4, KYV8]): "Retirees face acute pressures from condo special assessments and rising property insurance. The no-interest state-backed condo loan is targeted directly"
- `33b2854f` (`/jolly-insurance-proposal-facts`, 0.88 / 0.78, [A1]): "Byron Donalds is lying to scare people with invented numbers. There is no “$1,000 hurricane tax” in the plan. Here". Opens with an attack; then states the plan to cut premiums by 60 to 70 percent. A claim written from it must not carry "lying" in the Profiler's voice.
- `c65836a7` (`/jolly-insurance-proposal-facts`, 0.82 / 0.40, [A1]): "Byron Donalds thinks you should pay an extra $4,500 a year for insurance. A state catastrophic fund would lift the". Opens with an attack; the rest states the plan and its savings.
- `cde8755c` (`/issues/affordability`, 0.70 / 0.36, [A1, A2]): "No, it is a risk-pooling mechanism that lowers costs for everyone by spreading hurricane exposure across all Florida homes. Homeowners"
- `5d9e0ab9` (`/`, 0.82 / 0.70, [A1]): "Floridians pay the highest home insurance prices in America. Here is the plan to cut them by 60 to 70"
- `9f5f0a83` (`/issues/affordability`, 0.82 / 0.75, [A1]): "Read the full plan: how a state-backed catastrophe fund cuts Florida homeowners insurance by 60 to 70 percent." A link line, but it states the plan and its aim.
- `cc1ca7ba` (`/homeowners-insurance`, 0.89 / 0.75, [], A1 0.79): "Not homeowners. The plan funds it by making insurance companies pay the taxes they currently avoid, and through other sources"
- `23c2f5ab` (`/homeowners-insurance`, 0.86 / 0.74, [], A1 0.73): "The fund is built to a financially sound level and buys backup insurance for catastrophic storms. Coverage does not start"
- `4cbd001d` (`/homeowners-insurance`, 0.86 / 0.72, [], A1 0.47): "Only after the fund reaches a fiscally sound level and backup reinsurance for catastrophic storms is in place. The fund"
- `dd261a7f` (`/homeowners-insurance`, 0.62 / 0.54, [], A1 0.78): "David Jolly's plan takes a structure Florida has already proven and directs it to the people who actually pay the"
- `39e5b792` (`/homeowners-insurance`, 0.61 / 0.56, [], A1 0.45): "The fund is rolled out responsibly. Coverage becomes available only after a fiscally sound amount of money is set aside"
- `6d9d038d` (`/issues/affordability`, 0.66 / 0.31, [KYV2], A4 0.66): "The cap would bring Florida's authorized utility return in line with the national average of roughly 9 to 10 percent." The matching utility-cap passage `1552aa29` is tagged A4.

Borderline (closer to rebuttal, goal or slogan than to a commitment):

- `edaa05d2` (`/homeowners-insurance`, 0.34 / 0.28, []): "Yes. The Florida Hurricane Catastrophe Fund has existed since 1993. Today it reimburses insurance companies for a share of their". Its last sentence states the plan.
- `7d167a89` (`/homeowners-insurance`, 0.17 / 0.26, []): "No. There is no $1,000 fee, tax or assessment on homeowners in the plan. The claim comes from a Byron". A rebuttal about the A1 plan; it is not a property-tax position.
- `e983526d` (`/issues/affordability`, 0.57 / 0.22, [A4]): "When most people can't cover a surprise bill without going into debt, the whole economy is one storm away from"
- `3a1efd65` (`/issues/affordability`, 0.33 / 0.26, [A4]): "Florida can be a place where hard work still buys a home, a full fridge, and a night's sleep without"
- `8182d91a` (`/ending-the-culture-wars`, 0.66 / 0.47, [], A4 0.80): "In Florida, that means moving beyond left versus right and focusing on what actually improves people's lives. Lower costs. Better"

Also for the founder: these cleared both gates but no issue was tagged, and each plainly describes the A1 insurance plan. Their A1 scores are below the 0.85 cut, so they are not in the A1 count above: `b80c7018`, `b243bfec`, `96ef8495`, `5b7a1d33`. (`c02fc117`, the fifth gated passage with no tag, is a marriage-equality position, not a spine issue.)

## Notes

- `run.log`: "190 asked, 28 state a policy, 5 state a policy the taxonomy has no question for, 162 state no policy, 0 failed". This matches `counts` (28 − 23 = 5).
- `ingest-report.md`, section "Step 2: policy run (Jev)", still describes the one-gate run (provenance `q-b2171346`, 56 state a policy, 42 with an issue, 670343 tokens in). The current `run.json` is `q-e7282116` with 28 / 23 and 709863 tokens in. `meta.tsv` `policy_end` (2026-09-29T11:49:12Z) is also the one-gate run's time. The report is stale, not wrong about what it describes; `run.json`, `run.log` and `run-report.txt` agree with each other.
- The second gate trades precision for recall on this site: it removed 2 of 3 flagged biography passages, and it also removed real plan passages on A1, A2 and A4 (check 5). The A2 and A4 positions now rest on three passages each, one of which (`18010427`) is shared by both.

VERDICT: FAIL (check 3: No inferred motive)
