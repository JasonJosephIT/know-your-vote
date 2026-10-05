# Step 3 review: FL-DOE-90696 (Ryan Elijah), FL-7-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. Nothing was fetched from the web. The previous attempt's review is in `attempt-1-one-gate/review.md`. This review covers the current run.

Run under review: `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`. It covers 64 passages, all 64 asked. 16 state a policy, 9 of those match an issue, and 0 failed. This run has two gates: `states_policy` requires both `commitment >= 0.85` and `own_commitment >= 0.85`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) that has a passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 64 passages are on `elijahforcongress.com`: `/` 28, `/issues.html` 26, `/about.html` 10. There is no other host. |
| 2 | Quotes verbatim | **PASS** | All 16 `states_policy: true` passages are byte-identical to the passage with the same id in `passages.jsonl`. So are all 64 run passages and every `areas` citation. No id is missing on either side. |
| 3 | No inferred motive | **PASS** | Each of the 16 passages marked as stating a policy contains a commitment by the candidate. None is only biography, an attack, fundraising or event copy. Three borderline passages are listed below: 98a5c0a6, 61002de3, 16fb2393. |
| 4 | Silence recorded, not filled | **PASS** | 7 issues have gated passages. B5 and KYV2 have raw passages over the threshold but 0 gated, so they are `no_stated_position_found`. The other 16 issues have 0. `areas` fills none of the zeros. |
| 5 | Possible misses (information only) | reported | eae90399 (B5), 032d0f52 and 00020f86 (KYV2/B1), 80ea4aad (B3), 5772d16e (B1), 40924017 (B2), 73047bf5 (B1). |

## Evidence

### Check 1: hosts

A node script parsed every `url` in `run.json` with `new URL()`. The only host is `elijahforcongress.com`, which is the OFFICIAL_SITE host. No redirects were involved.

| url | passages |
|---|---|
| https://elijahforcongress.com/ | 28 |
| https://elijahforcongress.com/issues.html | 26 |
| https://elijahforcongress.com/about.html | 10 |

`ingest.log` prints "30 passage(s) issues.html" and "11 passage(s) about.html", and it prints no homepage line. This is not a discrepancy. `scripts/candidate-site-ingest.ts` prints the per-page line (line 420) before `dedupeAcrossPages` (line 424). The final total is 64 in the log, in `passages.jsonl` and in `run.json`.

### Check 2: verbatim

A node script ran `Buffer.from(text, "utf8").equals(...)` on each run passage against the `passages.jsonl` row with the same id. It also compared url and heading.

- `states_policy: true` passages: 16 checked, 0 mismatches (url and heading also equal).
  - 2743f0e9, 505b979e, 884858e0, 3025591a, 2986b333, 06159b8c, 98a5c0a6, 4051627a
  - e5f3502d, 61002de3, 301d2773, 4e5a39d7, 16fb2393, 948beea9, f8b6de60, 2cd51efe
- All run passages: 64 checked, 0 mismatches.
- Ids in `run.json` but not in `passages.jsonl`: none. The reverse: none. Duplicate ids: none.
- `areas` citations: 9 checked (505b979e, 2743f0e9, 4051627a, 884858e0, 3025591a, 06159b8c, 948beea9, 16fb2393, 2cd51efe). All are text-identical to `passages.jsonl`, and all are gated passages.

Consistency check: for every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`. `issues` equals the set of scores >= 0.85. There are no exceptions.

### Check 3: the 16 passages marked as stating a policy

None of the 16 is only biography, an opponent attack, fundraising or event copy. Each has a "will", "supports", "champions" or "we must" commitment. Three are borderline and passed:

- **98a5c0a6** (issues.html, Education; commitment 0.93, own 0.91): "Ryan will strongly support our schools. His boys were educated in both public and private schools. He believes both are…" The middle sentence is biography. The opening commitment is vague. It is tagged with no issue, so it reaches no Position.
- **61002de3** (issues.html, Faith, Family and Life; commitment 0.89, own 0.93): "As your representative, he will champion policies that support parents, protect children, and keep families united and strong." This is a commitment, but a very general one. It is tagged with no issue.
- **16fb2393** (issues.html, Law Enforcement; commitment 0.97, own 0.95): "Ryan is a strong defender of law enforcement and deeply understands the daily challenges officers face. He will strongly support…" The first sentence is self-description. The second is a specific commitment ("tougher penalties for assaulting or shooting officers"), which is what the B7 citation rests on.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Gated" means the passage also passes both `states_policy` gates. Only gated passages reach `areas` and Positions. "Raw" counts any issue score of 0.85 or more, whether or not the passage is gated.

| Issue | Label | Gated | Gated passage ids | Raw | Raw only (dropped by the gate) |
|---|---|---|---|---|---|
| KYV9 | School choice and vouchers | 2 | 2743f0e9, 4051627a | 2 | none |
| B2 | Healthcare access and costs | 2 | 884858e0, 3025591a | 3 | 40924017 (own 0.40) |
| B1 | Economy, inflation, and jobs | 1 | 505b979e | 4 | 00020f86 (own 0.76), 5772d16e (own 0.54), 73047bf5 (commitment 0.73) |
| KYV4 | Storm resilience and flood protection | 1 | 06159b8c | 1 | none |
| B3 | Immigration and border enforcement | 1 | 948beea9 | 2 | 80ea4aad (commitment 0.84, own 0.58) |
| B7 | Crime policy, policing and courts | 1 | 16fb2393 | 1 | none |
| A7 | Elections administration and voting access | 1 | 2cd51efe | 1 | none |
| KYV2 | Energy and utilities | **0**: `no_stated_position_found` in this run | none | 2 | 032d0f52 (own 0.78), 00020f86 (own 0.76) |
| B5 | Abortion policy | **0**: `no_stated_position_found` in this run | none | 1 | eae90399 (commitment 0.73) |

KYV9 has 2 passage ids but only 1 distinct statement. 2743f0e9 (homepage) and 4051627a (issues.html) are the same sentence with a different opening. The Position builder should treat them as one statement cited twice.

Two issues went to 0 compared with `attempt-1-one-gate`: KYV2 (2 before) and B5 (already 0 before). In both cases the reason is the gate, not the issue score.

The following 16 issues have **0 passages** (`no_stated_position_found`):

| Id | Label |
|---|---|
| A1 | Property insurance costs |
| A2 | Housing affordability |
| A3 | Property taxes |
| A4 | Cost of living in Florida |
| A5 | Water quality and Everglades restoration |
| A6 | Public school funding and teachers |
| KYV10 | Career, vocational and higher education |
| B4 | Social Security and Medicare |
| B6 | Election integrity |
| KYV1 | Threats to democratic institutions |
| B8 | Climate and environment (national) |
| KYV3 | Growth, development and land conservation |
| KYV5 | Water supply and drinking water |
| KYV6 | Renters and evictions |
| KYV7 | Homelessness |
| KYV8 | Condominium and HOA costs |

Neither `run.json` nor `run-report.txt` fills any zero. `areas` contains only these seven, and every citation id matches the gated column above:

- B1 (economy)
- KYV9 (education)
- B2 (healthcare)
- KYV4 (environment)
- B3 (immigration)
- B7 (safety)
- A7 (elections)

### Check 5: passages marked as stating no policy that plainly state a commitment on a taxonomy issue

This is for the founder. It is not a fix.

- **eae90399** (issues.html, "Faith, Family and Life"; commitment 0.73, own 0.30, B5 0.89): "Ryan is pro-life and believes every life is a sacred gift from God." This is a plain statement of position on B5 (Abortion policy), and the only one on the site. The first gate drops it, so B5 shows 0.
- **032d0f52** (homepage, "Affordability & Economy"; commitment 0.96, own 0.78, KYV2 0.88): "Congress must continue driving down costs for American families by keeping taxes low and achieving American energy independence." This is the campaign's own "must" statement. The `own_commitment` gate drops it, so KYV2 shows 0.
- **00020f86** (issues.html, "Affordability & Economy"; commitment 0.97, own 0.76, B1 0.91, KYV2 0.89): "Congress must continue driving down costs for American families by keeping taxes low and achieving American energy independence. Lower gas…" This is the same sentence as 032d0f52, plus a sentence on gas prices. The same gate drops it.
- **80ea4aad** (homepage, "Illegal Immigration"; commitment 0.84, own 0.58, B3 0.95): "America is a nation built by immigrants, however we must enforce the rule of law." This is a general stance. B3 is still covered by 948beea9.
- **5772d16e** (issues.html, "Affordability & Economy"; commitment 0.95, own 0.54, B1 0.90): "It's past time to put a stop to out of control government spending that acts to drive up everyday costs…" This is a stated position on spending. B1 is still covered by 505b979e.
- **40924017** (homepage, "Healthcare"; commitment 0.91, own 0.40, B2 0.96): "The United States must continue to lead the world in medical innovation. The federal government can do more to lower…" This is a stance rather than a specific commitment. B2 is still covered by two passages.
- **73047bf5** (issues.html, "Affordability & Economy"; commitment 0.73, own 0.16, B1 0.96): "Ryan understands that burdensome federal regulations will slow job creation and economic growth." This is a view rather than a commitment. It is listed for completeness.

The `own_commitment` gate is the main cause of the "Congress must" and "America … we must" drops. Those are campaign-voice statements, not third-party ones. Whether the gate should read them as the candidate's own is a question for the founder.

These related items are outside check 5's literal scope and are listed for context:

- **d1cc0098** (issues.html, "Law Enforcement"; commitment 0.72): "He is a staunch supporter of the Second Amendment and has earned an "A" rating with the NRA." This is a stated position, but the taxonomy has no firearms issue (B7 0.31). If captured, it would be a candidate-tier issue.
- **81fd02c3** (homepage, "Law Enforcement"; B7 0.75): "Ryan is a strong defender of law enforcement and deeply understands the daily challenges officers face." This is self-description and is not over the issue threshold.
- Seven passages pass the gate but fall under every issue threshold, so they reach no Position. These are the 7 in `run.log` that "state a policy the taxonomy has no question for", and they are candidate-tier material:

  | Id | Subject | Nearest issue score |
  |---|---|---|
  | 2986b333 | Consumer protection | B7 0.65 |
  | 98a5c0a6 | Schools | KYV9 0.54 |
  | e5f3502d | Local control of education dollars | A6 0.75 |
  | 61002de3 | Family policy | none |
  | 301d2773 | Military | none |
  | 4e5a39d7 | Veterans' care | B2 0.73 |
  | f8b6de60 | Illegal drugs | B7 0.77 |

### Note outside the five checks

`ingest-report.md` in this directory still describes the earlier policy run: provenance `q-b2171346`, "State a policy 21", "…and match a taxonomy issue 14", 224039 tokens in. The current `run.json`, `run-report.txt` and `run.log` show `q-e7282116`, 16, 9 and 237351. The ingest half of that report matches `ingest.log`, `meta.tsv` and `passages.jsonl`. Only its "Step 2: policy run" table is stale.

VERDICT: PASS
