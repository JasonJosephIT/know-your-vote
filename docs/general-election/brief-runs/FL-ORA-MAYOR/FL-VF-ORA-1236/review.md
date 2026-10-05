# Step 3 review: FL-VF-ORA-1236 (Tiffany Moore Russell), FL-ORA-MAYOR-general

Reviewer role: I checked that the machine run in this folder could only produce claims the Profiler constitution allows. I wrote no claims, fetched no site and committed nothing.

Inputs: `passages.jsonl` (23 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates `q_states_policy` + `q_own_commitment`, 23 asked, 0 failed, 1 `states_policy`, 0 with an issue, `areas` empty), `ingest.log`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (tax-7, the 25 sub-issues in `src/lib/news-issues.ts`), and check 5 considers every taxonomy issue.

This review replaces the one in `attempt-1-one-gate/review.md`, which covered the earlier one-gate run (`q-b2171346`).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 23 are on `tiffanyformayor.com`. No other host. |
| 2 | Quotes verbatim | PASS | 1e827cf5 is byte-identical to `passages.jsonl`, and so are all 23 passages. |
| 3 | No inferred motive | PASS | The only policy passage, 1e827cf5, is an agenda item. It is not biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | Over the issue threshold: B1 1 (f0f52930), KYV3 1 (48ff90fe). Both fail the second gate, so the run records 0 positions on every issue. |
| 5 | Possible misses (information only) | 3 noted | 48ff90fe, f0f52930, 52ad1078 |

## 1. Candidate-controlled sources only: PASS

A node script grouped every passage URL in `run.json` (and in `passages.jsonl`) by host. There is one host, `tiffanyformayor.com`, which is the OFFICIAL_SITE host. The `site` field in `run.json` is `https://tiffanyformayor.com`.

| URL | Passages |
|---|---|
| https://tiffanyformayor.com/ | 6baca065, 768004dd, 19b3ebd8, 733fa339, 3318a408 |
| https://tiffanyformayor.com/issues | 0b6303d7, 67457bb5, 48ff90fe, 1e827cf5, f0f52930, fd3d5cf5 |
| https://tiffanyformayor.com/about | 52ad1078, 2e3b3262, 2dd1ed6b, 97ef5fcb, c84c7804, 05c2c1a0, 76588030, 02cd5d7a, 50f68d59, d5e3ad09, c480bd5e, 61cfe211 |

No other host appears. `ingest.log` shows no redirects. Each page (/, /issues and /about) hit a bot challenge (HTTP 202) and was fetched again in the browser from the same URL, so the host never changed.

## 2. Quotes verbatim: PASS

A node script loaded `passages.jsonl` and `run.json`, matched passages by id and compared `text` with `Buffer.compare` on the UTF-8 bytes.

- The one passage with `states_policy: true` (1e827cf5, 62 bytes) is byte-identical to `passages.jsonl`.
- All 23 passages also match on `text`, `url` and `heading`. Each file has 23 unique ids, and every id appears in both files.
- `areas` is empty, so no citation text was copied into it.

## 3. No inferred motive: PASS

One passage is marked `states_policy: true`. It clears both gates (commitment 0.92, own_commitment 0.86).

| id | Heading | Text (whole passage, under 20 words) | issues |
|---|---|---|---|
| 1e827cf5 | "Tiffany Moore Russell's vision includes:" | "Enhancing and Investing in Innovative Transportation Solutions" | (none) |

This is a forward-looking agenda item from the candidate's /issues page. It is not biography, an attack on an opponent, fundraising or event copy.

Notes (these do not change the result):
- It is a headline slogan with no detail behind it in the corpus. A stated_position claim built from it can only repeat its own wording.
- It matches no tax-7 question (its highest score is B1 at 0.07). The run report lists it as "1 state a policy the taxonomy has no question for". Under the constitution it would be a candidate-tier issue (transportation), not a spine issue.
- The script re-derived `states_policy` for every passage as commitment ≥ 0.85 AND own_commitment ≥ 0.85. The result matched the file for all 23 passages. The recount also matched `counts`: 1 `states_policy`, 0 with an issue.
- All biography, accomplishment, testimonial and donation passages are marked `states_policy: false`. These are 0b6303d7 and 67457bb5, the /about passages other than 52ad1078, and the 5 homepage passages.

## 4. Silence recorded, not filled: PASS

A passage counts for an issue when its score for that issue is ≥ 0.85, the run threshold. The script computed this from `verdict.scores` for all 25 taxonomy questions. Two issues have a passage over the threshold:

| Issue | Label | Passages over threshold | Passage (score, gates) | Also clears both gates |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 1 | f0f52930 (0.89; commitment 0.90, own_commitment 0.76) | 0 |
| KYV3 | Growth, development and land conservation | 1 | 48ff90fe (0.93; commitment 0.93, own_commitment 0.79) | 0 |

Every other taxonomy issue has 0 passages over the threshold. Each of those is `no_stated_position_found`: A1, A2, A3, A4, A5, A6, A7, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9, KYV10.

Neither B1 nor KYV3 passage clears the second gate, so neither is `states_policy`. `areas` is therefore empty, and the run as written produces no Position for any issue. That makes B1 and KYV3 `no_stated_position_found` in the run's output too. Nothing filled a silence. The run tagged each passage's `issues` field with exactly the issues it cleared, and with no others.

This review does not count any passage below the threshold as covering an issue. The highest scores below it were c480bd5e B1 0.77, 52ad1078 B1 0.73, 67457bb5 B7 0.47 and c84c7804 KYV6 0.45.

## 5. Possible misses (information for the founder, not a fix)

Three passages are marked `states_policy: false` but state a commitment on a taxonomy issue:

- **48ff90fe** (/issues, heading "Tiffany Moore Russell's vision includes:"; commitment 0.93, own_commitment 0.79, KYV3 0.93): "Ensuring Equitable Development that Prioritize Smart Growth". This is a bare plan item from the candidate's own agenda list. The `q_own_commitment` instructions say a bare plan item counts. It cleared the commitment gate and the KYV3 threshold, but the second gate dropped it.
- **f0f52930** (/issues, same heading; commitment 0.90, own_commitment 0.76, B1 0.89): "Protecting Small Business, Supporting Their Growth, and Diversifying Jobs". Same situation, on B1.
- **52ad1078** (/about; commitment 0.76, own_commitment 0.87, B1 0.73): "As your next Orange County mayor, I will fight for quality services, more economic opportunities, and a responsive government that". This is a first-person commitment. The only taxonomy issue it touches is B1 ("more economic opportunities"), and the wording is general. It cleared the second gate but not the first.

48ff90fe and f0f52930 were `states_policy: true` in the one-gate run (`attempt-1-one-gate`). The second gate has removed two of the site's four agenda items even though their wording has the same form as 1e827cf5, which it kept. The founder may want to look at this when calibrating the gate.

Passages I considered that are not misses:
- fd3d5cf5 ("Expanding Parks, Recreation, and the Arts"; commitment 0.89, own_commitment 0.82) is also an agenda item that the second gate dropped. It clears no taxonomy issue (its highest is KYV3 at 0.22), so it would be a candidate-tier issue, not a spine miss.
- c480bd5e, 02cd5d7a, 50f68d59, d5e3ad09, 05c2c1a0, 76588030 and 61cfe211 are past accomplishments as Commissioner. c84c7804 and 67457bb5 are past work as Clerk or attorney. All of these are record, not commitments, and record belongs to a different bucket.

Also noted: the "Step 2: policy run" table in `ingest-report.md` still describes the one-gate run (`q-b2171346`, 4 state a policy, 2 with an issue, 80843 tokens in). It does not describe the current `run.json` (`q-e7282116`, 1 and 0, 85627 tokens in). The report is stale. The run itself is not wrong.

VERDICT: PASS
