# Step 3 review: FL-VF-ORA-1279 (Johanna Lopez), FL-ORA-CC4-general

Reviewer under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` and `ingest.log` in this directory. No site was fetched.

- OFFICIAL_SITE: https://www.votejohannalopez.com/ (host `www.votejohannalopez.com`)
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 21 asked, 0 failed
- Corpus: 21 passages from 2 pages (`/` 12, `/meet-johanna` 9). Ingest chose 0 policy pages; the only page followed was the About page.
- SPINE: undecided for this race, so check 4 covers every taxonomy issue (25 sub-issues, taxonomy v7) and check 5 considers every taxonomy issue.

## Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 21 passage urls are on `www.votejohannalopez.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | 0 passages are marked `states_policy`. A script compared all 21 anyway: text (byte-for-byte), url and heading match `passages.jsonl` for every id, with the same id set on both sides. |
| 3 | No inferred motive | **PASS** | No passage is marked as stating a policy, so none can be biography, attack, fundraising or event copy marked as policy. |
| 4 | Silence recorded, not filled | **PASS** | 0 passages clear the commitment gate, so every taxonomy issue is 0 → `no_stated_position_found`. On raw issue score, one issue has a passage over 0.85: B2, with 1 (`880b673a`), which fails the gate. `run.json` `areas` is empty. |
| 5 | Possible misses (information only) | **None found** | No passage marked "no policy" plainly states a commitment by the candidate on a taxonomy issue. One borderline passage (`880b673a`) is listed below. |

## Evidence

### 1. Hosts

| Host | Passages |
|---|---|
| www.votejohannalopez.com | 21 (ids: all) |

`run.json` `site` = `https://www.votejohannalopez.com`. `ingest.log` shows no redirects and no off-site pages. `links.jsonl` lists only paths on the same host (`/meet-johanna`, `/get-involved`, `/copy-of-vote`, `/news-articles`, `/vote`, `/copy-of-results`).

### 2. Verbatim check (script, not by eye)

Run from this directory with node:

```
const fs=require("fs");const r=JSON.parse(fs.readFileSync("run.json","utf8"));
const P=new Map(fs.readFileSync("passages.jsonl","utf8").trim().split("\n").map(l=>JSON.parse(l)).map(p=>[p.id,p]));
// for every run passage: Buffer.from(p.text).equals(Buffer.from(P.get(p.id).text)), and url/heading equal
```

Output:
- ids in run.json: 21. ids in passages.jsonl: 21. Only in one file: none. Duplicate ids: none.
- Passages with `states_policy: true`: [] (none).
- Text, url or heading mismatches across all 21: [] (none).

Note for the founder (not a failure): the corpus keeps undecoded HTML entities and one zero-width space, byte-for-byte in both files. If any of these were ever quoted to voters they would show up as raw markup:
- `&oacute;` in 76e870ed, f2861ef8, 4f568c6d, 880b673a, d625b018, 8eae6901 (and in every `/meet-johanna` heading and the heading of 6a9771fb)
- `&uuml;`, `&aacute;` in d597804a
- U+200B (zero-width space) at the end of e5d8e695

### 3. Passages marked as stating a policy

None (`counts.states_policy` = 0; highest `commitment` of any passage = 0.72, on 880b673a). There is nothing to check for inferred motive. For the record, the corpus is almost all biography (76e870ed, e5d8e695, 727ecabb, 5f361bf2, bc6a8bab, d597804a, 55a2fb15, 85291df9, f2861ef8, 4f568c6d, e9266b53, 38e587ca, 5f124111, fb7b9892, d625b018, 8eae6901, 880b673a) or volunteer/donate copy (6a9771fb, 187b3cc7, be09cede, 45cf9c3c), and all of it is correctly marked as not stating a policy.

### 4. Count per issue at threshold 0.85

Gate plus issue (the run's definition of a stated position): **0 for all 25 taxonomy issues** (A1–A7, B1–B8, KYV1–KYV10). Every one is recorded as `no_stated_position_found`.

Raw issue score ≥ 0.85, whatever the gate says (the only issue with any passage over the threshold):

| Issue | Label | Passages over 0.85 on issue score | Passages clearing gate + issue | Coverage |
|---|---|---|---|---|
| B2 | Healthcare access and costs | 1 (880b673a, B2 = 0.93, commitment = 0.72) | 0 | no_stated_position_found |

Every other issue has 0 passages over the threshold on either count. The next-highest scores are B3 0.81 (880b673a) and KYV3 0.44 (76e870ed), both below the threshold and neither from a gated passage.

Note on the data (not a failure): 880b673a has `issues: ["B2"]` while `states_policy: false`. `readVerdict` in `src/lib/policy-noul.ts` thresholds the issue scores separately from the gate. The grouping skips any passage that fails the gate, so `areas` is empty and nothing reaches a Position. A downstream reader that uses `issues` without checking `states_policy` would count this as a B2 position. It is not one.

### 5. Possible misses (information for the founder, not a fix)

No plain misses. One borderline passage, which I judge correctly marked:

- **880b673a** (`/meet-johanna`, B2 0.93, B3 0.81, commitment 0.72): "Known for her effectiveness and ability to work across the aisle, Representative L&oacute;pez has championed legislation that protects families, strengthens"
  It describes her record as a state legislator, in the third person and in the past tense ("has championed", "has also successfully passed"). It mentions healthcare access (B2) and immigrant families (B3), but it makes no commitment about what she would do as County Commissioner. Correctly marked as no policy. It is record, not stance.

Also for the founder:
- The repeated heading "Responsible growth that strengthens infrastructure and protects communities" is a campaign slogan that touches KYV3 (growth and development). It sits above eight biography passages on the homepage and is not itself a passage with a commitment. Its passages score KYV3 0.12–0.44.
- Coverage limit: Jev chose no policy page (the highest `policy` link score was 0.16, for `/meet-johanna`). `/vote`, `/news-articles`, `/copy-of-vote` and `/get-involved` were not ingested. On this corpus the zeros are honest. They mean "not found on the pages read", not "the site has no issues page". No passage should be assumed to cover an issue.
- `ingest.log` reports "13 passage(s)" for `/meet-johanna`, but `passages.jsonl` holds 9 from that page (21 total, matching the final line of the log). This looks like cross-page deduplication of repeated footer copy. It does not affect any check.

VERDICT: PASS
