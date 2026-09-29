# Step 3 review: FL-VF-HIL-2880 (Jackie Toledo), FL-HIL-CC1-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (45 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `ingest-report.md`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy when `commitment >= 0.85` (`readVerdict` in `src/lib/policy-noul.ts`), and it is tagged with an issue when that issue's score is `>= 0.85` (`applyThreshold` in `src/lib/news-characterize.ts`). A script confirmed that every `states_policy` flag and every `issues` list in run.json follows this rule (0 mismatches).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 45 passages in run.json, and all 5 citations in `areas`, are on `jackietoledo.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | All 7 `states_policy` passages (`28ab0ed8`, `33f94dd4`, `f29ea206`, `32c9d7b4`, `0d4cfb5f`, `1d861287`, `c715d57e`) match passages.jsonl byte for byte. So do all 45 passages (text, url, heading) and all 5 `areas` citations. |
| 3 | No inferred motive | **FAIL** | `28ab0ed8` is a third-party endorsement quote (Blaise Ingoglia), not a commitment by the candidate. `c715d57e` is a line from her past legislative record ("Jackie worked to:"), which is biography. |
| 4 | Silence recorded, not filled | **PASS** | A2 1, KYV3 1, KYV4 1, B7 1, B1 1. The other 20 issues have 0 and are `no_stated_position_found`. B1's only passage is `c715d57e`, which check 3 flags. |
| 5 | Possible misses (information only) | Reported | None. No passage marked as stating no policy plainly states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script parsed the host from every `url` in run.json (`passages` and `areas`) and in passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| jackietoledo.com | 45 | 5 | 45 |

The pages behind those passages are `/` (21), `/issues` (12) and `/meet-jackie-toledo` (12). No other host, redirect or third-party URL appears.

Informational: the host test passes, but the homepage carries an "Endorsements" block whose passages (`bee8e61b`, `28ab0ed8`, `45b8a94b`, `a8d7e84c`, `5f522a16`, `e6e622ed`) are in the voices of third parties (a state CFO and state representatives). They are on the candidate's own domain, so check 1 does not catch them. Check 3 flags the one the run marks as stating a policy.

Informational: `ingest.log` reports 13 passages each for `/issues` and `/meet-jackie-toledo` and gives no count for the homepage. passages.jsonl, run.json and `ingest-report.md` all show 12, 12 and 21, for a total of 45. This does not affect any check. The log's per-page counts and the final per-page counts do not match.

### 2. Quotes verbatim: PASS

A node script compared each run.json passage with the passages.jsonl passage that has the same `id`. It used `Buffer.equals` on the UTF-8 text and also compared url and heading. Neither file has duplicate ids, and both files hold the same 45 ids.

| id | bytes (run / passages) | identical |
|---|---|---|
| 28ab0ed8 | 375 / 375 | yes |
| 33f94dd4 | 187 / 187 | yes |
| f29ea206 | 373 / 373 | yes |
| 32c9d7b4 | 151 / 151 | yes |
| 0d4cfb5f | 320 / 320 | yes |
| 1d861287 | 154 / 154 | yes |
| c715d57e | 46 / 46 | yes |

All 45 passages are identical in text, url and heading, and so are the 5 citations under `areas`.

### 3. No inferred motive: FAIL

These passages are marked `states_policy: true` but hold no commitment by the candidate:

- `28ab0ed8` (`/`, heading "Endorsements", commitment 0.87, no issue tag). First 20 words: "Blaise Ingoglia - Florida CFO Jackie Toledo is exactly the kind of conservative leader Hillsborough County needs. Jackie knows that". This is endorsement copy. The commitments in it ("She will stand up to the big spenders, cut government waste, and deliver tax cuts") are the endorser's words about her, not hers. Constitution items 1 and 3 and the source rules (endorsers are third parties) exclude it from `stated_position`. It has no issue tag, so it reaches no issue under `areas`. It still counts in `counts.states_policy` and would become a candidate-tier claim attributed to the candidate.
- `c715d57e` (`/meet-jackie-toledo`, heading "A Record of Results", commitment 0.88, tagged B1 at 0.87). First 20 words: "Support workforce development and job creation". The passage is a list item under `c2380f3e`, "As a member of the Florida House of Representatives, Jackie worked to:". Read in place, it describes what she did as a state legislator. That is biography, not a stated commitment for this race. The run cut the list item off from its lead-in, and that turned a record into a pledge. This passage is the only B1 citation in `areas`.

The other five `states_policy` passages are forward commitments in the candidate's own framing, all on `/issues`: `33f94dd4` ("Jackie will focus on accelerating transportation improvements…"), `f29ea206` ("…She will work to implement smarter planning…"), `32c9d7b4` ("Jackie will strongly support law enforcement…"), `0d4cfb5f` ("…Jackie will work to ensure transparency and accountability…") and `1d861287` ("Jackie will prioritize infrastructure resilience…").

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, this counts the passages whose score for that issue is at or above 0.85. Only these five issues have any. The same passages appear in `issues` and in `areas`, and every one is also `states_policy: true`. No passage has an issue score at or above 0.85 without also clearing the gate.

| Issue | Label | Passages ≥ 0.85 | ids |
|---|---|---|---|
| A2 | Housing affordability | 1 | `f29ea206` (0.96) |
| KYV3 | Growth, development and land conservation | 1 | `f29ea206` (0.96) |
| KYV4 | Storm resilience and flood protection | 1 | `1d861287` (0.97) |
| B7 | Crime policy, policing and courts | 1 | `32c9d7b4` (0.85, exactly at threshold) |
| B1 | Economy, inflation, and jobs | 1 | `c715d57e` (0.87), flagged in check 3 |

The other 20 issues have 0 passages and are `no_stated_position_found`: A1, A3, A4, A5, A6, A7, B2, B3, B4, B5, B6, B8, KYV1, KYV2, KYV5, KYV6, KYV7, KYV8, KYV9 and KYV10.

Note for the founder: if `c715d57e` is removed under check 3, B1 falls to 0 and becomes `no_stated_position_found`.

Candidate-tier: two passages state a policy that no taxonomy issue covers. They are `33f94dd4` (traffic and transportation) and `0d4cfb5f` (county spending and waste). Under the constitution these are candidate-tier issues for this candidate, and they fill no spine silence.

### 5. Possible misses (information only)

I read all 38 passages that the run marks as stating no policy. None plainly states a commitment by the candidate on a taxonomy issue:

- The passages with the highest commitment scores are `a8d7e84c` (0.70, endorsement by Michael Owen: "leaders who will stand up for taxpayers, support law enforcement, encourage responsible growth") and `0cf9896c` (0.77, "Why I'm Running": "leaders who will ask tough questions, demand accountability…"). The first is a third party's words. The second is the candidate's, but it names no issue commitment.
- `31475cba` ("Secure transportation and infrastructure investments") and `2435145e` ("Fighting for the most vulnerable, including victims of Human Trafficking and those suffering from Mental Health issues") belong to the same past-record list as `c715d57e`, so they are biography.
- `aaf85728`, `09e842e2`, `b8ad8dee` and `daa93a0c` describe problems or priorities (housing and insurance costs, flooding, public safety, growth) and make no commitment.

For information only, outside the taxonomy: `a64a0e26` ("Explore innovative transportation alternatives.", commitment 0.48) is a commitment bullet under "Fix Traffic and Improve Mobility". Transportation is not a taxonomy issue, so this is not a spine miss.

VERDICT: FAIL (check 3)
