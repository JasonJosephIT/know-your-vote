# Step 3 review: FL-DOE-89909 (Maxwell Alejandro Frost), FL-10-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (12 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 12 of 12 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 12 passages on `www.frostforcongress.com` (4 on `/`, 8 on `/meet-maxwell`). No other host. |
| 2 | Quotes verbatim | PASS | The one policy passage, `ed7658fc`, is byte-identical to `passages.jsonl` (376 bytes); so are all 12 texts, urls and headings. |
| 3 | No inferred motive | PASS | `ed7658fc` states a forward commitment ("I will fight to…"). No passage marked as stating a policy is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | B2 1, B4 1, B7 1, B8 1 (all `ed7658fc`). B5 has 1 score over the threshold (`b4f5879f`), but it failed the gate, so it counts 0. The other 21 issues are 0. |
| 5 | Possible misses (information only) | none | No passage marked states_policy=false states a forward commitment on any taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only

A script over `run.json` found exactly one host in the passage urls: `www.frostforcongress.com`, the OFFICIAL_SITE host. No redirect was involved.

- `https://www.frostforcongress.com/`: `50be1c50`, `ed7658fc`, `b4f5879f`, `321c7278`
- `https://www.frostforcongress.com/meet-maxwell` (About page, chosen by Jev at about=0.91): `2ca83fd0`, `69490ae3`, `c1f5e9ae`, `59f11e41`, `65d0e2a7`, `9cb5dced`, `354d716f`, `938570aa`

`ingest.log` records only this site and this About page. The four links Jev judged (`links.jsonl`) are all on the same host, and none was chosen as a policy page.

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text, "utf8")` in each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 12 in `run.json`, 12 in `passages.jsonl`, all shared.
- `ed7658fc` (states_policy=true) is byte-identical, and so are its url and heading.
- All 12 passage texts are identical, including the ones gated out.
- Every citation in `run.json.areas` (B2, B4, B7, B8) points to `ed7658fc`, and its text matches `passages.jsonl` exactly. (`run-report.txt` shortens the quote with "…" for display only. The run file holds the full text.)

### 3. No inferred motive

Only one passage is marked as stating a policy:

- `ed7658fc` (commitment 0.99), first 20 words: "I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time for". The passage goes on to say "from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis." That is a commitment in the candidate's own words, not biography, attack, fundraising or event copy.

Fundraising (`321c7278`), event and volunteer copy (`50be1c50`), and biography (`2ca83fd0`, `69490ae3`, `c1f5e9ae`, `59f11e41`) were all gated out with commitment between 0.02 and 0.05.

Notes for writing the claim (not failures):
- "our racist criminal justice system" is the candidate's own wording. It should appear only as a quote attributed to the campaign ("The campaign website states…"), never restated in our voice.
- The B4 tag (Social Security and Medicare, 0.91) rests only on the words "win Medicare For All". B2 (Healthcare access and costs, 0.97) is tagged from the same words.

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. These are the taxonomy issues where at least one passage scored over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| B2 | Healthcare access and costs | 1 (`ed7658fc`, 0.97) | stated |
| B4 | Social Security and Medicare | 1 (`ed7658fc`, 0.91) | stated |
| B7 | Crime policy, policing and courts | 1 (`ed7658fc`, 0.92) | stated |
| B8 | Climate and environment (national) | 1 (`ed7658fc`, 0.95) | stated |
| B5 | Abortion policy | 0 (`b4f5879f` scored 0.94 on B5 but failed the gate at commitment 0.65, so it is not a stated position) | no_stated_position_found |

The other 20 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B3, B6, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

On scope: the crawl read only the homepage and the About page. It selected 0 policy pages, because none of the 4 judged links scored ≥ 0.5 as policy. These silences therefore cover those two pages only.

### 5. Possible misses (information for the founder, not a fix)

None. I read all 11 passages marked states_policy=false. None states a forward commitment by the candidate on any taxonomy issue. The ones with any issue score ≥ 0.5 all describe past record or biography, not a commitment:

- `b4f5879f` (commitment 0.65; B5 0.94, A7 0.74, B7 0.53): "I know how to hold power to account. As a National Organizer with the ACLU, I pushed Joe Biden to agree to". Past actions only.
- `65d0e2a7` (0.55; B7 0.61): "Been a national leader in the fight to end gun violence and have helped passed major gun legislation that has saved". Past actions only.
- `9cb5dced` (0.17; A7 0.84, B7 0.76): "Led the ACLU of Florida’s fight to win Amendment 4, which restored voting rights to over 1.6 million Floridians who". Past actions only.
- `938570aa` (0.21; B7 0.77): "Helped secure an unprecedented five billion dollars in funding for community-based violence prevention programs in President Biden’s budget proposal". Past actions only.

VERDICT: PASS
