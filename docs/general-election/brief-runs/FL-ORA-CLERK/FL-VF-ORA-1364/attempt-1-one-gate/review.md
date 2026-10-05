# Step 3 review: FL-VF-ORA-1364 (Terrell Thomas), FL-ORA-CLERK-general

Reviewed 2026-09-29 against `passages.jsonl`, `run.json` and `ingest.log` in this directory. Run provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 43 of 43 passages asked, 0 failed. The site was not fetched again for this review. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues, the same 25 listed in `run.json` `question_ids`).

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS**. All 43 passages are on `thomasforclerk.com` (23 on `/`, 20 on `/meet-terrell`). No other host appears. Two passages carry third-party text on that host; neither is marked as stating a policy. |
| 2 | Quotes verbatim | **PASS**. The 3 `states_policy` passages (`224fe4f4`, `43631cf2`, `b17f6838`) are byte-identical to `passages.jsonl`, and so are all 43 passages. `areas` is empty. |
| 3 | No inferred motive | **PASS**. All 3 gated passages are forward commitments in the campaign's own voice ("We will…"). None is only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS**. 0 passages clear the threshold for any of the 25 taxonomy issues, gated or raw. The highest issue score anywhere is 0.19. `areas` is empty, so no gap was filled. |
| 5 | Possible misses | **PASS** (this check only informs). 0 possible misses on a taxonomy issue. One near-gate passage (`fae3cce0`, commitment 0.84) is noted. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A Node script (`new URL(url).host`) went over every `run.json` passage. It found one host, `thomasforclerk.com`: 23 passages on `https://thomasforclerk.com/` and 20 on `https://thomasforclerk.com/meet-terrell`. `passages.jsonl` has the same host and URLs and 43 lines. `run.json` `site` is `https://thomasforclerk.com`. No redirect off the OFFICIAL_SITE host appears in `ingest.log`, so there was none to document.

A note on `ingest.log`. It lists `/vision` (2 passages) and `/meet-terrell` (22 passages) and a total of 43, but neither `passages.jsonl` nor `run.json` has any passage with a `/vision` url, and `/meet-terrell` has 20. The per-page counts in the log are taken before `dedupeAcrossPages` (`src/lib/candidate-site.ts`), which drops text repeated across pages and keeps the first occurrence in fetch order. 23 + 2 + 22 = 47, and 47 - 4 = 43, so 4 passages were dropped as repeats of earlier text: both from `/vision` and 2 from `/meet-terrell`. This is what the code does, not a host problem. The review did not fetch `/vision` to see which text was repeated.

The check passes on host. But two passages on the host are not the campaign's own words:

- `64a7c0fc`, heading "Read Repps's Endorsement": "“As the former Chief Information Officer for". It is a cut-off endorsement quote from a third party.
- `6314e407`, heading "Terrell Thomas says experience, relationships and legacy prepare him to lead the Orange County Clerk's Office": "Orange County Clerk of Courts candidate Terrell Thomas says his campaign is rooted in legacy, leadership and a vision he calls "Clerk Forward."" It reads as a news story excerpt shown on the homepage. The passage does not name the outlet.

Neither is marked `states_policy: true` (commitment 0.05 and 0.09), so neither can become a claim. If a later run gates either one, that would be third-party framing, not the candidate's self-portrait.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` line with the same id. It compared `text` as UTF-8 bytes (`Buffer.equals`) and also compared `url` and `heading`.

- 3 passages have `states_policy: true`: `224fe4f4` (346 bytes), `43631cf2` (351 bytes) and `b17f6838` (335 bytes). None differs in text, url or heading.
- All 43 passages match, not only those three. No id is in one file and not the other, and all 43 ids are unique.
- `run.json` `areas` is `[]`, so there are no citations to compare.

### 3. No inferred motive: PASS

Three passages are marked as stating a policy. All three are on the homepage and none is tagged with a taxonomy issue (`issues: []`).

- `224fe4f4` (commitment 0.91), heading "People First": "Our people are our greatest strength. We will invest in employees, develop leaders, and foster a culture that empowers every"
- `43631cf2` (commitment 0.96), heading "Community Focused": "The Clerk's Office should be more than a place people visit- it should be an active partner throughout Orange County."
- `b17f6838` (commitment 0.91), heading "Future Ready": "Preparing for tomorrow requires thoughtful leadership and responsible stewardship. We will embrace modern technology, cybersecurity, continuous improvement, and fiscal responsibility"

Each one states what the campaign will do in the office: invest in and develop employees; expand outreach, strengthen partnerships and improve accessibility; adopt modern technology and cybersecurity and practice fiscal responsibility. That is a commitment in the candidate's own framing. None is biography, and none names or attacks an opponent. None asks for money or promotes an event.

Limits on what a claim built on these may say:

- The commitments are general. A claim should quote or closely paraphrase them, for example "The campaign website states: 'We will expand outreach, strengthen partnerships, improve accessibility…'". It should not add targets, programs or figures the passages do not give.
- "Our people are our greatest strength" and "build lasting public trust" are framing, not positions. Any use should be quoted and attributed.
- None matches a taxonomy issue, so under the constitution these belong to candidate-tier issues for this candidate only (for example office workforce, public outreach and access, and court technology). They must not be placed under a spine issue they do not name.

The passages marked `states_policy: false` include the biography on both pages (for example `7a015d52`, `bc390de8`, `352cb48d`, `7af544c3`), the fundraising and volunteer copy (`87e845e7`, `4244af4b`), the event copy (`f36d7778`), the navigation and address lines (`53f80485`, `22d95858`) and the two third-party passages from check 1. All were correctly kept out of the gate.

### 4. Silence recorded, not filled: PASS

Counts were computed by a script over `verdict.scores[issue] >= 0.85`, for all 25 issues in `run.json` `question_ids`:

- **Gated**: the passage cleared the threshold for the issue and `states_policy` is true. These are the only passages that reach `areas`.
- **Raw**: the passage cleared the threshold for the issue, whether or not it cleared the gate.

No taxonomy issue has at least one passage over the threshold, so the table the header asks for has no rows. Every issue is **0** gated and **0** raw:

A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8.

If any of them joins the spine, the Position is `coverage="no_stated_position_found"`. `run.json` has `counts.with_issue: 0`, no passage has a non-empty `issues` list, and `areas` is `[]`, so the run filled no gap. `run-report.txt` says the same: "No passage cleared both the commitment gate and an issue question."

For the record, the highest issue score on any passage is B1 0.19 (`224fe4f4`). The next are B7 0.17 (`cee7c8ef`), KYV10 0.12 (`224fe4f4`) and A7 0.12 (`43631cf2`). All are far below 0.85.

The zeros cover the pages that were read and nothing else: the homepage and `/meet-terrell`, plus `/vision`, whose text was dropped as repeated. Jev judged 2 of 65 homepage links and chose 1 policy page (`/vision`, 0.62) and 1 about page (`/meet-terrell`, 0.79) (`links.jsonl`, `ingest-report.md`). This is a Clerk of Court race, and the taxonomy's issues are policy subjects that a clerk candidate's operations platform may not touch. This review makes no assumption about pages that were not read.

### 5. Possible misses (for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue. Count: **0**.

Noted, but not misses on a taxonomy issue:

- `fae3cce0` (commitment 0.84, just under the 0.85 gate; top issue B1 0.14), `/meet-terrell`, heading "Why I'm Running": "I believe we can honor the proud legacy of this office while embracing innovation, investing in our employees, strengthening community". It repeats the three homepage commitments in first person. It names no taxonomy issue. At most it would add a second source to the candidate-tier material in check 3.
- `39623571` (commitment 0.20): "That same mindset will guide every decision I make as your Orange County Clerk of Court." It commits to an approach, not to a position on any issue.
- `cee7c8ef` (commitment 0.05, B7 0.17): "Those years gave me a deep appreciation for the important role the Clerk's Office plays in supporting our courts, safeguarding". It describes the office's role, not a commitment on court policy (B7).

VERDICT: PASS
