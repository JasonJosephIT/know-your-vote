# Data Ingest — Primary → General

> ⚠️ **Superseded in part — read `news-fairness.md` first.** The founder retired
> candidate **briefs** on 2026-09-06 (bio + per-candidate news cards instead), so
> anything here about briefing, the audit population, or the Balance Audit as a
> publication gate no longer applies. **Still live:** the whole T1 parser story — B1's findings, the tier mapping, `official_site`
> (I3), and the copy fixes. Ingesting the right ballot matters more under the
> pivot, not less.

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

**Do not guess the codes.** Look at the real file first. That is what
`scripts/doe-code-dump.py` does — it fetches `20261103-GEN` for each office
group (`FED`, `CAB`, `LEG`) and prints, for the 8 target races only, the
distinct `StatusCode`/`StatusDesc` and `PartyCode`/`PartyDesc` counts plus any
column the current parser doesn't know about (a candidate-type column would be
the clean write-in signal). If no column distinguishes write-ins, fetch twice
with different `cantype` values and diff on `AcctNum` — a set difference, not a
parser rewrite.

It deliberately does **not** reuse `parse_candidate_list`: that parser collapses
`StatusCode` to `{qualified, withdrawn, other}` and `PartyCode` to
`{REP, DEM, NPA, other}`, discarding exactly the values B1 exists to find.

> **B1 cannot run from a Claude Code remote session.** Verified 2026-09-06: the
> session's egress proxy answers `403` to CONNECT for every external host —
> `dos.elections.myflorida.com`, `api.open.fec.gov`, `www.flsenate.gov`,
> `dos.fl.gov`, and even `example.com`. Only the infrastructure allowlist (npm,
> PyPI, the Anthropic API) is reachable. **Run the script on the founder's
> machine** — the same box that live-verified T1–T3 on 2026-07-10 — and paste
> the output back. The same limit applies to **B4, B5 and B7**: every task that
> touches a live external endpoint is local-only.
> **Runbook for that machine: `local-session.md`.**

*This dump is a prerequisite for I1 and I2 alike: neither mapping can be written
correctly without it.*

### B1 results — live run 2026-09-06

Run on the founder's machine with `/usr/bin/python3` (3.9.6). Script stdout,
verbatim — aggregate only, no candidate row travels:

```
## office=FED — 283 rows, 26 columns
   columns: AcctNum, VoterID, ElectionID, OfficeCode, OfficeDesc, Juris1num, Juris2num, StatusCode, StatusDesc, PartyCode, PartyDesc, NameLast, NameFirst, NameMiddle, SuppressAddress, Addr1, Addr2, City, State, Zip, County, Phone, TrsNameLast, TrsNameFirst, TrsNameMiddle, Email
   unknown-to-parser columns: StatusDesc, PartyDesc
   rows in the 8 target races: 26
   StatusCode / StatusDesc across target races:
      'QUA'      'Qualified'                            x8
      'DNQ'      'Did Not Qualify'                      x8
      'WIT'      'Withdrew'                             x5
      'DEF'      'Defeated'                             x4
      'UNO'      'Unopposed'                            x1
   PartyCode / PartyDesc across target races:
      'REP'      'Republican Party of Florida'          x12
      'DEM'      'Florida Democratic Party'             x11
      'WRI'      'Write-In'                             x2
      'NPA'      'No Party Affiliation (Partisan)'      x1

## office=CAB — 83 rows, 26 columns
   columns: AcctNum, VoterID, ElectionID, OfficeCode, OfficeDesc, Juris1num, Juris2num, StatusCode, StatusDesc, PartyCode, PartyDesc, NameLast, NameFirst, NameMiddle, SuppressAddress, Addr1, Addr2, City, State, Zip, County, Phone, TrsNameLast, TrsNameFirst, TrsNameMiddle, Email
   unknown-to-parser columns: StatusDesc, PartyDesc
   rows in the 8 target races: 83
   StatusCode / StatusDesc across target races:
      'DNQ'      'Did Not Qualify'                      x28
      'DEF'      'Defeated'                             x19
      'QUA'      'Qualified'                            x17
      'WIT'      'Withdrew'                             x17
      'REM'      'Removed'                              x2
   PartyCode / PartyDesc across target races:
      'REP'      'Republican Party of Florida'          x31
      'DEM'      'Florida Democratic Party'             x23
      'NPA'      'No Party Affiliation (Partisan)'      x16
      'WRI'      'Write-In'                             x8
      'IND'      'Independent Party of Florida'         x3
      'LPF'      'Libertarian Party of Florida'         x1
      'CPF'      'Constitution Party of Florida'        x1

## office=STA — 0 rows, 26 columns
   columns: AcctNum, VoterID, ElectionID, OfficeCode, OfficeDesc, Juris1num, Juris2num, StatusCode, StatusDesc, PartyCode, PartyDesc, NameLast, NameFirst, NameMiddle, SuppressAddress, Addr1, Addr2, City, State, Zip, County, Phone, TrsNameLast, TrsNameFirst, TrsNameMiddle, Email
   unknown-to-parser columns: StatusDesc, PartyDesc
   rows in the 8 target races: 0
   StatusCode / StatusDesc across target races:
   PartyCode / PartyDesc across target races:
```

Whole-file counts from the same fetch (all races, not just the 8 targets),
computed by a throwaway aggregate — kept here because D2's CHECK applies to
every ingested row, not only the target field:

| Office group | Rows | StatusCode | PartyCode |
|---|---|---|---|
| `FED` (269 USR + **14 USS**) | 283 | DEF 107 · QUA 86 · DNQ 57 · WIT 32 · UNO 1 | REP 134 · DEM 106 · NPA 22 · WRI 11 · LPF 5 · IND 3 · FFP 1 · **MGT 1 (empty `PartyDesc`)** |
| `CAB` (63 GOV + 9 AGR + 7 CFO + 4 ATG) | 83 | DNQ 28 · DEF 19 · QUA 17 · WIT 17 · REM 2 | REP 31 · DEM 23 · NPA 16 · WRI 8 · IND 3 · LPF 1 · CPF 1 |

> ⚠️ **Read the USS number.** Those 14 U.S. Senate filings were skipped by
> `parse_candidate_list` until 2026-09-07 — `USS` was in neither office map,
> so a statewide federal race was absent from every ballot with nothing in the
> run report to say so. This table recorded the count all along. Fixed in
> `intake.py` (`_NO_DISTRICT_RACES`, race `FL-SEN-general`, level `federal`);
> full write-up in `db-audit-2026-09-07.md` §1. **Answered 2026-09-07:** the
> ballots-by-ZIP read split those 14 filings **3 ballot / 0 write-in / 11
> excluded**, and the per-race tier table below now carries the row. The demo
> fixture's guess of four Senate candidates was wrong.

#### Q1 — which status codes appear post-primary

**Eight.** Six in the target races B1 measured — `QUA` Qualified, `UNO`
Unopposed, `DEF` Defeated, `DNQ` Did Not Qualify, `WIT` Withdrew, `REM`
Removed — plus two the 2026-09-07 ballots-by-ZIP whole-file read found outside
them: `XTL` Transferred to Local (7 state-legislative rows) and `DEC` Deceased
(1 circuit judge). **The primary loser is `DEF`.** Mapping onto the D1 tiers
(`data-architecture.md`):

| `StatusCode` | `StatusDesc` | Tier | `qualifying_status` |
|---|---|---|---|
| `QUA` | Qualified | `ballot` — or `write_in`, see Q2 | `qualified` |
| `UNO` | Unopposed | `ballot` | `qualified` |
| `DEF` | Defeated | `excluded` | `withdrawn` |
| `DNQ` | Did Not Qualify | `excluded` | `withdrawn` |
| `WIT` | Withdrew | `excluded` | `withdrawn` |
| `REM` | Removed | `excluded` | `withdrawn` |
| `XTL` | Transferred to Local | `excluded` | `other` |
| `DEC` | Deceased | `excluded` | `other` |
| anything else | — | loud `status='fail'` (Risk R1) | — |

`XTL` and `DEC` take `other` rather than `withdrawn`: the filing moved to a
county office, or the filer died. Neither is the candidate's own withdrawal,
and the column gates social-account ingestion (`CAP_Schema_v1.md`).

> **Correction to `ballots-handoff.md` F3.** That note said an unmapped `XTL`
> would stop the next live run. It would not have. Every `XTL` row is
> state-legislative and the `DEC` row is a circuit judge, so the office filter
> in `parse_candidate_list` drops all eight *before* `_ballot_status` is
> consulted — verified by running the parser against rows of both shapes. The
> trap is real but latent: it springs the first time a targeted office carries
> one of these codes, which is exactly what widening coverage past the eight
> races would do. Mapped now, with a test that fails if either half of the
> mapping is removed.

The form's status filter also offers `ACT` Active and `ELE` Elected; neither
is in the export today. B2 must **not** pre-map them: `ELE` will appear after
certification and means the race is decided. Leave both unrecognised → fail
until they are seen in a real file.

#### Q2 — is there a write-in column

No candidate-type column. The two "unknown-to-parser" columns are only
`StatusDesc` and `PartyDesc`. **The write-in signal is `PartyCode = 'WRI'`
(`PartyDesc = 'Write-In'`).**

Precedence is status first, then party. Write-ins carry every status code —
the whole-file cross-tab shows `WRI` rows with `DNQ` (4), `REM` (2) and `WIT`
(1) as well as `QUA` (12). So: a row whose status is in the excluded set is
`excluded` regardless of party; a `QUA`/`UNO` row with `WRI` is `write_in`;
any other `QUA`/`UNO` row is `ballot`.

**The `cantype` fallback in `local-session.md` is void.** Read off the DoE
download form on 2026-09-06, the `cantype` select is `STA` State Candidates /
`LOC` Local Candidates / `ALL` State & Local — a jurisdiction filter, not a
candidate type. A cantype diff would separate county-level filers from
state-level ones, not write-ins from printed lines. No diff fetch was needed.

#### Q3 — party codes beyond REP/DEM/NPA

In the 8 target races: `WRI` Write-In, `IND` Independent Party of Florida,
`LPF` Libertarian Party of Florida, `CPF` Constitution Party of Florida.
Whole-file adds `FFP` Florida Forward Party and `MGT`, which arrives with an
**empty `PartyDesc`** (one FED row). **D2 confirmed:** three real minor
parties in the target field alone would be flattened into `other` by the
current CHECK, and the read model's raw-code fallback must tolerate a code that
has no label at all. Note `NPA`'s description is
"No Party Affiliation (Partisan)".

#### Per-target-race tier counts

What B2's parser must produce from today's file, and what B3 must seed.
Aggregate only — race IDs are public.

| Race | `ballot` | `write_in` | `excluded` | Note |
|---|---|---|---|---|
| FL-GOV | 8 | 2 | 53 | 15 DEF · 22 DNQ · 14 WIT · 2 REM |
| FL-ATG | 2 | 0 | 2 | |
| FL-CFO | 2 | 0 | 5 | |
| FL-AGR | 2 | 1 | 6 | |
| FL-10 | **1** | 0 | 6 | the file's only `UNO` row — a one-candidate race; A3's `unopposed` flag is live, not hypothetical |
| FL-15 | 2 | 1 | 2 | |
| FL-23 | 2 | 0 | 5 | |
| FL-28 | 3 | 0 | 4 | |
| FL-SEN | 3 | 0 | 11 | measured 2026-09-07; Moody (REP) · Nixon (DEM) · Gillespie (NPA) |
| **Total** | **25** | **4** | **94** | B3 seed = 25 `official_site` rows |

Without I1 fixed, 83 excluded filers plus 4 write-ins would enter
`race.candidate_ids` for 22 real ballot lines.

#### Two corrections the run surfaced

- The script's third office group **`STA` is not a valid `office` value** — that
  is why it returned 0 rows, not because the list is empty. The form offers
  `All`, `FED`, `CAB`, `ATT`, `LEG`, `JUD`, `SPD`; state legislature is `LEG`.
  Fixed in `scripts/doe-code-dump.py`. No target race is affected (all eight
  are `FED`/`CAB`).
- The python.org 3.11 **alpha** first on the founder's `PATH` has no CA bundle
  (`CERTIFICATE_VERIFY_FAILED` on every fetch). `/usr/bin/python3` works.
  Noted in `local-session.md`.

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
| `race.is_open_seat` | derived from the same T2 field — open **only** when the validated 2026 House field has no `I` row *and* no `C` row (all `O`); `C` is "challenger *to* an incumbent", so a C-without-I field asserts an incumbent the run did not see and refuses instead | none |
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
| ~~`0004_official_links.sql` (~line 24)~~ ✅ | Same sentence in a seeded `news_item` row | **Done** — `0015_general_election_copy.sql`. `0004` is already applied live, so editing the file would have changed nothing a voter sees; the fix is an `UPDATE`. Confirmed against production first: `/api/news` returned the stale summary verbatim on 2026-09-07 |

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

Dependency-ordered. **B1 is done (2026-09-06) — B2 and B3 are unblocked**; the real status
codes are in §1. **B2 requires `data-architecture.md` A1**, which
adds the column it writes.

| ID | Task | Files | Verify | Depends |
|---|---|---|---|---|
| **B1** ✅ | **Done 2026-09-06** — live run on the founder's machine; distributions, the write-in signal (`PartyCode='WRI'`, status takes precedence) and the D1 status→tier table are recorded in §1 *B1 results* | `scripts/doe-code-dump.py`, this file (§1) | `--selftest` passes ✅; live run ✅ — six status codes found (`DEF` is the primary loser), write-in signal confirmed, `cantype` fallback shown void | — |
| **B2** | T1: tier mapping, exclude `excluded` from `candidate_ids`, verbatim party code, `ballot_status` through the upsert. Unrecognised status ⇒ loud fail | `toollayer/cap_toollayer/intake.py`, `store.py` | `python3 toollayer/test_toollayer_skeleton.py` (100) green + new cases: a defeated filer is absent from `candidate_ids`; a write-in is present with `ballot_status='write_in'`; an unknown code fails loudly; re-parse is byte-identical (idempotent) | B1, A1 |
| | **✅ B2 done 2026-09-07.** `_ballot_status(status, party)` tiers each row, status before party (B1's cross-tab found `WRI` rows carrying `DNQ`, `REM` and `WIT`, so a write-in that withdrew is excluded for withdrawing). Only `ballot` rows enter `candidate_ids`; everyone else is still **stored** as a candidate, because an invisible exclusion is not an auditable one. `_PARTY` is deleted — the DoE `PartyCode` is stored verbatim (D2). `_STATUS` gains the four post-primary codes; an unrecognised one raises rather than defaulting, so `ELE` (which arrives after certification and means the race is decided) stops the run instead of publishing a settled race as a live one. `ballot_status` rides the `upsert_candidate` ON CONFLICT, defaulting to `'ballot'` for pre-B2 callers. The parse result and the tool result both carry per-tier counts, so the exclusion is visible in a run report and not only in the database. **107 tests green** (was 100; the fixture moved off `ACT`, which is on the DoE form but not in the file, and gained `UNO`/`DEF`/`WRI`/`LPF` rows). Mutation-checked: removing the ballot filter, treating write-ins as ballot lines, checking party before status, silently excluding an unknown status, and re-flattening minor parties each fail the suite. `--selfcheck` green. |
| **B3** | Populate `official_site` for briefed candidates — manual seed, one row per candidate, each URL human-verified | `scripts/` seed SQL | Every `ballot`-tier candidate in the 8 races has a non-NULL `official_site`; `store.candidate_scope` returns non-empty scope for each | B1 |
| **B4** | Fill `is_incumbent` / `incumbent_id` / `is_open_seat` from the existing T2 FEC candidates endpoint | `toollayer/cap_toollayer/intake.py`, `store.py` | Known FL-28 incumbent resolves correctly; a genuinely open seat sets `is_open_seat` | B2 |
| | **Code done 2026-09-07 — live DB write still pending (`local-session.md`).** Built behind the existing `doe_file_intake` handler with a `fill_incumbency: true` payload flag, **not a new tool**: every guard core enumerates `ALL_TOOLS`/`GRANTED_TOOLS` by name and cores are never edited, so a new `fec_incumbency` tool would be denied by every identity. Flag absent ⇒ byte-identical to pre-B4 behaviour and the FEC is never called; no key ⇒ `not_configured` before anything is fetched. A pure `resolve_incumbency(race, candidates, fec_rows)` does the matching (`fec_id` first, then `LAST, FIRST` name match); `store.write_incumbency` writes `race` and `candidate` in separate UPDATEs so a later DoE re-run cannot wipe incumbency. `is_open_seat` is true **only** when the validated 2026 House field has no `I` and no `C` — all `O`. **Refusal classes** (nothing written for the race, `is_open_seat` absent entirely so a caller cannot read a missing answer as a negative one): unmatched or duplicate `I` row; two `I` rows; unknown or null `incumbent_challenge`; a `C` row with no `I` row anywhere (the field asserts an incumbent this run did not see); a malformed row (missing `office`, or `election_years` missing/null/not a list); a truncated FEC page (or one with no `pagination.count`); a malformed `results` envelope; a non-numeric district; a name collision on an `I` row. Unresolved-but-not-refused: a roster candidate matching 0 or ≥2 rows, or two roster candidates on one non-`I` row — recorded with a reason, nothing written for them, and they do not block the field's verdict. |
| **B5** | Add Congress.gov as a T3-sibling read tool for federal incumbent records (P0 gap, §4) | `toollayer/cap_toollayer/intake.py` | Returns a schema-valid vote/bill payload for a known FL US-House member; unknown query type ⇒ `not_implemented`; missing key ⇒ `not_configured` | B1 |
| ~~**B6**~~ ✅ | Copy: both app strings + the `UPDATE news_item` | `voting-info/route.ts`, `YourRaces.tsx` (both **already fixed on `main` by another session**), `supabase/migrations/0015_general_election_copy.sql` (this change) | `node scripts/verify-migrations.mjs` green, including a new invariant asserting the row actually changed — mutation-checked: a trailing-slash typo in the `WHERE` makes it fail |
| **B7** | Re-run the S2-01 acceptance end to end on real general data once B2–B4 land | `runtime/` | Profiler completes one real candidate: non-empty `stated_position` claims, each with a `candidate_self` source | B2, B3, B4 |

**Baseline that must stay green after every task** (AGENT_BRIEF §3):

```
python3 toollayer/test_toollayer_skeleton.py        # 170
(cd toollayer && python3 -m cap_toollayer.server --selfcheck)
python3 runtime/test_runtime.py                     # 39
node scripts/verify-migrations.mjs                  # if SQL changed
```

### Still-open founder gates (from AGENT_BRIEF §7, unchanged by this plan)

`SUPABASE_DB_URL` password · arm64 Python 3.12 venv with `mcp` + `psycopg` ·
demo seed loaded · key rotation. **B7 cannot run until those close.**

### B6 notes — 2026-09-07

Two-thirds of B6 was already done by another session: the closed-primary
strings in `YourRaces.tsx` and `voting-info/route.ts` are gone from `main`.
What remained was the part that is easy to believe is finished when it is not
— **the database row**. Production still served
*"Florida is a closed-primary state — party registration determines your
primary ballot"* verbatim, because `0004` is applied and nobody had shipped an
`UPDATE`. That is precisely the trap this table flagged.

The new migration carries no date. Election dates live in `election_event`,
where `verified_by` gates each row behind human verification; duplicating the
October 5 deadline into a news summary would create a second, ungated copy.

`scripts/build-election-seed.mjs` also mentions the August 18 primary, and was
deliberately left alone — it is a source citation documenting both the primary
and general dates from `dos.fl.gov`, not voter-facing copy.

**Still stale, and NOT covered by B6:** the live feed also carries an
`election_news` row titled *"Miami-Dade sets early-voting schedule for August
18 Primary"* — accurate when written, now three weeks past. That is agent
content rather than seeded copy, so removing or superseding it is a content
decision for whoever owns the feed, not a copy fix.
