# Step 3 review: FL-DOE-92013 (Joey Mendoza Atkins), FL-AGR-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (2 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 2 of 2 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | Both passages (`0462c809`, `8587887c`) are on `www.joeyforflorida.com/`. No other host. |
| 2 | Quotes verbatim | PASS | No passage is marked as stating a policy, so nothing is quoted as policy. As a check, both texts, urls and headings are byte-identical to `passages.jsonl`. |
| 3 | No inferred motive | PASS | 0 passages are marked states_policy=true. The attack and fundraising copy (`0462c809`, `8587887c`) was gated out. |
| 4 | Silence recorded, not filled | PASS | Every issue counts 0 and is recorded as no_stated_position_found. A4 and B1 each have 1 score over the threshold (`0462c809`), but that passage failed the gate, so both count 0. |
| 5 | Possible misses (information only) | none | `0462c809` describes costs and attacks the opponent. It makes no commitment. |

## Evidence

### 1. Candidate-controlled sources only

A script over `run.json` found exactly one host in the passage urls: `www.joeyforflorida.com`, the OFFICIAL_SITE host. No redirect was involved.

- `https://www.joeyforflorida.com/`: `0462c809`, `8587887c`

`ingest.log` records only this site. Jev judged 0 of the 44 homepage links (`links.jsonl` is empty), so no policy page and no About page were chosen. The run read the homepage only.

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text)` in each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 2 in `run.json` and 2 in `passages.jsonl`, and both ids appear in each file.
- No passage has states_policy=true, and `run.json.areas` is empty. No policy quote exists to mismatch.
- Both texts are identical anyway (`0462c809` is 692 bytes), and so are their urls and headings.

### 3. No inferred motive

No passage is marked as stating a policy (`counts.states_policy` = 0), so no passage is wrongly promoted. The two passages the gate held back are the kinds this check guards against:

- `0462c809` (commitment 0.43): an attack on the opponent plus a description of costs.
- `8587887c` (commitment 0.03), "Your contributions help us reach more voters.": fundraising copy.

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. These are the taxonomy issues where at least one passage scored over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A4 | Cost of living in Florida | 0 (`0462c809` scored 0.96 on A4 but failed the gate at commitment 0.43) | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 (`0462c809` scored 0.86 on B1 but failed the gate at commitment 0.43) | no_stated_position_found |

In `run.json`, `0462c809` carries `issues: ["A4", "B1"]` even though its `states_policy` is false. `applyThreshold` tags issue scores separately from the gate. `groupByArea` skips the passage, so `areas` is empty, and that is correct. A reader of the raw file should not read those tags as stated positions.

The other 23 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A2, A3, A5, A6, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

On scope: this corpus is thin, with 2 passages (121 words) from the homepage alone. The link step selected 0 policy pages and found no About page. These silences cover that one page only, not the whole site.

### 5. Possible misses (information for the founder, not a fix)

None. I read both passages marked states_policy=false.

- `0462c809` (commitment 0.43; A4 0.96, B1 0.86, KYV3 0.79, KYV2 0.70), first 20 words: "The Ag and Consumer Commissioner affects everyday Floridians in so many ways they don’t realize, from food prices to farm". The text describes rising costs and says the opponent "has played a key role in driving up all of those costs." It contains no "I will" or other commitment by the candidate. The only commitment-shaped words are in the heading, "Make Florida More Affordable". That is a slogan, it is not in the passage text, and it names no policy, so it is not a plain miss. When the brief is written, the attack wording ("corrupt multimillionaire politician", "Wilt rakes in millions") may appear only as an attributed quote, never in our voice. It does not support a stated_position claim.
- `8587887c` (commitment 0.03): fundraising thank-you. No issue content.

None of the 44 homepage links was judged by Jev (see `ingest.log`: "asking Jev about 0 link(s)"). The site may state positions on pages this run did not read.

VERDICT: PASS
