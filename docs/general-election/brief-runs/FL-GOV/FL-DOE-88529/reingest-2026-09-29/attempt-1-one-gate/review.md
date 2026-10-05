# Step 3 review: FL-DOE-88529 (Moliere "Moe" Dimanche), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29`
- OFFICIAL_SITE: https://nomoecorruption.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json`, schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85. 123 passages asked, 10 marked `states_policy`, 8 with an issue tag, 0 failed, 0 null verdicts.
- Method: a node script loaded `run.json` and `passages.jsonl` and compared them. It also re-derived `states_policy` (commitment >= 0.85) and `issues` (score >= 0.85) from the stored scores. Both matched the stored values for all 123 passages.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | PASS (with notes) |
| 4 | Silence recorded, not filled | PASS (A1 = 0, A2 = 0, A4 = 0, no_stated_position_found; A3 = 4) |
| 5 | Possible misses (policy on a SPINE issue marked as no policy) | PASS (none found; information only) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 123 passage URLs in `run.json` (and in `passages.jsonl`) are on the host `nomoecorruption.com`. No other host appears, and no redirect was involved.

| URL | Passages |
|---|---|
| https://nomoecorruption.com/ | 12 (be2b3dd0, 35f33085, 78f25f50, 40ed9e53, 20db998d, c75f5a06, 14275f4c, a455591a, 634a8fbb, 8a291072, fed82a0b, 0f653308) |
| https://nomoecorruption.com/2024/12/06/judicial-cleanup | 29 |
| https://nomoecorruption.com/judicial-corruption | 82 |

Other hosts: none. `links.jsonl` lists only same-host links.

Note: two passages on the judicial-cleanup page come from the page's comment section ("6 responses to ..."), not the candidate's body copy. They are on the candidate's host but they are not self-authored text. Both are marked `states_policy: false`, so neither reaches a claim:

- 8111e06d (c=0.06): "UPDATE | Need a healthy treat November 30, 2024 at 7:25 am […] https://nomoecorruption.com/2023/08/02/judicial-cleanup/comment-page-1/#respond […] Loading… Reply" (a pingback).
- 938a6403 (c=0.68): "Dissolving the Ninth Judicial Circuit – MOE DIMANCHE September 26, 2025 at 11:24 am […] Judicial Corruption […] Loading… Reply"

### 2. Quotes verbatim: PASS

The script compared the UTF-8 bytes of `text` (`Buffer.compare`), plus `url` and `heading`, for each of the 10 passages marked `states_policy: true` against the passage with the same id in `passages.jsonl`.

- Mismatches: 0 of 10 (20db998d, c75f5a06, 14275f4c, 634a8fbb, 8a291072, fed82a0b, 0f653308, 58e77567, 40b7276b, cf66b20a).
- Extended to all 123 passages: 0 mismatches. There are no ids missing from either file, no duplicate ids, and the two files list the ids in the same order.
- The passage texts embedded in `run.json` `areas[].subIssues[].citations[]` also match `passages.jsonl` byte for byte (0 mismatches).

### 3. No inferred motive: PASS (with notes)

None of the 10 `states_policy: true` passages is only biography, an attack on an opponent, fundraising or event copy with no commitment. Every one either contains a commitment by the candidate or sits under a section heading that states one. The site's biography, podcast and fundraising passages are all marked `states_policy: false`:

- 35f33085 (bio, c=0.02): "Florida grown and a first-generation American, Moe Dimanche, born Moliere Dimanche, grew up under financial hardship in a single-parent home in"
- 40ed9e53 (bio, c=0.02): "Moe is a product of Pine Hills. He attended Meadowbrook Middle School and Evans Ninth Grade Center briefly, before going on"
- be2b3dd0 (podcast promo, c=0.04): "Tune in to The Moe Dimanche Show , available wherever you get your podcasts!"
- c0f72b8c (fundraising, c=0.37): "Consider donating to ensure that Corruption dies when Moe is sworn into office."
- a455591a (attack on DeSantis, no commitment, c=0.22): "After Ron DeSantis and his attorney general introduced the plan for Alligator Alcatraz, the federal government tweeted out an image of"

These passages are marked as policy and pass, but the founder should know what they are before quoting them:

- 8a291072 (c=0.88, A3 0.90, KYV8 0.96): "And with new HOA scams arising every single day throughout the state, Floridians are paying double their property taxes when" This is a statement of the problem with no commitment sentence of its own. It sits under the heading "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS", which is the commitment.
- fed82a0b (c=0.92, A3 0.89, KYV8 0.87): "Everybody knows HOAs are a honeypot for taxation without representation, and are manipulated to initiate scam foreclosures against our most" Same as above: a statement of the problem under the same heading, with no commitment of its own. It criticizes HOAs and "malicious neighbors", not an opponent in this race.
- c75f5a06 (c=0.90, no issue): "The key to public happiness is giving the members of the communities in these areas more control over their own" This is a statement of principle that supports 20db998d (the municipal-incorporation commitment). It has no issue tag, so it reaches no spine Position.
- 14275f4c (c=0.97, B3): "While our laws will be followed, we will not re-enact Jim Crow. During the Jim Crow era, Black babies were" Most of this passage is an attack on DeSantis and Uthmeier, including a historical assertion that the Profiler must not repeat as fact. It ends in a commitment ("On Day 1 , Moe will permanently close Alligator Alcatraz."). Any claim should attribute that commitment only.
- 58e77567 (c=0.93, B7, KYV1): "Florida judges are corrupt to the core and their corruption is a cancer on our society as Floridians. Lawfare is" 40b7276b (c=0.89, B6, KYV1): "A. James Craner, a Rick Scott appointee, blocked the grand jury investigation, blocked Alban and Herdocia from testifying, forced a" Both are mostly accusations against named judges, not opponents in this race. Each contains a commitment ("individuals Moe will remove from office"; "He will be suspended from office and prosecuted as soon as Moe takes office"). Any claim must attribute the accusations to the campaign and must not state them as fact.
- cf66b20a (c=0.94, B7, KYV1): "Moe is most likely going to have the courthouse in your county investigated and audited for corruption. Being on the" This is a hedged commitment ("most likely") mixed with the candidate's own story. Any quote should keep the hedge.

None of these is a SPINE issue except A3 (8a291072, fed82a0b). See check 4.

### 4. Silence recorded, not filled: PASS

"Clears the threshold" here means `states_policy: true` and an issue score of 0.85 or higher. As a cross-check, no passage scores 0.85 or higher on A1, A2 or A4 even without the gate.

| SPINE issue | Passages clearing 0.85 | Coverage |
|---|---|---|
| A1 Property insurance costs | 0 | no_stated_position_found |
| A3 Property taxes | 4: 634a8fbb (0.98), 8a291072 (0.90), fed82a0b (0.89), 0f653308 (0.89) | stated |
| A2 Housing affordability | 0 | no_stated_position_found |
| A4 Cost of living in Florida | 0 | no_stated_position_found |

`run.json` `areas` has no finding for A1, A2 or A4, so the run does not fill them.

Notes on A3 for the founder, not failures:

- 634a8fbb carries the property-tax position itself: "the state can fund these efforts without taxing property held as the homestead".
- 0f653308 ("HOAs will be abolished under the Dimanche Administration ...") is a commitment about HOAs. Its A3 tag rests on the section heading, and KYV8 (condominium and HOA costs, 0.89) is the closer fit.
- 8a291072 and fed82a0b are statements of the problem (see check 3).

Corpus scope, stated as fact: the ingest read 3 pages (homepage, /2024/12/06/judicial-cleanup, /judicial-corruption) and found no about page (`ingest.log`, `ingest-report.md`). The zeros above describe that corpus.

### 5. Possible misses: none found (information only)

I read all 113 `states_policy: false` passages. None states a commitment on A1, A2, A3 or A4. Their highest SPINE score is 0.05 (c42f6647). A keyword scan (insur, rent, afford, housing, cost of living, price, inflation, property tax, homestead, mortgage, utility, wage) matched no SPINE content in them. The only hits were substrings such as "parent", "currently", "insured" and "insurmountable".

These passages scored just under the gate, but all are off-spine (judicial prosecutions and audits), so this is not a SPINE miss:

- c05ef4d3 (c=0.83): "Judge Photoshop, AKA Alicia L. Latimore , is one of the most corrupt judges in the State of Florida, and"
- 6eb46292 (c=0.79): "If the police and the state attorneys office will not give the non-verbal a voice, Moe will. That investigation"
- aa4004cb (c=0.78): "From attempted kidnapping, to obstruction of justice, this criminal endangers every Floridian and on Day 1 of a Dimanche administration,"
- b73d99f7 (c=0.74): "Check out this video demonstration of how Latimore got caught using Photoshop to coverup her first coverup. There’s no telling how"

VERDICT: PASS
