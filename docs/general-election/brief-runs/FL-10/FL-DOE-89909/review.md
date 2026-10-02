# Step 3 review: FL-DOE-89909 (Maxwell Alejandro Frost), FL-10-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (12 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, two gates, threshold 0.85, status complete, created 2026-09-30T01:58:01Z, 12 of 12 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 12 passages are on `www.frostforcongress.com` (4 on `/`, 8 on `/meet-maxwell`). No other host appears. |
| 2 | Quotes verbatim | PASS | The one policy passage, `ed7658fc`, is byte-identical to `passages.jsonl` (376 bytes), and so are its four `areas` citations. All 12 texts, urls and headings match too. |
| 3 | No inferred motive | PASS | `ed7658fc` states a forward commitment ("I will fight to…"). No passage marked as stating a policy is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | B2 1, B4 1, B7 1, B8 1 (all `ed7658fc`). B5 scores over the threshold once (`b4f5879f`), but that passage failed both gates, so B5 counts 0. The other 20 issues are 0. |
| 5 | Possible misses (information only) | none | No passage marked states_policy=false plainly states a commitment on any taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script collected the host of every passage url in `run.json` and of every citation under `areas`. There is one host, `www.frostforcongress.com`, which is the OFFICIAL_SITE host. No redirect was involved.

- `https://www.frostforcongress.com/`: `50be1c50`, `ed7658fc`, `b4f5879f`, `321c7278`
- `https://www.frostforcongress.com/meet-maxwell` (the About page, which Jev chose with about=0.91): `2ca83fd0`, `69490ae3`, `c1f5e9ae`, `59f11e41`, `65d0e2a7`, `9cb5dced`, `354d716f`, `938570aa`

`ingest.log` lists only this site and this About page. The four links Jev judged (`links.jsonl`: `/organize`, `/democracysummer`, `/meet-maxwell`, `/media`) are all on the same host, and none was chosen as a policy page.

### 2. Quotes verbatim

I checked this with `node`, comparing `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 12 ids in each file, all shared.
- `ed7658fc` (states_policy=true) is byte-identical at 376 bytes, and its url and heading match.
- The copies of `ed7658fc` under `areas` (B2, B4, B7, B8) are byte-identical too.
- All 12 passage texts, urls and headings are identical, including the passages the gates excluded.

### 3. No inferred motive

One passage is marked states_policy=true (commitment 0.99, own_commitment 0.98):

- `ed7658fc`, first 20 words: "I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time"

The same passage goes on: "from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis." That is a first-person commitment by the candidate, not biography, an attack, fundraising or event copy. The phrase "our racist criminal justice system" is the candidate's own framing. A brief may quote it verbatim with attribution, but it must not restate it as the project's description.

The run marks no other passage as stating a policy.

### 4. Silence recorded, not filled

Counts are passages with states_policy=true and an issue score ≥ 0.85. Only these passages reach the brief, because `groupByArea` skips passages that fail the gates.

| Issue | Label | Count | Passages / coverage |
|---|---|---|---|
| B2 | Healthcare access and costs | 1 | `ed7658fc` (0.97) |
| B4 | Social Security and Medicare | 1 | `ed7658fc` (0.91) |
| B7 | Crime policy, policing and courts | 1 | `ed7658fc` (0.91) |
| B8 | Climate and environment (national) | 1 | `ed7658fc` (0.95) |
| B5 | Abortion policy | 0 | no_stated_position_found. `b4f5879f` scores 0.94 on B5 but fails the gates (commitment 0.59, own_commitment 0.15), so it is not counted. |
| A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B3, B6, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 | (20 issues) | 0 each | no_stated_position_found |

Label fit on B4, for the founder: the tag comes from the phrase "win Medicare For All", a proposal for healthcare coverage, and B2 already carries it. The quote is verbatim and attributed, so the constitution is not violated. Still, a voter reading B4 as "Social Security and Medicare" might expect a statement about the existing Medicare program.

### 5. Possible misses (information only)

None. None of the 11 passages marked states_policy=false plainly states a commitment by the candidate on a taxonomy issue. For completeness, the passages with the highest scores are past record, and they are correctly excluded from a stated-position bucket:

- `b4f5879f` (B5 0.94, A7 0.73; commitment 0.59, own_commitment 0.15): "I know how to hold power to account. As a National Organizer with the ACLU, I pushed Joe Biden to" (past advocacy, not a commitment by the candidate)
- `65d0e2a7` (B7 0.65; commitment 0.57, own_commitment 0.08): "Been a national leader in the fight to end gun violence and have helped passed major gun legislation that has" (past record)
- `9cb5dced` (A7 0.82, B7 0.77): "Led the ACLU of Florida’s fight to win Amendment 4, which restored voting rights to over 1.6 million Floridians who" (past record)
- `938570aa` (B7 0.78): "Helped secure an unprecedented five billion dollars in funding for community-based violence prevention programs in President Biden’s budget proposal" (past record)

The rest are event copy (`50be1c50`), fundraising (`321c7278`) or biography (`2ca83fd0`, `69490ae3`, `c1f5e9ae`, `59f11e41`, `354d716f`).

## Notes for the founder (not check failures)

- **Thin corpus.** The ingest chose no policy pages (0 of the cap of 8), and Jev judged only 4 of 36 homepage links. The site yielded 12 passages (434 words), so the 20 zeros above record what this crawl saw. They may not show everything the campaign publishes.
- **Stale ingest-report.md.** Its "Step 2: policy run" table describes the earlier one-gate run (`q-b2171346`, 42266 in / 5496 out tokens), which is now in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116` (44762 in / 5748 out). The gate counts are the same (1 states a policy, 1 with an issue).

VERDICT: PASS
