# Step 3 review: FL-DOE-90696 (Ryan Elijah), FL-7-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. Nothing was fetched from the web.

Run under review: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 64 passages, 64 asked, 21 state a policy, 14 with an issue, 0 failed.

SPINE: not yet decided for this race, so check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) that has a passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 64 passages are on `elijahforcongress.com`: `/` 28, `/issues.html` 26, `/about.html` 10. No other host. |
| 2 | Quotes verbatim | **PASS** | All 21 `states_policy: true` passages are byte-identical to the passage with the same id in `passages.jsonl`. So are all 64 run passages, including url and heading. No ids are missing on either side. |
| 3 | No inferred motive | **PASS** | Each of the 21 passages marked as stating a policy contains a commitment or a stance. None is only biography, an attack, fundraising or event copy. Two borderline passages are noted below (98a5c0a6, 80ea4aad). |
| 4 | Silence recorded, not filled | **PASS** | Counts for 9 issues are below. The other 16 taxonomy issues have 0 passages and are recorded as `no_stated_position_found`. |
| 5 | Possible misses (information only) | reported | eae90399 (B5) and 73047bf5 (B1) are below. |

## Evidence

### Check 1: hosts

A node script parsed every `url` in `run.json`. The only host is `elijahforcongress.com`, which is the OFFICIAL_SITE host. No redirects were involved.

| url | passages |
|---|---|
| https://elijahforcongress.com/ | 28 |
| https://elijahforcongress.com/issues.html | 26 |
| https://elijahforcongress.com/about.html | 10 |

`ingest.log` lists "30 passage(s) issues.html" and "11 passage(s) about.html" and does not list the homepage. This is not a discrepancy. In `scripts/candidate-site-ingest.ts`, the per-page line is printed before `dedupeAcrossPages`, and the homepage passages are added without a log line. The final count is 64 in the log, in `passages.jsonl` and in `run.json`.

### Check 2: verbatim

A node script compared `Buffer.from(text)` for each run passage against the `passages.jsonl` row with the same id, and also compared url and heading.

- `states_policy: true` passages: 21 checked, 0 mismatches.
- All run passages: 64 checked, 0 mismatches.
- Ids in `run.json` but not in `passages.jsonl`: none. The reverse: none. Duplicate ids: none.

Every citation in `run.json` `areas` points to a passage that is itself in the checked set.

### Check 3: the 21 passages marked as stating a policy

032d0f52, 40924017, 2743f0e9, 80ea4aad, 00020f86, 5772d16e, 505b979e, 884858e0, 3025591a, 2986b333, 06159b8c, 98a5c0a6, 4051627a, e5f3502d, 61002de3, 301d2773, 4e5a39d7, 16fb2393, 948beea9, f8b6de60, 2cd51efe.

For every passage, `states_policy` equals `commitment >= 0.85`, so the gate is applied consistently. None of the 21 is only biography, an opponent attack, fundraising or event copy. Two are borderline and passed:

- **98a5c0a6** (issues.html, Education; commitment 0.93): "Ryan will strongly support our schools. His boys were educated in both public and private schools. He believes both are critical to our…" The middle sentence is biography, but the passage opens with a commitment ("will strongly support our schools"). It is tagged with no issue, so it reaches no Position.
- **80ea4aad** (homepage, Illegal Immigration; commitment 0.85, exactly at the gate): "America is a nation built by immigrants, however we must enforce the rule of law." It is a general stance, not a specific commitment. It is cited under B3 next to the more specific 948beea9.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Gated" means the passage also passes the `states_policy` gate, and only gated passages reach `areas`/Positions. "Raw" counts any score of 0.85 or more. The `issues` array in `run.json` equals the raw set for every passage.

| Issue | Label | Gated | Gated passage ids | Raw | Raw only (not gated) |
|---|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 3 | 00020f86, 5772d16e, 505b979e | 4 | 73047bf5 |
| B2 | Healthcare access and costs | 3 | 40924017, 884858e0, 3025591a | 3 | none |
| KYV9 | School choice and vouchers | 2 | 2743f0e9, 4051627a | 2 | none |
| KYV2 | Energy and utilities | 2 | 032d0f52, 00020f86 | 2 | none |
| B3 | Immigration and border enforcement | 2 | 80ea4aad, 948beea9 | 2 | none |
| KYV4 | Storm resilience and flood protection | 1 | 06159b8c | 1 | none |
| B7 | Crime policy, policing and courts | 1 | 16fb2393 | 1 | none |
| A7 | Elections administration and voting access | 1 | 2cd51efe | 1 | none |
| B5 | Abortion policy | **0**, recorded as `no_stated_position_found` in this run | none | 1 | eae90399 |

Two gated counts include the same statement twice. KYV9's 2743f0e9 (homepage) and 4051627a (issues.html) are the same sentence with a different opening. KYV2's 032d0f52 (homepage) is the first sentence of 00020f86 (issues.html). So KYV9 and KYV2 each have 2 passage ids but 1 distinct statement. The Position builder should treat each pair as one statement cited twice.

**0 passages** (`no_stated_position_found`) for these issues: A1 Property insurance costs, A2 Housing affordability, A3 Property taxes, A4 Cost of living in Florida, A5 Water quality and Everglades restoration, A6 Public school funding and teachers, KYV10 Career, vocational and higher education, B4 Social Security and Medicare, B6 Election integrity, KYV1 Threats to democratic institutions, B8 Climate and environment (national), KYV3 Growth, development and land conservation, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs.

Neither `run.json` nor `run-report.txt` fills any of these zeros. `areas` contains only B1, KYV9, B2, KYV2, KYV4, B3, B7 and A7, and every citation id matches the gated column above.

### Check 5: passages marked as stating no policy that state a position on a taxonomy issue

This is for the founder. It is not a fix.

- **eae90399** (issues.html, "Faith, Family and Life"; commitment 0.74, B5 0.87): "Ryan is pro-life and believes every life is a sacred gift from God." This is a plain statement of position on B5 (Abortion policy). Its issue score clears the threshold, but the commitment gate drops it, so B5 shows 0 in this run. This is the clearest miss.
- **73047bf5** (issues.html, "Affordability & Economy"; commitment 0.74, B1 0.96): "Ryan understands that burdensome federal regulations will slow job creation and economic growth." It states a view on B1 rather than a commitment. B1 is covered anyway by three gated passages, so nothing is lost at the issue level.

Related items that are outside check 5's literal scope, for context:

- **d1cc0098** (issues.html, "Law Enforcement"; commitment 0.74): "He is a staunch supporter of the Second Amendment and has earned an 'A' rating with the NRA." This is a stated position, but the taxonomy has no firearms issue (B7 scores 0.28). If it is captured, it would be a candidate-tier issue.
- Passages that are gated but fall under the issue threshold, so they reach no Position:
  - e5f3502d, A6 0.76: "We must protect local control and ensure every dollar serves our students effectively."
  - f8b6de60, B7 0.75: "Ryan will work with local law enforcement to stop the flood of illegal drugs…"
  - 4e5a39d7, veterans' care, B2 0.71.
  - 2986b333, consumer protection, B7 0.59.
  - 301d2773, military, no issue.
  - 61002de3, family policy, no issue.
  - 98a5c0a6, schools, KYV9 0.55 and A6 0.31.

  Together these are the 7 "state a policy the taxonomy has no question for" in `run.log`.

VERDICT: PASS
