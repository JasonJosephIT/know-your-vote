# Decision record — the `listed` tier: the roster goes up before the briefs

**Written** 2026-09-23 · **Live project** `pqracitpmzpiqfnzlngw` · The counts in
§1 were **read from the live database on 2026-09-23**; §6 has the queries so
you can re-run them rather than trust this file. Ships as
`supabase/migrations/0033_listed_publication.sql` (the tier) and
`scripts/list-ballot-2026.sql` (the go-live flip, run by hand).

This exists because the week's data work — the whole 2026 general roster, the
three amendments' ballot text, the decided county seats, the FL-GOV official
sites — was in the database and could not reach a single voter. Not because
anything was broken: because the publication gate had one setting, and that
setting meant "the audited brief", which nobody has written yet.

**Go-live, done 2026-09-23.** PR #77 merged and deployed; `0033` applied live
(53 `draft` rows seeded, nothing visible); `scripts/list-ballot-2026.sql` run
through the door: 53 races listed, 3 measures listed, one `admin_action` row
each. Read back as `anon` afterwards: 53 races, 106 ballot candidates, 3
measures, 7 FL-GOV official sites; 0 profiles, issues, positions, claims or
measure arguments; 0 non-ballot candidates. The roster is up and no claim is.

---

## 1. The headline

**Everything a voter could have used this week was dark by construction.** RLS
(`0002`, `0011`) lets anon read `race`, `candidate` and `ballot_measure` only
through a publication row at `status = 'published'`, and no such row exists.

| Read live 2026-09-23                            | Count                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| General-election races                          | **53** — 17 federal, 4 state, 32 county                          |
| Ballot-tier candidates                          | **106** — 98 `qualified`, 6 `unopposed`, 10 `elected_in_primary` |
| …with a verified `official_site`                | **7** (FL-GOV; `candidate-sites-2026-09-21.md`)                  |
| Ballot measures                                 | **3** (Amendments 1–3, verbatim DoE ballot text, `0030`)         |
| `profile` / `issue` / `position` / `claim` rows | **0 / 0 / 0 / 0**                                                |
| `race_publication` / `measure_publication` rows | **0 / 0**                                                        |
| `news_item` rows                                | **14**, none issue-tagged                                        |
| `source` rows                                   | **87**                                                           |

So the home page said "The ballot isn't published yet", `/candidates` listed
nothing, and every `/races/*` said "still in review". The briefs are weeks of
editorial work per race (`candidate-profiles-handoff-2026-09-21.md` §5). The
roster is not.

## 2. The decision: two tiers

The non-negotiable is about **claims**: every claim traceable to a source, and
a race's brief reachable only when every candidate Profile has
`balance_check_passed`. Who is on the ballot, their party as filed, their
official site, whether the seat was already decided, and an amendment's ballot
wording are **public record** from the Division of Elections (the
`20261103-GEN` candidate export) and the county Supervisors of Elections
(VoterFocus candidate lists). None of it is our writing, and there is nothing
in it for the Balance Audit to balance.

| Status                | Anon can read                                                                                                                                                                          | Voter sees                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `draft` / `in_review` | nothing                                                                                                                                                                                | nothing                                                                                                                              |
| **`listed`** (new)    | `race`; `candidate` for ids in `race.candidate_ids` (ballot tier only); `race_publication.status`; verified `candidate_social_account`; `ballot_measure`; `measure_publication.status` | **the roster** — names, party chip, Incumbent chip, official site, verified socials, decided-seat facts, the amendment's ballot text |
| `published`           | everything, exactly as before                                                                                                                                                          | the audited brief — says / done / verified, and a measure's case for and against                                                     |

A listed race **never** shows a position, a claim, a fact-check, a summary, or
a measure argument. Not a partial set; none.

## 3. The safety argument

It is one sentence, and the rest of this section is evidence for it: **the
policies on the brief tables were not touched.**

**Changed by `0033`** (dropped by name and recreated to accept
`status IN ('listed','published')`):

- `anon_read_published` on `race_publication`
- `anon_read_race` on `race`
- `anon_read_candidate` on `candidate` — the `0002` path (a profile in a
  published race) is kept, and a second path added: named in
  `race.candidate_ids` of a listed-or-published race. `candidate_ids` holds
  ballot-tier ids only (`data-architecture.md` D1), so write-ins and excluded
  filers (DEF / DNQ / WIT / REM) stay invisible on both paths.
- `anon_read_social` on `candidate_social_account` — verified handles only,
  as before. An unverified handle is a claim about who runs an account;
  listing does not make it.
- `anon_read_measure_publication` on `measure_publication`
- `anon_read_ballot_measure` on `ballot_measure`

**Not changed** — each still reads `'published'` exactly as `0002` / `0011`
wrote it, and none mentions `listed`:

- `profile`, `issue`, `position`, `claim`, `claim_source`, `measure_argument`

So a listed race cannot leak an unaudited claim whatever rows exist beneath
it: the database refuses, not the UI. `scripts/verify-migrations.mjs` pins this
with a listed race that **does** carry a profile, an issue, a claim and a
claim source, and asserts anon sees none of them.

Also in `0033`:

- Both status CHECKs widened to include `listed`.
- `set_race_publication` recreated to accept `listed`, with its own audit
  verbs: `list` entering the tier, `unlist` leaving it. `publish` /
  `unpublish` keep their meaning and take precedence, so `published → listed`
  logs as an unpublish (the brief came down). Listing never stamps
  `published_at`. Grants re-stated by name (the `0020` lesson).
- A `draft` `race_publication` row seeded for every general race that has
  none, because the door refuses a race without a row. Draft is invisible. A
  closing assertion refuses to commit if the migration changed the listed or
  published count.
- Measures: `0010`'s balance trigger only fires on `published`, so a listed
  measure with zero arguments is accepted, and its arguments stay freely
  editable until the balanced set is published.

The UI adds a second, independent guard: the read layers only render a
roster from a listed row, and `src/lib/measure-status.ts` fails closed —
anything but exactly `listed` or `published` means "do not render"
(`scripts/verify-measure-balance.ts`).

## 4. What each surface renders in listing mode

The rule everywhere: the full brief is unchanged; a row that is visible with
no brief behind it gets a **listing**, and the listing says it is one. Copy
uses "listed", "on the ballot" and "brief in review" — never "published" for a
listed race.

| Surface                                                  | Listing mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (`SharedBallot`)                                    | Statewide race cards, each captioned "Names on the ballot · brief in review" (a published race says "Full brief"); the ballot questions below                                                                                                                                                                                                                                                                                                                               |
| Ballot questions (`BallotQuestions`)                     | One card per amendment; a listed one adds "· arguments in review" after the threshold                                                                                                                                                                                                                                                                                                                                                                                       |
| `/measures/[id]`                                         | Header, the 60% threshold, **"What the ballot says"** (verbatim `ballot_summary`), the full-text link — and, in place of the YES/NO comparison, a card: "The case for and against are in review. We publish arguments only when both sides are present and comparably sourced — until then, this is the official ballot text and nothing else." Never two empty columns                                                                                                     |
| `/races/[id]` (`RaceListing`)                            | Status line (decided in August / elected without opposition / one qualifier / ordinary contest — `src/lib/listing-copy.ts`), where the names come from, the county note for printed county seats, the write-in note, then one identical card per candidate in `orderCandidates()` order: name, party chip, Incumbent chip, Official site, verified socials, Save, and the same "Brief in review" line on every card                                                         |
| `/candidates/[id]` (`CandidateListing`)                  | The same card as the race page, with the name as the heading, the race linked, and the decided-seat fact when the seat is not on the November ballot                                                                                                                                                                                                                                                                                                                        |
| Your ballot (`YourRaces` + `CountyRaces`)                | District races with the same caption as home; county races listed **per county** — "On the November ballot" and "Already decided" — with a caption saying which seats are on your ballot depends on your commission or school-board district, which we cannot place yet                                                                                                                                                                                                     |
| Candidates directory (`/candidates`, `CandidateBrowser`) | Every candidate on the ballot across the four counties, mapped to a race through `race.candidate_ids` rather than `profile`; county races included; "Official site" on the card; the link reads "Read their brief" only when a profile row is readable, otherwise "About this candidate"; seats already decided stay searchable with a status line ("Elected without opposition — not printed on the ballot" / "Decided in the August primary — not printed on the ballot") |
| `sitemap.xml`                                            | Race URLs from every visible race; candidate URLs from the flattened `race.candidate_ids` of visible races (was `profile`); the outlets index at `/news/outlet`                                                                                                                                                                                                                                                                                                             |
| `/methodology`                                           | New "Listed before briefed" section; the scrutiny table shows counts only for briefed races, and lists the rest as "Listed, not yet briefed" — no count is not a count of zero                                                                                                                                                                                                                                                                                              |
| News                                                     | Unchanged by the tier; cards carry no lean (the outlet page does), and issue chips appear only on tagged rows                                                                                                                                                                                                                                                                                                                                                               |

## 5. Go-live sequence

**The order matters.** Code written for published-only rows can read a roster
as an empty brief, so the listing UI goes first, and the flip goes last.

1. **Merge the PR; Vercel deploys.** Safe against the live DB as it stands:
   with no `listed` row, every surface behaves as before.
2. **Apply `0033` live** — through the Supabase migration tool (name
   `listed_publication`) or `psql -f supabase/migrations/0033_listed_publication.sql`.
   Safe on its own: it widens what `listed` _could_ show and seeds `draft`
   rows only. With no `race_publication` rows live today, expect
   `NOTICE: 0033: seeded 53 draft race_publication row(s); listed=0,
published=0 (unchanged)`.
3. **Run `scripts/list-ballot-2026.sql` by hand** (Supabase SQL editor, MCP
   `execute_sql`, or `psql -f`). One transaction: every `draft` general race →
   `listed` through `set_race_publication` (one `admin_action` row each,
   action `list`), and a `listed` `measure_publication` row for each of the
   three amendments with its own `admin_action` row. Actor and reason are
   constants at the top of its `DO` block — edit them if someone other than
   the founder runs it. Expect `NOTICE: list-ballot-2026: listed 53 race(s)
and 3 measure(s)`. A second run is a no-op.
4. **Confirm** with §6's queries, then load `/`, one federal, one state and
   one county `/races/*`, a decided county seat, and `/measures/FL-AM3-general`.

**Cache.** Reads are `unstable_cache`d for an hour under the `races`,
`measures`, `race:<id>`, `candidate:<id>` and `measure:<id>` tags. After step
3, pages catch up within the hour; revalidate those tags (or redeploy) to see
it at once.

**To reverse** (by hand, through the door, touching nothing published):

```sql
-- races: back to draft, logs 'unlist' per race
SELECT set_race_publication(rp.race_id, 'draft', '<actor>', '<why>')
  FROM race_publication rp JOIN race r USING (race_id)
 WHERE r.election = 'general' AND rp.status = 'listed';

-- measures: no door exists, so delete and log in one statement,
-- one admin_action row per measure (mirrors the go-live script)
WITH removed AS (
  DELETE FROM measure_publication WHERE status = 'listed'
  RETURNING measure_id
)
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
SELECT '<actor>', 'unlist', 'measure_publication', measure_id,
       jsonb_build_object('prior_status', 'listed', 'new_status', NULL,
                          'reason', '<why>')
  FROM removed;
```

`0033` itself needs no reversal: with no `listed` row it exposes nothing.

## 6. Re-run the numbers

```sql
-- roster
SELECT level, count(*) FROM race WHERE election = 'general' GROUP BY 1;
SELECT qualifying_status, count(*) FROM candidate
 WHERE ballot_status = 'ballot' GROUP BY 1;
SELECT count(*) FROM candidate WHERE official_site IS NOT NULL;

-- the gate, after go-live: expect listed 53, and 3 listed measures
SELECT rp.status, count(*) FROM race_publication rp
  JOIN race r USING (race_id) WHERE r.election = 'general' GROUP BY 1;
SELECT measure_id, status FROM measure_publication ORDER BY 1;
SELECT subject_kind, action, count(*) FROM admin_action
 WHERE action IN ('list', 'unlist') GROUP BY 1, 2;

-- what anon actually sees: expect 53 / 106 / 3, then zeros
BEGIN;
SET LOCAL ROLE anon;
SELECT (SELECT count(*) FROM race)             AS races,
       (SELECT count(*) FROM candidate)        AS candidates,
       (SELECT count(*) FROM ballot_measure)   AS measures,
       (SELECT count(*) FROM profile)          AS profiles,
       (SELECT count(*) FROM claim)            AS claims,
       (SELECT count(*) FROM measure_argument) AS measure_arguments;
ROLLBACK;
```

A `candidates` count below 106 means a ballot-tier candidate is missing from
every race's `candidate_ids` — a roster gap worth reading, not a leak.

## 7. What is still NOT visible, and why

- **Briefs.** Zero `profile` / `issue` / `position` / `claim` rows exist. Every
  race is `listed`; none can be `published` until its briefs are written and
  pass the Balance Audit. Nothing about the tier shortens that.
- **Measure arguments.** No `measure_argument` rows exist, and `0010` refuses
  to publish a measure without balanced sourced sides. The amendments show
  their ballot text only.
- **County district placement.** Nothing places a voter inside a commission or
  school-board district — there is no crosswalk, and the boundaries in
  `docs/general-election/boundaries/` are unbuilt. County races are listed per
  county, with the caption saying so, rather than claimed for a voter's
  ballot. Countywide seats (Orange Mayor and Clerk, Hillsborough CC 5 and 7,
  Hillsborough SB 6) are on every ballot in their county, but the row alone
  cannot tell them apart, so no card claims it.
- **News issue tags.** All 14 `news_item` rows are untagged. Tags appear when
  `scripts/news-characterize.ts` runs, which needs `TYPESAFE_API_KEY`; it
  refuses to start without one. Untagged stories still render, just without
  chips (`news-ingest-order-handoff-2026-09-23.md` §1).
- **Write-ins.** Never shown (D1). Every printed listing says a blank write-in
  line may appear on the ballot.

## 8. Open questions for the founder

1. **Datto has no official site.** Jeffrey Peter "Dr. Jeff" Datto (NPA,
   FL-GOV) campaigns on social platforms only; the domain he advertises is a
   parked page (`candidate-sites-2026-09-21.md`). In listing mode his card is
   identical to the others minus the "Official site" link, which is true and
   fine. It stops being fine when FL-GOV is briefed: a website-only ingest
   leaves him at "no stated position found" on every spine issue beside seven
   sourced opponents. Decide what ingests social posts before FL-GOV
   publishes.
2. **Tier B.** The 43 special-district seats (92 candidates — CDD, water
   control, drainage, improvement and soil-and-water boards;
   `roster-recalibration-2026-09-21.md` §5) are not loaded. That doc called
   them "defensible to list without briefing, or to skip entirely". The
   `listed` tier is now exactly the "list without briefing" mechanism, so the
   choice is cheaper than it was: load them and list them, or skip. Note they
   carry the same placement problem as the county district seats — a CDD is a
   single subdivision, and nothing places a voter inside one.
3. **Should `listed` ever be the launch state?** This record assumes it is a
   bridge: the roster goes up now so a voter can see who is on the ballot,
   and briefs replace listings race by race. If briefs do not land before
   early voting, a fully `listed` ballot would be the product voters meet.
   That is honest, but it is a different product from the one the README
   promises, and it deserves a decision rather than a default.

## 7. Follow-up — the resource ladder (2026-09-23, unapplied)

`measure_argument` is retired by `0034_measure_resources.sql` in favour of
`measure_resource`: outside links ordered by kind of source (spec
`docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md`).
The safety argument in §3 transfers unchanged: `anon_read_measure_resource`
reads `'published'` only. Apply order: merge and deploy the PR, then `0034`,
then `0035` (after the `url_norm` check in `supabase/migrations/README.md`).
All three measures stay `listed` until the founder adds sided rows and
flips each to `published`; the 2× rule refuses a lopsided flip.
