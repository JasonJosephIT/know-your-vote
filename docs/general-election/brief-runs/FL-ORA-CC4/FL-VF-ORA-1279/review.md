# Step 3 review: FL-VF-ORA-1279 (Johanna Lopez), FL-ORA-CC4-general

I reviewed this run under the Profiler constitution. The review was read-only: I read `passages.jsonl`, `run.json` and `ingest.log` in this directory and fetched no site.

- OFFICIAL_SITE: https://www.votejohannalopez.com/ (host `www.votejohannalopez.com`)
- Run: `jev:jev-1.13.0/tax-7/q-e7282116`, created 2026-09-30T01:59:09Z, threshold 0.85, status `complete`, 21 asked, 0 failed. This is the two-gate run: a passage is `states_policy` only when both `commitment` and `own_commitment` are at least 0.85 (`readVerdict` in `src/lib/policy-noul.ts`).
- Corpus: 21 passages from 2 pages (12 from `/`, 9 from `/meet-johanna`). The ingest chose no policy pages. The only page it followed was the About page.
- SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue (25 sub-issues in taxonomy v7, all 25 asked), and check 5 considers every taxonomy issue.

## Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 21 passage URLs are on `www.votejohannalopez.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | No passage is marked `states_policy`. A script compared all 21 anyway: text (byte for byte), URL and heading match `passages.jsonl` for every id, and both files hold the same set of ids. |
| 3 | No inferred motive | **PASS** | No passage is marked as stating a policy, so no biography, attack, fundraising or event copy has been marked as policy. |
| 4 | Silence recorded, not filled | **PASS** | No passage clears the gate, so every taxonomy issue has 0 passages and is recorded as `no_stated_position_found`. On raw issue score, one issue has a passage over 0.85: B2, with 1 passage (`880b673a`). That passage fails both gates. `areas` in `run.json` is empty. |
| 5 | Possible misses (information only) | **None found** | No passage marked "no policy" plainly states a commitment by the candidate on a taxonomy issue. One borderline passage (`880b673a`) is discussed below. |

## Evidence

### 1. Hosts

| Host | Passages |
|---|---|
| www.votejohannalopez.com | 21 (every id) |

In `run.json`, `site` is `https://www.votejohannalopez.com`, and every URL in `passages.jsonl` is on the same host. `ingest.log` shows no redirects and no off-site pages. `links.jsonl` lists only paths on the same host.

### 2. Verbatim check (by script, not by eye)

I ran this with node from this directory:

```
const fs=require("fs");const r=JSON.parse(fs.readFileSync("run.json","utf8"));
const P=new Map(fs.readFileSync("passages.jsonl","utf8").trim().split("\n").map(l=>JSON.parse(l)).map(p=>[p.id,p]));
// for every run passage: Buffer.compare(Buffer.from(p.text), Buffer.from(P.get(p.id).text)) === 0, and url/heading equal
```

Output:
- Ids: 21 in `run.json` and 21 in `passages.jsonl`. No id appears in only one file, and no id is duplicated.
- Passages with `states_policy: true`: none.
- Text, URL or heading mismatches across all 21 passages: none.

A note for the founder (not a failure): both files keep undecoded HTML entities byte for byte. `&oacute;`, `&uuml;` or `&aacute;` appear in the text of 76e870ed, d597804a, f2861ef8, 4f568c6d, 880b673a, d625b018 and 8eae6901, and in the headings. The text of e5d8e695 ends in a U+200B zero-width space. If these passages were ever quoted to voters, the raw markup would show.

### 3. Passages marked as stating a policy

None: `counts.states_policy` is 0. The highest `commitment` of any passage is 0.75 (880b673a). The highest `own_commitment` is 0.16 (76e870ed). So there is nothing to check for inferred motive.

For the record, the corpus is nearly all biography or record:
- Biography or record: 76e870ed, e5d8e695, 727ecabb, 5f361bf2, bc6a8bab, d597804a, 55a2fb15, 85291df9, f2861ef8, 4f568c6d, e9266b53, 38e587ca, 5f124111, fb7b9892, 880b673a, d625b018, 8eae6901.
- Volunteer and donate copy: 6a9771fb, 187b3cc7, be09cede, 45cf9c3c.

The run correctly marks all of it as not stating a policy.

### 4. Count per issue at threshold 0.85

The run defines a stated position as a passage that clears the gate and matches an issue. By that definition, **all 25 taxonomy issues (A1–A7, B1–B8, KYV1–KYV10) have 0 passages**, and each is recorded as `no_stated_position_found`.

Counting raw issue scores of 0.85 or more, whatever the gate says, only one issue has a passage over the threshold:

| Issue | Label | Passages at or over 0.85 on issue score | Passages clearing gate and issue | Coverage |
|---|---|---|---|---|
| B2 | Healthcare access and costs | 1 (880b673a: B2 = 0.92, commitment = 0.75, own_commitment = 0.14) | 0 | no_stated_position_found |

Every other issue has 0 passages over the threshold on either count. The next-highest issue scores are B3 at 0.83 (880b673a) and KYV3 at 0.44 (76e870ed). Both are below the threshold, and neither passage clears the gate.

A note on the data (not a failure): 880b673a has `issues: ["B2"]` but `states_policy: false`. This happens because `readVerdict` in `src/lib/policy-noul.ts` applies the threshold to issue scores separately from the gates. `groupByArea` skips any passage that fails the gate, so `areas` stays empty and nothing reaches a Position. A downstream reader that used `issues` without checking `states_policy` would count this passage as a B2 position. It is not one.

### 5. Possible misses (information for the founder, not a fix)

There are no plain misses. One passage is borderline, and I judge it correctly marked:

- **880b673a** (`/meet-johanna`; B2 0.92, B3 0.83; commitment 0.75, own_commitment 0.14). First 20 words: "Known for her effectiveness and ability to work across the aisle, Representative L&oacute;pez has championed legislation that protects families, strengthens"
  The passage describes her record as a state legislator. It is written in the third person and the past tense ("has championed", "has also successfully passed"). It names healthcare access (B2) and immigrant families (B3). It makes no commitment about what she would do as County Commissioner. It is her record, not a stance, and the run correctly marks it as stating no policy. The low own_commitment score (0.14) reflects this.

Three more notes for the founder:
- **A slogan used as a heading.** The heading "Responsible growth that strengthens infrastructure and protects communities" is a campaign slogan that touches KYV3 (growth and development). It sits above eight biography passages on the homepage, and it is not itself a passage with a commitment. Those eight passages score between 0.12 and 0.44 on KYV3.
- **Coverage is limited.** Jev chose no policy page: the highest `policy` link score was 0.16, for `/meet-johanna`. The pages `/vote`, `/news-articles`, `/copy-of-vote` and `/get-involved` were not ingested. On this corpus the zeros are honest, but they mean "not found on the pages read". They do not mean "the site has no issues page". No passage should be assumed to cover an issue.
- **Minor log inconsistencies** (these affect no check):
  - `ingest.log` reports "13 passage(s)" for `/meet-johanna`, but `passages.jsonl` holds 9 from that page. The total of 21 matches the log's final line.
  - `ingest-report.md` still quotes the earlier run's provenance and token counts (`q-b2171346`, 74021 in / 9618 out). The current run's values are `q-e7282116` and 78389 in / 10059 out.

VERDICT: PASS
