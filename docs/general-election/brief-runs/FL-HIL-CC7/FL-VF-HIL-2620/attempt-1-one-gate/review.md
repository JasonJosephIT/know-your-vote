# Step 3 review: FL-VF-HIL-2620 (Joshua Wostal), FL-HIL-CC7-general

Reviewer: Step 3, under the Profiler constitution (stated_position bucket only). Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (50 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 50 of 50 asked, 0 failed, 16 states_policy, 5 with an issue), `ingest.log`. For context only: `links.jsonl`, `ingest-report.md`, `run-report.txt`, `run.log`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 sub-issues), and check 5 considers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 50 passages are on `www.joshuawostal.com`, across 6 pages (`/`, `/about`, `/infrastructure`, `/spending`, `/taxes`, `/the-boring-budget-guy`). No other host. |
| 2 | Quotes verbatim | **PASS** | All 16 `states_policy` passages match `passages.jsonl` byte for byte (text, url, heading), checked with a node script. So do all 50, and all 5 A3 citations in `areas`. |
| 3 | No inferred motive | **FAIL** | `bb4d1b79` and `09b1b3e1` are marked as stating a policy and cited under A3, but they only describe county taxes, with no commitment by the candidate. `73b813e3` and `fe0337a6` are also gated as policy with no commitment (no issue tag). Borderline: `f3dbd42e`, `3849d714`, `0e40b6d8`. |
| 4 | Silence recorded, not filled | **PASS** | A3 5 over / 5 cited (`bb4d1b79`, `09b1b3e1`, `ab9928dc`, `92d24dbd`, `fa63e97e`). The other 24 issues have 0 and are `no_stated_position_found`. Every `issues` list matches the scores and threshold exactly. |
| 5 | Possible misses (information only) | none | No passage marked states_policy=false states a forward commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script over `run.json` found exactly one host in the passage urls: `www.joshuawostal.com`, the OFFICIAL_SITE host. No redirect was involved.

- `https://www.joshuawostal.com/` (7): `6b76fddb`, `f64c2294`, `fe4cb1dc`, `47d23ee0`, `bb4d1b79`, `76f5e54e`, `52a09edc`
- `/about` (10, chosen by Jev as About at 0.92): `6f898d69`, `09529e2c`, `cbac57a2`, `8899588b`, `69df1537`, `415aa167`, `96169f04`, `5340edff`, `d5cbfb01`, `3ab30bfd`
- `/infrastructure` (7): `1d7b8a14`, `ac435153`, `2520a32f`, `84e0a6a7`, `34b069a3`, `6380e500`, `0e40b6d8`
- `/spending` (10): `08d103cb`, `2151a451`, `e71efebc`, `eb265a67`, `98d2f5a0`, `c9ca2e38`, `9d098ac4`, `82a61530`, `2b19d7db`, `bb26eb61`
- `/taxes` (7): `73b813e3`, `09b1b3e1`, `ab9928dc`, `92d24dbd`, `fe0337a6`, `f3dbd42e`, `3849d714`
- `/the-boring-budget-guy` (9): `9915adb5`, `b248cd25`, `737ddcdf`, `996b0121`, `e472815e`, `fa63e97e`, `93c86005`, `17cb117a`, `76935b3a`

`ingest.log` names only this site. Its per-page counts (9, 12, 9, 12, 10) are before cross-page de-duplication and do not list the homepage. The final 50 matches `ingest-report.md` (homepage 7, and the other five pages as above). All 7 links Jev judged (`links.jsonl`) are on the same host; `/get-involved` and `/vote` were not chosen.

### 2. Quotes verbatim: PASS

Checked with `node`, comparing `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 50 in `run.json`, 50 in `passages.jsonl`, all shared, none unique to either side.
- All 16 `states_policy` passages are byte-identical, and so are their url and heading: `bb4d1b79`, `84e0a6a7`, `6380e500`, `0e40b6d8`, `eb265a67`, `c9ca2e38`, `82a61530`, `bb26eb61`, `73b813e3`, `09b1b3e1`, `ab9928dc`, `92d24dbd`, `fe0337a6`, `f3dbd42e`, `3849d714`, `fa63e97e`.
- All 50 texts match, including the gated-out ones.
- Every citation in `run.json.areas` (A3: `ab9928dc`, `92d24dbd`, `fa63e97e`, `09b1b3e1`, `bb4d1b79`) carries text identical to `passages.jsonl`. `run-report.txt` shortens quotes with "…" for display only.
- The site's own oddities are preserved and must stay that way in any quote: `ab9928dc` "attempts , and" (space before the comma), `fa63e97e` "for mileage" (the site's spelling, where `92d24dbd` says "millage").

The gate is also internally consistent: for every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores `>= 0.85`.

### 3. No inferred motive: FAIL

I read all 16 passages marked `states_policy: true`. Four have no commitment by the candidate. They describe county taxes or state an opinion about tax hikes, and say nothing the candidate will do. Two of them are cited under A3 (Property taxes), so a stated position would be built from them:

| id | Commitment | Issues | Why it fails | First 20 words |
|---|---|---|---|---|
| `bb4d1b79` | 0.90 | A3 (0.86) | A description of county taxes and a criticism of the county government. No commitment. Homepage copy. | "Here in Hillsborough County, we pay the 3rd highest sales taxes in the state. The county maxes their property tax" |
| `09b1b3e1` | 0.90 | A3 (0.87) | The same text as `bb4d1b79` plus "And those are just the ones you can see—there are a lot more buried each year in the budget." No commitment. | "Here in Hillsborough County, we pay the 3rd highest sales taxes in the state. The county maxes their property tax" |
| `73b813e3` | 0.92 | none | An opinion only. No commitment. | "Tax hikes hurt working families and seniors throughout the county." |
| `fe0337a6` | 0.86 | none | A description of a problem. No commitment. | "Seniors on fixed incomes are being taxed out of their homes." |

Borderline passages. I have not counted these as failures, but a human should read them:

| id | Commitment | Note | First 20 words |
|---|---|---|---|
| `f3dbd42e` | 0.97 | Almost all problem description. The only stance is "We can't continue the same approach that's been done in the past", which names no action. It contains `73b813e3` and `fe0337a6` word for word. | "We can't continue the same approach that's been done in the past because tax hikes hurt working families and seniors" |
| `3849d714` | 0.86 | Argues for "being creative and thinking outside of the box" and lists hoped-for results. No specific action is committed to. | "But being creative and thinking outside of the box is what will let our residents keep more of their hard-earned" |
| `0e40b6d8` | 0.93 | A general view (spending infrastructure funds on infrastructure means no tax increase), not a commitment, though it restates the commitment on the same page. | "When we spend our allocated funds for infrastructure actually on improving infrastructure, we don't have to raise taxes on our" |

The other nine carry a commitment in the candidate's words and pass: `ab9928dc` ("I'll continue to vote no"), `fa63e97e` ("I'm fighting for you"), `92d24dbd` (a tax plan the candidate says he developed), `84e0a6a7` ("I'm changing that"), `6380e500` ("if elected to another term I will ensure we continue making progress"), `eb265a67` ("I'm fighting to lower our spending"), `c9ca2e38` ("we're not doing that anymore", plus a described policy), `82a61530` ("I will stop this unsustainable wasteful spending"), `bb26eb61` ("I will further audit the county's spending").

Effect on A3: if `bb4d1b79` and `09b1b3e1` are dropped, A3 rests on `ab9928dc`, `92d24dbd` and `fa63e97e`, all of which state the candidate's own votes or plan on property taxes.

Notes for writing the claims (not failures):
- The candidate is a sitting County Commissioner. Attribute as "The campaign website states…" or "Commissioner Wostal says…". The constitution's example title "Senator" does not apply to him.
- `c9ca2e38` includes "Insiders who made backroom deals were getting rich off us year after year. That's fraud". That is an allegation by the campaign. It may appear only as an attributed quote, never in our voice, and the Profiler must not assess it.
- Much of the copy is the candidate's account of his own record in office (`92d24dbd`, `84e0a6a7`, `c9ca2e38`, `fa63e97e`). It is self-portrait and belongs in stated_position only as attributed statements. Checking it against the record is not this bucket's job.
- 11 of the 16 policy passages match no taxonomy issue (county spending, audits and transparency, roads and sidewalks). Under the constitution these are candidate-tier issues for this candidate only.

### 4. Silence recorded, not filled: PASS

A passage counts only if it clears the gate (commitment ≥ 0.85) and scores ≥ 0.85 on the issue. This matches `groupByArea` in `src/lib/policy-noul.ts`. One taxonomy issue has any passage over the threshold:

| Issue | Label | Over | Cited | Passages | Coverage |
|---|---|---|---|---|---|
| A3 | Property taxes | 5 | 5 | `ab9928dc` 0.98, `92d24dbd` 0.98, `fa63e97e` 0.98, `09b1b3e1` 0.87, `bb4d1b79` 0.86 | stated (but see check 3: two of the five carry no commitment) |

The other 24 issues have 0 passages over the threshold and are recorded as `no_stated_position_found`: A1, A2, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

No passage that failed the gate scored over the threshold on any issue.

On scope: the crawl read the homepage, the About page and four policy pages. `/get-involved` and `/vote` were judged and not chosen. These silences cover the six pages read.

### 5. Possible misses (information for the founder, not a fix)

None. I read all 34 passages marked `states_policy: false`. None states a forward commitment by the candidate on any taxonomy issue. They are biography (`f64c2294`, `8899588b`, `69df1537`, `415aa167`, `96169f04`, `5340edff`, `d5cbfb01`, `3ab30bfd`, `6f898d69`, `09529e2c`, `6b76fddb`, `cbac57a2`, `2b19d7db`, `17cb117a`), slogans (`fe4cb1dc`, `9915adb5`, `93c86005`, `08d103cb`), volunteer or vote-ask copy (`52a09edc`, `76935b3a`), or criticism of the county and accounts of past actions (`47d23ee0`, `2151a451`, `b248cd25`, `e71efebc`, `737ddcdf`, `1d7b8a14`, `ac435153`, `76f5e54e`, `2520a32f`, `34b069a3`, `98d2f5a0`, `996b0121`, `e472815e`, `9d098ac4`). The ones with any issue score ≥ 0.5 have no commitment:

- `98d2f5a0` (commitment 0.69; A3 0.80): "$235 million of our property tax dollars was funding non-government entities that had zero oversight." A finding, not a commitment.
- `996b0121` (0.22; A3 0.79): "Our infrastructure in Hillsborough County is crumbling despite county government collecting billions in tax dollars earmarked for infrastructure. Over the". Problem and past findings only.
- `e472815e` (0.52; A3 0.68, B1 0.60, A2 0.51): "Our county government has a spending problem. To fund their wasteful spending, they keep asking us for more of our". Problem description only.
- `9d098ac4` (0.68; A7 0.50): "In another instance, I noticed the supervisor of elections budget remained the same even after a decrease in registered voters." Past action only.

VERDICT: FAIL (check 3: `bb4d1b79` and `09b1b3e1` are marked as stating a policy and cited under A3 but only describe county taxes with no commitment by the candidate; `73b813e3` and `fe0337a6` are gated as policy with no commitment)
