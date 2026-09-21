# Roster recalibration — what is actually on our voters' ballots

**Written** 2026-09-21 · **Live project** `pqracitpmzpiqfnzlngw` · Every number
here was read either from the live database or from a **fresh DoE export pulled
on this date**, not from a planning doc. Methods are in §6.

This was prompted by a reasonable challenge: *we are past the primaries, so why
does FL-GOV carry 8 candidates instead of 2?* The answer is that 8 is correct —
but checking it surfaced a larger problem in the opposite direction.

---

## 1. The headline

**The roster is correct and post-primary. The ballot scope is not — we carry
about a third of what a covered voter actually sees.**

Two separate findings, and only the second is a problem:

1. The 21 races and 57 ballot candidates in the database are accurate, current
   as of today, and correctly filtered to the general election. Nothing to fix.
2. State legislative, judicial and ballot-measure contests are **missing
   entirely** — 43 more contests and 88 more candidates, all of them already
   sitting on disk, never loaded.

## 2. Why FL-GOV has 8 candidates, and why that is right

The roster was built from the DoE `20261103-GEN` export — the **November 3
general** election list, not a primary or qualifying list — filtered to status
codes `QUA`/`UNO` with `PartyCode <> 'WRI'`.

Today's fresh pull of the same export shows the Governor field as:

| Status | Count | Meaning |
|---|---|---|
| `QUA` ballot tier | **8** | on the general ballot |
| `DEF` Defeated | **15** | 5 DEM + 10 REP — the primary losers |
| `DNQ` / `WIT` / others | rest | never qualified, or withdrew |

Those 15 `DEF` rows **are** the primary having happened: David Jolly (DEM) beat
5 rivals, Byron Donalds (REP) beat 10. What remains is the general ballot:

> 1 DEM + 1 REP + 1 LPF (Libertarian) + 5 NPA = **8**

Florida general ballots carry minor-party nominees and NPA candidates who
qualified by petition or fee; they never appear in a party primary. So the
two-candidate intuition is a two-major-party model, and Florida is not that.

The same pattern holds across every race — **exactly one DEM and one REP in all
21**, plus minor-party and NPA extras:

| Shape | Races |
|---|---|
| DEM + REP only | 9 |
| DEM + REP + one LPF/IND/NPA | 10 |
| DEM only — FL-10, unopposed, not printed | 1 |
| DEM + REP + LPF + 5 NPA — FL-GOV | 1 |

**One item still worth a spot-check:** 5 NPA candidates on a statewide race is
high by historical standards. The DoE export is authoritative and says they
qualified, so this is not a blocker — but it is the kind of thing a county
sample ballot settles for free once they publish (§4).

## 3. Freshness: the 09-07 snapshot is still current

The on-disk roster was fetched 2026-09-07. A full re-fetch today across all six
office groups (FED, CAB, ATT, LEG, JUD, SPD) diffs to **one single change in
the entire state**:

```
- USR|006|  Michael Gist (NPA, QUA)  ->  WIT (Withdrew)
```

Congressional district 6 is **outside our covered counties**, so **zero changes
affect our ballot**. 419 contests and 623 ballot-tier candidates statewide, both
matching the snapshot.

This matters practically: it means we can load from the file already in the repo
rather than re-deriving anything.

> **Parsing note, learned the hard way.** Write-ins are identified by
> `PartyCode = 'WRI'`, **not** by status code — a write-in's status is `QUA`
> like anyone else's. Filtering on status alone silently pulls 17 write-ins into
> the ballot tier and makes a clean diff look like 18 changes.

## 4. The real gap: scope

For the 4 counties we cover — Miami-Dade (80 ZIPs), Broward (55), Hillsborough
(55), Orange (45), **235 ZIPs total** — here is the full ballot against what is
loaded:

| Contest | In scope | Candidates | In DB |
|---|---|---|---|
| Statewide — GOV, USS, AGR, CFO, ATG | 5 | 17 | ✅ |
| U.S. House | 15 printed + FL-10 unopposed | 40 | ✅ |
| **State House** | **30** | **60** | ❌ |
| **State Senate** | **9** | **20** | ❌ |
| **Circuit judge runoffs** | **4** | **8** | ❌ |
| **Supreme Court retention** | 1 justice | — | ❌ |
| **DCA retention** | 14 judges | — | ❌ |
| **Constitutional amendments** | 3 | — | ⏳ migration `0030` written, not applied |
| **Local — Tier A** (county commission, school board, mayor, clerk) | **17** | **34** | ⏳ migration `0031` written, not applied |
| **Local — Tier B** (CDD, water, drainage, soil & water) | 43 | 92 | ❌ available now — §5 |
| **Municipal contests + local ballot questions** | unknown | unknown | ⛔ needs sample ballots — §5b |

**21 races live vs. 124 candidate contests + 18 retention/measure questions
actually on the ballot** — and that still excludes municipal.

Everything above the county line **is already on disk** in
`docs/general-election/ballots/ballots_by_zip.json` (419 contests, fetched
09-07, verified current today). It needs loading, not fetching.

Loading it takes the candidate count from **57 to 145**. Adding the local
contests from §5 takes it to **271** — or **179** if Tier B is skipped.

## 4b. The amendments — done, pending one approval

Migration `supabase/migrations/0030_ballot_measures_2026.sql` seeds all three.
It passes `node scripts/verify-migrations.mjs` (PGlite, all RLS checks green).
**It has not been applied to the live database** — the apply was refused as a
production deploy and needs founder approval.

`0010` defines `ballot_summary` as "the text as it appears on the ballot", so
the gists in `ballots_by_zip.json` are not usable — they are our paraphrases.
The migration takes every string verbatim from the Division of Elections
booklet, *Proposed Constitutional Amendments for the General Election
(November 3, 2026)*, updated 2026-08-21.

> **If this is ever regenerated, do not hand-roll the PDF parse.** The booklet
> mixes literal and CID-encoded text. A hand-written extractor read most of it
> correctly and *silently dropped the line carrying Amendment 3's dollar
> figures* — "$150,000 in 2027 and $250,000 in 2028" simply vanished, leaving a
> grammatical sentence that was missing the numbers. It was caught only by
> reading the output. Use pypdf and diff against the PDF.

The migration deliberately writes no `measure_publication` rows: `0010`'s
trigger refuses to publish a measure without balanced support/oppose
arguments, and none exist yet. So the amendments stay invisible under RLS until
sourced arguments for both sides are written — which is editorial work, not
ingest.

## 5. Local races — NOT blocked. Correcting an earlier call.

An earlier pass of this document said county and municipal contests were
blocked until sample ballots publish. **That was wrong, and the correction
matters**, because it moves ~60 contests from "wait" to "available now".

Sample ballots are not the only county source. Qualifying closed in June, and
every one of our four counties publishes a **live candidate list** through
VoterFocus (VR Systems), their elections vendor. Each row carries a status, and
the status is what tells you who is on the November ballot:

| Status | Meaning |
|---|---|
| `Runoff` | advanced from the primary → **on the November ballot** |
| `Qualified` | qualified field → **on the November ballot** |
| `Unopposed` / `Elected` | decided; not printed (same rule as FL-10) |
| `Withdrawn` / `Defeated` / `Did not qualify` | off the ballot |
| `Qualified Write-In` | blank write-in line, no printed name |

One URL per county, server-rendered, no key:

```
https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=<county>
# c = orange | miamidade | broward | hillsborough
# all four default to the 11/3/2026 reporting group
```

### What is actually there

| County | Offices seen | Candidates | **Printed contests** | **Printed candidates** |
|---|---|---|---|---|
| Orange | 46 | 112 | 12 | 26 |
| Miami-Dade | 84 | 99 | 3 | 6 |
| Broward | 54 | 89 | 16 | 32 |
| Hillsborough | 155 | 206 | 29 | 62 |
| **Total** | | | **60** | **126** |

Miami-Dade's 3 is not an error — 73 of its county contests were settled
unopposed or in the primary.

### The editorial finding: these are two different things

Splitting the 60 by jurisdiction changes what "cover local races" means:

| Tier | Contests | Candidates | What |
|---|---|---|---|
| **A** | **17** | **34** | County Commission, School Board, County Mayor, Clerk of the Courts |
| **B** | 43 | 92 | CDD, water control, drainage, improvement and soil-and-water district seats |

Tier B is dominated by Community Development District supervisor seats — boards
for a single subdivision, often a few hundred voters. Briefing them costs more
than the whole state-level ballot and reaches almost nobody.

**Tier A is the local product.** 17 contests, every one of them exactly two
candidates, which is the clean two-column comparison the brief pages already
render. Tier B is defensible to list without briefing, or to skip entirely —
that is a founder call, not a data limitation.

### 5a. Tier A is built — `0031`, written and verified, not applied

`supabase/migrations/0031_local_tier_a_2026.sql` loads all 17 races and 34
candidates. **It has not been applied** — refused as a production deploy, same
as `0030`.

Verification is in two parts, because they prove different things.
`verify-migrations.mjs` proves the SQL applies and RLS still holds; it does
*not* prove a seed loaded the right rows — a data migration can run cleanly and
insert nothing. `scripts/verify-ballot-seeds.mjs` (new) asserts the contents of
both `0030` and `0031` against embedded Postgres: row counts, every
`candidate_ids` entry resolving to a real candidate, no orphaned candidate, no
NULL or bare-number county district, nothing published, and that Amendment 3
still contains its dollar figures. Its own assertions were mutation-tested —
feeding it a wrong expected count and a broken text match made it fail and exit
non-zero, so the passes are real. `verify-coverage`, `verify-unopposed`,
`verify-shared-ballot`, `verify-election-scope` and `verify-party-label` also
pass.

Three things it had to settle, each worth knowing:

**`race.level` did not admit county contests.** The CHECK was
`IN ('federal','state')`. `0031` widens it to include `'county'` and
`RaceLevel` in `src/types/schema.ts` widens to match, rather than
mislabelling a county race as state.

**Nonpartisan races rendered inconsistently.** School board is nonpartisan by
constitution and several county offices are by charter — those ballots print
no party. Miami-Dade's list emits the code `NOP`; Orange, Broward and
Hillsborough leave the field blank for the identical kind of race. Stored
verbatim, the same fact would have shown a chip reading "NOP" in one county
and nothing in the next. `party-label.ts` now treats `NOP` the way it already
treats `WRI` — a non-affiliation is not printed as an affiliation — with cases
added to `verify-party-label.ts`.

**These rows cannot reach a voter yet, by design.** A ZIP resolves to
congressional, state house and state senate districts. *Nothing* resolves a
voter to a county commission or school board district, because we hold no
boundary file for either. `coverage.ts` matches
`district IS NULL OR district = X`, so `0031` stores a county-scoped district
(`ORA-CC-2`) that matches nothing — whereas `NULL` would read as statewide and
show an Orange County race to a Broward voter. **Loading the roster is step
one; the geography is a separate piece of work** and is the gate on local
races actually appearing. Obtaining county commission and school board
boundaries for the four counties is the next local task after this.

`is_incumbent` is `false` on all 34 because these lists do not state it. That
is UNKNOWN, not a claim — it needs a source that actually says so.

## 5b. What sample ballots still add

Sample ballots remain unpublished, verified 2026-09-21:

| County | Status today | Mail window |
|---|---|---|
| Orange | page reads "2026 General Election — **Not available**" | — |
| Miami-Dade | sample ballot archive covers **2004–2024** only | — |
| Broward | 2026 General prep report posted, no sample ballot | domestic VBM **09-24 → 10-01** |
| Hillsborough | personalized lookup only, nothing public | **146,000 domestic ballots mail 10-01** |

Hillsborough has already mailed 2,721 military/overseas ballots and has
certified its primary results — consistent with everything above.

What is still genuinely gated on them, and only this: **municipal contests and
municipal/county ballot questions**, plus per-precinct confirmation of the
printed ballot. The candidate contests in §5 do not wait on any of it.

**That layer opens roughly 2026-09-24 → 10-01.** It is a publication date, not
a task.

## 6. Re-run it

```bash
# fresh DoE export — one POST per office group. No robots.txt exists (404),
# which under our own ingest convention means no rules. Needs a browser UA.
curl -A "<browser UA>" -H "Referer: https://dos.elections.myflorida.com/candidates/" \
  --data "elecID=20261103-GEN&status=All&cantype=ALL&office=FED&search=Search" \
  https://dos.elections.myflorida.com/candidates/extractCanList.asp
# repeat for CAB ATT LEG JUD SPD
```

**The raw export carries candidate addresses, phones and emails. It must never
be committed** — work in a scratchpad and derive only office/jurisdiction/
status/party/name, which is what `roster_2026gen_public.json` holds.

```sql
-- ballot composition by party, per race
SELECT r.race_id, c.party, count(*)
  FROM race r CROSS JOIN LATERAL unnest(r.candidate_ids) AS cid
  JOIN candidate c ON c.candidate_id = cid
 WHERE r.race_id NOT LIKE 'demo-%' AND c.ballot_status = 'ballot'
 GROUP BY r.race_id, c.party ORDER BY r.race_id;
```

## 7. What this changes about the plan

The candidate-profiles handoff (`candidate-profiles-handoff-2026-09-21.md`)
scoped the brief work at **57 candidates**. That number is a floor, not a
target:

- loading what is already on disk takes it to **145**
- adding local races takes it to **271**, or **179** skipping Tier B
- municipal contests will push it higher still, amount unknown until ~09-24

Under the founder's narrowed scope — House, Governor, Senate, amendments and
local — the brief target is **57 + 34 = 91 candidates** (Tier A local only),
which is a real, countable number rather than an open one.

Any per-candidate work planned against 57 — collecting campaign URLs, writing
briefs — would have to be redone once the rest lands. **Load the full roster
first, then scope the brief work against it.**

Also still true from that handoff, and unchanged by this: no real candidate has
an `official_site` (0 of 57) or `fec_id`, and nothing in the repo writes
`profile` / `issue` / `position` except the demo-seed SQL.

## 8. Suggested order

Scoped to the founder's 2026-09-21 call — **U.S. House, Governor, U.S. Senate,
amendments and local races**; state legislative and judicial retention parked.

1. **Apply `0030` and `0031`.** Both written and verified; both refused as
   production deploys and waiting on approval. Nothing else here is blocked by
   them.
2. **Get county commission and school board boundaries** for the four
   counties. Without this, `0031`'s 17 races are loaded but unreachable — see
   §5a. This is now the real gate on local races, not the data.
3. **Decide Tier B** — list the 43 special-district seats without briefs, or
   skip. Founder call.
4. **Sample ballots** at ~09-24 → 10-01 for municipal contests and local ballot
   questions; spot-check the 5 NPA governor candidates against one while there.
5. **Write the measure arguments** — both sides, sourced, or the amendments
   cannot pass `0010`'s balance trigger.
6. **Re-scope the profile/brief work** against whatever the roster then holds.

Parked, and still on disk whenever wanted: 30 state house, 9 state senate,
4 circuit judge, 15 retention questions.

Only steps 1 and 4 have external dependencies — an approval and a publication
date. Everything else is unblocked today.
