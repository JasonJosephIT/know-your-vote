# Step 3 review: FL-VF-BRO-1254 (Cynthia Alceus Dominique), FL-BRO-SB7-general

I ran this review read-only. It covers `run.json` as it stands now: `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:58Z. That run has two gates: the passage must clear both `commitment` and `own_commitment`. The other inputs are `passages.jsonl` (62 passages) and `ingest.log`.
Official site: https://www.cynthiaforbrowardschools.com/
Spine: not yet decided for this race. So check 4 gives a count for every taxonomy issue in `src/lib/news-issues.ts` that has at least one passage over the threshold, and check 5 looks at every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result |
|---|---|---|
| 1 | Only candidate-controlled sources | PASS |
| 2 | Quotes are verbatim | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence is recorded, not filled | PASS (information only) |
| 5 | Possible misses | 2 reported (information only, not a fix) |

## 1. Only candidate-controlled sources: PASS

- All 62 `passages[].url` values in `run.json`, and all 4 citations under `areas[]`, are on the host `www.cynthiaforbrowardschools.com`. This is the same host as OFFICIAL_SITE, and every one of them is the homepage `https://www.cynthiaforbrowardschools.com/`.
- No other hosts appear, and there are no redirects.
- `ingest.log` shows the crawl read 1 page. It found 20 links on the homepage but asked Jev about 0 of them, chose 0 policy pages and found no about page. `links.jsonl` is empty.

## 2. Quotes are verbatim: PASS

I checked this with a node script, not by eye. For each passage, it compares the Buffer bytes of `run.json` `text` against `passages.jsonl` `text` for the same id. It also compares `url` and `heading`.

- There are 29 passages with `states_policy: true`. All 29 match byte for byte, with 0 mismatches and 0 missing ids.
- The 4 citations in `areas[]` (`9804b508`, `57cd31fd`, `977fa8cb`, `da2c2d8b`) match byte for byte.
- All 62 passages also match, in the same order. The two files have exactly the same set of ids.

## 3. No inferred motive: PASS

None of the 29 passages marked `states_policy: true` is only biography, an attack on an opponent, fundraising or event copy. All 29 come from the section "My Vision for Broward Schools", and each is a platform bullet naming an action the candidate would take ("Ensure…", "Provide…", "Expand…", "Strengthen…"):

`e8611d38`, `be5d7b67`, `3874c056`, `c4c8307f`, `4296139b`, `e3c39e75`, `20a5a153`, `b2e1af18`, `f8e1fca1`, `c5334919`, `a9b7fc9a`, `ad9c8dc3`, `a031efaa`, `da2c2d8b`, `977fa8cb`, `19ae11b7`, `e9422067`, `57cd31fd`, `e970a8e8`, `c23e1e86`, `9804b508`, `e95e2ecc`, `4c3f2fb5`, `54a931c2`, `c6f0e369`, `c78d027b`, `fda00dfe`, `6407fd3c`, `c4bff4a0`.

The gate kept out all the biography, record and sign-off copy. Examples:
- `4695ac5e` "I am a wife, Army veteran…": commitment 0.03.
- `1550adc7`, `e580810e`, `797b3ca9`, `5f747e65`: record anecdotes, commitment 0.04–0.13.
- `10de0a58` "I would be truly grateful to earn your support.": 0.03.
- `6f08e413`, an endorsement line: 0.03.

Some things near the line:
- `fda00dfe` "Celebrate and market the outstanding programs and achievements of Broward County Public Schools to strengthen community pride and increase enrollment." This names a district action, not campaign promotion, so it is not event or fundraising copy.
- The bullets are written in the imperative with no first-person subject. The first-person framing comes from the heading "My Vision for Broward Schools" on the candidate's own site. Any claim written from them should still be attributed ("The campaign website states…").

## 4. Silence is recorded, not filled: PASS (information only)

For each issue, "Score ≥ 0.85" counts passages whose score on that issue clears 0.85, whether or not they passed the gate. "Also passed the gate" counts the ones that also have `states_policy: true`. Only the second group reaches `areas[]`.

| Issue | Label | Score ≥ 0.85 | Also passed the gate (cited) | Passage ids |
|---|---|---|---|---|
| A6 | Public school funding and teachers | 4 | 2 | cited: `9804b508` (0.96), `57cd31fd` (0.86); failed the gate: `86025bd9` (0.95), `ca1006b7` (0.92) |
| KYV10 | Career, vocational and higher education | 2 | 2 | `977fa8cb` (0.97), `da2c2d8b` (0.96) |

Every other taxonomy issue has **0** passages over the threshold, so each one is **no_stated_position_found**:
- A1, A2, A3, A4, A5, KYV9, A7
- B1, B2, B3, B4, B5, B6, KYV1, B7, B8
- KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8

The run marks 25 passages as stating a policy with no taxonomy issue (29 − 4). They go to candidate-tier, not to any taxonomy issue. Two things limit what this silence means:
- **The silence covers the homepage only.** The ingest judged 0 of 20 links and followed none of them.
- **Bookkeeping, not a violation.** `86025bd9` and `ca1006b7` have `states_policy: false` but a non-empty `issues: ["A6"]`. `readVerdict` in `src/lib/policy-noul.ts` computes `issueIds` without checking the gate. `groupByArea` and `counts.with_issue` (= 4) both skip passages that failed the gate, so neither passage is cited. Anyone reading `issues[]` directly should not count these two as positions.

## 5. Possible misses (information for the founder, not a fix)

These passages are marked as stating no policy, but they plainly state a commitment on a taxonomy issue.

| Id | Issue | Scores | First 20 words |
|---|---|---|---|
| `ca1006b7` | A6 | commitment 0.94, own_commitment 0.82, A6 0.92 | "Prioritize investments that directly impact classrooms, student learning, and teacher success." |
| `06807192` | A6 | commitment 0.79, own_commitment 0.79, A6 0.78 | "Competitive compensation and support for teachers and staff." |

- **`ca1006b7`** is a bullet in "My Vision for Broward Schools" with the same form as the cited bullets beside it. It failed only the second gate (0.82 < 0.85).
- **`06807192`** is a list item that completes the sentence in `83be06ca`: "As your next Broward County School Board Member for District 7, I will always put students first and prioritize". The passage splitter separated the list item from its lead-in "I will … prioritize", so neither passage clears the gate on its own. The same split cuts off the other list items after `83be06ca` (`d43dc7b2`, `b00a34ff`, `1ee5abce`, `56649abc`), but none of those scores near the threshold on a taxonomy issue.

Considered and not listed:
- **`86025bd9`** "I have advocated for increased teacher pay, better support and work conditions for teachers and have made great progress this…" (A6 0.95, own_commitment 0.12). This describes past advocacy, not a forward commitment.
- **Commitments outside the taxonomy.** `c48c02ab` (assessment), `16fee8c7` (academic achievement) and `5fdffcd0` (leadership) failed the gate but match no taxonomy issue. They would be candidate-tier if they were captured at all.

## Notes

- **`ingest-report.md` is stale about Step 2.** Its "Step 2: policy run" section shows provenance `q-b2171346`, 33 passages stating a policy, 5 with an issue, and 216964/28396 tokens. Those are the figures of the one-gate run, now kept in `attempt-1-one-gate/`. The current `run.json`, `run.log` and `run-report.txt` show `q-e7282116`, 29, 4, and 229860/29698 tokens.
- In the current run, `counts` (62 asked, 29 stating a policy, 4 with an issue, 0 failed) agrees with the passages. `states_policy` equals `commitment ≥ 0.85 && own_commitment ≥ 0.85` for all 62 passages.

VERDICT: PASS
