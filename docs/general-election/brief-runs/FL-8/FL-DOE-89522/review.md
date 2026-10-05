# Step 3 review: FL-DOE-89522 (Mike Haridopolos), FL-8-general

Reviewer: Step 3 (Profiler constitution). Read-only review of `RUN_DIR = docs/general-election/brief-runs/FL-8/FL-DOE-89522`.
Inputs: `passages.jsonl` (39 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:44Z), `ingest.log`.
No website was fetched. Nothing was committed.

SPINE: undecided for this race, so check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, `TAXONOMY_VERSION = "7"`) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

This supersedes `attempt-1-one-gate/review.md`, which reviewed the one-gate run `q-b2171346` (18 `states_policy`). The current run adds the second gate (`own_commitment`) and marks 13.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | 39/39 passage urls on `www.mike4congress.com`; no other host |
| 2 | Quotes verbatim | **PASS** | 13/13 `states_policy` passages byte-identical to `passages.jsonl` (script); 39/39 identical overall |
| 3 | No inferred motive | **PASS** | None of the 13 is only biography, attack, fundraising or event copy; `721f97f2` and `7fa3b19b` are borderline (noted) |
| 4 | Silence recorded, not filled | **PASS** | 8 issues have at least one gated passage; 17 issues have 0 and are `no_stated_position_found`; nothing is filled |
| 5 | Possible misses (information only) | **PASS** (reported) | 5 gated-out commitments on taxonomy issues (`2728200b`, `b2317584`, `1b5270d0`, `5b7a8406`, `3a922585`); only `3a922585` (A5, Indian River Lagoon) would touch a 0 |

## Check 1: candidate-controlled sources only (PASS)

Script over `run.json.passages[].url` and `passages.jsonl[].url` (`new URL(url).host`):

| Host | run.json | passages.jsonl |
|---|---|---|
| `www.mike4congress.com` | 39 | 39 |
| any other host | 0 | 0 |

| URL | Passages |
|---|---|
| `https://www.mike4congress.com/` | 16 |
| `https://www.mike4congress.com/issues` | 18 |
| `https://www.mike4congress.com/about` | 5 |

The host matches OFFICIAL_SITE `https://www.mike4congress.com/` exactly, so there is no redirect to document. The 13 `states_policy` passages are on `/` (6) and `/issues` (7). `4f3d9c06` (homepage "Endorsements") names third parties, but it is the campaign's own copy on the campaign's host, and it is not marked as stating a policy. No other host is listed.

## Check 2: quotes verbatim (PASS)

Checked with node: for every `run.json` passage where `verdict.states_policy === true`, `Buffer.compare` of the UTF-8 `text` against the `passages.jsonl` row with the same `id`, plus an equality check on `url`.

| id | bytes (run / jsonl) | result |
|---|---|---|
| 721f97f2 | 246 / 246 | identical |
| edbb4fc9 | 253 / 253 | identical |
| 67dc4ebd | 308 / 308 | identical |
| cdf4cbda | 669 / 669 | identical |
| 028520a0 | 650 / 650 | identical |
| 474ba98c | 317 / 317 | identical |
| 7fa3b19b | 510 / 510 | identical |
| 09ef25b8 | 233 / 233 | identical |
| 4c24f783 | 294 / 294 | identical |
| 3e005845 | 525 / 525 | identical |
| 3a5cd3cd | 225 / 225 | identical |
| bf2a8a22 | 272 / 272 | identical |
| b3004edf | 314 / 314 | identical |

Also checked: 39 unique ids in each file, the same id set in both (0 only in one), 0 text or url mismatches across all 39, and 0 null verdicts. Recomputing from the stored scores (`states_policy = commitment ≥ 0.85 && own_commitment ≥ 0.85`; `issues` = every score ≥ 0.85, recorded whether or not the gate passed) reproduces every `states_policy` and `issues` value (0 inconsistencies). `counts` (39 asked, 13 states_policy, 9 with_issue, 0 failed) matches the passages, and `run.json.areas` cites only gated passages.

## Check 3: no inferred motive (PASS)

Each of the 13 passages marked `states_policy` contains a stance or commitment by the candidate. None is only biography, an attack on an opponent, fundraising or event copy.

| id | page | issues | contains a candidate commitment |
|---|---|---|---|
| 721f97f2 | / | A2, B6 | borderline, see below |
| edbb4fc9 | / | none | "supports banning congressional stock trading" |
| 67dc4ebd | / | A7, B6 | "He supports the SAVE America Act and commonsense voter verification measures" |
| cdf4cbda | / | B1, B3, B4 | "Vision" bullets: securing borders, "Fighting reckless spending to preserve Social Security and Medicare", "He will do this again in Congress" |
| 028520a0 | / | B7 | "Mike will stand shoulder-to-shoulder key allies to end the weaponization of our justice system"; "Backing law enforcement and defending Second Amendment rights" |
| 474ba98c | / | none | "Ensuring our military has the best technology…"; "Supporting term limits" |
| 7fa3b19b | /issues | B3 | borderline, see below |
| 09ef25b8 | /issues | A7, B6 | "I'm fighting to restore trust in our elections by supporting the SAVE America Act" |
| 4c24f783 | /issues | B6 | "I will continue fighting for election integrity" |
| 3e005845 | /issues | B1 | "Mike will stand against federal mandates that hurt small businesses and families" |
| 3a5cd3cd | /issues | none | "Mike will always protect our right to bear arms in Congress" |
| bf2a8a22 | /issues | none | "signed the U.S. Term Limits pledge and will vote for all term limits measures in office" |
| b3004edf | /issues | B2 | "will always support measures that provide patient centered care…"; "stands firm against any single-payer healthcare system" |

Mixed passages (attack or record plus a commitment), not failures: `09ef25b8` opens "For too long, Washington Democrats have fought against commonsense election safeguards"; `3e005845` opens "Joe Biden's economy crushed working families"; `3a5cd3cd` cites an NRA rating. Each goes on to a commitment in the candidate's own voice. A Profiler claim should attribute the commitment sentence, not the characterization of the opponent.

Borderline, not failures:

- **721f97f2**: "In Congress, he focuses his efforts on supporting our space industry, improving the water quality of our Indian River Lagoon, fighting to protect election …". It describes his current priorities as an incumbent rather than a forward commitment. It is not only biography: it names the causes he works for. It is the **only** passage behind A2 (the four words "expanding access to affordable housing" at the end of a list), so an A2 Position built on it should quote it as a one-line priority and say no more.
- **7fa3b19b**: "Understanding the key issues that impact our country is crucial for making informed decisions. Mike Haridopolos is dedicated to addressing the most pressing …". This is the `/issues` page's introduction. It lists topics ("From stopping illegal immigration to fixing our economy…") without a specific commitment. It is none of the four excluded kinds, and B3 is also carried by `cdf4cbda`, so nothing depends on it.

This run resolves what the earlier review flagged as borderline: the second gate now keeps out the record and biography passages the one-gate run had admitted (`a2a3199d`, `3a922585`, `5b7a8406`, `2728200b`, `b2317584`).

## Check 4: silence recorded, not filled (PASS)

A "gated" passage is one that clears both gates (`states_policy`) and scores ≥ 0.85 on the issue. That is what `run.json.areas` and `run-report.txt` carry, and what a Position can be built from. "Raw" counts any passage whose issue score is ≥ 0.85, whether or not it passed the gate. Raw is shown only so nothing is hidden. It is not coverage.

Taxonomy issues with at least one passage over the threshold:

| Issue | Label | Gated | Raw | Coverage | Gated ids (raw-only ids) |
|---|---|---|---|---|---|
| A2 | Housing affordability | 1 | 1 | stated | 721f97f2 |
| A7 | Elections administration and voting access | 2 | 2 | stated | 67dc4ebd, 09ef25b8 |
| B1 | Economy, inflation, and jobs | 2 | 2 | stated | cdf4cbda, 3e005845 |
| B2 | Healthcare access and costs | 1 | 1 | stated | b3004edf |
| B3 | Immigration and border enforcement | 2 | 4 | stated | cdf4cbda, 7fa3b19b (2728200b, b2317584) |
| B4 | Social Security and Medicare | 1 | 1 | stated | cdf4cbda |
| B6 | Election integrity | 4 | 4 | stated | 721f97f2, 67dc4ebd, 09ef25b8, 4c24f783 |
| B7 | Crime policy, policing and courts | 1 | 1 | stated | 028520a0 |
| A3 | Property taxes | **0** | 1 | **no_stated_position_found** | (9641a511: commitment 0.61, own_commitment 0.29, gate failed) |

Every other taxonomy issue has **0** gated and 0 raw and is **no_stated_position_found**: A1, A4, A5, A6, KYV9, KYV10, B5, KYV1, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

So 17 of 25 issues are 0 and recorded as silence. `run.json.areas` holds only the 8 stated issues above, and no citation for any of the 17. Nothing is filled.

Scope note for the founder (not a fix): this silence covers the ingested corpus, not the whole site. `ingest.log` and `links.jsonl` show Jev chose one policy page (`/issues`, 0.63) and one about page. `/recipes` ("News"), `/media`, `/endorsements` and `/join-the-team` were not chosen (0.04 to 0.08), so they were not read.

## Check 5: possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that plainly state a commitment or stance on a taxonomy issue. All five were `states_policy` in the one-gate run and are held out now by `own_commitment` < 0.85.

| id | page | issue (score) | c / own | first 20 words |
|---|---|---|---|---|
| 2728200b | /issues | B3 (0.98) | 0.88 / 0.45 | Mike is a strong supporter of President Trump's immigration measures to secure the southern border and remove dangerous illegal aliens. The Biden |
| b2317584 | /issues | B3 (0.98) | 0.93 / 0.67 | Mike led the fight to defeat a measure in the Florida legislature to allow illegals to obtain a driver's license. |
| 1b5270d0 | /issues | B7 (0.81) | 0.66 / 0.78 | As the son of a law enforcement agent, Mike knows the challenges our men and women in uniform face each |
| 5b7a8406 | /issues | B2 (0.70) | 0.89 / 0.84 | Our veterans deserve the best care as well for their service to our nation. Unfortunately, the system too often lets |
| 3a922585 | /issues | A5 (0.46) | 0.87 / 0.51 | Mike has lived in Brevard County since 1989 and raised his family along the Lagoon and that is why it's |

- `2728200b` and `b2317584` state support for "President Trump's immigration measures" and that "Mike fully stands by President Trump's immigration agenda". B3 is already covered by `cdf4cbda`.
- `1b5270d0` goes on: "Mike will always 'Back the Blue'". The same sentence is inside the gated `028520a0`, so B7 is already covered.
- `5b7a8406` goes on: "Mike will fight each day to make sure our veterans get the top-notch care they deserve." Veterans' care fits B2 only loosely; B2 is already covered by `b3004edf`. Its own_commitment is 0.84, one hundredth under the gate.
- `3a922585` goes on: "Advancing common sense ideas that protect our Lagoon and preserve our natural beauty is important to Mike." The rest is record ($14 million in appropriations). This is the only miss that touches a 0: A5 ("Water quality and Everglades restoration") is 0 in check 4. The Lagoon is one of the candidate's headline items (homepage "Vision" bullet in `028520a0`, and `721f97f2`'s "improving the water quality of our Indian River Lagoon"), but no passage scores ≥ 0.85 on A5: `721f97f2` 0.77, `3a922585` 0.46, `028520a0` 0.41. A5's label names the Everglades, and the Lagoon is not the Everglades, which is likely why. Reported for the founder; check 4 stays 0.

Not counted as misses:

| id | page | issue (score) | c / own | first 20 words | why not |
|---|---|---|---|---|---|
| d888f8a8 | /issues | B6 (0.74) | 0.76 / 0.17 | Free and fair elections start with one simple principle: American elections should be decided by American citizens. | a principle, no act; B6 already covered |
| 9641a511 | /about | A3 (0.95) | 0.61 / 0.29 | In 2008, he sponsored and championed Florida's constitutional amendment reducing property taxes and allowing homeowners to bring their tax savings with | past record in the state Senate, no commitment |

### Outside the taxonomy: candidate-tier issues

The four gated passages with no issue (`edbb4fc9`, `474ba98c`, `3a5cd3cd`, `bf2a8a22`) carry candidate-tier issues: congressional stock trading, term limits, military and veterans, and the Second Amendment. Gated-out passages on the same subjects:

| id | page | subject | c / own | first 20 words |
|---|---|---|---|---|
| a2a3199d | /issues | stock trading | 0.98 / 0.67 | Politicians should not profit from the very laws they pass. I have NEVER traded stocks while serving in Congress, and |
| ba2f1f82 | /issues | military | 0.80 / 0.63 | Mike's son serves in the United States Air Force. Our military preserves our freedom every day. We must back them |
| f09f7dfb | /issues | space | 0.47 / 0.10 | Space exploration generates high-paying jobs here in District 8. Space is key to American technological innovation as well as our |

Space exploration is also a headline "Vision" bullet ("Supporting Space Exploration" inside `028520a0`) with no taxonomy issue. `f09f7dfb` scores B1 0.83; it describes, it does not commit.

## Other notes for the founder (not part of the verdict)

1. **Honorific in the constitution header.** The Profiler constitution's attribution example reads "Senator Mike Haridopolos says…". The corpus shows he is the sitting U.S. Representative for FL-8 (`224ee1f0`, `22db3bfe`, `39f3ce0a`: elected 2024) and a former Florida Senate President (2010-2012). "Senator" is not his current title, and a claim written with it would be an unsourced fact. Use "Rep. Mike Haridopolos says", "Mike Haridopolos says" or "The campaign website states".
2. **`run-report.txt` excerpt under B7.** B7 cites `028520a0`, but the printed excerpt is cut off after "Protecting the Indian River Lagoon Advancing common sense ideas to protect our environment…", before the "Tackling Crime & Public Safety" bullet that earns the tag. A reader sees weaponization and Lagoon text under "Crime policy". The full passage contains the crime sentence, so the claim is fine; only the preview misleads. The same applies to `cdf4cbda` under B4, where "preserve Social Security and Medicare" falls after the cut.
3. **Stale `ingest-report.md`.** Its "Step 2" table reports provenance `q-b2171346`, 18 states_policy and 11 with an issue. That is the one-gate run, now in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116` with 13 and 9.
4. **The candidate is the incumbent.** The homepage (`caf5bf75`, `0e48ae07`) opens with a 2024 victory message. Several stated positions are phrased as record ("I supported legislation", "helped pass historic tax relief"). Under the constitution those are the candidate's own framing and stay in `stated_position` attributed as such; contrasting them with the voting record belongs to another bucket.

VERDICT: PASS
