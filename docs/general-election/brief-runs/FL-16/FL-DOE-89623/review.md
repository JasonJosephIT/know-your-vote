# Step 3 review: FL-DOE-89623 (Mark Davis), FL-16-general

Reviewer: Step 3 reviewer under the Profiler constitution. This is a read-only review of `passages.jsonl`, `run.json` and `ingest.log` in this directory. No site was fetched and no other file was edited.

Run under review: `jev:jev-1.13.0/tax-7/q-e7282116` (two gates: `q_states_policy` and `q_own_commitment`), threshold 0.85, status `complete`, created 2026-09-30T01:58:20Z. 84 passages were asked and 0 failed. 1 passage states a policy, and it matches a taxonomy issue.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7, 25 sub-issues) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 84 passage urls in `run.json` are on `markdavisforcongress.com` (`/` 16, `/issues` 18, `/more-about-why` 50). No other host appears. |
| 2 | Quotes verbatim | **PASS** | The only `states_policy: true` passage, `b5d4b33c`, is byte-identical to `passages.jsonl`. All 84 passages and the single `areas` citation also match. |
| 3 | No inferred motive | **PASS** | `b5d4b33c` is a concrete commitment ("Free public college and trade school"). It is not biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | Published: KYV10 = 1. Over the issue threshold but failed a gate: B2 (3), B5 (3), B1 (1), KYV1 (1). These show 0 and `no_stated_position_found`. The other 20 issues have 0. |
| 5 | Possible misses (information only) | 4 plain, 2 support-without-action, 2 borderline | Plain: `edd1ed3c` (B2), `ee976211` (B5), `a5c8bf14` (KYV1), `47094dad` (B5, first sentence only). Support without an action: `861a9584`, `ad290768` (B2). Borderline: `654f65a5` (B7), `4eb06c46` (KYV1). |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script tallied `new URL(p.url).host` over `run.json.passages`: `markdavisforcongress.com` 84. All 86 URL strings anywhere in `run.json` (84 passages, the `site` field and the one `areas` citation) have origin `https://markdavisforcongress.com`. `passages.jsonl` is also 84 of 84 on that host. `links.jsonl` (the 6 links Jev judged) is all `markdavisforcongress.com`. No redirect is involved and no other host appears.

Side note, not a failure: `ingest.log` gives per-page counts of 19 (`/issues`) and 50 (`/more-about-why`) out of 84. That would leave 15 for `/`, but `passages.jsonl` and `run.json` hold 16 / 18 / 50. This is the same discrepancy the one-gate review found (probably one passage deduplicated across `/` and `/issues` and kept under `/`). All three pages are on the official host either way.

### 2. Quotes verbatim: PASS

The node script compared UTF-8 bytes with `Buffer.compare`, and also compared `url` and `heading`, against the `passages.jsonl` passage with the same id:

| id | url | commitment | own_commitment | issues | text |
|---|---|---|---|---|---|
| b5d4b33c | /more-about-why | 0.97 | 0.94 | KYV10 (0.98) | IDENTICAL |

Running the same comparison over all 84 `run.json` passages found 0 differences. No id is missing or duplicated on either side. The one `areas` citation (KYV10 → `b5d4b33c`) matches on text and url.

The verdicts are internally consistent. For every passage, `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85`, and `issues` equals the set of scores `>= 0.85`. Every verdict carries `own_commitment`. `counts.with_issue` = 1 matches `areas`.

The ellipsis in "Free public college and trade school...because debt" is in the source passage and is not a truncation by the run.

### 3. No inferred motive: PASS

Only one passage is marked as stating a policy. `b5d4b33c` reads "• Free public college and trade school...because debt shouldn’t be the price of opportunity". It is a bullet under "So here's what I stand on" (`00d6046f`) and is the candidate's own commitment. No biography, attack, fundraising or event copy is marked as policy.

The weak items flagged in the one-gate review (`42678db4`, `5687859f`, and the attack half of `47094dad`) are no longer marked as policy. Each fails `q_own_commitment` (0.50, 0.48 and 0.37).

### 4. Silence recorded, not filled: PASS

A script counted, for every taxonomy sub-issue, how many passages have an issue score of at least 0.85 ("over threshold"). "Published" means the passage also cleared both gates. That is what `areas` contains, and it is what the Profiler would write as `stated_position`.

| Issue | Label | Over threshold (score; commitment / own) | Published | Coverage |
|---|---|---|---|---|
| KYV10 | Career, vocational and higher education | 1: `b5d4b33c` 0.98 (0.97 / 0.94) | 1 | stated |
| B2 | Healthcare access and costs | 3: `861a9584` 0.97 (0.94 / 0.45), `ad290768` 0.97 (0.90 / 0.54), `edd1ed3c` 0.97 (0.92 / 0.71) | 0 | 0, `no_stated_position_found` |
| B5 | Abortion policy | 3: `e87468c9` 0.86 (0.79 / 0.12), `47094dad` 0.96 (0.88 / 0.37), `ee976211` 0.87 (0.77 / 0.38) | 0 | 0, `no_stated_position_found` |
| B1 | Economy, inflation, and jobs | 1: `6069df39` 0.91 (0.67 / 0.13) | 0 | 0, `no_stated_position_found` |
| KYV1 | Threats to democratic institutions | 1: `a5c8bf14` 0.92 (0.80 / 0.61) | 0 | 0, `no_stated_position_found` |

Every other taxonomy issue has 0 passages over the threshold and should be recorded as 0, `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, A7, B3, B4, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

The run did not fill any silence: `areas` holds KYV10 only. No passage cleared both gates without matching an issue, so there is no candidate-tier material in this run.

What changed from the one-gate run (`attempt-1-one-gate/`, `q-b2171346`, 11 policy passages, 5 with an issue): the first-gate scores barely moved, within 0.02. The new `q_own_commitment` gate removed 10 of the 11, and B2 (3 citations) and B5 (1 citation) dropped out of `areas`. That is the constitution-safe direction, because silence is recorded rather than filled. But it is a coverage loss, and check 5 lists it.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment on a taxonomy issue. In each case the passage cleared or nearly cleared the first gate, and the second gate (`own_commitment`) rejected it.

Plain commitments:

- `edd1ed3c` (commitment 0.92, own 0.71; B2 0.97). First 20 words: "• Single-payer healthcare...so you don’t lose everything just because you got sick". This is a bullet in the "So here's what I stand on" list (`00d6046f`) and is the site's clearest healthcare commitment. It is the main reason B2 now shows `no_stated_position_found`.
- `ee976211` (commitment 0.77, own 0.38; B5 0.87). First 20 words: "• Women’s rights and reproductive freedom...protected in federal law". This bullet is in the same list and commits to codifying reproductive rights in federal law. It fails both gates.
- `a5c8bf14` (commitment 0.80, own 0.61; KYV1 0.92). First 20 words: "• Checks and balances rebuilt...so no one man can ever rule again". This bullet is in the same list and fails both gates.
- `47094dad` (commitment 0.88, own 0.37; B5 0.96). First 20 words: "We can protect reproductive freedom and protect public safety. These aren’t radical ideas—they’re mainstream. But, under Trump’s influence, the government". The first sentence states a position, and the rest attacks an opponent. If this is ever published, quote only the first sentence (see the one-gate review).

Support stated, but no action named. Both sit under the heading "Healthcare for all" on `/issues`:

- `861a9584` (commitment 0.94, own 0.45; B2 0.97). First 20 words: "Universal healthcare isn’t some scary monster—it’s common sense. The current patchwork of employer-based or profit-driven plans is a failure."
- `ad290768` (commitment 0.90, own 0.54; B2 0.97). First 20 words: "We need a system that actually covers everyone without bankrupting them. Period."

Borderline:

- `654f65a5` (commitment 0.87, own 0.78; B7 0.77, below threshold). First 20 words: "You don’t destroy democracy to fix a problem that requires all of us to fix. We’re not going to". The passage continues "militarize our streets", a stated opposition on policing, but neither the gate nor the issue score reaches 0.85.
- `4eb06c46` (commitment 0.52, own 0.38; KYV1 0.57). First 20 words: "• And real accountability...for trump, for Elon, for any politician or executive who thinks". It is framed as a commitment, but it is a truncated fragment aimed at named people.

Considered and not listed, because they are rhetoric, problem description or attack rather than a commitment: `6069df39` (tariffs, B1 0.91), `e87468c9` (B5 0.86), `761f23cb`, `7ebe62e5`, `5db769ff`, `2ebf001f`, `18a105a4`, `dbcde81d`, `17eb9bf4`, `42678db4`, `5687859f`.

Outside check 5's scope, because no taxonomy issue fits them: `b98df5b7` ("Common-sense gun laws", 0.93 / 0.80), `4b7d1f10` ("Equal rights for all Americans", 0.92 / 0.82) and `85dfa9bb` ("Taxing billionaires", 0.90 / 0.68; B1 0.59) were candidate-tier material in the one-gate run. Each now misses `own_commitment` by 0.03 to 0.17. Together with the misses above, the second gate kept 1 of the 7 "what I stand on" bullets on this site. The founder may want to add this site to the gold set for `q_own_commitment`, since bare plan items ("Cut property taxes") are meant to count.

### Other note for the founder (not a check)

The "Step 2: policy run" section of `ingest-report.md` still describes the one-gate run (`q-b2171346`, 11 state a policy, 5 with an issue, 293645 tokens in). It does not describe the `run.json` reviewed here (`q-e7282116`, 1 and 1, 311117 tokens in, per `run.log`). `run-report.txt` and `run.log` match the current `run.json`.

VERDICT: PASS
