# Step 3 review: FL-DOE-90703 (Te Mayonna Brown), FL-24-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (27 lines), `run.json` (`kyv.policy-run/1`, status `complete`, model `jev-1.13.0`, taxonomy v7, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates `q_states_policy` + `q_own_commitment`), `ingest.log`. For context only: `links.jsonl`, `meta.tsv`, `run.log`, `ingest-report.md`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (`src/lib/news-issues.ts`, v7, 25 sub-issues), and check 5 considers every taxonomy issue.

Threshold rule, from the code (`readVerdict` in `src/lib/policy-noul.ts`): a passage states a policy only when `commitment >= 0.85` AND `own_commitment >= 0.85`; it is tagged with an issue when that issue's score is `>= 0.85`.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 27 passages in run.json and all 21 `areas` citations are on `tebrownforflorida.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | All 12 `states_policy` passages (`44f0eaeb`, `0c802def`, `93d60669`, `6ce50e9c`, `e1b6b720`, `18911dd3`, `993d6724`, `518d18b1`, `06592307`, `7fdc81fa`, `6abe852a`, `4ef9bace`) are byte-identical to passages.jsonl (text, url, heading), checked by script. So are all 27 rows and all 21 `areas` citations. |
| 3 | No inferred motive | **PASS** | None of the 12 policy passages is only biography, attack, fundraising or event copy. Mixed bio + commitment, noted: `6abe852a`, `4ef9bace`. |
| 4 | Silence recorded, not filled | **PASS** | Among policy passages: B1 5, B3 5, A2 4, KYV9 2, A4 1, B2 1, B4 1, B7 1, KYV10 1. The other 16 issues are 0 and `no_stated_position_found`. Every `issues` array matches its scores at 0.85; `areas` is consistent with it. |
| 5 | Possible misses (information only) | Reported | `1acafefe`, `143588d7` (H-1B bullets, B3/B1), `4a9ef6ee` (border principle, B3, borderline). All three are already covered in substance by policy passages `18911dd3` and `993d6724`. |

## Evidence

### 1. Candidate-controlled sources only: PASS

Host parsed from every `url` in run.json `passages`, run.json `areas` citations and passages.jsonl:

| Host | run.json passages | areas citations | passages.jsonl |
|---|---|---|---|
| tebrownforflorida.com | 27 | 21 | 27 |

Pages: `/` (7), `/issues` (12), `/the-people-first-agenda` (5), `/meet-te-brown` (3). No redirect was needed to explain any host. `ingest.log` and `links.jsonl` name only this host.

Information: passage `560e7ff7` (not a policy passage) contains the email address `info@tmbrownforcongress.com`, a different domain. It appears only inside the text; no passage was sourced from it. If that domain is ever used as a source, it would need to be registered as the candidate's own first.

### 2. Quotes verbatim: PASS

Script (node, in the scratchpad): for each run.json passage, look up the same id in passages.jsonl and compare `text` with `Buffer.equals`, plus `url` and `heading` with `===`. Results: 27/27 ids present in both files, 0 mismatches; 12/12 `states_policy` passages byte-identical; 21/21 `areas` citations identical to passages.jsonl.

Information: the agenda list on `/the-people-first-agenda` is split across `0c802def` (ends "… 6.") and `93d60669` (begins "Safe & Strong Communities …"). Both are verbatim; a claim writer quoting item 6 must use `93d60669`.

### 3. No inferred motive: PASS

Every passage marked `states_policy: true` contains a commitment in the candidate's voice or the campaign's ("supports", "I support", "I will fight", "will work", an agenda list):

| id | commitment / own | First 20 words | Note |
|---|---|---|---|
| 44f0eaeb | 0.94 / 0.89 | A bold agenda focused on lowering the cost of living, making housing and childcare more affordable, protecting seniors and veterans, | Agenda summary. |
| 0c802def | 0.98 / 0.96 | 1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost | Agenda items 1–5. |
| 93d60669 | 0.98 / 0.96 | Safe & Strong Communities — Support law enforcement, address crime, and make communities safer. 7. Education & Opportunity — Expand | Agenda items 6–8. |
| 6ce50e9c | 0.98 / 0.95 | Te Brown supports redirecting federal housing dollars away from lifelong rental subsidies and toward helping low-income families in our district | |
| e1b6b720 | 0.99 / 0.94 | Every child in Florida's 24th District deserves a quality education, not a zip code assignment. Te Brown supports taking federal | |
| 18911dd3 | 0.99 / 0.96 | The H-1B program should serve America's workforce—not be used to undercut American workers' wages or replace qualified Americans. I support | |
| 993d6724 | 0.99 / 0.98 | I support securing our southern border, enforcing our immigration laws, and prioritizing the removal of criminals and those who pose | |
| 518d18b1 | 0.98 / 0.92 | At the same time, we should create a clear, lawful process for people who have earned the right to remain, | |
| 06592307 | 0.98 / 0.97 | For 15 years, Washington has told Haitian families in South Florida that their status was temporary, and for 15 years | "In Congress, I will fight for an earned path to citizenship." |
| 7fdc81fa | 0.97 / 0.95 | A Republican Congress did this in 1998 with the Haitian Refugee Immigration Fairness Act, and it was right then. Those | "I will work to end the South Florida weapons pipeline …". The 1998 reference must be attributed, not verified. |
| 6abe852a | 0.98 / 0.91 | As a former teacher, she believes every child deserves access to a quality education and that parents—not government bureaucrats—should have | Mixed: biography ("former teacher", "isn't a career politician") plus commitments (school choice advocate; "committed to fighting for stronger wage growth, affordable housing …"). A claim should use only the commitment sentences. |
| 4ef9bace | 0.94 / 0.91 | Te believes America is strongest when government is limited, communities are safe, the economy is growing, and every family has | General, but contains commitments ("will work every day to protect taxpayers, support small businesses …"). Low specificity. |

None attacks a named opponent, solicits money or advertises an event. The non-policy copy (biography `7a003d7f`, `47150ed2`, `8a02b2df`; identity `3a8cf149`; news/events `b7e52bb9`, `74182647`, `f2ff891e`, `6ee90ccc`; contact solicitation `0ab92443`, `560e7ff7`) was correctly left out by the gates.

### 4. Silence recorded, not filled: PASS

Count of passages with the issue score `>= 0.85`. "Policy" = among the 12 `states_policy` passages (what can become a claim); "all" = among all 27, for information.

| Issue | Label | Policy | All | Policy passage ids |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 5 | 6 | 44f0eaeb, 0c802def, 18911dd3, 6abe852a, 4ef9bace (+ 1acafefe not policy) |
| B3 | Immigration and border enforcement | 5 | 8 | 18911dd3, 993d6724, 518d18b1, 06592307, 7fdc81fa (+ 1acafefe, 143588d7, 4a9ef6ee not policy) |
| A2 | Housing affordability | 4 | 4 | 44f0eaeb, 0c802def, 6ce50e9c, 6abe852a |
| KYV9 | School choice and vouchers | 2 | 2 | e1b6b720, 6abe852a |
| A4 | Cost of living in Florida | 1 | 1 | 0c802def |
| B2 | Healthcare access and costs | 1 | 1 | 0c802def |
| B4 | Social Security and Medicare | 1 | 1 | 0c802def |
| B7 | Crime policy, policing and courts | 1 | 1 | 93d60669 |
| KYV10 | Career, vocational and higher education | 1 | 1 | 93d60669 |

0, `no_stated_position_found` (16): A1 Property insurance costs, A3 Property taxes, A5 Water quality and Everglades restoration, A6 Public school funding and teachers, A7 Elections administration and voting access, B5 Abortion policy, B6 Election integrity, KYV1 Threats to democratic institutions, B8 Climate and environment (national), KYV2 Energy and utilities, KYV3 Growth, development and land conservation, KYV4 Storm resilience and flood protection, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs.

Script check: every passage's `issues` equals exactly the set of scores `>= 0.85` (0 mismatches), and `areas` holds only policy passages with the counts above (21 citations).

### 5. Possible misses (information for the founder, not a fix)

Passages marked as stating no policy that state a commitment on a taxonomy issue:

| id | commitment / own | Issue score | First 20 words | Note |
|---|---|---|---|---|
| 1acafefe | 0.94 / 0.81 | B1 0.90, B3 0.87 | No wage suppression or worker replacement | Bullet under the candidate's "PROTECT AMERICAN WORKERS & REFORM H-1B" section; failed the own-commitment gate. Restates part of `18911dd3`, which is captured. |
| 143588d7 | 0.90 / 0.71 | B3 0.96 | H-1B visas for genuine high-skill workforce shortages | Same section and same situation; restates `18911dd3`. |
| 4a9ef6ee | 0.92 / 0.46 | B3 0.98 | A nation must have secure borders and a fair, lawful immigration system. | Borderline: a principle rather than an action. The commitment follows in `993d6724`, which is captured. |

Not spine misses, but candidate-tier material the founder may want to see (no taxonomy issue at 0.85):
- `0c7e1b54` (0.94 / 0.72; B2 0.81): "The men and women who served this country deserve more than empty thank-yous. Faster care, real mental health support, and …" Veterans' care; also named in agenda passages `44f0eaeb` and `0c802def`.
- `c015eb57` (0.86 / 0.54): "Faith, family, and freedom are the foundation of America. Religious liberty, parental rights, the Second Amendment, and the Constitution itself …" Values copy; the Second Amendment and religious liberty have no taxonomy issue.

Below-threshold tags on passages that do state a policy (not misses under check 5's definition, listed for context): KYV4 0.71 on `0c802def` (drainage and infrastructure resilience), B2 0.73 and A4 0.63 on `44f0eaeb`, KYV9 0.79 on `93d60669` ("Expand educational choices"), A6 0.79 on `e1b6b720`, KYV6 0.68 on `6ce50e9c` (rental subsidies).

### Other observations (no effect on the verdict)

- `ingest-report.md`'s "Step 2: policy run" table describes the earlier one-gate run (`q-b2171346`, 17 policy / 15 with issue, now in `attempt-1-one-gate/`), not the current `run.json` (`q-e7282116`, 12 / 12). `run.log` matches the current run. The report should be refreshed.
- `ingest.log` lists page counts for 3 pages (5 + 12 + 3 = 20) while its total is 27; the 7 homepage passages are not on their own line. `ingest-report.md` shows all 4 pages and agrees with passages.jsonl.

VERDICT: PASS
