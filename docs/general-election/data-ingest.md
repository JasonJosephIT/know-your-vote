# Data Ingest — Primary → General

**Scope change:** the pipeline must ingest the **2026 Florida general election**
(2026-11-03) rather than the primary (2026-08-18, now past). This document owns
**how rows get filled**: HTTP sources, parsers, field population, gap-closing
sources, and voter-facing copy.

**Companion:** `data-architecture.md` owns the **stored shape** — DDL,
constraints, RLS, read-model types, and audit-population policy. It defines
`candidate.ballot_status` and the tier semantics (its D1); this document defines
only how the DoE export is *mapped* onto that column. Decisions are referenced
by ID, never restated.

---

## 0. What does NOT change

`intake.py` was written against the general election from the start. Verified:

- `DOE_ELECTION_ID = "20261103-GEN"` — already the general.
- `_STATEWIDE_RACES` already emits `FL-GOV-general` etc.; `"election": "general"`
  is already stamped on every parsed race.
- T2 (FEC) and T3 (FL Legislature) are election-agnostic read tools.
- The eight target races are unchanged (Gov/AG/CFO/AgComm + FL-10/15/23/28).

**No new tool, no new endpoint, and no re-pointing is required.** What changed
is that a *filing list* fetched after a primary no longer equals a *ballot*.

### Not needed: primary-results ingest

The obvious instinct is "we must ingest primary results to learn who advanced."
We must not build that. The DoE export for `20261103-GEN` already carries the
resolved general field with status codes. A results ingest would be a second
source of truth for a fact the existing source already answers.

*Skipped: results ingest. Add when the DoE export is shown to lag the certified
result — it has not been.*

---

## 1. Three defects that block the general run

All three are in code today and all three were confirmed by reading it.

### I1 — No status filter: defeated primary candidates enter the general race

`parse_candidate_list` (`intake.py`) appends **every** parsed row:

```python
candidates.append({...})
race = races.setdefault(race_id, {...})
race["candidate_ids"].append(candidate_id)   # no status filter
```

`_STATUS = {"QUA": "qualified", "WIT": "withdrawn"}` maps everything else to
`"other"` — and nothing is ever excluded. Run today, this puts primary losers
into `race.candidate_ids` for the general.

Downstream that is not cosmetic: each one becomes a Profile with near-zero
claims, and per `data-architecture.md` §1 the Balance Audit's `(max-min)/max`
formula turns a zero-claim candidate into ~100% variance → **HALT**.

### I2 — Write-ins are indistinguishable in the parsed columns

The request sends `cantype=ALL`, so qualified write-ins are in the file. But the
26 documented columns (`intake.py` docstring) carry **no candidate-type
column** — only `StatusCode`/`StatusDesc`. So the parser cannot currently tell a
write-in from a printed ballot line, which is exactly the distinction
`ballot_status` needs.

**Do not guess the codes.** The first move is to look:

```
# throwaway, not committed: dump the live distribution
StatusCode / StatusDesc / PartyCode / PartyDesc  ->  counts, per OfficeCode
```

Fetch `20261103-GEN` once per office group (`FED`, `CAB`, `STA`), print the
distinct values, and let the real file drive the mapping. If no column
distinguishes write-ins, fetch twice with different `cantype` values and diff on
`AcctNum` — a set difference, not a parser rewrite.

*This dump is a prerequisite for I1 and I2 alike: neither mapping can be written
correctly without it.*

### I3 — `official_site` is never populated, and the Profiler cannot run without it

`store.upsert_candidate` writes exactly six columns:

```
candidate_id, legal_name, party, office_sought, qualifying_status, fec_id
```

`official_site` is not among them, and the DoE export does not carry a website.
So `official_site` is `NULL` for every ingested candidate.

That is a hard stop, not a missing nicety. Allowlist A is **candidate-controlled
sources only**; `store.candidate_scope` feeds it `official_site` plus verified
social handles, and `allowlist_a_core` fails closed on empty scope
("no official_site and no verified handles -> fail closed"). With both empty:

> The Profiler can fetch nothing, so it can write no `stated_position` claims,
> so **"What They Say" is empty for every candidate in every race.**

And because it is empty *uniformly*, the Balance Audit passes — the pipeline
would publish a set of hollow briefs without tripping a single gate.

**Fix (ponytail): seed the URLs by hand.** Eight races × 2–4 briefed candidates
is roughly **20–30 rows**. That is an afternoon with the DoE list and a search
box, and it is auditable — each URL is a fact a human checked. Building a
site-discovery agent to avoid typing 30 URLs, eight weeks out, is the textbook
bad trade. Verified handles then arrive the way the schema already intends, via
`candidate_social_account.provenance = 'linked_from_official_site'`.

*Skipped: automated official-site discovery. Add when coverage passes ~100
candidates.*

---

## 2. T1 changes

One function, one store method. Nothing else in the tool layer moves.

| Change | Where |
|---|---|
| Map `StatusCode`/`StatusDesc` (+ write-in signal from §1) onto the three tiers of `data-architecture.md` D1 | `intake.py` `parse_candidate_list` |
| Exclude `excluded`-tier candidates from `race["candidate_ids"]`; keep `ballot` and `write_in` | same |
| Store the DoE `PartyCode` verbatim — drop the `_PARTY` three-way map (D2 removes the CHECK it existed to satisfy) | same |
| Carry `ballot_status` through the upsert | `store.upsert_candidate` |

Keep the parser **deterministic and fail-closed** (Risk R1): an unrecognised
status code is a loud `status='fail'`, never a silent `'other'`. Idempotency is
unaffected — `candidate_ids` is still sorted and replaced wholesale.

---

## 3. Field gaps, and which existing source closes each

Four `candidate`/`race` columns are still never populated. Three are closable
with tools we already have; the fourth needs a new source.

| Column | Closed by | Cost |
|---|---|---|
| `official_site` | manual seed (§1 I3) | ~30 rows, one sitting |
| `is_incumbent`, `incumbent_id` | **T2 FEC** — the `candidates` endpoint returns an incumbent/challenger/open-seat status per candidate | none; T2 exists and the key is live |
| `race.is_open_seat` | derived from the same T2 field — no incumbent in the field ⇒ open seat | none |
| `prior_offices` | leave empty | — |

`prior_offices` is worth naming as a deliberate skip: it is display-only, it has
no audit consequence, and there is no clean structured source. *Skipped, add
when a brief actually shows it.*

---

## 4. New sources to close real gaps

Only one genuine hole, plus optional additions. Verify each against its current
terms and robots policy before wiring — and note that a Profiler source must be
candidate-controlled (Allowlist A), while a Fact-Checker source must be
tier-classified (Allowlist B). A source is not usable just because it is good.

| Gap | Source | Why it fits | Auth / cost | Priority |
|---|---|---|---|---|
| **US House incumbents have no reachable voting record.** T3 covers `flsenate.gov` only, so FL-10/15/23/28 incumbents' federal records are unreachable — the Recorder cannot do its job for half the target races | **Congress.gov API** | Primary-source bill and vote data; `api.data.gov` key — the same key infrastructure T2 already uses for FEC | free key | **P0** |
| Statewide incumbents (Gov/AG/CFO/AgComm) hold executive office — no bills, no votes | FL agency sites + FL DoE official actions | Executive records are documents, not roll calls; treat as `primary_doc` | free | P1 |
| "What else is on my ballot" (amendments, retention, local) | **County SOE sample ballots** — Miami-Dade, Broward, Hillsborough, Orange | Authoritative per-ballot content; **already linked** in `0004_official_links.sql`, so this closes as a link-out with zero new modelling (`data-architecture.md` D3) | free | P1 |
| Campaign finance context | T2 FEC `candidate_totals` | Already-built endpoint, unused | none | P2 |
| Fact-Checker Tier-1/Tier-2 breadth for a bigger general field | Existing Allowlist B list (`allowlist_b_core`) | Frozen in-repo, changes only via PR — re-check it covers general-election coverage before the run | none | P1 |

**Explicitly not recommended:** Ballotpedia and similar aggregators as a
*Profiler* source. Allowlist A is candidate-controlled by construction, so an
aggregator can never be one — it could only ever be an Allowlist B fact-check
source, where it would need a tier assignment and a licensing review. Skip it;
the DoE export plus candidate sites already cover the field.

---

## 5. Voter-facing copy

Three places still tell the voter about the closed primary. In a general
election that is at best irrelevant and at worst wrong — the general is open to
every registered voter regardless of party.

| Location | Current | Change |
|---|---|---|
| `src/components/features/YourRaces.tsx` (~line 132) | "Florida is a closed-primary state — you vote in a party's primary only if you're registered with that party…" | Lead with the general: open to every registered voter; keep the registration deadline |
| `src/app/api/voting-info/route.ts` (~line 137) | Same note in the email body | Same |
| `0004_official_links.sql` (~line 24) | Same sentence in a seeded `news_item` row | **`0004` is already applied to the live DB — editing the file changes nothing.** Ship an `UPDATE news_item SET summary = …` in migration `0010` |

The `0004` case is the one to watch: an agent that edits the seed file and sees
tests pass will believe it fixed live copy that is still wrong.

---

## 6. Deferred (YAGNI register)

| Deferred | Add when |
|---|---|
| Primary-results ingest | never — §0 |
| Automated official-site discovery | coverage > ~100 candidates |
| `prior_offices` population | a brief displays it |
| Amendment / retention *content* ingest | founder reverses `data-architecture.md` D3 |
| Per-county ballot-style ingest | coverage goes below congressional district |

---

## 7. Sub-agent task list

Dependency-ordered. **B1 gates B2 and B3** — neither mapping can be written
without the real status codes. **B2 requires `data-architecture.md` A1**, which
adds the column it writes.

| ID | Task | Files | Verify | Depends |
|---|---|---|---|---|
| **B1** | Dump the live `20261103-GEN` export (`FED`, `CAB`, `STA`); record the distinct `StatusCode`/`StatusDesc`/`PartyCode` values and how write-ins are identifiable. Throwaway script, findings recorded here | this file (§1) | Distributions recorded; write-in identification method named and confirmed against the live file | — |
| **B2** | T1: tier mapping, exclude `excluded` from `candidate_ids`, verbatim party code, `ballot_status` through the upsert. Unrecognised status ⇒ loud fail | `toollayer/cap_toollayer/intake.py`, `store.py` | `python3 toollayer/test_toollayer_skeleton.py` (100) green + new cases: a defeated filer is absent from `candidate_ids`; a write-in is present with `ballot_status='write_in'`; an unknown code fails loudly; re-parse is byte-identical (idempotent) | B1, A1 |
| **B3** | Populate `official_site` for briefed candidates — manual seed, one row per candidate, each URL human-verified | `scripts/` seed SQL | Every `ballot`-tier candidate in the 8 races has a non-NULL `official_site`; `store.candidate_scope` returns non-empty scope for each | B1 |
| **B4** | Fill `is_incumbent` / `incumbent_id` / `is_open_seat` from the existing T2 FEC candidates endpoint | `toollayer/cap_toollayer/intake.py`, `store.py` | Known FL-28 incumbent resolves correctly; a genuinely open seat sets `is_open_seat` | B2 |
| **B5** | Add Congress.gov as a T3-sibling read tool for federal incumbent records (P0 gap, §4) | `toollayer/cap_toollayer/intake.py` | Returns a schema-valid vote/bill payload for a known FL US-House member; unknown query type ⇒ `not_implemented`; missing key ⇒ `not_configured` | B1 |
| **B6** | Copy: both app strings + the `UPDATE news_item` in migration `0010` | `YourRaces.tsx`, `voting-info/route.ts`, `supabase/migrations/0010_general_election.sql` | `npm run build` clean; live `news_item` row shows general-election wording after 0010 | A1 |
| **B7** | Re-run the S2-01 acceptance end to end on real general data once B2–B4 land | `runtime/` | Profiler completes one real candidate: non-empty `stated_position` claims, each with a `candidate_self` source | B2, B3, B4 |

**Baseline that must stay green after every task** (AGENT_BRIEF §3):

```
python3 toollayer/test_toollayer_skeleton.py        # 100
(cd toollayer && python3 -m cap_toollayer.server --selfcheck)
python3 runtime/test_runtime.py                     # 39
node scripts/verify-migrations.mjs                  # if SQL changed
```

### Still-open founder gates (from AGENT_BRIEF §7, unchanged by this plan)

`SUPABASE_DB_URL` password · arm64 Python 3.12 venv with `mcp` + `psycopg` ·
demo seed loaded · key rotation. **B7 cannot run until those close.**
