# Step 3 review: FL-VF-DAD-3076 (Linda Cothiere), FL-DAD-SB1-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (122 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates `q_states_policy` + `q_own_commitment`, status complete, 122 of 122 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 122 passage urls in `run.json` are on `lindaforschoolboard.com` (53 on `/`, 61 on `/es`, 8 on `/meet-linda`). No other host, no redirect. |
| 2 | Quotes verbatim | PASS | All 22 states_policy passages are byte-identical (text, url, heading) to the same id in `passages.jsonl`. All 122 texts match. |
| 3 | No inferred motive | PASS | All 22 states_policy passages are the campaign's own numbered planks or pillar summaries, in English and Spanish. None is biography, attack, fundraising, event copy or third-party (endorsement) text. |
| 4 | Silence recorded, not filled | PASS | A6: 7 passages. B1: 2 passages. The other 23 issues: 0, recorded as no_stated_position_found. |
| 5 | Possible misses (information only) | 4 on A6 | `cde79f96`, `46563534`, `d184a43e`, `5014e0ff` state a commitment on A6 but failed the `own_commitment` gate (0.79 to 0.83). |

## Evidence

### 1. Candidate-controlled sources only

A node script over `run.json` found one host in the passage urls: `lindaforschoolboard.com`, the OFFICIAL_SITE host. `passages.jsonl` has the same single host. All 6 links Jev judged (`links.jsonl`) are on that host too.

- `https://lindaforschoolboard.com/`: 53 passages (homepage).
- `https://lindaforschoolboard.com/es`: 61 passages. This is the site's own Spanish version, chosen as the policy page at policy=0.50.
- `https://lindaforschoolboard.com/meet-linda`: 8 passages. This is the About page, chosen at about=0.58.

`ingest.log` prints 67 for `/es` and 10 for `/meet-linda`. Those are per-page counts before cross-page dedupe. After dedupe the file holds 61 and 8, and 53 + 61 + 8 = 122, which matches the log's final line.

The United Teachers of Dade letter (`fcfac758`, `97fe70d3`, `d447b3b6` and neighbors) is reproduced on the candidate's own domain, so it passes this check. Its voice is third-party, which matters for check 3; see below.

### 2. Quotes verbatim

Checked with `node`, comparing `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`.

- Id sets match: 122 in each, all shared, no duplicate ids.
- All 22 passages with states_policy=true are byte-identical in text, url and heading. No mismatch.
- All 122 texts are byte-identical, including the gated-out ones.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85` (the rule in `src/lib/policy-noul.ts`). For every passage, `issues` equals the set of scores >= 0.85. `counts` (22 states_policy, 7 with_issue) matches the passages.

Note: `run.json` stores `issues` on 8 passages whose states_policy is false (`97fe70d3`, `fcfac758`, `cde79f96`, `d447b3b6`, `a1bb0124`, `46563534`, `d184a43e`, `7f1638ac`). This is by design: `toRunVerdict` records the thresholded issue ids whatever the gate says, and `groupByArea` skips passages that fail the gate. None of them reaches `areas` or `run-report.txt`.

### 3. No inferred motive

22 passages are marked as stating a policy. All 22 are commitments the campaign makes in its own voice:

- English (`/`): `736ea853` (pillar summary: "Cut the bureaucratic overload and give educators the tools…"), `9b3b5641`, `05e36987`, `9cc654c4`, `c299d462`, `77b9a48b`, `f2b8783d`, `5f10dd5b`, `bbafd7d3`, `9f1c9628`, `0c135834`.
- Spanish (`/es`): `83a2ad11` (pillar summary), `8108b123`, `0bfb3c47`, `7ee648c1`, `97f22c3a`, `3963a59b`, `59f4a04f`, `d1a8359e`, `a8435f53`, `932f22b6`, `c5f119d3`.

`3963a59b` ("Exigir cuentas para el Distrito 1 del bono escolar de $1.2 mil millones de 2012 — continuando la auditoría que…") refers to the seat's former member. It names no opponent and makes a commitment (demanding an accounting), so it is not an attack.

None of the passages that are only endorsement text is marked. The two UTD pull quotes, `97fe70d3` and `d447b3b6`, cleared `commitment` (0.88 and 0.89) but failed `own_commitment` (0.30 and 0.35). The letter body `fcfac758` failed both gates (0.82 and 0.29). The video end card `7f1638ac` ("Four pillars. Empower teachers Safe & modern campuses…") failed `own_commitment` at 0.79. Biography (`8b078d78`, `6f031e49`, `5d4467da`, `f96bca15`, …), fundraising (`d7b575e0`, `6fddc62e` to `1c337130`, `bd54d003` to `112c7eef`), and event and voting copy (`d68cdf6b`, `87ed9904`, `f5f38dfa` to `78aa21d2`, `47bcfab1`, …) were all gated out.

Result: no passage to list.

### 4. Silence recorded, not filled

A passage counts only if it clears both gates and scores >= 0.85 on the issue, which matches `groupByArea`. These taxonomy issues have at least one passage over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A6 | Public school funding and teachers | 7: `9b3b5641`, `bbafd7d3`, `9f1c9628`, `0c135834`, `3963a59b`, `932f22b6`, `c5f119d3` | stated |
| B1 | Economy, inflation, and jobs | 2: `932f22b6` (B1 0.86), `c5f119d3` (B1 0.85) | stated |

Eight more passages score >= 0.85 on an issue but failed a gate, so they count 0: `fcfac758`, `97fe70d3`, `d447b3b6` (also KYV9 0.86), `a1bb0124`, `7f1638ac`, `cde79f96`, `46563534` (also B1 0.85) and `d184a43e`, all on A6. See check 5 for the ones that are real commitments.

These 23 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A2, A3, A4, A5, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

For the founder:

- B1 rests on two Spanish passages (`932f22b6`, `c5f119d3`) whose English twins (`bbafd7d3` B1 0.63, `9f1c9628` B1 0.75) are not tagged B1. The same pay planks are tagged differently depending on language.
- 15 of the 22 states_policy passages match no taxonomy issue. They are the campaign's teacher-autonomy, school-safety (Marjory Stoneman Douglas law), capital-plan, school-closure notice and budget-transparency planks. `run.log` reports these as "state a policy the taxonomy has no question for". Under the constitution they would be candidate-tier issues.

### 5. Possible misses (information only, not a fix)

These passages are marked states_policy=false but plainly state a commitment on a taxonomy issue (A6). All four passed `commitment` and failed only `own_commitment`, and each has a twin in the other language that passed or scores close:

- `cde79f96` (`/`, "Pay & keep great teachers", commitment 0.97, own_commitment 0.83, A6 0.98): "Florida ranks last in the nation for teacher pay, and we lose ours to the next county. Direct local dollars"
- `46563534` (`/es`, "Pagar y retener a los buenos maestros", commitment 0.96, own_commitment 0.79, A6 0.98, B1 0.85): "La Florida está de última en el país en salario docente, y perdemos a los nuestros con el condado de"
- `d184a43e` (`/es`, "4 · Pagar y retener a los buenos maestros", commitment 0.94, own_commitment 0.79, A6 0.98): "Pelear en Tallahassee por una inversión estatal de verdad en el salario docente — la Florida está hoy en el". Its English twin `0c135834` passed (own_commitment 0.88).
- `5014e0ff` (`/`, "2 · Safe & modern campuses", commitment 0.94, own_commitment 0.82, A6 0.82): "Demand a District 1 accounting of the 2012 $1.2 billion school bond — continuing the audit the seat's own former". Its Spanish twin `3963a59b` passed and is tagged A6 at 0.88.

Not counted as misses:

- `e74cbacb` / `618c42f9` ("Strengthen communication in every family's language — English, Kreyòl, and Español — through the Parent Portal and Parent Academy."): commitments, but on no taxonomy issue (A6 0.03, A2 0.02). They are candidate-tier.
- `9fb3060d` ("Privatization protection. Charter operators not included."): a video-card joke that is borderline on KYV9 (0.80). It is not a plain commitment.
- `7f1638ac` (pillar titles plus URL) and `a1bb0124` (slogan «Cuando gana el maestro, gana el estudiante.»): no commitment.
- `97fe70d3`, `d447b3b6`, `fcfac758`: the union's words, not the candidate's. They were correctly gated out.

### Other notes

- `ingest-report.md` in RUN_DIR is stale on the policy run. Its Step 2 table gives provenance `q-b2171346`, 29 states_policy and 12 with an issue, which match the earlier one-gate run in `attempt-1-one-gate/`. The current `run.json` has `q-e7282116`, 22 and 7. The ingest half of the report (53/61/8) is correct.
- `ingest.log` carries a Node `MODULE_TYPELESS_PACKAGE_JSON` warning. It is harmless.

VERDICT: PASS
