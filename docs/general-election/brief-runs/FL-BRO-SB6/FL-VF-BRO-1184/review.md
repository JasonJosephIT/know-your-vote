# Step 3 review: FL-VF-BRO-1184 (Adam Cervera), FL-BRO-SB6-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. No website was fetched.

Run reviewed: `run.json`, `status: complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates (`q_states_policy` and `q_own_commitment`), 19 of 19 passages asked, 0 failed. Only 1 passage clears the gate (`3dd671d7`), and no passage matches a taxonomy issue (`counts.with_issue: 0`, `areas: []`).

SPINE: undecided for this race, so check 4 covers all 25 taxonomy issues in `src/lib/news-issues.ts` (tax-7) and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 19 passages are at `https://www.adamcervera.com/`. The only host is `www.adamcervera.com`. |
| 2 | Quotes verbatim | PASS | `3dd671d7` (the only states-policy passage) matches `passages.jsonl` byte for byte. All 19 run passages also match on text, url and heading. |
| 3 | No inferred motive | PASS | `3dd671d7` is a first-person commitment, not biography, an attack on an opponent, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | 0 passages clear the threshold on any of the 25 issues, so all 25 are `no_stated_position_found`. |
| 5 | Possible misses (information only) | 1 noted | `fd035128` (A6). This does not affect the verdict. |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

A node script collected `new URL(p.url).host` for every passage in `run.json`. The result was `["www.adamcervera.com"]`. That matches the OFFICIAL_SITE host, so no redirect was involved and there are no other hosts.

According to `ingest.log`, only the homepage was read: "19 links, 0 policy page(s) selected (cap 8), about page: none", and `links.jsonl` is empty. The whole corpus is 19 passages from one page. That limits coverage (see check 4), but it does not breach sourcing.

### Check 2: quotes verbatim (PASS)

A node script compared each `run.json` passage with the `passages.jsonl` passage of the same id, using `Buffer.from(text, "utf8").equals(...)`.

- Both files hold 19 passages with the same id set. No id is in only one of them.
- `3dd671d7` has `states_policy: true`, and its text is byte-identical (149 bytes). Its url and heading also match.
- None of the other 18 passages differs in text, url or heading either.

### Check 3: no inferred motive (PASS)

Only one passage is marked as stating a policy:

- `3dd671d7`: "Safer Schools Every student deserves to feel safe at school. I’m committed to supporting common-sense safety measures and stronger school" (commitment 0.95, own_commitment 0.92).

This is the candidate's own first-person commitment ("I’m committed to supporting …"). It is not biography, an attack, fundraising or event copy.

The run does not tag it with any issue (`issues: []`). Its highest score is B7 "Crime policy, policing and courts" at 0.36, well under 0.85. Under the constitution, school safety and security would be a candidate-tier issue for this candidate. It does not belong under a taxonomy issue, and the run correctly does not force it into B7.

The ten biography, fundraising and endorsement-lead passages all have `states_policy: false`: `16e7627f`, `80761470`, `492af281`, `77554922`, `e7a5438a`, `c7256efe`, `005fa61d`, `02950a75`, `e4f4e572` and `0cd4f4c8`.

### Check 4: silence recorded, not filled (PASS)

For each issue, the count is the number of passages with `states_policy: true` and a score of 0.85 or more for that issue. The same count without the gate is also 0 for every issue. The highest score any passage gets is A6 at 0.72 (`fd035128`). No issue has a passage over the threshold, so every issue is reported here as 0:

| Issue | Label | Passages ≥ 0.85 | Coverage |
|---|---|---|---|
| A1 | Property insurance costs | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | no_stated_position_found |

The run leaves these zeros as they are: `areas` is empty, and `run-report.txt` says "nothing was found". The corpus is the homepage only. So these zeros mean nothing was found on the one page the site was read from. They do not mean the whole site was searched.

### Check 5: possible misses (information for the founder, not a fix)

These are passages marked `states_policy: false` that plainly state a commitment on a taxonomy issue:

- `fd035128` (A6 "Public school funding and teachers", score 0.72; commitment 0.77, own_commitment 0.64): "Supporting Teachers Championing policies that give teachers the tools, respect, and support they need to succeed — because strong teachers". This is a platform plank that states support for teachers. It is phrased as a gerund heading with no first-person subject, which is probably why it misses both gates.

Passages considered and not listed as misses, because they do not plainly commit to a taxonomy issue:

- `c0357942`: "Students First Prioritizing academic success, classroom resources, and real opportunities for every student to thrive." It mentions classroom resources in general but makes no commitment on funding or teachers.
- `a751a7eb`: "Standing with parents and ensuring they have a voice in their children’s education and what happens in the classroom." This is a parental-voice plank, and no taxonomy issue covers it, so it would be candidate-tier.
- `b2e7757a` ("Accountability Delivering honest, responsive leadership …"), `12442d3b` ("“I didn’t come here to go along … fight for transparency and accountability.”") and `15b3dfe4` ("… committed to ensuring that every student has the opportunity to succeed …"). These are general governance and values statements with no taxonomy issue. The 0.52 KYV1 score on `12442d3b` concerns school-board accountability, not threats to democratic institutions.

### Notes (not checks)

- **Headings.** The headings in the corpus are page-builder template text, not section names: "CHIP IN NOW" on `16e7627f` and `80761470`, and "Pricing Plans" on 16 passages. They should not be shown to voters as the candidate's section titles.
- **Out-of-date `ingest-report.md`.** Its "Step 2: policy run" table gives provenance `q-b2171346` and 66605/8702 tokens. Those figures belong to the earlier one-gate run, now kept in `attempt-1-one-gate/run.json`. The current `run.json` has provenance `q-e7282116` and 70557/9101 tokens. The table has not been updated since the rerun.

VERDICT: PASS
