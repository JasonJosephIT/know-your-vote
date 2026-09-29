# Step 3 review: FL-VF-ORA-1236 (Tiffany Moore Russell), FL-ORA-MAYOR-general

Reviewer role: checks that the machine run in this folder could only produce claims the Profiler constitution allows. No claims written, no site fetched, nothing committed.

Inputs: `passages.jsonl` (23 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 23 asked, 0 failed, 4 `states_policy`, 2 with an issue), `ingest.log`.

SPINE: undecided for this race. Check 4 therefore reports every taxonomy issue (tax-7, `src/lib/news-issues.ts`) and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 23 on `tiffanyformayor.com`, no other host |
| 2 | Quotes verbatim | PASS | 48ff90fe, 1e827cf5, f0f52930, fd3d5cf5 byte-identical (all 23 are) |
| 3 | No inferred motive | PASS | None of the 4 policy passages is biography, attack, fundraising or event copy |
| 4 | Silence recorded, not filled | PASS | B1: 1 (f0f52930), KYV3: 1 (48ff90fe), the other 23 issues: 0 |
| 5 | Possible misses (information only) | 1 noted | 52ad1078 |

## 1. Candidate-controlled sources only: PASS

A node script grouped every `run.json` passage URL by host. There is one host, `tiffanyformayor.com`, which is the OFFICIAL_SITE host. `run.json` `site` is `https://tiffanyformayor.com`.

| URL | Passages |
|---|---|
| https://tiffanyformayor.com/ | 6baca065, 768004dd, 19b3ebd8, 733fa339, 3318a408 |
| https://tiffanyformayor.com/issues | 0b6303d7, 67457bb5, 48ff90fe, 1e827cf5, f0f52930, fd3d5cf5 |
| https://tiffanyformayor.com/about | 52ad1078, 2e3b3262, 2dd1ed6b, 97ef5fcb, c84c7804, 05c2c1a0, 76588030, 02cd5d7a, 50f68d59, d5e3ad09, c480bd5e, 61cfe211 |

Other hosts: none. `ingest.log` shows no redirects. Each page hit a bot challenge (HTTP 202) and was fetched again in the browser from the same URL, so the host did not change.

## 2. Quotes verbatim: PASS

A node script loaded `passages.jsonl` and `run.json`, matched passages by id and compared `text` with `Buffer.compare` on the UTF-8 bytes.

- The 4 passages with `states_policy: true` (48ff90fe, 1e827cf5, f0f52930, fd3d5cf5) are byte-identical to `passages.jsonl`.
- All 23 passages match on `text`, `url` and `heading`. Each file has 23 ids, and every id is in both.
- The citations copied into `run.json` `areas` (f0f52930 under B1, 48ff90fe under KYV3) are also byte-identical in `text` and `url`.

## 3. No inferred motive: PASS

These are the 4 passages marked `states_policy: true`. All four are items under the heading "Tiffany Moore Russell's vision includes:" on /issues. Each is a forward-looking agenda item from the candidate, and none is biography, attack, fundraising or event copy.

| id | commitment | issues | Text (whole passage, under 20 words) |
|---|---|---|---|
| 48ff90fe | 0.92 | KYV3 | "Ensuring Equitable Development that Prioritize Smart Growth" |
| 1e827cf5 | 0.92 | (none) | "Enhancing and Investing in Innovative Transportation Solutions" |
| f0f52930 | 0.90 | B1 | "Protecting Small Business, Supporting Their Growth, and Diversifying Jobs" |
| fd3d5cf5 | 0.89 | (none) | "Expanding Parks, Recreation, and the Arts" |

Notes (these do not change the result):
- These are headline slogans with no detail behind them in the corpus. A stated_position claim built from them can only repeat the heading's wording. It cannot add specifics.
- 1e827cf5 (transportation) and fd3d5cf5 (parks, recreation and arts) state a policy but match no tax-7 question. Under the constitution they would be candidate-tier issues, not a spine issue.
- The biography, accomplishment, testimonial and donation passages (0b6303d7, 67457bb5, the 11 /about passages other than 52ad1078, and the 5 homepage passages) are all correctly marked `states_policy: false`.

## 4. Silence recorded, not filled: PASS

A passage counts for an issue when its score for that issue is ≥ 0.85 (the run threshold), computed from `verdict.scores` for all 25 taxonomy questions.

Issues with at least one passage over the threshold:

| Issue | Label | Count | Passage (score) |
|---|---|---|---|
| B1 | Economy, inflation, and jobs | 1 | f0f52930 (0.89) |
| KYV3 | Growth, development and land conservation | 1 | 48ff90fe (0.93) |

Every other taxonomy issue has 0 passages, so each gets `no_stated_position_found`: A1, A2, A3, A4, A5, A6, A7, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9, KYV10.

The run's `issues` tags agree with these counts. No passage is tagged with an issue it did not clear. The highest scores that did not clear are c480bd5e B1 0.77, 52ad1078 B1 0.71, 67457bb5 B7 0.49, c84c7804 KYV6 0.49 and 50f68d59 KYV4 0.24. This review does not treat any of them as covering an issue.

## 5. Possible misses (information for the founder, not a fix)

One passage is marked `states_policy: false` but states a first-person commitment on a taxonomy issue:

- **52ad1078** (https://tiffanyformayor.com/about, commitment 0.76, B1 0.71): "As your next Orange County mayor, I will fight for quality services, more economic opportunities, and a responsive government that will put you first." This is a stated commitment in the candidate's own voice. The only taxonomy issue it touches is B1 ("more economic opportunities"). It is general wording and scored below the 0.85 gate.

Other passages that were considered and are not misses:
- c480bd5e ("Prioritized the distribution of Micro Loans to support small businesses."), 02cd5d7a, 50f68d59, d5e3ad09, 05c2c1a0, 76588030 and 61cfe211 describe past accomplishments as Commissioner. They are record, not commitments, and the record belongs to a different bucket.
- c84c7804 and 67457bb5 describe past work as Clerk or attorney (the self-help center, fiscal accountability). They are also record, not commitments.

VERDICT: PASS
