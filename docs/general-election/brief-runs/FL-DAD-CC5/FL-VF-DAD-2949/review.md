# Step 3 review: FL-VF-DAD-2949 (Vicki L. Lopez), FL-DAD-CC5-general

This review was done under the Profiler constitution (stated_position bucket only). It is read-only, and nothing was fetched from the web.

Inputs: `passages.jsonl` (9 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `commitment` and `own_commitment`, 9 of 9 asked, 0 failed, created 2026-09-30T01:58:52Z), `ingest.log`. Read for context only: `links.jsonl`, `meta.tsv`, `run-report.txt`, `run.log`, `ingest-report.md`, `attempt-1-keywords/`, `attempt-1-one-gate/`.

SPINE has not been decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 sub-issues), and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 9 passages have url `https://vickilopez.vote/`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | The 6 `states_policy` passages (`be66cc78`, `b1c5a17c`, `00ef817e`, `03d294d0`, `22313929`, `8f45134e`) are byte-identical to `passages.jsonl`. So are all 9 texts, urls and headings, and the 3 area citations. |
| 3 | No inferred motive | **PASS** | All 6 passages marked as stating a policy are bullets under "Action Plan for District 5", forward commitments in the campaign's words. Biography (`311fe3b2`) and fundraising (`4646aa2c`) were gated out. |
| 4 | Silence recorded, not filled | **PASS** | A2 1 (`00ef817e`), B1 1 (`22313929`), KYV4 1 (`8f45134e`). `311fe3b2` scored 0.86 on A2 but failed both gates, so it is not counted. The other 22 issues are 0, recorded as `no_stated_position_found`. |
| 5 | Possible misses (information only) | Reported | B7 (weak): `0b5c0e56` "Stand with our first responders to keep our communities safe" (commitment 0.76, own_commitment 0.66, B7 0.64). |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host from every `url` in run.json:

| Host | Passages |
|---|---|
| vickilopez.vote | 9: `311fe3b2`, `be66cc78`, `b1c5a17c`, `00ef817e`, `03d294d0`, `0b5c0e56`, `22313929`, `8f45134e`, `4646aa2c` |

This is the OFFICIAL_SITE host. No redirect was involved. `ingest.log` shows only `https://vickilopez.vote/`, which returned a bot challenge (HTTP 202) to a plain fetch and was then fetched in the browser. The one link Jev judged (`/inicio`, "Vicki Lopez ES", policy 0.39, about 0.37) is on the same host and was not chosen.

### 2. Quotes verbatim: PASS

A node script compared `Buffer.from(text, "utf8")` for each run.json passage with the passages.jsonl passage of the same id, using `Buffer.compare`. It also compared url and heading.

- The id sets match: 9 in run.json and 9 in passages.jsonl, all shared.
- All 6 `states_policy: true` passages are byte-identical: `be66cc78` (119 bytes), `b1c5a17c` (59), `00ef817e` (44), `03d294d0` (63), `22313929` (69), `8f45134e` (67).
- All 9 passages match, including the 3 gated out (`311fe3b2` 513 bytes, `0b5c0e56` 60, `4646aa2c` 81). There were 0 mismatches.
- The citations in `run.json.areas` (B1 `22313929`, A2 `00ef817e`, KYV4 `8f45134e`) also match passages.jsonl byte for byte in text, and in url.
- Consistency: for every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85` (the rule in `src/lib/policy-noul.ts`), and `issues` equals the set of scores at or above 0.85. There were 0 inconsistencies and 0 null verdicts.

### 3. No inferred motive: PASS

These are the passages marked as stating a policy. All six sit under the heading "Action Plan for District 5". Each is a single short bullet, quoted in full:

| id | commitment / own_commitment | Text |
|---|---|---|
| `be66cc78` | 0.94 / 0.93 | "Lead with transparency and accountability by regularly communicating with residents, businesses, and condo associations" |
| `b1c5a17c` | 0.92 / 0.92 | "Improve quality of life with senior programming investments" |
| `00ef817e` | 0.96 / 0.93 | "Create more affordable and workforce housing" |
| `03d294d0` | 0.95 / 0.94 | "Invest in infrastructure to reduce traffic and improve mobility" |
| `22313929` | 0.96 / 0.93 | "Support small businesses to grow our economy and create opportunities" |
| `8f45134e` | 0.94 / 0.89 | "Protect Biscayne Bay, defend our environment, and mitigate flooding" |

Each bullet is a forward commitment the campaign presents as its plan. None is only biography, an attack on an opponent, fundraising or event copy.

Correctly gated out:
- `311fe3b2` (0.42 / 0.11) is biography and record: past work and an award.
- `4646aa2c` (0.03 / 0.05) is fundraising: "Vicki is relying on your support. Please make a secure online contribution today."

Notes for writing the claims (not failures):
- The bullets are imperatives with no subject. Attribute them to the site's plan, for example "The campaign website's 'Action Plan for District 5' lists…". None names an amount, a mechanism or a timeline, and a claim must not add one.
- The site calls her "Commissioner Vicki Lopez" (`311fe3b2`). The constitution template's example attribution, "Senator Vicki L. Lopez says…", uses a title the site does not use. Use only a title the sources give.
- `311fe3b2` carries `issues: ["A2"]` although it failed the gate. This does not surface: `groupByArea` skips passages with `states_policy: false`, and `run.json.areas` cites only `00ef817e` for A2. Any downstream reader of `run.json` should still read `issues` only together with `states_policy`.

### 4. Silence recorded, not filled: PASS

A passage counts only if it clears both gates (commitment and own_commitment ≥ 0.85) and scores ≥ 0.85 on the issue. That is the rule `groupByArea` in `src/lib/policy-noul.ts` uses. Every taxonomy issue on which at least one passage scored over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A2 | Housing affordability | 1 (`00ef817e`, 0.96). `311fe3b2` also scored 0.86 but failed the gates (0.42 / 0.11), so it is not counted. | stated |
| B1 | Economy, inflation, and jobs | 1 (`22313929`, 0.95) | stated |
| KYV4 | Storm resilience and flood protection | 1 (`8f45134e`, 0.93) | stated |

The other 22 issues have 0 passages over the threshold, and each is `no_stated_position_found`: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV5, KYV6, KYV7, KYV8.

Candidate-tier (outside the taxonomy): three passages state a policy but match no taxonomy issue. `be66cc78` is transparency and communication with residents, `b1c5a17c` is senior programming, and `03d294d0` is infrastructure, traffic and mobility. These can be captured as candidate-tier issues for this candidate only.

Scope of these silences: the crawl read one page, the homepage. The first attempt (`attempt-1-keywords/`) got 0 passages behind the bot challenge, and the retry fetched the homepage in the browser. `ingest.log` reports "39 links, 0 policy page(s) selected (cap 8), about page: none", but only 1 link (`/inicio`) was judged, so the other 38 homepage links were never considered as policy or About pages. The 22 zeros describe this homepage only, not any issue pages the site may have.

### 5. Possible misses (information for the founder, not a fix)

The 3 passages marked `states_policy: false`:

- `0b5c0e56` (commitment 0.76, own_commitment 0.66; B7 0.64): "Stand with our first responders to keep our communities safe". This is the seventh bullet under "Action Plan for District 5", in the same form as the six bullets that passed. It states a commitment, although a general one, in the Public Safety & Crime area. B7 (Crime policy, policing and courts) scored 0.64, below the threshold. A weak possible miss: it fell below both gates while its sibling bullets cleared them.
- `311fe3b2` (0.42 / 0.11; A2 0.86, KYV3 0.67), first 20 words: "From protecting our environment to standing with our residents, Commissioner Vicki Lopez has been hard at work delivering results for". It describes her record and an award (condominium reform, ADUs) and asks for support "to build on her record of results". It states no forward commitment. Not a miss.
- `4646aa2c` (0.03 / 0.05), first 20 words: "Vicki is relying on your support. Please make a secure online contribution today." Fundraising. Not a miss.

### Housekeeping note (not a check)

`ingest-report.md` (written 2026-09-29 19:19) describes the Step 2 run as `jev:jev-1.13.0/tax-7/q-b2171346` with a single gate and 31435 / 4122 tokens. That is the earlier run now kept in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116` (two gates), 33307 / 4311 tokens, created 2026-09-30T01:58Z. The counts (6 state a policy, 3 with an issue) and the three area citations are the same in both runs. Only the report's Step 2 table is stale.

VERDICT: PASS
