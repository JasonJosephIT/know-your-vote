# Step 3 review: FL-DOE-92377 (Christopher Dennison), FL-7-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (17 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 17 of 17 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 17 passages (and all 6 `areas` citations) are on `dennison4congress.com`: 5 from `/`, 12 from `/issues-2`. No other host. |
| 2 | Quotes verbatim | PASS | All 8 states_policy=true passages (`41b9675e`, `a424af76`, `2dcb8eed`, `83b70a8e`, `1c672fe2`, `2bee679f`, `a3d4dea8`, `1537d983`) and all 6 `areas` citations are byte-identical to `passages.jsonl`. Checked with `node`. |
| 3 | No inferred motive | PASS | None of the 8 passages marked as stating a policy is only biography, an attack, fundraising or event copy. Each makes a commitment or states a position in the candidate's voice. |
| 4 | Silence recorded, not filled | PASS | B7 = 3 (`a424af76`, `1c672fe2`, `a3d4dea8`), B2 = 1 (`2dcb8eed`), B5 = 1 (`2bee679f`), KYV3 = 1 (`83b70a8e`). The other 21 issues = 0, no_stated_position_found. |
| 5 | Possible misses (information only) | none | No passage marked states_policy=false plainly commits on a taxonomy issue. `96fabaaf` (gate 0.74) was considered and is not a miss. See below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` found one host in the 17 passage urls and in the 6 `areas` citation urls: `dennison4congress.com`, the OFFICIAL_SITE host. No redirect was involved.

- `https://dennison4congress.com/`: `49346e1a`, `41b9675e`, `a424af76`, `2dcb8eed`, `0e65de95`
- `https://dennison4congress.com/issues-2`: `184a806e`, `83b70a8e`, `1c672fe2`, `2bee679f`, `a3d4dea8`, `1537d983`, `86a55d23`, `b2bf97cf`, `f53e222d`, `96fabaaf`, `480de0ab`, `eca9438e`

`ingest.log` records only this site. The two links Jev judged in `links.jsonl` (`/issues-2` chosen, `/issues` "Help us reach District 7" not chosen) are on the same host. `run.json` `site` is `https://dennison4congress.com`.

A bookkeeping note (not a failure): `ingest.log` prints "13 passage(s)" for `/issues-2`, but `passages.jsonl` holds 12 passages from that url (5 + 12 = 17, which matches the log's final count and `ingest-report.md`). The difference is in the ingest's own counting before the file was written. It does not affect which passages were asked.

### 2. Quotes verbatim

I checked this with `node`, comparing `Buffer.from(text)` for each `run.json` passage with the passage of the same id in `passages.jsonl`:

- The id sets match: 17 in `run.json`, 17 in `passages.jsonl`, all shared, no duplicates.
- All 8 passages with states_policy=true are byte-identical in text, and their urls and headings also match: `41b9675e` (217 bytes), `a424af76` (277), `2dcb8eed` (298), `83b70a8e` (270), `1c672fe2` (251), `2bee679f` (223), `a3d4dea8` (211), `1537d983` (285).
- All 6 citations under `areas` (B2 `2dcb8eed`; KYV3 `83b70a8e`; B7 `a424af76`, `a3d4dea8`, `1c672fe2`; B5 `2bee679f`) are byte-identical too.
- The other 9 passages are also identical.

The script also confirmed that every `states_policy` equals `commitment >= 0.85` and that every `issues` array equals the scores that are ≥ 0.85. No verdict disagrees with its own numbers.

### 3. No inferred motive

These are the 8 passages marked as stating a policy, each with its gate score and first 20 words. Each one makes a commitment or states a position in the first person or in the imperative:

- `41b9675e` FOREIGN POLICY (0.98): "I served, and I will not vote to send anyone else's kid into a war we cannot explain. We end". It opens with biography, but it goes on to commit ("I will not vote…", "We end the deployments, close the bases").
- `a424af76` FOURTH AMENDMENT (0.98): "Flock and Axon have turned our streets into a permanent lineup. Every plate, every face, every trip you take, logged". It commits: "I will get these systems out of public spaces". The first sentence names two companies. It criticizes the products, not an opponent, and the passage's substance is the commitment.
- `2dcb8eed` SUPPORTING VETERANS (0.98): "Let Veterans Choose Their Own Care. My benefits should not be trapped inside one government hospital system. Veterans earned that". A position ("Put the benefit in the veteran's hands").
- `83b70a8e` Washington Doesn't Own Your Land (0.92): "If you want to build a data center on property you own, that is between you and your neighbors. The". A position ("The federal government has no business in that decision").
- `1c672fe2` End Qualified Immunity (0.97): "No government employee should be shielded from the consequences of their own actions. This is not about any one profession." A position. The explicit "End" is in the heading, and the text states the rule behind it.
- `2bee679f` Abortion, Not a Federal Question (0.98): "The federal government has no authority here. This belongs to the states, and I will not vote to hand Washington". A commitment ("I will not vote…").
- `a3d4dea8` The State Should Not Decide Who Dies (0.95): "I do not trust any government that gets this wrong even once. Courts convict innocent people. I would rather one". A stated position against capital punishment in his own words. The plainest wording ("The State Should Not Decide Who Dies") is in the heading, not in the text. Any claim written from this passage should quote or closely paraphrase it and not add a legislative commitment that the text does not make.
- `1537d983` End Foreign Aid. Charge for Defense. (0.98): "Not one more dollar borrowed from my grandchildren to fund another country's government. If a nation wants American troops on". A position.

None is only biography, an attack on an opponent, fundraising or event copy. The biography passages (`86a55d23`, `b2bf97cf`, `f53e222d`, `480de0ab`, `49346e1a`), the volunteer copy (`0e65de95`) and the page framing (`184a806e`, `eca9438e`) all failed the gate, and `areas` contains none of them.

Notes for downstream (not failures):

- `41b9675e` and `1537d983` pass the gate but match no taxonomy issue (`issues` = []). This is the "2 state a policy the taxonomy has no question for" line in `run.log`. Under the constitution these are candidate-tier issues (foreign policy / military deployments; foreign aid and defense cost-sharing). They should be captured under this candidate only, not forced into a spine issue.
- The Profiler prompt calls him "Senator Christopher Dennison". None of the 17 passages supports that title. The site calls him "Chris Dennison", a Libertarian candidate, an Air Force veteran and youth football coach (`86a55d23`, `49346e1a`), and says "I wasn't raised to run for office" (`480de0ab`). Under rules 1 and 2, no claim should use "Senator".

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. In this run the two ways of counting agree: every passage with an issue score ≥ 0.85 also cleared the gate. These are the taxonomy issues with at least one passage over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| B7 | Crime policy, policing and courts | 3: `a424af76` (0.93), `1c672fe2` (0.92), `a3d4dea8` (0.93) | stated |
| B2 | Healthcare access and costs | 1: `2dcb8eed` (0.95) | stated |
| B5 | Abortion policy | 1: `2bee679f` (0.93) | stated |
| KYV3 | Growth, development and land conservation | 1: `83b70a8e` (0.97) | stated |

The other 21 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B3, B4, B6, KYV1, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

On scope: this run covered 17 passages from 2 pages (the homepage and `/issues-2`), with no about page. `attempt-1-keywords/` holds an earlier keyword crawl. It is not part of this run, and I did not review it.

### 5. Possible misses (information for the founder, not a fix)

I read all 9 passages marked states_policy=false against all 25 taxonomy issues. None plainly states a commitment by the candidate on a taxonomy issue.

- `96fabaaf` (commitment 0.74; B1 0.57, KYV1 0.32), first 20 words: "I was an independent most of my life. In 2020, watching Jo Jorgensen and Spike Cohen run, I realized the". This is the only gated-out passage with a commitment score over 0.5. It describes his political philosophy ("individual liberty, limited government, free markets, private property, and the rule of law"). It makes no commitment on any specific issue, so it is not a miss.
- `184a806e` (0.13), first 20 words: "Every plank below is a position I will defend on the record. If one of them costs me your vote,". It frames the page and names no issue.
- `eca9438e` (0.20), first 20 words: "Nobody signs all four without reservations, and I am not asking you to. Come argue with me about the one". It invites disagreement and names no issue.
- `49346e1a`, `86a55d23`, `b2bf97cf`, `f53e222d` and `480de0ab` are biography or reasons for running. `0e65de95` is volunteer copy. None contains a commitment.

VERDICT: PASS
