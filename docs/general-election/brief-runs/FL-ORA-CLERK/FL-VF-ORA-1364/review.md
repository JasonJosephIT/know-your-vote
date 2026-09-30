# Step 3 review: FL-VF-ORA-1364 (Terrell Thomas), FL-ORA-CLERK-general

Reviewed 2026-09-30 under the Profiler constitution (stated_position bucket only), against `passages.jsonl`, `run.json` and `ingest.log` in this directory. Run provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, 43 of 43 passages asked, 0 failed, 3 state a policy, 0 of those match a taxonomy issue. This is the two-gate run: a passage states a policy only if both `q_states_policy` (commitment) and `q_own_commitment` are at least 0.85 (`readVerdict` in `src/lib/policy-noul.ts`). The earlier one-gate run and its review are in `attempt-1-one-gate/`. The site was not fetched for this review. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues, the same 25 as the non-gate `question_ids` in `run.json`).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 43 passage urls are on `thomasforclerk.com` (23 on `/`, 20 on `/meet-terrell`). No other host. Two passages on that host carry third-party text (`64a7c0fc`, `6314e407`); neither is marked as stating a policy. |
| 2 | Quotes verbatim | **PASS** | The 3 `states_policy` passages (`224fe4f4`, `43631cf2`, `b17f6838`) are byte-identical to `passages.jsonl` (node `Buffer.equals`); url and heading match too. All 43 passages match. `areas` is empty. |
| 3 | No inferred motive | **PASS** | `224fe4f4`, `43631cf2`, `b17f6838` are forward commitments in the campaign's own voice ("We will…"). None is only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | 0 passages clear 0.85 on any of the 25 taxonomy issues, gated or not. Highest issue score anywhere: B1 0.19 (`224fe4f4`). Every issue is `no_stated_position_found`. `areas` is empty. |
| 5 | Possible misses (information only) | **PASS** (0 misses) | No passage marked as stating no policy plainly commits on a taxonomy issue. Near-gate passage `fae3cce0` (0.84 / 0.84) noted; it is Clerk's-office administration, not a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script took `new URL(url).host` for every passage in `run.json` and in `passages.jsonl`. Both files have one host, `thomasforclerk.com`, the OFFICIAL_SITE host:

| URL | Passages |
|---|---|
| `https://thomasforclerk.com/` | 23 |
| `https://thomasforclerk.com/meet-terrell` | 20 |

`run.json` `site` is `https://thomasforclerk.com`. `links.jsonl` lists two links, both on the same host (`/vision`, `/meet-terrell`). `ingest.log` shows no redirect and no other host.

Note on `ingest.log`: it lists `/vision` with 2 passages and `/meet-terrell` with 22, and a total of 43. No passage in either file has a `/vision` url, and `/meet-terrell` has 20. The per-page counts in the log are taken before cross-page de-duplication; 23 + 2 + 22 = 47 and 43 are kept, so 4 were dropped as repeats of earlier text. This is not a host problem and was not investigated further (no fetch).

Two passages on the host are not the campaign's own words:

- `64a7c0fc`, heading "Read Repps's Endorsement": "“As the former Chief Information Officer for" — a cut-off third-party endorsement quote. Commitment 0.04, own_commitment 0.05, not gated.
- `6314e407`, heading "Terrell Thomas says experience, relationships and legacy prepare him to lead the Orange County Clerk's Office": "Orange County Clerk of Courts candidate Terrell Thomas says his campaign is rooted in legacy, leadership and a vision he calls "Clerk Forward."" — reads as a news-story excerpt shown on the homepage; the outlet is not named. Commitment 0.09, own_commitment 0.13, not gated.

Neither can become a claim in this run.

### 2. Quotes verbatim: PASS

A node script matched each `run.json` passage to the `passages.jsonl` line with the same id and compared `text` as UTF-8 bytes (`Buffer.from(a).equals(Buffer.from(b))`), plus `url` and `heading`.

- 43 of 43 ids present in both files, in the same set; no id in one file only; 43 unique ids.
- 43 of 43 byte-identical on text, url and heading.
- The 3 `states_policy: true` passages: `224fe4f4` (346 bytes), `43631cf2` (351 bytes), `b17f6838` (335 bytes), all identical.
- 0 null verdicts. For every passage, `states_policy` equals (commitment ≥ 0.85 AND own_commitment ≥ 0.85), and `issues` equals the set of `scores` ≥ 0.85 (empty everywhere). No inconsistency.

### 3. No inferred motive: PASS

The three gated passages, all on `https://thomasforclerk.com/`:

| id | heading | commitment / own | first 20 words |
|---|---|---|---|
| `224fe4f4` | People First | 0.92 / 0.95 | "Our people are our greatest strength. We will invest in employees, develop leaders, and foster a culture that empowers every" |
| `43631cf2` | Community Focused | 0.96 / 0.95 | "The Clerk's Office should be more than a place people visit- it should be an active partner throughout Orange County." |
| `b17f6838` | Future Ready | 0.91 / 0.92 | "Preparing for tomorrow requires thoughtful leadership and responsible stewardship. We will embrace modern technology, cybersecurity, continuous improvement, and fiscal responsibility while" |

Each contains an explicit forward commitment by the campaign ("We will invest in employees, develop leaders…"; "We will expand outreach, strengthen partnerships, improve accessibility…"; "We will embrace modern technology, cybersecurity, continuous improvement, and fiscal responsibility…"). None is only biography, an attack on an opponent, fundraising or event copy. The passages also carry the campaign's own framing ("build lasting public trust", "innovative, accountable"); a claim writer should attribute these as "The campaign website states…" and not restate the framing as fact.

None matched a taxonomy issue, so under the constitution these belong to a candidate-tier issue (Clerk's Office operations: workforce, outreach and accessibility, technology and fiscal stewardship), not to any taxonomy position. The run does not put them under any issue.

Gate change from the one-gate run (`attempt-1-one-gate/run.json`, `q-b2171346`): same 43 ids, 0 gate flips. The second gate neither added nor removed a passage.

### 4. Silence recorded, not filled: PASS

Count of passages with a score ≥ 0.85, per taxonomy issue, over all 43 passages (gated or not):

| Issue | Count | Coverage |
|---|---|---|
| A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 (all 25) | 0 each | `no_stated_position_found` |

Highest score per issue anywhere in the run: B1 0.19 (`224fe4f4`), B7 0.17 (`cee7c8ef`), KYV10 0.13 (`224fe4f4`), A7 0.11 (`43631cf2`); every other issue ≤ 0.05. `counts.with_issue` is 0, `areas` is `[]`, and `run-report.txt` says no passage cleared both the gate and an issue question. No gap was filled.

### 5. Possible misses (information only): PASS, 0 misses

I read all 40 passages marked `states_policy: false`. None plainly states a commitment on a taxonomy issue. Most are biography and career history (`cf819c0c`, `7a015d52`, `bc390de8`, `be61b3c1`, `20c5726b`, `70a619c4`, `0b4cdb26`, `cc8d4029`, `82acb691`, `f7740a7d`, `352cb48d`, `cee7c8ef`, `7af544c3`, `8f8506fb`, `2af3b580`, `6bdc2104`, `c21fb929`, `e523ab5e`, `77b30772`, `b65538f9`, `531e682f`, `7f8a49a7`, `e87f08a6`, `2818fb57`), navigation or contact (`53f80485`, `22d95858`), slogan or fragment (`6e4aac7d`, `aaeb1141`), event or volunteer/fundraising copy (`f36d7778`, `4244af4b`, `87e845e7`), third-party text (`64a7c0fc`, `6314e407`) or a general philosophy with no issue (`79803d56`, `cc246c5a`, `6b9e5d30`, `b539170d`, `7493d7f4`, `39623571`).

For the founder, the one near-gate passage:

- `fae3cce0` (commitment 0.84, own_commitment 0.84, just under 0.85; top issue score 0.13), `/meet-terrell`, heading "Why I'm Running": "I believe we can honor the proud legacy of this office while embracing innovation, investing in our employees, strengthening community partnerships," It restates the three homepage commitments in first person. It names no taxonomy issue; at most it would be a second source for the candidate-tier material in check 3.
- `39623571` (commitment 0.20, own_commitment 0.60): "That same mindset will guide every decision I make as your Orange County Clerk of Court." It commits to an approach, not to a position on any issue.

### Other observations (no effect on the verdict)

- `ingest-report.md` "Step 2: policy run" still shows the one-gate run's provenance (`q-b2171346`) and tokens (150814 in, 19694 out). The current `run.json` and `run.log` are `q-e7282116`, 159758 in, 20597 out. The counts (3 gated, 0 with issue) are the same.

VERDICT: PASS
