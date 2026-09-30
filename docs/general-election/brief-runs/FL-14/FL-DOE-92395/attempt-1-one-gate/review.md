# Step 3 review: FL-DOE-92395 (Brian Lambert, FL-14-general)

Reviewer run on 2026-09-29, read-only, against the files in this directory:
`passages.jsonl` (171 passages), `run.json` (schema `kyv.policy-run/1`, status `complete`,
model `jev-1.13.0`, taxonomy v7, threshold 0.85, provenance `jev:jev-1.13.0/tax-7/q-b2171346`,
171 asked, 51 `states_policy`, 0 failed) and `ingest.log`.

SPINE is undecided for this race, so check 4 covers every taxonomy issue in
`src/lib/news-issues.ts` (the 25 question ids in `run.json`), and check 5 considers every
taxonomy issue.

All checks were run with a node script (in the reviewer's scratchpad, not committed) that loads
both files and compares them. It also confirmed the run is internally consistent:
`states_policy` equals `commitment >= 0.85` on all 171 passages, and each passage's `issues`
array is exactly the issue scores at or above 0.85. `areas` (the published findings) contains
only passages with `states_policy: true`.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS (with 2 borderline notes) |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | Reported: 7 passages |

## 1. Candidate-controlled sources only: PASS

- Every one of the 171 passage URLs in `run.json` has host `www.brianlambertforcongress.com`,
  the OFFICIAL_SITE host. The same holds for all 171 rows of `passages.jsonl` and all 10 rows of
  `links.jsonl`.
- `ingest.log` shows the site root plus 8 selected pages, all on that host, with no redirect to
  another host: `/`, `/issues/fiscal-responsibility`, `/issues/veterans`, `/issues/election-integrity`,
  `/issues/constitutional-government`, `/issues/individual-liberty`, `/issues`, `/why-libertarian`,
  and `/about-brian`.
- Other hosts: none.

## 2. Quotes verbatim: PASS

- The script compared the UTF-8 bytes (`Buffer.compare`) of each of the 51 passages with
  `states_policy: true` against the passage with the same id in `passages.jsonl`. It found
  0 mismatches in `text`, and also 0 in `url` and `heading`. None of the ids were missing.
- The same comparison over all 171 passages also found 0 text mismatches. `passages.jsonl` has
  no duplicate ids.

## 3. No inferred motive: PASS

None of the 51 `states_policy` passages is only biography, an attack on a named opponent,
fundraising, or event copy. The fundraising, volunteer, contact and Navy-biography passages all
scored low on commitment and are marked `states_policy: false` (for example 8ee13c84, 41d057ac,
cabb118d, d06d7716, 75a36d60, 4ce4c963, 318a9625, e17e1cd0, aa36455a). No passage names or
attacks an opponent. The criticism of "Washington" is generic.

Two borderline passages are listed for the founder. Neither is counted as a failure, because
each contains a stated goal or pledge by the candidate:

- **beeed4a9** (`/about-brian`, "A Life of Service", commitment 0.86, no issue tag): "Today I'm
  running for Congress because I believe government exists to serve the American people—not the
  other way around. My goal isn't…" This is bio-page copy. Its only commitment is a general goal
  ("restore constitutional government, protect individual liberty, and return power to the
  people").
- **e062a159** (`/`, "Citizen Legislator", commitment 0.90, no issue tag): "Congress should be
  filled with citizens who serve for a time—not politicians who build lifelong careers in
  Washington. I will…" This is self-description framed as a pledge ("I will serve, remain
  accountable, and come home").

## 4. Silence recorded, not filled: PASS

"Clears" means an issue score of 0.85 or more. The **Cited** column counts only the passages that
also have `states_policy: true`, which are the ones that reach `areas` and `run-report.txt`.

| Issue | Label | Clears | Cited | Passage ids (cited in **bold**) |
|---|---|---|---|---|
| A7 | Elections administration and voting access | 9 | 5 | **4abcfde7, ee144dfb, 47e0db33, 21eef4db, 169c8bc1**, c2f61637, 9eb3d8e8, 693abc45, 89da380d |
| B6 | Election integrity | 12 | 5 | **4abcfde7, ee144dfb, 4e07f0e7, 47e0db33, 169c8bc1**, e8a08e79, c2f61637, b9c19f89, 9eb3d8e8, 693abc45, 89da380d, 598ea509 |
| B1 | Economy, inflation, and jobs | 4 | 2 | **7000e360, c5cb4c19**, 2a424cdd, 3631c60a |
| B2 | Healthcare access and costs | 2 | 2 | **93876ec1, fdf3227a** |
| KYV2 | Energy and utilities | 2 | 0 | 4582445b, 69d1c80d (neither clears the commitment gate) |
| B3 | Immigration and border enforcement | 1 | 1 | **f3796b4c** |
| KYV1 | Threats to democratic institutions | 1 | 1 | **362df6e6** |

These 18 issues have 0 passages over the threshold and are `no_stated_position_found`:
A1, A2, A3, A4, A5, A6, KYV9, KYV10, B4, B5, B7, B8, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

KYV2 has 0 cited passages. The run correctly leaves it out of `areas`, so in the run's output it
is also `no_stated_position_found`, even though two passages clear the issue score. (See check 5.)

No issue with zero cleared passages appears in `areas`, and no passage below the threshold was
attached to any issue. Silence is recorded, not filled.

## 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but each plainly states a position on a
taxonomy issue.

| Id | Page / heading | Commitment | Issue score | First 20 words |
|---|---|---|---|---|
| 69d1c80d | `/issues` / Energy & American Independence | 0.43 | KYV2 0.92 | "Reliable, affordable energy strengthens our economy, protects national security, and reduces dependence on foreign adversaries." |
| 4582445b | `/issues/fiscal-responsibility` / Energy Independence | 0.58 | KYV2 0.92 | "Affordable, reliable American energy strengthens families, businesses, and national security." |
| 598ea509 | `/issues` / Election Integrity | 0.82 | B6 0.89 | "Restore confidence through transparency, accountability, and secure elections." |
| 9eb3d8e8 | `/issues/election-integrity` / Protect Every Legal Vote | 0.83 | A7 0.96, B6 | "Every eligible citizen should be able to vote, and every legal vote should be counted accurately." |
| 693abc45 | `/issues/election-integrity` / Bottom Line | 0.83 | A7 0.96, B6 | "Our elections should leave Americans with confidence—not doubt. Every eligible citizen deserves the opportunity to vote, and every legal vote deserves…" |
| 89da380d | `/issues/election-integrity` / Individual Liberty | 0.69 | A7 0.93, B6 | "Every eligible citizen deserves a secure vote and confidence that their voice will be heard." |
| f290c422 | `/issues/veterans` / Healthcare Reform | 0.72 | B2 0.80 | "Veterans and their families deserve timely care, real choices, and a healthcare system focused on patients." |

Notes:

- **Energy (KYV2) is the gap that matters.** The candidate lists "Energy & American Independence"
  as one of their headline issues on `/issues` (69d1c80d). The other headline entries on that
  page were each marked `states_policy`, for example abf2ecdb, f3796b4c, fdf3227a and c5cb4c19.
  As the run stands, no energy position is cited.
- **598ea509** is the "Election Integrity" headline entry on `/issues` and was missed the same way.
  Election issues still have 5 cited passages, so nothing is lost there.
- Weaker candidates were left out of the table because they are framing or description, not a
  commitment: 2a424cdd (B1 0.86, a debt and inflation description), 3631c60a (B1 0.97, "I
  believe inflation is a hidden tax…"), c2f61637, e8a08e79 and b9c19f89 (election framing),
  and c3f64869 (veterans' mental health, B2 only 0.24).
- A related tagging observation, outside check 5's scope: some passages are marked
  `states_policy: true` but carry no issue tag, even though they touch a taxonomy issue:
  - Education: 1f50f5a5 (A6 0.39).
  - Healthcare: 3cedc60a (B2 0.20) and 2c82bbbe (B2 0.71).
  - Taxes and economy: 2b0b9a59, 3c24523a and abf2ecdb (B1 0.36–0.48).

  They are cited under no issue. The other untagged `states_policy` passages are on fiscal,
  constitutional, liberty, Second Amendment, veterans and defense topics. These are
  candidate-tier issues with no taxonomy question.

VERDICT: PASS
