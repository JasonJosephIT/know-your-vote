# Handoff — candidate profiles and the 21 unbuilt races

**Written** 2026-09-21 · **Live project** `pqracitpmzpiqfnzlngw` · **Every number
below was read from the live database on that date**, not from a planning doc.
The queries are in §6 so you can re-run them rather than trust this file.

This exists because the founder asked "are there any more tasks?" while getting
the product out, and the honest answer turned out to be one item much larger
than the rest. It is ingest and editorial work, not news work.

---

> **SUPERSEDED IN PART, same day.** The founder had the nine demo races
> **deleted** (migration `0030_drop_demo_races.sql`, applied 2026-09-21), so
> §1's "all content belongs to a demo race" is now history rather than current
> state. What the live database holds after that:
>
> | | Before | After |
> |---|---|---|
> | races | 30 | **21, all real** |
> | ballot-tier candidates | 86 | **57 — this is the real ballot** |
> | `profile` / `issue` / `position` / `claim` | 29 / 28 / 88 / 261 | **0 / 0 / 0 / 0** |
> | `race_publication` | 9 draft | **0** |
> | `news_item`, `source` | 14, 87 | **14, 87 — untouched** |
>
> Zero orphaned rows on every check. `news_item` and `source` were never
> touched, because nothing in them referenced a demo race or candidate.
>
> **So §7 question 1 is answered, and the "86 ballot candidates" figure in §1
> was 57 real + 29 demo** — the demo candidates carried realistic names and a
> `ballot` status, which is why they were counted as real here at first.
>
> What does NOT change: there is still **no written brief anywhere**, all 21 real
> races are still empty, and nothing is published. The worklist in §5 and the
> remaining questions in §7 stand exactly as written. One thing got cleaner:
> the shape to copy is now `scripts/demo-seed*.sql` in the repo rather than rows
> in production, and there is no longer a set of invented races one
> `set_race_publication` call from being voter-facing.
>
> Also surfaced by the delete: `candidate_social_account` went 38 → **0**, so
> every social account in the database had belonged to a demo candidate. The 57
> real ballot candidates have none. That is a gap in the real roster, not
> something the deletion caused.

## 1. The headline

**Every piece of candidate brief content in the live database belongs to a demo
race. All 21 real races are empty.**

| | Count |
|---|---|
| Races | **30** — 9 `demo-*`, **21 real** (`FL-GOV-general`, `FL-SEN-general`, `FL-7…28-general`, `FL-AGR/CFO/ATG-general`) |
| Ballot-tier candidates | **86** (plus 182 excluded, 8 write-in) |
| …with a `profile` row | **29 — all of them in demo races** |
| …with no `profile` row | **57 — every real-race candidate** |
| `issue` / `position` / `claim` rows | 28 / 88 / 261 — **all attached to the 9 demo races** |
| Real races with any issue or position | **0** |

So the roster ingest worked: 86 real ballot candidates across 21 real races,
with real names — no candidate matches a demo naming pattern. What is missing is
everything written *about* them.

## 2. Two corrections to earlier framing

**"57 candidates are missing a profile row" undersells it, and "the roster is 29
demo fixtures" was wrong.** Both were said in session before the database was
queried. What is actually true:

- **`profile` is not a link table.** Its columns are `candidate_id`, `race_id`,
  `facts[]`, `positions[]`, `opinions[]`, `audit`. A profile row *is* the
  candidate's brief. So "add 57 profile rows" is not a backfill — it is writing
  57 briefs.
- **The 29 that exist are empty stubs.** All 29 have `cardinality(facts) = 0`
  and `cardinality(positions) = 0`, and every `audit->>'source'` is NULL. Not a
  single written brief exists live, in a demo race or anywhere.
- The real brief content the app renders lives in `issue`, `position`, `claim`
  and `claim_source`, keyed by `race_id` — which is why the 9 demo races look
  populated (28 issues, 88 positions, 261 claims) while their profile arrays are
  empty.

## 3. The good news: nothing is published, and nothing can leak

`race_publication` status, live:

| Status | Races |
|---|---|
| `draft` | **9 — all demo** |
| no row at all | **21 — all real** |

**No race is published, so no race is voter-visible**, and `briefs.ts` §24-25
records why that is stronger than a UI filter: *"RLS already hides every row tied
to a race that is not published — unpublished races are unreachable at the
database, not just here."* Publishing goes through `set_race_publication`
(migration `0018`), which is audited and `REVOKE`d from PUBLIC.

Two things follow, and the second is the reason this is not an emergency:

1. **The demo races cannot reach a voter** while they sit at `draft`. They carry
   realistic-sounding office names (`Governor of Florida`, `U.S. House —
   District 10`), so if one were ever published it would be indistinguishable
   from real content on the page. The gate is the only thing preventing that,
   and it is holding.
2. **There is also no product visible yet.** Zero published races means the
   candidate surface is entirely dark. Nothing here is broken; it is unbuilt.

## 4. What a voter hits today for a real candidate

`src/lib/briefs.ts:289-295` looks up the candidate's `profile` row and returns
`null` when there is none. `src/app/(public)/candidates/[candidateId]/page.tsx:32`
turns that into a not-found:

```ts
if (!detail || !detail.brief) {
```

So each of the **57** real ballot candidates has **no page**. That is correct
fail-closed behaviour — far better than rendering an empty brief that looks like
"this candidate has no positions" — but it means the real ballot is unreachable
even by direct URL.

## 5. The worklist, by race

All 21 need the same thing. Ordered by how many candidates each unblocks:

| Race | Office | Ballot candidates |
|---|---|---|
| `FL-GOV-general` | Governor | **8** |
| `FL-SEN-general` | U.S. Senator | 3 |
| `FL-7-general` … `FL-28-general` | U.S. Representative | 3 each: FL-7, 11, 12, 14, 16, 20, 25, 26, 28 |
| | | 2 each: FL-8, 9, 15, 22, 24, 27 |
| | | 1: FL-10 |
| `FL-AGR-general` | Commissioner of Agriculture | 2 |
| `FL-CFO-general` | Chief Financial Officer | 2 |
| `FL-ATG-general` | Attorney General | 2 |

Per race, reaching a publishable state needs: a `profile` row per ballot
candidate, `issue` rows for the race, `position` rows per candidate per issue,
and `claim` + `claim_source` rows backing them — then `set_race_publication`.
The existing demo races are the shape to copy: roughly 3 issues and 3 positions
per candidate, every claim carrying a source.

**Do not seed real races from `scripts/demo-seed*.sql`.** Those files are what
put the demo races in the live database in the first place, and their content is
invented. A real race's positions have to come from the candidate's own material
with a citation per claim — which is what `scripts/candidate-site-ingest.ts` and
the policy-categorization work merged in PR #55 exist to support.

## 6. Re-run the numbers

```sql
-- roster vs profiles
SELECT count(*) FILTER (WHERE ballot_status='ballot') AS ballot FROM candidate;
SELECT count(*) FROM profile;
SELECT count(*) FROM profile WHERE cardinality(facts)=0 AND cardinality(positions)=0;

-- which races are built, and which are demo
SELECT r.race_id,
       (SELECT count(*) FROM issue i WHERE i.race_id=r.race_id)    AS issues,
       (SELECT count(*) FROM position p WHERE p.race_id=r.race_id) AS positions,
       (SELECT count(*) FROM profile pr WHERE pr.race_id=r.race_id) AS profiles
  FROM race r ORDER BY r.race_id;

-- what is publishable / published
SELECT COALESCE(rp.status,'(no row)') AS status, count(*)
  FROM race r LEFT JOIN race_publication rp USING (race_id) GROUP BY 1;
```

## 7. Open questions for the founder

1. **Should the 9 demo races exist in the live database at all?** They are
   `draft` and therefore harmless today, but they are invented content one
   `set_race_publication` call away from being voter-facing, and their office
   names do not announce themselves as fake. Deleting them removes that
   possibility; keeping them keeps a working example of the target shape.
2. **Which races launch first?** `FL-GOV-general` unblocks 8 candidates, the
   most of any race; the 21 do not have to land together.
3. **Where does the brief content come from** — the candidate-site ingest
   (PR #55), hand-writing, or both — and who signs off a position before it is
   published? The publication door is audited precisely so that answer is
   recorded rather than assumed.

## 8. Not blocked by this

The news side is independent and does not wait on any of the above: 37 outlets
listed, 32 designated `unrated`, **24 sweepable** after the 2026-09-21
AI-crawler hold. Candidate *news* matching does read the roster from
`profile` ⋈ `candidate`, so it would only ever attach stories to profiled
candidates — one more reason the profile work is upstream of the news work
being useful on candidate pages.
