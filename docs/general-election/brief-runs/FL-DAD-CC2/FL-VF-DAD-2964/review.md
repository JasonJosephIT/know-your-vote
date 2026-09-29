# Step 3 review: FL-VF-DAD-2964 (Marleine Bastien), FL-DAD-CC2-general

- Official site: https://reelectbastien.com/
- Run reviewed: `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 18 asked, 0 failed), `passages.jsonl` (18 passages), `ingest.log`
- Spine: undecided for this race, so every taxonomy issue in `src/lib/news-issues.ts` (tax-7, 25 sub-issues) is treated as spine.
- Reviewer scope: read-only. This file is the only file written. No website was fetched.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 18 passages in run.json have url `https://reelectbastien.com/`. Only host: `reelectbastien.com`. No other host. |
| 2 | Quotes verbatim (by script) | **PASS** | 4 states-policy passages byte-identical to passages.jsonl: 4845e5c0, f54aba05, c72830b8, 10bd421f. All 5 citations in `areas` also byte-identical. |
| 3 | No inferred motive | **PASS** | All 4 states-policy passages are forward commitments. None is biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | Over threshold: A2, B1, KYV6, KYV10. The other 21 issues have 0 passages and are `no_stated_position_found`. |
| 5 | Possible misses (information only) | none found | No no-policy passage makes a plain forward commitment on a taxonomy issue. Near-misses are listed below: 25a39462, 1f0dccc4, bee0011e, 60656e47. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I read every `passages[].url` in run.json with a script. The set of hosts is `["reelectbastien.com"]`, which is the OFFICIAL_SITE host. The `site` field is `https://reelectbastien.com`. The 18 passage ids in run.json are the same 18 ids in passages.jsonl, and each url and heading match. ingest.log shows one page fetched (`only 64 characters of text, rendering in the browser`), so it was rendered in the browser. It also shows no redirect.

Coverage note (not a failure): ingest.log says `21 links, 0 policy page(s) selected (cap 8), about page: none` and `asking Jev about 0 link(s)`, and `links.jsonl` is empty. The whole corpus comes from the homepage only.

### 2. Quotes verbatim: PASS

I checked this with node, comparing `Buffer.from(text,"utf8").equals(...)` for each run.json passage against the passages.jsonl row with the same id:

| id | states_policy | text byte-identical | url equal | heading equal | bytes |
|---|---|---|---|---|---|
| 4845e5c0 | true | yes | yes | yes | 124 |
| f54aba05 | true | yes | yes | yes | 102 |
| c72830b8 | true | yes | yes | yes | 108 |
| 10bd421f | true | yes | yes | yes | 91 |

All 18 passages matched, not only the 4 above. Every citation text in `areas` (B1: f54aba05, 10bd421f; KYV10: 10bd421f; A2: 4845e5c0; KYV6: 4845e5c0) is also byte-identical to passages.jsonl.

### 3. No inferred motive: PASS

These are the passages the run marks `states_policy: true`, with their first 20 words or fewer:

- 4845e5c0 (0.97): "Keep building homes families can actually afford, and protect renters from being pushed out of the neighborhoods they built." This is a forward commitment.
- f54aba05 (0.97): "Grow the Mom & Pop grant program and bring jobs and investment to District 2's commercial corridors." This is a forward commitment.
- c72830b8 (0.95): "Fix the aging roads, drainage, and water systems that have been neglected in our community for far too long." This is a forward commitment. It matches no taxonomy issue over the threshold, so it is a candidate-tier issue (infrastructure).
- 10bd421f (0.95): "Expand job training and real pathways so every family can build lasting financial security." This is a forward commitment.

The run marks all of the following as no policy, so none of them leaked through: the biography passages (9c91ef16, 5c8dd6ac, 34b0bfdd), the thank-you and election-result passages (4b3e7853, 81896268), the SMS opt-in (38e9eb2e) and the fundraising ask (a7b73074). None of the 4 states-policy passages attacks an opponent.

### 4. Silence recorded, not filled: PASS

This is the number of passages with a sub-issue score of 0.85 or more. The column "…and states policy" counts only the passages that also cleared the commitment gate. Only those feed `areas`.

| Issue | Label | Passages ≥ 0.85 | …and states policy | Position |
|---|---|---|---|---|
| A2 | Housing affordability | 2 (25a39462 0.95, 4845e5c0 0.98) | 1 (4845e5c0) | stated |
| B1 | Economy, inflation, and jobs | 2 (f54aba05 0.97, 10bd421f 0.96) | 2 | stated |
| KYV6 | Renters and evictions | 1 (4845e5c0 0.93) | 1 | stated |
| KYV10 | Career, vocational and higher education | 1 (10bd421f 0.91) | 1 | stated |
| A1, A3, A4, A5, A6, A7, KYV9, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV3, KYV4, KYV5, KYV7, KYV8 | (21 issues) | 0 | 0 | no_stated_position_found |

On A2, passage 25a39462 scores 0.95 on the issue but has commitment 0.81, which is below the gate. The run marks it `states_policy: false` and leaves it out of `areas`. It carries `issues: ["A2"]` in its verdict only because issue ids are computed whether or not the passage clears the gate. The published A2 position rests on 4845e5c0 alone.

c72830b8 states a policy but clears no issue. I am not assigning it to any spine issue.

### 5. Possible misses (information for the founder, not a fix)

None found. No passage the run marks as no policy makes a plain forward commitment on a taxonomy issue.

The passages closest to the gate describe past results, not commitments. All of them sit under the heading "Results for District 2" (042db9cf: "Since taking office in 2022, Commissioner Bastien has delivered…"):

- 25a39462 (commitment 0.81, A2 0.95): "More than 1,800 new homes at every income level, including 155 dedicated senior units and 800+ homes for…"
- 1f0dccc4 (commitment 0.78, B1 0.74): "The Mom & Pop Grant Program funds equipment, inventory, insurance and security for local shops, alongside facade improvements, an…"
- bee0011e (commitment 0.74, KYV6 0.79): "$1.9 million for the Older Adults Home Modification Program lets residents 62 and older age safely at home, and…"
- 60656e47 (commitment 0.48): "The county's first Solid Waste Cares Program helps customers facing financial hardship with their fees, paired with new recycling…"

These passages describe what the site says was done. They make no pledge, so leaving them out of stated_position matches the constitution. Whether the brief should show a "record the campaign cites" is a product decision, and it would be a different bucket.

### Scope note for the founder (not scored)

Passage 81896268 on the campaign site says: "District 2 re-elected Commissioner Marleine Bastien outright — 78% of the vote, won in one round, no runoff." The site itself says the contest was decided before the general. This review does not verify that statement or fetch anything to check it. The run is labelled race `FL-DAD-CC2-general`, and whether the candidate is on that ballot should be confirmed from an independent source before the brief is published. The site's own passages are also written in a post-election voice ("Thank you, District 2", "Now we get back to it").

VERDICT: PASS
