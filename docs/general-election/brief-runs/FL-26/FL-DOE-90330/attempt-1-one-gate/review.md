# Step 3 review: FL-DOE-90330 (Mario Diaz-Balart), FL-26-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (80 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 80 of 80 asked, 0 failed) and `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

The site is bilingual. Almost every block appears twice, once in English and once in Spanish, as two passages with separate ids. So the 19 policy passages are about 10 distinct statements, and each issue's citations are English/Spanish twins of fewer statements.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 80 passages have url `https://mariodiazbalart.org/`, the OFFICIAL_SITE. No other host appears. |
| 2 | Quotes verbatim | PASS | All 19 `states_policy` passages are byte-identical to `passages.jsonl`, with url and heading equal. So are all 80 passages and all 13 citation copies in `run.json.areas`. |
| 3 | No inferred motive | PASS (borderline notes) | None of the 19 is only biography, an attack, fundraising or event copy. 11 of them are past record (funds delivered, bills led or backed), not forward commitments: `4a9e86d5`, `c4e03f5f`, `1a46c3d6`, `abda53a2`, `8242653c`, `d60639be`, `05fe83f1`, `215b0ff8`, `3d26fcb2`, `78ead477`, `77ed6256`. See below. |
| 4 | Silence recorded, not filled | PASS | Stated (gate + issue): A4 2, B1 2, KYV9 2, B3 4, B7 3. Scores over the threshold but gated out, so 0: A5, B2, KYV4, KYV5. The other 16 issues are 0. |
| 5 | Possible misses (information only) | 2 | `c2f4b686` and `043f4837` ("Proteger los Everglades" plank). There are also 3 twin inconsistencies (`3e93a18f`, `15c408da`, `53f1895e`) and several gated-out record passages. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every passage url in `run.json` and `passages.jsonl`. There is one host, `mariodiazbalart.org`, and one url, `https://mariodiazbalart.org/`, for all 80 passages. `run.json.site` is `https://mariodiazbalart.org`, and all 13 citation urls in `run.json.areas` are the same url. No redirect was involved.

`ingest.log` records only this site: "40 links, 0 policy page(s) selected (cap 8), about page: none", and "asking Jev about 0 link(s)". `links.jsonl` is empty. It has no robots, bot-challenge, browser or unreachable lines. The whole corpus is the homepage, including its inline Terms of Service and Privacy Policy text.

Notes, not failures:
- Contact passages (`85fc2157`, `94c63e66`, `596b12ac` and others) give the email domain `mariodiaz-balart.org`, with a hyphen. That domain appears only in passage text, not as a source url.
- Some Spanish legal passages and headings keep raw HTML entities (`T&eacute;rminos`, `Campa&ntilde;a`), for example `99c441e0` and `85298ce7`. This is an ingest quirk. It does not touch any policy passage.

### 2. Quotes verbatim: PASS

A node script (`Buffer.from(text, "utf8").equals(...)`) compared each passage in `run.json` with the passage of the same id in `passages.jsonl`. It also compared `url` and `heading` for equality.

- `passages.jsonl` has 80 rows and 80 unique ids. `run.json` has the same 80 ids.
- All 19 `states_policy: true` passages are byte-identical, with matching url and heading: `4a9e86d5`, `c4e03f5f`, `1a46c3d6`, `abda53a2`, `8242653c`, `d60639be`, `05fe83f1`, `215b0ff8`, `3d26fcb2`, `dc389186`, `3fbd9bf6`, `78ead477`, `77ed6256`, `843f06d6`, `60dbc6f0`, `bf50a26e`, `8b0614b8`, `b9ca5294`, `cd2b7c86`.
- All 80 passage texts are identical. Mismatches: 0.
- The 13 citation copies in `run.json.areas` are also identical (0 mismatches): A4 (`3fbd9bf6`, `dc389186`), B1 (`bf50a26e`, `8b0614b8`), KYV9 (`1a46c3d6`, `abda53a2`), B3 (`8242653c`, `d60639be`, `843f06d6`, `60dbc6f0`), B7 (`4a9e86d5`, `60dbc6f0`, `843f06d6`). `run-report.txt` cuts some quotes with "…" for display only.
- Internal consistency holds for every passage: `states_policy == (commitment >= 0.85)`, and `issues` is exactly the set of scores at or above 0.85. A recount matches `counts`: 19 state a policy, 11 with an issue.

### 3. No inferred motive: PASS (with borderline notes)

None of the 19 policy passages is only biography, an attack on an opponent, fundraising or event copy. The run gated out all of those correctly:
- Biography, commitment 0.03 to 0.04: `07a3f282`, `04ba3861`, `a7f83b53`, `b1d5b13d`, `2e48052d`, `596306be`, `98991fad`, `fc665967`.
- Fundraising, 0.04 to 0.57: `b23ce834`, `cbd893d4`, `72bb9a5b`, `4eb8dd03`, `09b1d1ac`, `81fd5484`, `48df9243`, `98eefcb3`.
- Terms, SMS and privacy copy, all under 0.52.
- The site has no attack copy and no event copy.

The policy passages fall into two groups.

**A. Platform planks, present or forward stance (these pass).** They sit under imperative plank headings such as "Reducir el Costo de Vida", "Frontera Segura" and "Apoyar a las Pequeñas Empresas".
- `843f06d6` / `60dbc6f0` (B3, B7): "Detaining and removing criminal aliens, cracking down on fentanyl trafficking, and backing the men and women who enforce our laws."
- `bf50a26e` / `8b0614b8` (B1): "Backing the 21,000+ manufacturing jobs and $1.9B in annual wages that power FL-26 — with expanded tax relief and renewed Opportunity Zones."
- `dc389186` / `3fbd9bf6` (A4): "No tax on tips or overtime, permanent tax cuts for working families, and relief for seniors — sparing FL-26 taxpayers". The words "sparing … an average 24% tax increase" describe an enacted result, so this mixes a plank with record. `dc389186` scores A4 at exactly 0.85, on the threshold.
- `b9ca5294` / `cd2b7c86` (no issue tag): "Standing with political prisoners and dissidents in exile. Defending freedom in our hemisphere. Rejecting authoritarianism." This is a general stance with no specific measure. `cd2b7c86` passes the gate at exactly 0.85.

**B. Past record, not a forward commitment (borderline, listed for the founder).** These come from the "Entregando para el Sur de Florida" section, a list of things the campaign says he did. Each names a legislative action by the candidate with policy content, such as a bill he led, backed or championed, or funding he directed for a stated purpose. So none is only biography. Under the reading used in earlier Step 3 reviews, a stated legislative action is a stance, and a bare dollar line with no action is biography of service. By that reading these pass. They are still record, not pledges. Any claim from them must be written as record the site reports ("The campaign website states he led FY26 Homeland Security funding prioritizing…"), never as something he commits to do.
- `4a9e86d5` (B7, commitment 0.87), first 20 words: "Delivered over $11 million in FY26 funding for Miami-Dade and regional law enforcement — new patrol vehicles, upgraded technology, and". The stance comes from "championing House-passed bills like the LEOSA Reform Act and the Combatting Organized Retail Crime Act". It is 0.02 over the gate, and its Spanish twin `3e93a18f` was gated out at 0.65 (see check 5).
- `c4e03f5f` (no tag, 0.89): "Secured at least $135 million for school violence prevention through the STOP School Violence Act — threat assessment, security improvements,". The stance comes from "advancing legislation that shields kids from online exploitation". Its Spanish twin `15c408da` was gated out at 0.83.
- `1a46c3d6` / `abda53a2` (KYV9, 0.91 / 0.90): "Increased charter school funding by $60 million, preserved Pell Grants and magnet schools, and backed the first federal school choice". **These are the only KYV9 citations.** The site has no forward school-choice plank, so the KYV9 position rests entirely on record.
- `8242653c` / `d60639be` (B3, 0.96): "Led FY26 Homeland Security funding prioritizing border security, detention and swift removal of criminal aliens, and expanded resources to stop". This is record of an appropriations bill. Its stance is stated through the bill's priorities.
- `05fe83f1` (no tag, 0.98): "As Chairman, cut spending 16% from FY25 with over $9 billion in savings and tougher oversight — fully funding the". Its Spanish twin `53f1895e` was gated out at 0.84.
- `215b0ff8` / `3d26fcb2` (no tag, 0.95 / 0.93): "Directed $25 million for Cuba's democratic opposition plus $30 million for Radio and TV Martí, $50 million for human rights".
- `78ead477` / `77ed6256` (no tag, 0.96): "$135M for school violence prevention, tougher laws against online predators, and reinforced parental rights in education." This has no verb. It is the "Proteger a Nuestros Niños" plank, and it restates the `c4e03f5f` record. It passes on "tougher laws … reinforced parental rights". Unlike the failing case in FL-DOE-88868, it has no issue tag and is not cited in `areas`.

Five of these carry no issue tag (`c4e03f5f`, `05fe83f1`, `215b0ff8`, `3d26fcb2`, `78ead477`/`77ed6256`). They make up the 8 "state a policy the taxonomy has no question for", together with `b9ca5294`/`cd2b7c86`. They produce no spine claim. If kept, they would be candidate-tier issues: foreign policy toward Cuba, Venezuela and Nicaragua, federal spending, and child online safety.

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, a script counted the passages whose `verdict.scores[issue]` is 0.85 or more, over all 80 passages. The "stated" column counts only the ones that also cleared the gate (commitment 0.85 or more). This matches `groupByArea` in `src/lib/policy-noul.ts` and `run.json.areas`. Only stated passages could become stated_position claims. Every taxonomy issue with at least one passage over the threshold:

| Issue | Label | Passages ≥ 0.85 | Stated (gate + issue) | Ids (score); * = gated out | Coverage |
|---|---|---|---|---|---|
| A4 | Cost of living in Florida | 2 | 2 | `3fbd9bf6` (0.93), `dc389186` (0.85) | stated (one EN/ES statement) |
| B1 | Economy, inflation, and jobs | 4 | 2 | `bf50a26e` (0.97), `8b0614b8` (0.95), `34facf16`* (0.91, c 0.53), `8341366b`* (0.89, c 0.59) | stated (one EN/ES statement) |
| KYV9 | School choice and vouchers | 2 | 2 | `1a46c3d6` (0.97), `abda53a2` (0.96) | stated (record only; see check 3) |
| B3 | Immigration and border enforcement | 4 | 4 | `8242653c` (0.98), `d60639be` (0.98), `843f06d6` (0.98), `60dbc6f0` (0.97) | stated (two EN/ES statements) |
| B7 | Crime policy, policing and courts | 4 | 3 | `4a9e86d5` (0.98), `60dbc6f0` (0.95), `843f06d6` (0.94), `3e93a18f`* (0.96, c 0.65) | stated |
| A5 | Water quality and Everglades restoration | 2 | **0** | `861fa9b1`* (0.91, c 0.40), `0b82f00b`* (0.90, c 0.54) | no_stated_position_found |
| B2 | Healthcare access and costs | 4 | **0** | `b8068830`* (0.87, c 0.73), `b0235f9b`* (0.85, c 0.72), `9853238a`* (0.85, c 0.29), `876c42c9`* (0.91, c 0.36) | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 2 | **0** | `861fa9b1`* (0.87), `0b82f00b`* (0.91) | no_stated_position_found |
| KYV5 | Water supply and drinking water | 2 | **0** | `861fa9b1`* (0.85), `0b82f00b`* (0.85) | no_stated_position_found |

The other 16 issues have 0 passages at or above 0.85 and are no_stated_position_found: A1, A2, A3, A6, KYV10, A7, B4, B5, B6, KYV1, B8, KYV2, KYV3, KYV6, KYV7, KYV8.

A record note: `run.json` sets non-empty `issues` on the gated-out passages marked * above (for example `861fa9b1` has `issues: ["A5","KYV4","KYV5"]` with `states_policy: false`). They are correctly left out of `areas`. A downstream reader that uses `issues` without checking `states_policy` would count them.

On scope: the ingest read only the homepage. It judged 0 of 40 links and selected 0 policy pages and no About page. These silences cover the homepage only.

### 5. Possible misses (information for the founder, not a fix)

**Plainly stated commitment, marked no policy:**
- `c2f4b686` (commitment 0.73; A5 0.73, KYV5 0.72), first 20 words: "Continuing the work of the Everglades Caucus to protect Florida's natural heritage and water supply for future generations." This is the "Proteger los Everglades" plank, one of the same six plank headings as the passing `843f06d6` and `bf50a26e`. It is a forward-looking commitment on Everglades and water supply. Even through the gate, its issue scores sit below 0.85, so A5 and KYV5 would still count 0.
- `043f4837` (0.67; A5 0.71, KYV5 0.67), Spanish twin: "Continuando el trabajo del Caucus para proteger el patrimonio natural y suministro de agua de Florida."

**Twin inconsistency.** In each of these, the Spanish passage says the same thing as an English passage the run marked as policy, but the Spanish one was gated out. These are record, not forward commitments. They are listed because the gate split identical content.
- `3e93a18f` (0.65; B7 0.96): "Entregó más de $11 millones en fondos FY26 para las fuerzas del orden de Miami-Dade y la región — nuevos". Its twin is `4a9e86d5` (0.87, cited under B7).
- `15c408da` (0.83; B7 0.75): "Aseguró al menos $135 millones para la prevención de violencia escolar a través de la Ley STOP School Violence —". Its twin is `c4e03f5f` (0.89).
- `53f1895e` (0.84): "Como Presidente, recortó el gasto un 16% respecto a FY25 con más de $9 mil millones en ahorros y mayor". Its twin is `05fe83f1` (0.98).

**Record passages gated out that are the same kind as record passages that passed (not misses by the forward-commitment test).** They are listed because their issue scores clear the threshold:
- `861fa9b1` / `0b82f00b` (0.40 / 0.54; A5, KYV4, KYV5): "Founder and Co-Chair of the bipartisan Everglades Caucus — more than $6 billion delivered since his election for the EAA". This ends with "Protecting South Florida's drinking water, flood resilience, and Florida Bay."
- `34facf16` / `8341366b` (0.53 / 0.59; B1 0.91 / 0.89): "Helped block an average 24% tax increase on FL-26 families — no tax on tips or overtime, relief for seniors". This is the same tax content as the passing A4 plank `dc389186`.
- `b8068830` / `b0235f9b` (0.73 / 0.72; B2): "Championed $115.1 billion for VA medical care in the FY26 MILCON–VA bill — mental health, toxic exposure treatment, and rural".
- `9853238a` / `876c42c9` (0.29 / 0.36; B2, B4 up to 0.72): "Delivered $1.9 billion for Community Health Centers, $10 million for cancer screenings through the Alcee L. Hastings program, and expanded". This includes "Cosponsored the Medicare Multi-Cancer Early Detection Screening Coverage Act".

The run is consistent in gating out bare record, but inconsistent at the edge. "Delivered/Secured … while championing/advancing legislation" passes in English and fails in Spanish, and "Championed $115.1 billion …" fails while "Led FY26 Homeland Security funding …" passes. If the founder wants record copy treated the same way throughout, B2 and the Everglades items are where the count would change.

VERDICT: PASS
