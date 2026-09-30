# Step 3 review: FL-DOE-89778 (Branden Scrivener), FL-12-general

Reviewer: Step 3 (read-only, under the Profiler constitution). No site was fetched. Inputs were `passages.jsonl` (11 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 11 asked, 0 failed) and `ingest.log`.

SPINE: undecided for this race. Check 4 therefore covers all 25 taxonomy sub-issues in `src/lib/news-issues.ts` (A1–A7, B1–B8, KYV1–KYV10), and check 5 considers every one of them. A passage "clears the threshold" when its score is `>= 0.85`, which is the comparison `applyThreshold` in `src/lib/news-characterize.ts` makes.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 11 passage urls are `https://brandenscrivenerfl.info/`. No other host. |
| 2 | Quotes verbatim | **PASS** | The 4 policy passages (80cffe6c, beb4417b, 642c3734, 4c4aeea6) are byte-identical to `passages.jsonl`. So are all 11 passages and the 4 citations under `areas`. |
| 3 | No inferred motive | **PASS** | None of the 4 policy passages is only biography, an attack, fundraising or event copy. 642c3734 is the weakest; see the note below. |
| 4 | Silence recorded, not filled | **PASS** | A6 = 1, KYV9 = 1, B1 = 1, KYV3 = 1. The other 21 issues are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | **None found** | None of the 7 no-policy passages (6b43c10f, f0eb4736, 9813934a, dc978e4e, 6e49d97e, a810b8b7, 718fedc3) states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` `passages[]` and `passages.jsonl`. It found one host in each: `brandenscrivenerfl.info`. That is the OFFICIAL_SITE host, and no redirect was involved. `ingest.log` shows one page crawled, 5 homepage links, 0 policy pages selected and no about page, so every passage comes from the homepage.

Note: the *text* of passage 9813934a is the bare string `https://linktr.ee/Citzensforbrandenscrivener`. Its source url is the official site, so it is not an off-host source. The run marks it `states_policy: false` (commitment 0.03), so no claim can come from it.

### 2. Quotes verbatim: PASS

A node script compared each `run.json` passage with the `passages.jsonl` row of the same id, using `Buffer.equals` on the UTF-8 text:

| id | states_policy | text byte-equal | url equal | heading equal |
|---|---|---|---|---|
| 80cffe6c | true | yes | yes | yes |
| beb4417b | true | yes | yes | yes |
| 642c3734 | true | yes | yes | yes |
| 4c4aeea6 | true | yes | yes | yes |
| the other 7 | false | yes | yes | yes |

The citation copies under `run.json` `areas` (B1→642c3734, A6→beb4417b, KYV9→beb4417b, KYV3→4c4aeea6) also match `passages.jsonl` byte for byte. Both files have the same 11 ids; neither has an id the other lacks.

### 3. No inferred motive: PASS

The four passages marked `states_policy: true`:

- **80cffe6c** (Government Reform, commitment 0.99): "All political offices need strict term limits. I believe 8 years is sufficient for the House. Someone serving a decade long…" It has explicit commitments: term limits, uncapping the House, campaign finance reform, and "I will advocate for open primaries".
- **beb4417b** (Invest in local public education, commitment 0.97): "We have shifted our focus to develop Charter and other 3rd party school systems over public education. I believe in…" It commits to "Funding for public education should not be diverted to these programs".
- **642c3734** (Quality of Life, commitment 0.91): "Cost of living has skyrocketed and continues to rise. We need to change fundamentals rather than only addressing the symptoms. The…" It is not biography, an attack, fundraising or event copy. It is the candidate's normative stance ("must be prioritized over those of foreign nations or corporate capital"), but it names no specific measure. For the founder: this is the thinnest of the four, and any claim built on it should be phrased as the general statement it is.
- **4c4aeea6** (Data Privacy & Development, commitment 0.98): "Your data should be protected and required to be accessed by the government with the use of a warrant. They should…" It has explicit commitments: a warrant requirement, "No AI data centers paid for by Floridians", and expanding public transportation.

No passage is flagged.

### 4. Silence recorded, not filled: PASS

Counts of passages scoring `>= 0.85`, taken from `run.json` scores for every taxonomy issue:

| Issue | Label | Passages over threshold | Coverage |
|---|---|---|---|
| A6 | Public school funding and teachers | 1 (beb4417b, 0.98) | stated |
| KYV9 | School choice and vouchers | 1 (beb4417b, 0.97) | stated |
| B1 | Economy, inflation, and jobs | 1 (642c3734, 0.87) | stated |
| KYV3 | Growth, development and land conservation | 1 (4c4aeea6, 0.95) | stated |
| A1 | Property insurance costs | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | no_stated_position_found |

Every passage that clears an issue threshold also clears the policy gate (`states_policy: true`), and `run.json` `areas` lists exactly these four issue/passage pairs. `run-report.txt` records one passage that "state[s] a policy the taxonomy has no question for": 80cffe6c, which is gated true with `issues: []`. Under the constitution, that content is a candidate-tier issue for this candidate. This review does not assign it to a taxonomy issue.

### 5. Possible misses (information for the founder): none found

The 7 passages marked `states_policy: false`, with their first 20 words:

- **6b43c10f** (My Bio): "My name is Branden Scrivener, I’m a 27-year-old working class father of two. I have a bachelor’s in human services, along…" This is biography. "Broken insurance system" is an observation, not a commitment.
- **f0eb4736** (My Bio): "All this experience has led me to the same conclusion; our government policies are the source of many of our issues. For…" This is biography and motivation, with no commitment on an issue.
- **9813934a** (My Bio): "https://linktr.ee/Citzensforbrandenscrivener". A link only.
- **dc978e4e** (Government Reform): "In Pasco County, there are more registered independents than Democrats. That means there’s a significant portion of eligible voters unable to…" This is a descriptive statement with no commitment in the passage itself.
- **6e49d97e** (Grassroots): "This is a grassroots campaign and that means I need your support. Both parties are corrupted with special interests and selfish…" This is fundraising and volunteer copy, plus criticism of both parties, with no commitment on an issue.
- **a810b8b7** (Send Me a Message): "Have questions or suggestions? I would love to hear from you!" Contact copy.
- **718fedc3** (Send Me a Message): "Land O' Lakes Blvd, Land O' Lakes, FL, USA". An address.

None of them plainly states a commitment on a taxonomy issue.

VERDICT: PASS
