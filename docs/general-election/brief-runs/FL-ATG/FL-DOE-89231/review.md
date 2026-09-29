# Step 3 review: FL-DOE-89231 (Jose Javier Rodriguez), FL-ATG-general

Reviewer: Step 3, under the Profiler constitution. Read-only apart from this file. No website was fetched.

Inputs: `passages.jsonl` (17 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 17 asked, 0 failed, 9 `states_policy`, 4 with an issue), `ingest.log`. `run-report.txt`, `run.log`, `ingest-report.md`, `links.jsonl` and `meta.tsv` were read for context only.

SPINE: undecided for this race. Check 4 covers every taxonomy sub-issue in `src/lib/news-issues.ts` (A1–A7, B1–B8, KYV1–KYV10; 25 in all, the same 25 keys as `scores` in `run.json`), and check 5 considers all of them.

"Clears the threshold" means score ≥ 0.85, the `>=` comparison in `readVerdict` / `applyThreshold` (`src/lib/policy-noul.ts`).

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked by script) | **PASS** |
| 3 | No inferred motive (no non-commitment passage marked as policy) | **PASS** (1 borderline passage noted) |
| 4 | Silence recorded, not filled | **PASS** (counts below; 1 schema observation) |
| 5 | Possible misses (information only) | 1 possible miss, 1 weak one reported |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and `passages.jsonl` with `new URL()`. All 17 passages in both files are on host `www.jjr.vote`, the OFFICIAL_SITE host. `run.json` `site` is `https://www.jjr.vote`. No other host appears.

| URL | Passages | Ids |
|---|---|---|
| https://www.jjr.vote/ | 3 | c7830d38, 19195412, 8f919b11 |
| https://www.jjr.vote/priorities | 10 | 16e1a282, 782ad994, 6ee36adc, c1fc065e, d90e8b01, 2e2445d5, edc58216, bd7d4d2b, 2249eba7, d774b2ad |
| https://www.jjr.vote/about | 4 | 8b3e8193, 7b9b3d2a, 4fdf0cc1, 76753caf |

No redirect was involved. `ingest.log` has no robots, bot-challenge, browser or unreachable lines. It prints 11 passages for `/priorities` and 5 for `/about`, against 10 and 4 in the file. That is not a discrepancy: `scripts/candidate-site-ingest.ts` logs per-page counts before `dedupeAcrossPages`, and it does not log the homepage. The final line (17 passages) matches both files.

### 2. Quotes verbatim: PASS

A node script took each of the 9 passages where `verdict.states_policy === true`, looked up the passage with the same `id` in `passages.jsonl`, and compared the two `text` fields with `Buffer.compare` on their UTF-8 bytes. It also compared `url` and `heading`.

- Mismatches among the 9 policy passages: **0** (text, url and heading).
- The same comparison over all 17 passages: **0** mismatches. Ids are unique (17 of 17 in each file), and none is missing from either file.

The 9 ids checked: 16e1a282, 782ad994, 6ee36adc, c1fc065e, d90e8b01, 2e2445d5, bd7d4d2b, 2249eba7, 4fdf0cc1.

### 3. No inferred motive: PASS

I read each of the 9 passages marked `states_policy: true`. Eight are items from the `/priorities` list, each an imperative commitment under the campaign's "crime. / Costs. / Corruption." headings ("Support law enforcement, advocate for victims…", "Get fentanyl and dangerous drugs off our streets.", "Deliver real relief for homeowners…", "Root out corruption and fraud…", "Defend Floridians' constitutional and individual rights."). None is only biography, attack, fundraising or event copy.

All 3 fundraising passages on the homepage (`c7830d38`, `19195412`, `8f919b11`) and the biography passages `8b3e8193` and `7b9b3d2a` are marked `states_policy: false`.

One borderline passage is worth the founder's attention. It is not a violation:

- `4fdf0cc1` (commitment 0.90; no issue tag): "In 2020, FP&L approved and funded a criminal "ghost candidate" scheme to trick voters during my re-election to the State Senate, one…" The passage opens with biography and an allegation against a named third party (FP&L), and closes with a characterization of others ("not a hyper-political hack servant of the powerful"). It does contain commitments in the candidate's voice: "I'm committed to bringing stability back to the office and refocus it on a mission of fighting crime, costs and corruption. I will serve as a steady, professional and independent-minded enforcer of the law…". So it is not attack or biography only. It carries no taxonomy issue and files under no spine issue. Any claim built from it must use only the commitment sentences, attributed ("The campaign website states…"). The FP&L allegation and the "hack" wording must never be restated in the brief's own voice, and the brief must not treat the allegation as established.

Also noted: `2249eba7` ("Defend Floridians' constitutional and individual rights.", commitment 0.85) clears the gate at exactly the threshold with no issue tag. It is a commitment, but a very general one.

### 4. Silence recorded, not filled: PASS

A passage counts toward an issue as a stated position only if it clears the gate (`states_policy`, commitment ≥ 0.85) **and** its issue score is ≥ 0.85. That is the rule `run-report.txt` publishes by. Every taxonomy issue with at least one passage over the threshold is listed below:

| Issue | Label | Stated-position passages (gate and issue ≥ 0.85) | Ids (score) | Issue ≥ 0.85 but gate failed (not a stated position) | Coverage |
|---|---|---|---|---|---|
| A1 | Property insurance costs | **1** | d90e8b01 (0.90) | — | stated |
| B7 | Crime policy, policing and courts | **3** | 16e1a282 (0.95), 2e2445d5 (0.93), 782ad994 (0.85) | — | stated |
| KYV2 | Energy and utilities | **1** | d90e8b01 (0.92) | 7b9b3d2a (0.89, commitment 0.65) | stated |

Every other taxonomy issue has **0** passages over the threshold on any score: A2, A3, A4, A5, A6, A7, B1, B2, B3, B4, B5, B6, B8, KYV1, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9 and KYV10. Each of those is `no_stated_position_found`.

The counts match `run-report.txt`, which prints KYV2 (1), A1 (1) and B7 (3), and `counts.with_issue` = 4 (d90e8b01, 16e1a282, 782ad994, 2e2445d5). The script also confirmed that every passage's `issues` equals exactly its set of scores ≥ 0.85.

Two edge cases, reported as facts only:

- `782ad994` has a B7 score of exactly 0.85. It clears by the `>=` rule.
- A1 and KYV2 each rest on one passage, `d90e8b01`: "Deliver real relief for homeowners and small businesses from skyrocketing insurance costs and electric bills." A claim built from it should say what the site says ("relief … from skyrocketing insurance costs and electric bills") and no more. The passage names no mechanism.

Schema observation (not a failure of this run's output): in `run.json`, `verdict.issues` is filled even when `states_policy` is false. `readVerdict` in `src/lib/policy-noul.ts` applies the issue threshold without regard to the gate. One gate-failed passage carries an issue tag:

- `7b9b3d2a`: commitment 0.65, `issues: [KYV2]`. "I stood up to the most powerful special interests when they sought to take advantage of us as insurance policyholders, as utility ratepayers…" This is a description of the candidate's record, not a commitment.

The printed report correctly leaves it out. But any downstream consumer that reads `run.json` and files by `issues` without also checking `states_policy` would put a record/biography passage under KYV2. Consumers must filter on `states_policy === true` first.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but they state something close to a commitment on a taxonomy issue:

- `76753caf` (commitment 0.83; A4 0.84, B1 0.67): "I'm focused on keeping Floridians safe, fighting to lower costs, and rooting out corruption, all while serving as a fair, independent-minded…" This is a first-person statement of focus on cost of living (A4), and it misses both the gate and the A4 tag by 0.01–0.02. It is a summary line with no specific policy. If it had cleared, A4 would move from 0 to 1. As reported, A4 is 0 and `no_stated_position_found`.
- `edc58216` (commitment 0.76; B7 0.60): "Stand up for Florida families against bad actors who cheat or take advantage of them." This is a weak one: a consumer-protection commitment under the "Costs." heading. Its closest taxonomy fit is B7, which already has 3 stated-position passages, so coverage would not change.

Out of taxonomy scope, listed for completeness only: `d774b2ad` (commitment 0.77; "Serve as a fair, independent advocate for all Floridians — not special interests.") is a general commitment that fits no taxonomy issue. Among the gated passages, `6ee36adc` (children's online safety), `c1fc065e` (protecting seniors and veterans from exploitation; B7 0.80), `bd7d4d2b` (rooting out corruption; B7 0.67, KYV1 0.62), `2249eba7` (constitutional rights) and `4fdf0cc1` state policies the taxonomy has no tag for at this threshold. Under the constitution, these would be candidate-tier issues, not spine gaps.

VERDICT: PASS
