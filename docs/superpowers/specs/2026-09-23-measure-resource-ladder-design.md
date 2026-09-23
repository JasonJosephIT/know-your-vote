# Ballot questions: a two-sided resource ladder instead of our own arguments — design

_2026-09-23. Drafted in an autonomous session from the founder's direction of
the same day; the founder has NOT yet reviewed it. Every judgment call the
founder would normally make in conversation is listed in §9 as a founder
call, with the assumption this draft proceeds on. Branch
`claude/ballot-questions-resources-19285d`._

## The direction, in the founder's words

> Instead of us making particular cases for it, let's just point them to
> other resources that go into it. Keep it to news articles and YouTube
> videos, studies — people that are making cases for or against it. Include
> more credible information at the top, and lead them into the more
> speculative as they scroll deeper. Give both points of view a chance to
> give their most credible arguments first and foremost, and then allow
> users to also look at the arguments that aren't as credible.

## Why now

The three 2026 amendments (`0030`) are live at the `listed` tier: verbatim
ballot text and nothing else (`listed-tier-2026-09-23.md`). What would take
them to `published` is `measure_argument` rows — sentences **we** write, one
source each, both sides within one of each other (`0010`). Zero such rows
exist, and none are scheduled. The founder's direction removes that editorial
step entirely: the site does not argue a ballot question, it hands the voter
the people who do, ordered by how much weight each kind of source can bear.

That is a better fit for the product's constitution than what it replaces.
"We describe. You decide." was always strained by a case-for/case-against
that we authored. A reading list of outside material, labelled and ordered
by kind, is description.

## Scope

**In:**

- A new app-owned table, `measure_resource`, replacing `measure_argument`.
- A fixed credibility ladder derived from what a resource **is**, never from
  a per-item judgment.
- The measure page renders the ladder: a shared "understand it" block on
  top, then YES and NO columns of equal room, each ordered credible → less so.
- Publication gate, RLS, read layer, verify scripts and methodology copy
  updated to match.
- Seeding the first resources for Amendments 1–3 by migration, the `0030`
  way. (Which URLs is editorial work and is listed in §9, not decided here.)

**Out:**

- Any automated discovery of resources (a news-sweep hook, YouTube search).
  Every row is hand-entered. The sweep already tags stories with issues;
  linking a story to a measure is a later, separate design.
- Embedding video. Links out only (§6).
- Any change to races, candidates, or the news plane.
- Local (county) measures. The table supports them; no rows are planned.

## 1. The ladder: kind decides the tier, nobody decides per link

Three options were weighed. **Chosen: A.**

| Option                                     | Trade-off                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. By kind of source, by rule (chosen)** | Tier is a consequence of classifying what the thing is. Auditable, explainable on the methodology page, symmetric by construction.            |
| B. Hand-assigned 1–5 per link              | Flexible, but an editorial verdict per item — the exact thing the site refuses to make about candidates, and impossible to defend as neutral. |
| C. Outside outlet rating                   | 32 of 37 Florida outlets are unrated (`0028`), and studies, advocacy groups and YouTube channels have no rating agency at all.                 |

The ladder, top to bottom. `kind` is a CHECK-constrained enum; `tier` is
`RESOURCE_TIER[kind]` in one TypeScript module and nowhere else.

| Tier | `kind`       | What qualifies                                                                                                                                                                        | Stance                          |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1    | `official`   | Government primary documents about this measure: the DoE booklet, the joint resolution / full text, a legislative staff analysis, a Revenue Estimating Conference or FIEC statement. | always `neutral` (CHECK)        |
| 2    | `analysis`   | Research with a method: peer-reviewed work, university centres, think tanks and policy institutes, fiscal analyses by non-government bodies.                                          | `support`, `oppose` or `neutral` |
| 3    | `reporting`  | Straight news: explainers and coverage by a newsroom.                                                                                                                                 | always `neutral` (CHECK)        |
| 4    | `argument`   | A named person or organisation making the case: editorials, op-eds, the sponsor's statement, an advocacy group's page, an endorsement.                                                | `support` or `oppose`           |
| 5    | `commentary` | Unaffiliated takes: a YouTuber, a podcaster, a blog, a social video. The "less credible" tier the founder wants reachable but last.                                                   | `support` or `oppose`           |

Two things this deliberately does **not** encode:

- **Format is not credibility.** `format` (`document` / `article` / `video` /
  `audio`) is a separate column. A think tank's YouTube explainer is
  `analysis` + `video` and sits in tier 2. Putting "YouTube" in tier 5 by
  format would have mis-filed it.
- **Lean is not credibility.** `source.lean_tag` is carried through untouched
  and is not a sort key. Ordering by lean would be a verdict.

The one CHECK that reaches across columns: `official` and `reporting` are
`neutral` by definition. A newsroom's explainer that reads as one-sided is an
`argument` if it is an editorial, and stays `reporting` + `neutral` if it is
news — the label on the page, not our placement, tells the voter which.

## 2. Data model — `supabase/migrations/0034_measure_resources.sql`

```sql
CREATE TABLE measure_resource (
  resource_id      TEXT PRIMARY KEY,
  measure_id       TEXT NOT NULL REFERENCES ballot_measure(measure_id) ON DELETE CASCADE,
  -- No source, no render — the same NOT NULL 0010 put on measure_argument.
  -- publisher, url, type and lean_tag come from here, never duplicated.
  source_id        TEXT NOT NULL REFERENCES source(source_id),
  stance           TEXT NOT NULL CHECK (stance IN ('support','oppose','neutral')),
  kind             TEXT NOT NULL CHECK (kind IN ('official','analysis','reporting','argument','commentary')),
  format           TEXT NOT NULL CHECK (format IN ('document','article','video','audio')),
  title            TEXT NOT NULL,          -- the resource's own title, verbatim
  author           TEXT,                   -- byline, speaker, or channel name
  published_at     DATE,                   -- null when the resource is undated
  duration_seconds INT CHECK (duration_seconds > 0),  -- video/audio only
  -- ≤140 chars of ATTRIBUTION, never summary: "Sponsor of the joint
  -- resolution", "Legislature's own staff analysis". Founder call F4.
  note             TEXT CHECK (char_length(note) <= 140),
  display_order    INT NOT NULL DEFAULT 0,
  CHECK (kind NOT IN ('official','reporting') OR stance = 'neutral'),
  CHECK (kind NOT IN ('argument','commentary') OR stance <> 'neutral'),
  CHECK (duration_seconds IS NULL OR format IN ('video','audio')),
  UNIQUE (measure_id, source_id)          -- one URL is one resource
);
CREATE INDEX idx_measure_resource_scope ON measure_resource (measure_id, stance, display_order);
```

`measure_argument` is **dropped** by the same migration, with its two
triggers. Zero rows exist live (read 2026-09-23, `listed-tier` §1), the
concept is retired, and leaving the table would leave a live RLS policy and
trigger pair guarding nothing — and would keep `0033`'s safety argument
("`measure_argument` is untouched") pointing at a table nobody reads.
`0033`'s argument transfers word for word to `measure_resource`: its anon
policy reads `mp.status = 'published'` and never `'listed'`.

`measure_sides_balanced()` is redefined over `measure_resource` (§4); the two
trigger functions keep their names and bodies, so `0012`'s pinned
`search_path` carries over by `CREATE OR REPLACE`. `trg_measure_argument_balance`
is recreated as `trg_measure_resource_balance` on the new table.

RLS: `ENABLE`, revoke writes from `anon`/`authenticated`, `GRANT SELECT` to
anon, policy `anon_read_measure_resource` `USING (EXISTS (... mp.status =
'published'))`. A copy of `0011`'s argument policy with the table renamed.

Idempotent in the house style: `DROP TABLE IF EXISTS measure_argument
CASCADE`, `CREATE TABLE IF NOT EXISTS`, policies dropped `IF EXISTS` and
recreated.

**Not changed:** `source` (pipeline-owned, `0000`). `source.type`'s four
values are coarser than `kind` and are left alone; `kind` lives on the
app-owned row. The verify script (§7) flags the one contradiction that
matters: `kind = 'official'` on a source whose `type <> 'primary_doc'`.

## 3. Read layer — `src/lib/measures.ts`

`MeasureBrief` becomes:

```ts
export interface MeasureResourceWithSource { resource: MeasureResource; source: Source; }
export interface MeasureBrief {
  measure: BallotMeasure;
  neutral: MeasureResourceWithSource[];   // tier-ordered
  support: MeasureResourceWithSource[];   // tier-ordered
  oppose:  MeasureResourceWithSource[];   // tier-ordered
}
```

`fetchMeasureBrief` selects `measure_resource, source!inner(*)` for the
measure, splits by stance, and orders each list with `rankResources()` from a
new dependency-free module `src/lib/measure-ladder.ts`:

- primary key `RESOURCE_TIER[kind]` ascending,
- then `published_at` descending, nulls last,
- then `display_order`.

`display_order` is the editor's tie-break within a tier, not a way to lift
something above its tier. The module exports `RESOURCE_TIER`, `TIER_LABEL`
(the small headings in §5), `rankResources`, and `sidesBalanced` moves in
from `measure-balance.ts` (which is deleted). Pure, no `next/cache`, so
`scripts/verify-measure-balance.ts` keeps driving it under Node's native
type stripping.

`getMeasureListing` is unchanged in shape: `brief` is null for a listed
measure and for a published one that fails the re-check. `types/app.ts`
drops `MeasureArgument` / `MeasureSide` and adds `MeasureResource`,
`MeasureStance`, `MeasureKind`, `MeasureFormat`.

## 4. The publication gate

`0010`'s rule — both sides present, within one of each other — was written
for sentences we composed and could balance by writing one more. A list of
outside material cannot be balanced by writing, only by finding, and "5 vs 4
is fine, 6 vs 4 is forbidden" would keep a well-covered side's sixth resource
off the page for no reason a voter would recognise.

**New rule (founder call F2):** a measure can be `published` only when

- at least one `support` and at least one `oppose` resource exist, and
- the larger side is at most **twice** the smaller.

Neutral resources are not counted: they are shared context, not a side.
Enforced in `measure_sides_balanced()` and re-checked by `sidesBalanced()`
exactly as today, on both the publication row and every resource write
(`0010`'s deferred constraint trigger, moved to the new table). A measure
that cannot meet it stays listed — ballot text only — which is the honest
outcome.

**Equal room on the page** is a second, presentational guarantee independent
of the gate: each column shows at most `COLUMN_CAP = 8` rows, tier-ordered,
with the rest inside a native `<details>` element ("Show all N") so no client
JavaScript is needed. An 8-vs-4 measure passes the gate
and shows 8 vs 4; the cap stops a 16-vs-8 one from becoming a wall on one
side.

## 5. The page — `src/app/(public)/measures/[measureId]/page.tsx`

Order down the page, unchanged above the fold:

1. Header, threshold, **What the ballot says** — as today.
2. **Understand it first** (new; `brief.neutral`). Official documents, then
   research, then reporting. The most credible material on the page, shared
   by both sides, before either side speaks. Omitted entirely when empty
   (nothing on the page says "no neutral sources" — silence is recorded in
   the row count on the methodology page, not filled in with copy).
3. **The case for a YES / The case for a NO** — `MeasureResourceLadder`
   replaces `MeasureCompare`. Two equal columns, fixed order, equal-treatment
   stack on mobile, neither styled as preferred. Within a column, rows are
   grouped under small muted tier headings so the ladder is visible, not
   implied: **Research** (`analysis`) · **Positions** (`argument`) ·
   **Commentary** (`commentary`). A tier with no rows shows no heading.
4. The existing footer. Copy becomes: _"We collect what each side says and
   order it by the kind of source. We write none of it. You decide."_

A resource row (`MeasureResourceRow`, one component, both columns and the
neutral block):

```
[Title — links out, rel="noreferrer", new tab]
Publisher · Author · Video · 14 min · Mar 2026
"Sponsor of the joint resolution"           ← note, when present
```

Label rules, inherited from `news-labels.ts` and `NewsStoryCard`:

- **`Opinion` is marked** (source.type `opinion`, and every `argument` /
  `commentary` row) in the same visually distinct container the news card
  uses. Reporting is unmarked, as on the news page.
- **Lean is not printed on the row** — the founder's 2026-09-19 card rule.
  The publisher links to its outlet page (`outletPathFor`) when the outlet is
  in the news corpus, and lean is disclosed there. Founder call F3.
- Format and duration are plain text, no icon. "Video · 14 min" is a fact;
  a play glyph would invite a click into a platform that tracks.
- No thumbnails. Fetching one from a video host puts a third-party request
  on the page; the privacy page promises none.

The listed-tier card copy in `BallotQuestions.tsx` and the in-review copy on
the measure page change from "the case for and against are in review" to
_"Resources on both sides are being collected. We publish them only when
both sides are represented."_

## 6. Video: link out, never embed

An `<iframe>` from a video host sets cookies and sends the visitor's IP to
that host on page load, before any click. The privacy page's promise
("no third party at all") rules that out. A `video` resource is a plain link
with its duration beside it, like every other row. This also keeps the page
prerenderable (`revalidate = 3600`) with no client JavaScript.

## 7. Verification

- `scripts/verify-measure-balance.ts` — rewritten for the 2× rule
  (1/1, 2/4, 4/2, 8/4 pass; 1/0, 0/1, 1/3, 5/2 fail; boundary 3/6 pass, 3/7
  fail) and for `rankResources()` (tier before date, date desc within tier,
  nulls last, `display_order` last; a tier-5 row dated today never outranks a
  tier-2 row from 2024). The `measureVisibleStatus` checks stay.
- `scripts/verify-migrations.mjs` §16 — fixtures move from `measure_argument`
  to `measure_resource`: anon reads resources only through a published
  measure, never listed; a measure with no `oppose` resource cannot be
  published; a 1-vs-3 measure cannot; deleting the last `oppose` row from a
  published measure is refused; the `official ⇒ neutral` and
  `argument ⇒ not neutral` CHECKs reject the wrong stance; exactly one status
  CHECK remains on `measure_publication`.
- `scripts/verify-ballot-seeds.mjs` and `scripts/demo-teardown.sql` — the
  one `measure_argument` reference in each becomes `measure_resource`.
- New: `scripts/verify-measure-resources.ts` — reads the seed migration's
  rows (or the live DB with `--live`) and flags `kind = 'official'` on a
  non-`primary_doc` source, a `video`/`audio` row with no duration, and a
  `note` that reads as a summary (heuristic: contains "would", "will", or
  "means"). Advisory, not a gate.
- `npm run typecheck` and `npm run lint` clean; the measure page prerenders
  for all three ids with `brief = null` (nothing is published by this work).

## 8. Methodology page

A new section after **How we label the news**, titled **How we order what
people say about a ballot question**, ~150 words: we write no case for or
against; each link is placed by what kind of source it is (the five tiers,
one line each); official and news are always neutral by definition; a
YouTube video can sit anywhere on the ladder depending on who made it;
neither side is published until both are represented; the counts per side
per measure, read live, in the same open style as the scrutiny counts.

## 9. Founder calls — this draft's assumptions, to confirm or overturn

| #  | Call                                                                        | Assumed here                                                                                         |
| -- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| F1 | Retire `measure_argument` (drop) vs keep it beside the new table            | **Drop.** Zero rows; keeping it keeps a policy and trigger alive for nothing.                        |
| F2 | Symmetry rule for a reading list                                            | **Both sides present, larger ≤ 2× smaller.** Alternative: keep `0010`'s ±1.                          |
| F3 | Print lean on each resource row                                             | **No** — same as the story card; disclosed on the outlet page. Alternative: print it on `analysis` rows only, where the funder matters most. |
| F4 | Allow the ≤140-char attribution `note`                                      | **Yes**, attribution only. Alternative: none — publisher + author must carry it.                     |
| F5 | Should `analysis` be allowed a stance, or is a study always `neutral`?      | **Allowed.** A think tank's fiscal study that concludes "this costs counties $X" is a case, and filing it as neutral would hide who made it. |
| F6 | Column cap                                                                  | **8** visible per side, then "Show all".                                                             |
| F7 | Which URLs seed Amendments 1–3                                              | **Not decided here.** Editorial work; §10 gives a starting list per tier to check, not to trust.     |

## 10. Candidate resources per amendment (researched 2026-09-23, not yet verified row by row)

Found by web search in session; every URL still needs to be opened and its
`kind`/`stance` confirmed by the founder before it becomes a `0035` row.
"via news" means the person or group's position was found only in coverage,
which our ladder files as `reporting` + `neutral` — a primary statement (their
own page, testimony, or video) is still needed for an `argument` row.

### Amendment 1 — Budget Stabilization Fund

| Tier | Neutral | YES | NO |
| --- | --- | --- | --- |
| 1 official | DoE booklet (seeded); DoS initiative page (find the AM1 `seqnum`; AM2 is 109, AM3 is 110); the joint resolution + staff analysis on flsenate.gov (number unconfirmed) | — | — |
| 2 analysis | James Madison Institute 2026 Amendment Guide (jamesmadison.org; no recommendation found) | Florida TaxWatch 2026 Taxpayer's Guide (recommends YES) | — |
| 3 reporting | WUSF 2026-09-15 "DeSantis splits with GOP on Amendment 1"; WFLA; CBS Miami "What is Amendment 1"; Bradenton Times explainer; Ocala Gazette; Creative Loafing Tampa | — | — |
| 4 argument | — | Republican Party of Florida (Evan Power statement — via news; find RPOF's own page) | Gov. DeSantis (via news — find the press-conference video or transcript); Florida AFL-CIO (Rich Templin committee testimony — via news; find the Florida Channel clip); House Democratic Leader Fentrice Driskell (via news); League of Women Voters of Florida (listed as opponent by LWV Manatee; the Vote411 PDF at lwvfl.org carries the synopsis) |
| 5 commentary | — | palmbeachexaminer.substack.com "Stop Paying Rent to the State" | amandainformed.substack.com "Three Amendments, Three Reasons to Vote No"; sparkers-soapbox.com |

**Gate risk:** NO has no primary-source `argument` row yet. Every opponent was found through coverage. The Florida Channel archive of the House Budget Committee hearing is the most likely fix.

### Amendment 2 — Agricultural tangible personal property

| Tier | Neutral | YES | NO |
| --- | --- | --- | --- |
| 1 official | DoE booklet (seeded); DoS initiative page `seqnum=109`; Senate fiscal impact statement (≈$31M/yr local revenue, via Ballotpedia — find the flsenate.gov analysis PDF) | — | — |
| 2 analysis | James Madison Institute guide | Florida TaxWatch guide (recommends YES) | — |
| 3 reporting | Bradenton Times explainer; MyNews13 2026-04-09; WFLA/WKRG "New amendment aims to cut costs for Florida farms"; AgInfo.net; Bloomberg Tax | — | — |
| 4 argument | — | Florida Farm Bureau "Vote YES on Amendment 2" (floridafarmbureau.org, 2026-09-11, links its own fact sheet); Agriculture Commissioner Wilton Simpson (via news); RPOF | League of Women Voters of Florida and Florida Education Association (both listed as opponents by LWV Manatee; **no reasoning page found for either**) |
| 5 commentary | — | palmbeachexaminer.substack.com | sisusari.substack.com "Who Exactly Gets This Tax Break?"; amandainformed.substack.com |

**Gate risk: highest of the three.** The NO side has two named opponents and no page where either makes the case, plus two Substack posts. As found today, AM2 cannot clear "both sides present" with anything above tier 5. That is the honest outcome — the page stays at ballot text — unless the FEA or LWV statement is located.

### Amendment 3 — Homestead exemption

| Tier | Neutral | YES | NO |
| --- | --- | --- | --- |
| 1 official | DoE booklet (seeded); DoS initiative page `seqnum=110`; House staff analysis of HJR 1F (flhouse.gov `h0001z.SAC`); Revenue Estimating Conference impact (edr.state.fl.us `impact0710.pdf`, −$11.86B recurring); Pinellas County Property Appraiser FAQ (pcpao.gov/amendment3); Orange County page (ocfl.net); Lake Wales "Property Tax Impact 2026" | — | — |
| 2 analysis | James Madison Institute guide; JMI poll (via Florida Politics) | — | Florida TaxWatch guide (recommends NO, 2026-09-18) + its Property Tax Resource Center; Florida Policy Institute voter guide + local fiscal impacts post |
| 3 reporting | ClickOrlando 2026-09-23 explainer; CBS Miami "$12 billion a year"; WLRN 2026-09-21 "Realtors pour millions"; Florida Phoenix 2026-09-15; WFLX/WPTV poll story; Tampa Bay Beacons; WCTV on the REC projections; WUSF "Battleground Florida" video | — | — |
| 4 argument | — | Vote Yes on 3 (Florida Realtors' committee site; $18M funded); Florida Realtors launch release; Florida Chamber of Commerce page; RPOF endorsement; Gov. DeSantis; Senate President Albritton release (flsenate.gov PDF, 2026-06-02); Miami-Dade Sheriff (via Florida Politics) | Florida Sheriffs Association ad campaign (find the ad video); Vote No on 3 "Math" ad; Florida Association of Counties; Florida League of Cities property-tax page; 1000 Friends of Florida; APA Florida; Florida Professional Firefighters + FOP (Lake Mary presser) |
| 5 commentary | — | palmbeachexaminer.substack.com; bellaverderealty.com pros/cons | Political Cortadito 2026-09-03; amandainformed.substack.com |
| video | Martin County Property Appraiser Jenny Fields explains (YouTube, official); TaxWatch research-tool segment (YouTube, reporting) | "Amendment 3 backers say…" (YouTube, reporting — neutral) | Sheriffs' TV ad (argument) |

**Shape of the debate, which the ladder will show honestly:** YES has money and officials but no research organisation; NO has the two fiscal-analysis shops, the sheriffs and the local-government associations. Support and oppose row counts can still balance under the 2× rule at tier 4, so AM3 is the likeliest of the three to publish first.
