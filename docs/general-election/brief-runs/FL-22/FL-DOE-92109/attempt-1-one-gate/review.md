# Step 3 review: FL-DOE-92109 (Casey Askar), FL-22-general

Reviewed: `passages.jsonl`, `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85) and `ingest.log` in this directory. Official site: https://www.caseyaskar.com/. Spine: undecided for this race, so check 4 covers every taxonomy issue in `src/lib/news-issues.ts` (tax-7) and check 5 considers every taxonomy issue.

The corpus is one passage (id `8787d0fc`, 48 words, from the homepage). `run.json` has the same single passage.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | `8787d0fc`: host `www.caseyaskar.com`. There are no other hosts. |
| 2 | Quotes verbatim | PASS | `8787d0fc`: the text in `run.json` is byte-identical to `passages.jsonl` (282 bytes, checked by script). The `areas` citation is identical too. |
| 3 | No inferred motive | PASS | `8787d0fc` states a commitment ("Casey will work with leadership to help slash overburdening taxes and regulations"). |
| 4 | Silence recorded, not filled | PASS | B1 = 1 (`8787d0fc`). The other 24 taxonomy issues = 0, recorded as `no_stated_position_found`. |
| 5 | Possible misses (information only) | PASS | No passage is marked `states_policy: false`, so none can be a miss. |

## Evidence

### 1. Candidate-controlled sources only

I ran a Node script over `run.json` (passages and `areas` citations) and `passages.jsonl`. Every URL parsed to one host: `www.caseyaskar.com`, the OFFICIAL_SITE host. No redirects were needed or recorded. The passage URL in `run.json` also matches the URL of the same id in `passages.jsonl`.

### 2. Quotes verbatim

One passage is marked `states_policy: true`: `8787d0fc`. I compared its `text` as UTF-8 buffers with `Buffer.compare` against the `passages.jsonl` row of the same id, and they are identical (282 bytes). The copy in `areas[economy].subIssues[B1].citations` is also byte-identical. The source typos ("gas pump.Tackling", "hist top priority") are carried through unchanged, which is correct for a verbatim quote.

### 3. No inferred motive

Only one passage is marked as stating a policy:

- `8787d0fc` (first 20 words): "We are all feeling the pressure at the grocery store and at the gas pump.Tackling the rising cost of eggs,"

It is not only biography, an attack, fundraising or event copy. It contains a commitment by the candidate: "In Congress, Casey will work with leadership to help slash overburdening taxes and regulations that are adding to the affordability crisis." Commitment score 0.94.

Note, not a failure: the passage's `heading` is "Darrin Palumbo". That is not a section title, and it does not appear to describe the candidate. It may be a caption or credit that the extractor took as the heading. The Profiler should cite this as the homepage and should not present "Darrin Palumbo" as the section name.

### 4. Silence recorded, not filled (threshold 0.85, every taxonomy issue)

The script recomputed which scores are at or above 0.85 and got `["B1"]`. This matches `verdict.issues`.

| Issue | Passages over threshold | Coverage |
|---|---|---|
| B1 Economy, inflation, and jobs | 1 (`8787d0fc`, 0.94) | stated |
| A1, A2, A3, A4, A5, A6, A7, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9, KYV10 | 0 | no_stated_position_found |

The same passage scored 0.72 on A4 (Cost of living in Florida) and 0.30 on KYV2 (Energy and utilities). Both are below threshold, so both are counted as 0.

### 5. Possible misses

None. `counts.states_policy` is 1 of 1 asked, 0 failed. No passage was marked as stating no policy, so there is nothing to review for misses.

### Coverage note for the founder (not a check)

The corpus is very thin. `ingest.log` says the homepage had 21 links, but "asking Jev about 0 link(s)", "0 policy page(s) selected (cap 8), about page: none". The earlier `attempt-1-keywords` run also produced one passage from one page. It differs from the current `passages.jsonl` only after character 400, which is the `retrieved_at` timestamp. So the 24 zeros above mean nothing was found in one homepage passage. They do not show that the candidate is silent across the site. This is recorded as it stands, and the review does not fill it.

VERDICT: PASS
