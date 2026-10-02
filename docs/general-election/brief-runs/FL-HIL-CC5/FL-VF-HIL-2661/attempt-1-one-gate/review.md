# Step 3 review: FL-VF-HIL-2661 (Stacy Hahn), FL-HIL-CC5-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (16 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl` (empty), `run-report.txt`, `run.log`, `ingest-report.md`, `meta.tsv`, `attempt-1-keywords/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy when `commitment >= 0.85` (`src/lib/policy-noul.ts:171`), and it is tagged with an issue when that issue's score is `>= 0.85` (`src/lib/news-characterize.ts:164`).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 16 passages in run.json, all 3 `areas` citations and all 16 lines of passages.jsonl are on `www.votestacyhahn.com` (the OFFICIAL_SITE host). No other host. |
| 2 | Quotes verbatim | **PASS** | The 4 `states_policy` passages (`03a7e5d3`, `1b958554`, `8b02e21b`, `823b6a80`) match passages.jsonl byte for byte, checked with a node script. So do all 16 passages and all 3 `areas` citations. |
| 3 | No inferred motive | **PASS** | None of the 4 passages marked as stating a policy is only biography, attack, fundraising or event copy. Each carries a forward commitment ("will prioritize", "committed to", or a PRIORITIES item). |
| 4 | Silence recorded, not filled | **PASS** | B7 2 (`8b02e21b`, `03a7e5d3`), KYV3 1 (`03a7e5d3`). The other 23 issues have 0 and are `no_stated_position_found`. Every `issues` tag matches the scores and the threshold exactly. |
| 5 | Possible misses (information only) | Reported | None. No passage marked as stating no policy plainly states a commitment on a taxonomy issue. Near cases listed below for information. |

## Evidence

### 1. Candidate-controlled sources only: PASS

Hosts parsed from every `url` in run.json (`passages` and `areas`) and passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| www.votestacyhahn.com | 16 | 3 | 16 |

Every passage comes from one page, `https://www.votestacyhahn.com/`. No redirect, third-party or other host appears.

Context (does not affect the check): `ingest.log` says the homepage had 2 links, 0 of which were judged by Jev, 0 policy pages were selected and there is no about page. `links.jsonl` is empty. The corpus is therefore the homepage only (16 passages, 831 words per `ingest-report.md`). `attempt-1-keywords/passages.jsonl` holds the same 16 passages (same ids, urls, headings and text; only `retrieved_at` differs).

### 2. Quotes verbatim: PASS

A node script compared each run.json passage to the passages.jsonl passage with the same `id`, using `Buffer.equals` on the UTF-8 text, and also compared `url` and `heading`. There are no duplicate ids (16 lines, 16 unique ids, 16 run passages, none missing).

| id | bytes | sha256 (first 12) | result |
|---|---|---|---|
| 03a7e5d3 | 529 | 7a7bace4aed2 | identical |
| 1b958554 | 213 | 667642890add | identical |
| 8b02e21b | 224 | 278535aceba8 | identical |
| 823b6a80 | 224 | 1b14c153fefb | identical |

All 12 other passages are identical too. The 3 `areas` citations (KYV3 `03a7e5d3`; B7 `8b02e21b`, `03a7e5d3`) match passages.jsonl byte for byte, and each citation score equals that passage's score for the issue.

Informational, for whoever writes claims from these quotes:
- `823b6a80` carries an undecoded HTML entity: "Responsible Growth &#038; Infrastructure". It is verbatim to passages.jsonl, but a claim should render it as "&" rather than show the entity to voters.
- From `4325e8fb` onward, biography passages carry the heading "PRIORITIES". The heading is inherited from the page layout; those passages are biography, not priorities, and a claim should not describe them as priorities.

### 3. No inferred motive: PASS

The 4 passages marked `states_policy: true`, with first 20 words:

- `03a7e5d3` (commitment 0.98; B7, KYV3): "As County Commissioner, Stacy will prioritize fiscal responsibility and protecting taxpayers, finding efficiencies in government to keep taxes low without". Forward commitment ("will prioritize", "is committed to", "champions").
- `1b958554` (0.98; no tag): "Fiscal Responsibility: Protecting taxpayers by keeping taxes low, cutting wasteful spending, and improving efficiency inside government first so every dollar". A listed campaign priority.
- `8b02e21b` (0.96; B7): "Safer Communities: Supporting law enforcement, strengthening crime prevention, and prioritizing public safety so families feel secure, neighborhoods thrive, and first". A listed campaign priority.
- `823b6a80` (0.93; no tag): "Responsible Growth &#038; Infrastructure: Planning for growth the right way by improving roads and transportation, investing in infrastructure, and protecting". A listed campaign priority.

None is only biography, an attack on an opponent, fundraising or event copy. The site contains no attack, fundraising or event copy among its passages. All biography passages (`e405b26a`, `b26e8ddb`, `4325e8fb`, `c7dee5e8`, `70ae9465`, `e1ca48fe`, `5ae5bdf1`, `b49f9060`, `77ed9f24`, `80bc3d98`, `9bf1d635`, `b3f2e8f3`) are marked `states_policy: false`; the highest commitment among them is 0.72 (`70ae9465`).

`1b958554` and `823b6a80` state a policy but match no taxonomy issue at the threshold (the run report's "2 state a policy the taxonomy has no question for"). Under the constitution they are candidate-tier material (fiscal responsibility / taxes; growth and infrastructure), to be quoted and attributed, not filed under a spine issue.

### 4. Silence recorded, not filled: PASS

Passages with a score `>= 0.85` for each taxonomy issue (all of them also pass the gate):

| Issue | Label | Count | Passages (score) |
|---|---|---|---|
| B7 | Crime policy, policing and courts | 2 | `8b02e21b` (0.97), `03a7e5d3` (0.91) |
| KYV3 | Growth, development and land conservation | 1 | `03a7e5d3` (0.94) |

All other 23 issues (A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8) have 0 passages over the threshold: `no_stated_position_found`.

Script checks: for every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals exactly the set of scores `>= 0.85` on a passage that passes the gate. No mismatches. `counts` (16 passages, 16 asked, 4 states_policy, 2 with_issue, 0 failed) agrees with the passages.

### 5. Possible misses (information only): none

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue. For information, the passages that came nearest, with first 20 words:

- `70ae9465` (commitment 0.72; KYV10 0.70, A6 0.43): "Throughout her career, Stacy has served at every level of the K–20 continuum, including as a school board member, university". It describes past advocacy ("has been a strong advocate for early childhood education, literacy, workforce and career pathways"), not a commitment for this office.
- `c7dee5e8` (commitment 0.65; B1 0.31): "With more than three decades of experience spanning education, workforce development, public policy, and nonprofit leadership, Stacy brings a deep". It states a belief about government ("fiscally responsible, transparent, and accountable"), not a commitment on a taxonomy issue.
- `80bc3d98` (commitment 0.44): "Stacy has served on boards that strengthen Hillsborough County’s cultural, educational, and civic institutions, including ZooTampa, the Tampa Museum of". Past record ("authored policy supporting educational stability for military-connected students").

Also for information: `823b6a80` states a policy and scores KYV3 0.73, below the threshold, so it is untagged. This is reported as a score, not as a suggestion that it covers KYV3.

VERDICT: PASS
