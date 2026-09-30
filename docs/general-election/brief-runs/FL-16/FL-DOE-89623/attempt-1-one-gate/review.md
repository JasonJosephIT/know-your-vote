# Step 3 review: FL-DOE-89623 (Mark Davis), FL-16-general

Reviewer: Step 3 reviewer under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` and `ingest.log` in this directory; no site fetched, nothing else edited.

Run under review: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 84 passages asked, 0 failed, 11 state a policy, 5 of those match a taxonomy issue.

SPINE: not yet decided for this race, so check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7, 25 sub-issues) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 84 passage urls in `run.json` are on `markdavisforcongress.com` (`/` 16, `/issues` 18, `/more-about-why` 50). No other host appears anywhere in `run.json` or `links.jsonl`. |
| 2 | Quotes verbatim | **PASS** | All 11 `states_policy: true` passages are byte-identical to the passage with the same id in `passages.jsonl` (checked with node `Buffer.compare`); url and heading also match. All 84 passages and all 5 `areas` citations match too. |
| 3 | No inferred motive | **PASS** (2 weak items noted) | None of the 11 is only biography, an attack, fundraising or event copy. `42678db4` and `5687859f` are vague, and `47094dad` mixes a commitment with an attack. All three are listed below for the founder. |
| 4 | Silence recorded, not filled | **PASS** | Published (gate plus issue): B2 = 3, B5 = 1, KYV10 = 1. B1 and KYV1 each have 1 passage over the issue threshold that failed the gate, so they show 0 and `no_stated_position_found`. The other 20 issues have 0. |
| 5 | Possible misses (information only) | 2 plain, 1 borderline | `ee976211` (B5), `a5c8bf14` (KYV1). Borderline: `4eb06c46` (KYV1). |

## Evidence

### 1. Candidate-controlled sources only: PASS

Script tally of `new URL(p.url).host` over `run.json.passages`: `markdavisforcongress.com` 84. Every URL string anywhere in `run.json` (90 occurrences, counting the `areas` block) has origin `https://markdavisforcongress.com`. `links.jsonl` (the 6 links Jev judged) is also all `markdavisforcongress.com`. No other host appears, and no redirect is involved.

Side note, not a failure: `ingest.log` gives per-page counts of 19 (`/issues`) and 50 (`/more-about-why`) out of 84. That implies 15 passages from `/`, but `passages.jsonl` and `run.json` have 16 / 18 / 50, which matches `ingest-report.md`. This looks like one passage deduplicated across `/` and `/issues` and kept under `/`. Both pages are on the official host either way.

### 2. Quotes verbatim: PASS

The script compared each `run.json` passage with `states_policy: true` against the `passages.jsonl` passage of the same id, byte for byte (UTF-8 `Buffer.compare`):

| id | url | commitment | issues | text |
|---|---|---|---|---|
| 42678db4 | /issues | 0.87 | none | IDENTICAL |
| 654f65a5 | /issues | 0.88 | none | IDENTICAL |
| 861a9584 | /issues | 0.94 | B2 | IDENTICAL |
| ad290768 | /issues | 0.91 | B2 | IDENTICAL |
| 5687859f | /issues | 0.86 | none | IDENTICAL |
| 47094dad | /issues | 0.87 | B5 | IDENTICAL |
| edd1ed3c | /more-about-why | 0.93 | B2 | IDENTICAL |
| b98df5b7 | /more-about-why | 0.93 | none | IDENTICAL |
| 4b7d1f10 | /more-about-why | 0.93 | none | IDENTICAL |
| b5d4b33c | /more-about-why | 0.97 | KYV10 | IDENTICAL |
| 85dfa9bb | /more-about-why | 0.90 | none | IDENTICAL |

The same comparison over all 84 passages found 0 differences, and no id is missing or duplicated. The 5 `areas` citations (`b5d4b33c`, `861a9584`, `ad290768`, `edd1ed3c`, `47094dad`) match on text and url. The verdicts are also internally consistent: for every passage, `states_policy` equals `commitment >= 0.85` and `issues` equals the set of scores `>= 0.85`.

Note for the founder: `85dfa9bb` is verbatim but cut off mid-sentence ("...you can afford to pay your"). `/more-about-why` is split into passages by visual line, so several passages on that page are sentence fragments. A published quote from `85dfa9bb` would end mid-clause. It has no issue tag, so it does not reach `areas` in this run.

### 3. No inferred motive: PASS

None of the 11 policy-marked passages is only biography, an attack on an opponent, fundraising or event copy. Eight carry a concrete commitment (`654f65a5` "We're not going to militarize our streets", `861a9584`, `ad290768`, `edd1ed3c`, `b98df5b7`, `4b7d1f10`, `b5d4b33c`, `85dfa9bb`). The five `/more-about-why` bullets follow "So here's what I stand on" (`00d6046f`).

Weak items, listed for the founder. They do not fail the check:

- `42678db4` (no issue tag). First 20 words: "We need policies that actually lift everyday Floridians up, not just hand gold bars to the billionaires." This is a general aspiration with no specific policy. It is not biography, attack, fundraising or event copy.
- `5687859f` (no issue tag). First 20 words: "And, about democracy? We've got to stop this top-down nonsense." This is rhetorical, with no concrete commitment.
- `47094dad` (B5, published in `areas`). First 20 words: "We can protect reproductive freedom and protect public safety. These aren't radical ideas—they're mainstream. But, under Trump's influence, the government". The first sentence states a position. The remainder attacks an opponent ("under Trump's influence, the government has made 'freedom' mean forcing women into childbirth and flooding our neighborhoods with unregulated guns"). The run prints the whole passage as the B5 citation. It is the candidate's own words and attributable, but the attack sentence is not part of the stated position. The Profiler should quote only the first sentence, or attribute the rest explicitly.

Neither `42678db4` nor `5687859f` has an issue tag, so neither appears in the published `areas`.

### 4. Silence recorded, not filled: PASS

The script counted, for every taxonomy sub-issue, how many passages score at least 0.85. "Over threshold" means the issue score is at least 0.85 on any passage. "Published" means the passage also cleared the commitment gate, which is what `areas` contains and what the Profiler would write as `stated_position`.

| Issue | Label | Over threshold | Published | Coverage |
|---|---|---|---|---|
| B2 | Healthcare access and costs | 3 (`861a9584` 0.97, `ad290768` 0.97, `edd1ed3c` 0.97) | 3 | stated |
| B5 | Abortion policy | 3 (`e87468c9` 0.85, `47094dad` 0.96, `ee976211` 0.87) | 1 (`47094dad`) | stated |
| KYV10 | Career, vocational and higher education | 1 (`b5d4b33c` 0.98) | 1 | stated |
| B1 | Economy, inflation, and jobs | 1 (`6069df39` 0.90, gate 0.69) | 0 | 0, `no_stated_position_found` |
| KYV1 | Threats to democratic institutions | 1 (`a5c8bf14` 0.91, gate 0.80) | 0 | 0, `no_stated_position_found` |

All other taxonomy issues have 0 passages over the threshold, and each should be recorded as 0, `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, A7, B3, B4, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

The run did not fill any of these silences. `areas` contains only B2, B5 and KYV10, and `counts.with_issue` = 5 matches the 3 + 1 + 1 published citations. Six policy passages cleared the gate but match no taxonomy issue: `42678db4`, `654f65a5`, `5687859f`, `b98df5b7` (gun laws), `4b7d1f10` (equal rights) and `85dfa9bb` (taxing billionaires). They were left untagged rather than forced onto an issue. Under the constitution they are candidate-tier material, not spine coverage.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment on a taxonomy issue:

- `ee976211` (commitment 0.76; B5 0.87). First 20 words: "• Women's rights and reproductive freedom...protected in federal law". This is a bullet in the "here's what I stand on" list and a plain commitment to codify reproductive rights in federal law. It is the clearest B5 statement on the site, and it misses the gate by 0.09.
- `a5c8bf14` (commitment 0.80; KYV1 0.91). First 20 words: "• Checks and balances rebuilt...so no one man can ever rule again". This is a bullet in the same list and a commitment on KYV1. Because it misses the gate, KYV1 shows `no_stated_position_found`.
- Borderline: `4eb06c46` (commitment 0.50; KYV1 0.56). First 20 words: "• And real accountability...for trump, for Elon, for any politician or executive who thinks". It is in the same list and framed as a commitment, but it is a truncated fragment directed at named people. Both scores are well below threshold.

Considered and not listed, because they are rhetoric or problem description rather than a commitment: `6069df39` (tariffs, B1 0.90), `e87468c9` (B5 0.85), `5db769ff`, `7ebe62e5`, `761f23cb`, `2ebf001f`, `18a105a4`.

Related observation, outside check 5's scope: `85dfa9bb` ("Taxing billionaires...") cleared the gate but scored B1 0.61, so it has no issue tag. This is the only concrete economic commitment on the site.

VERDICT: PASS
