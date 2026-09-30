# Step 3 review: FL-VF-DAD-3076 (Linda Cothiere), FL-DAD-SB1-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (122 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 122 of 122 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 122 passages on `lindaforschoolboard.com` (53 on `/`, 61 on `/es`, 8 on `/meet-linda`). No other host. |
| 2 | Quotes verbatim | PASS | All 29 states_policy passages are byte-identical to `passages.jsonl`, and so are their urls and headings. The same holds for all 122 passage texts. |
| 3 | No inferred motive | FAIL | `97fe70d3` and `d447b3b6` are quotes from the United Teachers of Dade endorsement letter (the union's words, not the candidate's). `7f1638ac` is a video end card that lists four pillar titles plus the site URL and states no commitment. All three are tagged A6. |
| 4 | Silence recorded, not filled | PASS | A6 has 12 passages (3 of them are the check-3 passages). B1 has 1 (`932f22b6`). The other 23 issues have 0 and are recorded as no_stated_position_found. |
| 5 | Possible misses (information only) | none on a taxonomy issue | No passage marked states_policy=false plainly states a commitment on a taxonomy issue. Two gated-out commitments sit outside the taxonomy (`e74cbacb`, `618c42f9`), and one slogan is borderline (`9fb3060d`). |

## Evidence

### 1. Candidate-controlled sources only

A node script over `run.json` found exactly one host in the passage urls: `lindaforschoolboard.com`, the OFFICIAL_SITE host. `passages.jsonl` has the same single host. No redirect was involved.

- `https://lindaforschoolboard.com/`: 53 passages (homepage; the ingest always reads it, and it is not logged per page).
- `https://lindaforschoolboard.com/es`: 61 passages. This is the site's own Spanish version, chosen by Jev at policy=0.50.
- `https://lindaforschoolboard.com/meet-linda`: 8 passages. This is the About page, chosen at about=0.58.

`ingest.log` shows 67 passages for `/es` and 10 for `/meet-linda`. Those are counts before `dedupeAcrossPages`. After it, the file has 61 and 8, and 53 + 61 + 8 = 122, which matches the final line of the log. All 6 links Jev judged (`links.jsonl`) are on the same host.

Note: the United Teachers of Dade letter (`fcfac758`, `97fe70d3` and neighbors) is reproduced on the candidate's own domain. That is a candidate-controlled source, so it passes this check. The letter's voice is third-party, so it matters for check 3.

### 2. Quotes verbatim

Checked with `node`. The script compares `Buffer.from(text, "utf8")` in each `run.json` passage against the passage with the same id in `passages.jsonl`.

- Id sets match: 122 in `run.json`, 122 in `passages.jsonl`, all shared, no duplicate ids.
- All 29 passages with states_policy=true are byte-identical in text, url and heading.
- All 122 texts are identical, including the gated-out ones.
- Internal consistency: for every passage, `states_policy` equals `commitment ≥ 0.85`. For every states_policy passage, `issues` equals the set of scores ≥ 0.85.

(`run-report.txt` shortens one quote with "…" for display, and prints the issue score rather than the commitment score. `run.json` holds the full text.)

### 3. No inferred motive

29 passages are marked as stating a policy. 26 of them are numbered platform planks or pillar summaries that the campaign writes in its own voice, in English and Spanish (e.g. `9b3b5641` "Audit district-mandated paperwork…", `f2b8783d` "Require genuine parent notice and input…", `0c135834` "Fight in Tallahassee for a real state investment in teacher salaries…"). These are commitments. Three are not the candidate's commitments:

- `97fe70d3` (commitment 0.89; A6 0.89), homepage, section "Endorsed by United Teachers of Dade.". First 20 words: "“We know that you will make a difference on the Miami-Dade County School Board by … blocking attempts to privatize". This is a pull quote from the UTD president's endorsement letter (full letter text in `fcfac758`). It is the union's expectation, not a commitment by the candidate. Filing it as stated_position with attributed=true would attribute the union's words to the candidate.
- `d447b3b6` (commitment 0.88; A6 0.87), `/es`, section "Respaldada por United Teachers of Dade.". First 20 words: "“Sabemos que usted marcará la diferencia en la Junta Escolar del Condado Miami-Dade al … bloquear los intentos de privatizar". This is the Spanish version of the same endorsement pull quote, with the same problem.
- `7f1638ac` (commitment 0.86; A6 0.89), `/meet-linda`, section "Endorsed by United Teachers of Dade". First 20 words: "Four pillars. Empower teachers Safe & modern campuses Parents as partners Pay & keep great teachers Learn more at LindaForSchoolBoard.com". This is video end-card promo copy. It gives pillar titles and a URL and no commitment. It cleared the gate by 0.01.

Biography (`8b078d78`, `6f031e49`, `5d4467da`, …), fundraising (`d7b575e0`, `6fddc62e`…`1c337130`, `bd54d003`…`112c7eef`), event and voting copy (`d68cdf6b`, `87ed9904`, `f5f38dfa`…`78aa21d2`, `47bcfab1`), and the rest of the endorsement letter were all gated out.

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. These are the taxonomy issues where at least one passage scored over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A6 | Public school funding and teachers | 12: `cde79f96`, `bbafd7d3`, `9f1c9628`, `0c135834`, `46563534`, `932f22b6`, `c5f119d3`, `d184a43e`, `3963a59b`, `97fe70d3`, `d447b3b6`, `7f1638ac` | stated |
| B1 | Economy, inflation, and jobs | 1: `932f22b6` (B1 0.86) | stated |

Two more passages score ≥ 0.85 on A6 but failed the gate, so they count 0: `fcfac758` (A6 0.98, commitment 0.79; the UTD letter body) and `a1bb0124` (A6 0.89, commitment 0.65; the slogan «Cuando gana el maestro, gana el estudiante.»).

The other 23 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A2, A3, A4, A5, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

Notes on the counts (information, not failures):
- A6's 12 passages are bilingual pairs of the same statements. Once the 3 passages from check 3 are dropped, 9 candidate-authored passages remain. They cover the 4 "Pay & keep great teachers" statements in both languages, plus the Spanish bond-audit plank (`3963a59b`, A6 0.89). Its English original, `5014e0ff`, scored A6 0.82 and is not tagged.
- B1's only passage is the Spanish teacher-salary referendum plank `932f22b6` (B1 0.86). Its English original, `bbafd7d3`, scored B1 0.60. The B1 tag rests on a single translated sentence about teacher pay.
- The ingest selected only the `/es` translation as a policy page. `/compare-district-1-candidates` (policy 0.36) and `/the-vote` (0.20) were not read. These silences therefore cover the homepage, `/es` and `/meet-linda` only.

### 5. Possible misses (information for the founder, not a fix)

No passage marked states_policy=false plainly states a commitment on a taxonomy issue. For the record:

- `e74cbacb` (commitment 0.70; highest issue score A6 0.03). First 20 words: "Strengthen communication in every family's language — English, Kreyòl, and Español — through the Parent Portal and Parent Academy." This is a numbered plank under "3 · Parents as partners" and a plain commitment. No taxonomy issue covers it, so it would be a candidate-tier item.
- `618c42f9` (commitment 0.79; A1 0.02). First 20 words: "Reforzar la comunicación en el idioma de cada familia — español, inglés y kreyòl — a través del Parent Portal". This is the Spanish version of the plank above, and the same applies.
- `9fb3060d` (commitment 0.80; KYV9 0.82, A6 0.76), `/meet-linda` video card. First 20 words: "Privatization protection. Charter operators not included." This is joke product-label copy that touches school choice (KYV9). It is borderline, not a plain commitment, and it sits below the threshold on both scores.

Pillar summaries `b762dd96` / `23c5a3cd` (facilities and security, commitment 0.44 / 0.51) and `f6f2dfd5` / `6563a260` (parents, 0.78 / 0.73) state values rather than actions. They are not misses.

Notes for writing the claims (not failures):
- The 17 states_policy passages with no taxonomy issue are candidate-tier material: teacher autonomy and paperwork, the MSD safety-law check, the capital plan, parent notice before closures, and plain-language budget reporting.
- The site names the candidate "Linda Cothiere Aristide". The constitution template's example attribution says "Senator Linda Cothiere". Nothing on the site supports "Senator". She is described as a classroom teacher running for School Board, so that title must not be used.

VERDICT: FAIL (check 3)
