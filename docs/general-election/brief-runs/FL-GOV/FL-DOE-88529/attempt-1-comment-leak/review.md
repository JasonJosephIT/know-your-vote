# Profiler review: FL-DOE-88529 (Moliere "Moe" Dimanche, FL-GOV-general)

- Official site: https://nomoecorruption.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 19 passages, 19 asked, 8 state a policy, 6 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. All checks were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS on the host test (one passage on the host is a visitor comment; see 1 and 3) |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | FAIL: `0c289595` is a third-party visitor comment marked as stating a policy (B7 0.97) |
| 4 | Silence recorded, not filled | PASS: A1 = 0 (no_stated_position_found), A3 = 4, A2 = 0 (no_stated_position_found), A4 = 0 (no_stated_position_found) |
| 5 | Possible misses (information only, not a fix) | 0 reported |

## 1. Candidate-controlled sources only: PASS (host test)

Every one of the 19 passage URLs in `run.json` has host `nomoecorruption.com`, and so do all 10 citation URLs inside `run.json.areas`. No other host appears. `run.json.site` is `https://nomoecorruption.com`. There are 2 distinct URLs: the homepage `https://nomoecorruption.com/` (12 passages) and the blog post `/2026/07/09/byron-donalds-gets-sued-for-assault-but-fishbacks-racist-response-is-worse-why-voting-npa-is-the-best-option-for-governor-of-florida` (7 passages). Both match `ingest.log`. `ingest.log` has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines.

Caveat: the host is candidate-controlled, but passage `0c289595` is not candidate-authored. Its heading is `One response to "Byron Donalds Gets Sued for Assault, ..."`, and its text begins "Jesse Vega July 9, 2026 at 2:26 pm" and ends "Loading… Reply". It is a reader comment that the ingest captured from the blog post's comment section. It passes the host test as the check defines it. The constitution problem it causes is recorded under check 3.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 19 lines and 19 unique ids. `run.json` has 19 passages, and every id is present in both.
- All 8 passages with `states_policy: true` (`20db998d`, `c75f5a06`, `14275f4c`, `634a8fbb`, `8a291072`, `fed82a0b`, `0f653308`, `0c289595`) have `text` that is byte-identical (Buffer.equals over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 19 passages, and over all 10 citation copies in `run.json.areas`, also found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)`, and `issues` equals exactly the set of issue scores of 0.85 or more. No inconsistencies.

## 3. No inferred motive: FAIL

Failing item:

- `0c289595` (commitment 0.96, tagged B7 at 0.97; url is the blog post): "Jesse Vega July 9, 2026 at 2:26 pm yeah right, for the people. you don't do enough for the people," This is a visitor's comment. It addresses the candidate ("you don't do enough") and demands longer sentences and 2nd Amendment changes. It contains no commitment by the candidate. The run marks it as stating a policy, and `run.json.areas` and `run-report.txt` list it under "Public Safety & Crime / B7 Crime policy, policing and courts" as something "this site states". A claim built from it would be `attributed=true` to the candidate for words the candidate did not say, which breaks constitution rules 1 and 2 and the rule that every stated_position claim is the candidate's own. B7 is not a spine issue, so no spine count is affected.

Borderline items. These passed the gate. None is biography, fundraising, event copy or an attack on an opponent, so none fails the check by itself. Each is listed for the founder:

- `8a291072` (commitment 0.87; A3 0.92, KYV8 0.96): "And with new HOA scams arising every single day throughout the state, Floridians are paying double their property taxes when" This describes a problem. The passage itself contains no commitment. The commitment is in its section heading, "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS". It counts toward A3.
- `fed82a0b` (commitment 0.92; A3 0.89, KYV8 0.89): "Everybody knows HOAs are a honeypot for taxation without representation, and are manipulated to initiate scam foreclosures against our most" This is a grievance about HOAs and "malicious neighbors" in Orange County. It contains no commitment and counts toward A3.
- `14275f4c` (commitment 0.97; B3 0.88): "While our laws will be followed, we will not re-enact Jim Crow. During the Jim Crow era, Black babies were" Most of the passage is copy about DeSantis and James Uthmeier. It does end in a commitment: "On Day 1 , Moe will permanently close Alligator Alcatraz." It passes on that sentence. Any claim built from it should carry only the commitment, attributed.
- `c75f5a06` (commitment 0.90; no issue tag): "The key to public happiness is giving the members of the communities in these areas more control over their own" A general statement of principle about local control. It has no spine tag.

The attack copy on the blog post was gated out: `e7833937`, `bbc65669`, `f6d5a944`, `9e7f5a28`, `94f4a0e8` and `3bf8fba7` (commitment 0.10, 0.09, 0.16, 0.16, 0.12 and 0.21). So were the biography passages `35f33085`, `78f25f50` and `40ed9e53` (0.02 each), the podcast promotion `be2b3dd0` (0.04), and the copy about the Alligator Alcatraz announcement, `a455591a` (0.20).

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more. The count of passages with a raw issue score of 0.85 or more, whatever their gate result, is the same for every spine issue.

| Spine issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A1 Property insurance costs | 0 (no_stated_position_found) | none |
| A3 Property taxes | 4 | 634a8fbb (0.98), 8a291072 (0.92), fed82a0b (0.89), 0f653308 (0.89) |
| A2 Housing affordability | 0 (no_stated_position_found) | none |
| A4 Cost of living in Florida | 0 (no_stated_position_found) | none |

`run.json.areas` has no A1, A2 or A4 entry, which matches the counts of 0. This review does not suggest any passage to stand in for them.

On the A3 count of 4: only `634a8fbb` states a property-tax commitment in its own text ("the state can fund these efforts without taxing property held as the homestead"). `0f653308` ("HOAs will be abolished under the Dimanche Administration") is a commitment on HOAs. The run also tags it KYV8 (Condominium and HOA costs). `8a291072` and `fed82a0b` are the no-commitment passages listed under check 3. All four come from the homepage section "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS". This is recorded as information and changes no count.

## 5. Possible misses (information for the founder, not a fix)

None. No passage marked `states_policy: false` plainly states a commitment on a spine issue. The 11 passages that did not state a policy are biography (`35f33085`, `78f25f50`, `40ed9e53`), podcast promotion (`be2b3dd0`), copy about Alligator Alcatraz and the federal government's post (`a455591a`), and the six blog-post passages about Byron Donalds, James Fishback and the Republican Party (`e7833937`, `bbc65669`, `f6d5a944`, `9e7f5a28`, `94f4a0e8`, `3bf8fba7`). Their highest spine score is 0.03.

Context for the founder, from `ingest.log` and `ingest-report.md`: the crawler found 94 links on the site and selected 1 page as a policy page, which was the dated blog post. The corpus is therefore the homepage plus one blog post. That is a fact about this run's coverage. It is not evidence about positions the candidate may state elsewhere, and this review does not infer any.

VERDICT: FAIL (check 3: third-party visitor comment `0c289595` marked as a candidate policy statement)
