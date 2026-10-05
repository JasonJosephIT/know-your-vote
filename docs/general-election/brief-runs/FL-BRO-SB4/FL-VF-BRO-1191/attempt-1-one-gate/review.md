# Step 3 review: FL-VF-BRO-1191 (Nicole Morst), FL-BRO-SB4-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `run.json` (provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`), `passages.jsonl` (9 passages) and `ingest.log`. SPINE is undecided for this race, so check 4 covers every taxonomy issue (tax-7) with a passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | 1 reported (5f6746b4) |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script collected the host of every passage URL in `run.json` (`passages[]` and `areas[].subIssues[].citations[]`). There is one host: `nicolemorst.com`, which is the OFFICIAL_SITE host. All 9 passages (ecd6d140, adee3ed5, ca43b3ae, 41296d54, 5f6746b4, f977c748, 5c8bfb23, 83e6c06c, 3a0ac32e) have the URL `https://nicolemorst.com/`. No other host appears, and no redirect was involved. `ingest.log` names only `https://nicolemorst.com/`. The two links Jev judged (`/Home`, `/endorsements`) are on the same host, and neither was chosen.

### 2. Quotes verbatim: PASS

A node script compared each `run.json` passage with the passage of the same id in `passages.jsonl`, using `Buffer.equals` on the UTF-8 text. All four passages marked `states_policy: true` are byte-identical: ca43b3ae, f977c748, 5c8bfb23 and 83e6c06c. The other five are byte-identical as well. URL and heading match for all 9. The single `areas` citation (83e6c06c, heading "Transparency and Accountability") is also byte-identical. The id sets match exactly: no passage in `run.json` is missing from `passages.jsonl`, and none is extra. Recomputed counts match `counts`: states_policy 4, with_issue 1.

### 3. No inferred motive: PASS

Each of the four passages marked as stating a policy contains a commitment by the candidate:

- **83e6c06c**: "As our district faces financial challenges and declining enrollment, it is critical that we rebuild public trust. I believe transparency and accountability must…". It commits: "I will insist upon open, honest decision making…", "I will closely monitor how taxpayer dollars are spent…".
- **5c8bfb23**: "Every child should have equal access to a high-quality education, clean and safe facilities, and the full range of programs Broward Schools has to…". It commits: "I will work to ensure that every school's unique needs are prioritized and addressed…".
- **f977c748**: "I will continue to advocate for safety and security improvements, including modern detection and prevention tools, while ensuring behavioral health challenges, such…". The commitment is explicit.
- **ca43b3ae**: "I'm running because I know we can do better for our kids, teachers, and communities. By prioritizing student well-being, retaining good teachers, encouraging…". This is the weakest of the four. It is "why I'm running" copy with a biography sentence ("For years, I have fought…"). It does list priorities as a commitment ("By prioritizing … we will keep students in our Broward County public schools"), so it is not only biography.

Nothing marked as stating a policy is pure biography, opponent attack, fundraising or event copy. The biography passages (ecd6d140, adee3ed5), the closing line (41296d54) and the paid-for disclaimer (3a0ac32e) are all correctly marked `states_policy: false`.

### 4. Silence recorded, not filled: PASS

This counts passages with a sub-issue score of at least 0.85 (`>=`, as in `src/lib/policy-noul.ts`), across all 25 tax-7 sub-issues.

| Issue | Passages ≥ 0.85 | Ids |
|---|---|---|
| A6 Public school funding and teachers | 1 | 83e6c06c (0.91) |

The other 24 issues have **0** passages over the threshold, so each is recorded as "no_stated_position_found": A1, A2, A3, A4, A5, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8. The run's `areas` holds exactly one sub-issue (A6), with one citation (83e6c06c), so the run filled nothing it should have left silent.

Three passages state a policy but clear no taxonomy issue: ca43b3ae (top score A6 0.73), f977c748 (B7 0.36) and 5c8bfb23 (A6 0.34). They carry no issue id in the run. They count as 0 above.

Coverage caveat: the ingest read one page (the homepage). It chose 0 policy pages, found no about page, and had Jev judge 2 of 22 homepage links. These silences therefore reflect the homepage only.

### 5. Possible misses (information for the founder, not a fix)

- **5f6746b4** (heading "Well-Being"; commitment 0.81, just under 0.85; A6 0.79): "Ensuring our schools are properly funded and staffed with essential support personnel, including security staff, nurses, mental health professionals, and guidance counselors is…". This is a stated position on A6 school funding and staffing. It is phrased as a normative statement ("is critical for student success"), not as a first-person "I will".

No other passage marked as stating no policy states a commitment on a taxonomy issue. ecd6d140 describes past advocacy (biography). adee3ed5 describes experience only. 41296d54 is a closing line. 3a0ac32e is the paid-for disclaimer.

VERDICT: PASS
