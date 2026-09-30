# Step 3 review: FL-VF-ORA-1384 (Mike Crabb), FL-ORA-CC2-general

Reviewer, acting under the Profiler constitution. Read-only review of the machine run in this directory. No website was fetched; every finding below comes from `passages.jsonl`, `run.json`, `ingest.log` (plus `run-report.txt`, `ingest-report.md` and `src/lib/policy-noul.ts` / `src/lib/news-issues.ts` for context).

- Official site: https://ilikemikecrabb.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 45 asked, 0 failed
- Counts: 45 passages, 12 `states_policy`, 6 of them with a taxonomy issue
- Spine: not yet decided for this race. Check 4 reports every taxonomy issue (tax-7, 25 sub-issues) with at least one passage over the threshold. Check 5 covers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 45 passage urls, and all 9 citations in `areas`, are on host `ilikemikecrabb.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | Script check: all 12 `states_policy` passages match `passages.jsonl` byte for byte on `text`, and also on `url` and `heading`. The 9 `areas` citations match too, and so do all 45 passages. |
| 3 | No inferred motive | **PASS** | None of the 12 `states_policy` passages is only biography, an attack, fundraising or event copy. Each one contains a commitment by the candidate. |
| 4 | Silence recorded, not filled | **PASS** | 4 issues have passages over the threshold: B1 = 3, A2 = 3, KYV3 = 2 (3 by raw score, one below the gate), B7 = 1. The other 21 are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | **3 reported** | 4dbfb5b1 (KYV3), 2539921d (environment / conservation), b806b53f (borderline, a list of priorities). |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

Script output (node, over `run.json`):

```
hosts { 'ilikemikecrabb.com': 45, 'areas:ilikemikecrabb.com': 9 }
```

- By page: `https://ilikemikecrabb.com/` has 25 passages, `/issues` has 11 and `/about` has 9.
- The set of passage ids in `passages.jsonl` (45 unique) is the same as the set in `run.json` (45).
- No redirect is needed or recorded.
- Endorser names appear only as section headings on the candidate's own homepage: Sheriff Mina, West Orange Political Alliance, FOP, Lodge 93 and Firefighters Local 2057. No third-party host was read.

Note (not a failure): for `/about`, `ingest.log` prints "11 passage(s)", but `passages.jsonl` and `ingest-report.md` have 9. The log line is printed per page, before `dedupeAcrossPages` runs (`scripts/candidate-site-ingest.ts:424`). The most likely explanation is that 2 `/about` passages repeated homepage text and were dropped as duplicates. I did not check which 2 were dropped.

### Check 2: quotes verbatim (PASS)

The script compares, for each passage with `verdict.states_policy === true`, `Buffer.from(text)` in `run.json` against the passage with the same id in `passages.jsonl`. It also compares `url` and `heading`.

```
states_policy byte-identical 12 mismatch []
area citations identical 9 mismatch []
all passages identical 45
```

The 12 ids: deb833cb, 78311d86, fd9848d3, 8207c3ac, 6dd940c8, 11bdf44d, e6a6da9b, d4c79a01, 1c7e9102, 23fc3df6, 746e2f4d, c983c2a6.

Five passages contain non-ASCII characters (an em dash or similar): c72c02e9, 5b78d5af, 80554586, fa513ce4, 3bfea22c. None of them is `states_policy`, and all five still compare byte-identical.

### Check 3: no inferred motive (PASS)

Each of the 12 `states_policy` passages contains a commitment or stated position by the candidate. None is only biography, an attack on an opponent, fundraising or event copy.

- deb833cb: "Tackle housing costs, reduce taxes, and attract high-paying jobs." (homepage priority tile)
- 78311d86: "Support first responders, prevent crime, keep families safe." (homepage priority tile)
- fd9848d3: "Mike will work to tackle housing costs, reduce taxes, and attract high-paying jobs so families can afford to live, …"
- 8207c3ac: "Mike supports faster implementation of technology to improve traffic flow, strengthen connectivity, and expand transportation options for residents."
- 6dd940c8: "As a deputy sheriff with decades of experience, Mike understands that safe communities are the foundation of a strong …"
  - This one opens with biography but ends with a commitment: "He will support first responders and work to ensure public safety remains a top priority." It is not only biography.
- 11bdf44d: "Mike believes growth must be managed responsibly. Development should meet the needs of residents, protect existing neighborhoods, improve …"
- e6a6da9b: "Mike will work to protect wildlife, preserve natural resources, and secure grants to convert aging septic systems that …"
- d4c79a01: "Mike Crabb works to make Northwest Orange County more affordable for families by tackling housing costs, reducing taxes, …"
- 1c7e9102: "Mike Crabb supports reducing traffic congestion with better roads, smarter traffic technology, and more transportation options …"
- 23fc3df6: "Mike Crabb supports law enforcement, crime prevention, and safe neighborhoods, drawing on 30 years as an Orange County …"
  - This one has a biographical clause, but the passage states support.
- 746e2f4d: "Mike Crabb supports smart, responsible growth that protects existing neighborhoods and pays for the infrastructure it requires."
- c983c2a6: "Mike Crabb supports protecting the parks, wildlife, watershed, and natural places of District 2 for future generations."

None of the following passages was marked `states_policy`:

- the endorsement copy: 4fb6c80b, e0b9d5aa, ccd1dc82, c72c02e9, 1f756652, 5b78d5af
- the record-of-service tiles: d6ef6486, 188dd13d, f2cdf5f6, 593b9ca5, f1a692db
- the family and biography lines: 7dca1d35, a052beca, 80554586, 27352fd0, 150955e4, fa513ce4, 752d8b21, 7ea9c772, 3bfea22c
- the vote and support copy: 92c7f16b, 7715e0d5
- the event copy: 305f7ab0

### Check 4: silence recorded, not filled (PASS)

A passage "clears the threshold" for an issue when its issue score is at least 0.85. The count used here is the run's own: the passage must also clear the `states_policy` gate (commitment ≥ 0.85), which is what `groupByArea` puts into `areas`. For every passage, the `issues` array agrees with the score ≥ 0.85 rule (script: `issues vs scores mismatch []`).

| Issue | Label | Passages over threshold (gated, in `areas`) | Ids |
|---|---|---|---|
| A2 | Housing affordability | 3 | fd9848d3, d4c79a01, deb833cb |
| B1 | Economy, inflation, and jobs | 3 | fd9848d3, d4c79a01, deb833cb |
| KYV3 | Growth, development and land conservation | 2 | 746e2f4d, 11bdf44d |
| B7 | Crime policy, policing and courts | 1 | 23fc3df6 |

KYV3 by raw score alone is 3. Passage 4dbfb5b1 scores 0.91 on KYV3, but its commitment gate is only 0.73, so the run correctly leaves it out of `areas` (see check 5).

Every other taxonomy issue has **0** passages over the threshold, so each one is `no_stated_position_found`:

- A1, A3, A4, A5, A6, KYV9, KYV10, A7
- B2, B3, B4, B5, B6, KYV1, B8
- KYV2, KYV4, KYV5, KYV6, KYV7, KYV8

The run does not fill any of these silences. `areas` contains only the four issues above, and every citation in it is a gated passage over the threshold.

### Check 5: possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a taxonomy issue.

1. **4dbfb5b1** (homepage, "Smart, Responsible Growth"): "Development that protects neighborhoods and pays for itself."
   - Scores: commitment 0.73, KYV3 0.91.
   - This is the homepage tile for the same position as 11bdf44d / 746e2f4d. It has the same form as the homepage tiles deb833cb and 78311d86, which did clear the gate.
2. **2539921d** (homepage, "Parks & Conservation"): "Protect wildlife, natural resources, and our watershed."
   - Scores: commitment 0.71. No issue is over the threshold (KYV3 0.65, B8 0.55, KYV5 0.32).
   - It is an imperative priority tile on environment / conservation.
3. **b806b53f** (/about, "Meet Commissioner Mike Crabb"): "As Orange County Commissioner for District 2, Mike is focused on what matters most to local families: safe neighborhoods, …"
   - Scores: commitment 0.77 (KYV3 0.83, A2 0.79, A4 0.65).
   - Borderline. It is a list of the candidate's priorities, not a specific commitment.

The following were looked at and not counted as misses:

- 265bfe0a ("Faster traffic technology, better connectivity, more options."): a commitment, but on transportation, which has no taxonomy issue. It would be a candidate-tier issue (see below).
- d6ef6486, f2cdf5f6, 188dd13d and 593b9ca5: they describe past record ("Advocated…", "Championed…", "Secured…", "Worked with…"), not a forward commitment.
- c72c02e9 ("…who will always back the badge") and ccd1dc82 (WOPA): these are the endorsing organizations' words, not the candidate's.

Also for the founder, outside the literal scope of check 5: 6 passages cleared the commitment gate but have no issue over the threshold (the run's "no issue" list). These are not claims about any issue, and I am not suggesting they cover one. Their highest issue scores, as recorded:

- 78311d86: B7 0.80
- 6dd940c8: B7 0.84
- e6a6da9b: A5 0.83
- c983c2a6: KYV3 0.74
- 8207c3ac and 1c7e9102: traffic and transportation, where no taxonomy issue scores above 0.05

Traffic and transportation is a topic the candidate campaigns on. Taxonomy 7 has no sub-issue for it, so under the constitution it would be a candidate-tier issue.

VERDICT: PASS
