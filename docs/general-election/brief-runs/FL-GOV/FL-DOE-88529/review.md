# Profiler review: FL-DOE-88529 (Moliere "Moe" Dimanche, FL-GOV-general), attempt 2

- Official site: https://nomoecorruption.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 18 passages, 18 asked, 7 state a policy, 5 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Scope: only the files directly in this directory. `attempt-1-comment-leak/` is the superseded run and was not reviewed.
- Reviewer: read-only. Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye. Checks 3 and 5 are a reading of the full text of all 18 passages.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS: one host, `nomoecorruption.com` |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS: 0 mismatches over 7 policy passages |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (4 borderline items listed below) |
| 4 | Silence recorded, not filled | PASS: A1 = 0 (no_stated_position_found), A3 = 4, A2 = 0 (no_stated_position_found), A4 = 0 (no_stated_position_found) |
| 5 | Possible misses (information only, not a fix) | 0 reported |

## 1. Candidate-controlled sources only: PASS

- All 18 passage URLs in `run.json` have host `nomoecorruption.com`. So do all 8 citation copies inside `run.json.areas`, and all 18 lines of `passages.jsonl`. `run.json.site` is `https://nomoecorruption.com`. No other host appears.
- There are 2 distinct URLs: the homepage `https://nomoecorruption.com/` (12 passages) and the campaign blog post `/2026/07/09/byron-donalds-gets-sued-for-assault-but-fishbacks-racist-response-is-worse-why-voting-npa-is-the-best-option-for-governor-of-florida` (6 passages, matching `ingest.log`'s "6 passage(s)").
- `ingest.log` has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines. Its only other content is a Node `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Attempt 1's problem is gone. The corpus has no passage that looks like a visitor comment: no heading or text matches `Reply`, `Loading`, `response to` or a comment timestamp. The attempt-1 comment passage `0c289595` is in neither `passages.jsonl` nor `run.json`.
- File-name note, not a failure: `ingest.log` says it wrote `passages.v2.jsonl`, but the file here is `passages.jsonl`. `ingest-report.md` states the v2 file was promoted to `passages.jsonl` after comparison. `passages.jsonl`, `manifest.json` (18 passages, status `not_run`) and `run.json` agree id for id and text for text (0 mismatches).

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 18 lines and 18 unique ids. `run.json` has 18 passages, and every id is in both files.
- All 7 passages with `states_policy: true` (`20db998d`, `c75f5a06`, `14275f4c`, `634a8fbb`, `8a291072`, `fed82a0b`, `0f653308`) have `text` that is byte-identical (Buffer.equals over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 18 passages, and over all 8 citation copies in `run.json.areas`, also found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)`, and `issues` equals exactly the set of issue scores of 0.85 or more, in question order. No inconsistencies. The 2 passages that state a policy with no issue (`20db998d`, `c75f5a06`) match `run.log`'s "2 state a policy the taxonomy has no question for".

## 3. No inferred motive: PASS

None of the 7 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. The site's copy of those kinds was gated out:

- Biography: `35f33085` (0.02), `78f25f50` (0.02), `40ed9e53` (0.02).
- Podcast promotion: `be2b3dd0` (0.04).
- Copy about opponents: `a455591a` on DeSantis and Alligator Alcatraz (0.22), and all 6 blog-post passages on Donalds and Fishback, `e7833937` (0.12), `bbc65669` (0.10), `f6d5a944` (0.15), `9e7f5a28` (0.14), `94f4a0e8` (0.11) and `3bf8fba7` (0.21).

Borderline items. Each passed the gate. None is biography, fundraising, event copy or only an attack on an opponent, so none fails the check. They are listed for the founder:

- `8a291072` (commitment 0.89; A3 0.92, KYV8 0.96): "And with new HOA scams arising every single day throughout the state, Floridians are paying double their property taxes when" This describes a problem. The passage contains no commitment. The commitment is in its section heading, "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS". It counts toward A3.
- `fed82a0b` (commitment 0.93; A3 0.89, KYV8 0.87): "Everybody knows HOAs are a honeypot for taxation without representation, and are manipulated to initiate scam foreclosures against our most" This is a complaint about HOAs and "malicious neighbors" in Orange County. It contains no commitment and counts toward A3.
- `14275f4c` (commitment 0.97; B3 0.90): "While our laws will be followed, we will not re-enact Jim Crow. During the Jim Crow era, Black babies were" Most of the passage is copy about DeSantis and James Uthmeier, including a historical statement this review does not assess. It ends in a commitment: "On Day 1 , Moe will permanently close Alligator Alcatraz." It passes on that sentence. A claim built from it should carry only that commitment, attributed to the campaign website.
- `c75f5a06` (commitment 0.90; no issue): "The key to public happiness is giving the members of the communities in these areas more control over their own" This is a general value statement that supports the incorporation plan in `20db998d`. It names no specific action. It has no issue, so it adds nothing to the spine.

## 4. Silence recorded, not filled: PASS

The count is passages with `states_policy: true` and a score of 0.85 or more for the issue. No passage with `states_policy: false` scores 0.85 or more on any spine issue. The highest spine score among them is 0.03.

| Spine issue | Passages clearing 0.85 | Coverage |
|---|---:|---|
| A1 Property insurance costs | 0 | no_stated_position_found |
| A3 Property taxes | 4 (`634a8fbb` 0.98, `8a291072` 0.92, `fed82a0b` 0.89, `0f653308` 0.89) | stated |
| A2 Housing affordability | 0 | no_stated_position_found |
| A4 Cost of living in Florida | 0 | no_stated_position_found |

Note on A3, information only: all 4 passages sit under the heading "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS". Only `634a8fbb` states a property-tax position in its own text ("the state can fund these efforts without taxing property held as the homestead"). `8a291072` and `fed82a0b` are the borderline items in check 3. `0f653308` ("HOAs will be abolished under the Dimanche Administration") is a commitment about HOAs, and it is also tagged KYV8 (Condominium and HOA costs, not a spine issue). The count above is the run's count, left as it is.

## 5. Possible misses: 0

No passage with `states_policy: false` states a commitment on A1, A3, A2 or A4. The 11 ungated passages are biography (`35f33085`, `78f25f50`, `40ed9e53`), a podcast plug (`be2b3dd0`), copy about DeSantis (`a455591a`) and the 6 blog-post passages on the Republican candidates. `3bf8fba7` does say "The next Governor of Florida must be an NPA with No Party Affiliation", but that is about the race and not about a spine issue. `35f33085` mentions poverty and homelessness in Moe's childhood. That is biography, not a housing position.

Coverage note: the corpus has 2 pages. `ingest.log` reports 91 links and 1 policy page selected, and `ingest-report.md` says there is no About or bio page among the passages. The zeros above mean nothing was found in these 18 passages. This review makes no guess about what other pages on the site say.

VERDICT: PASS
