# Results: the ingest-order checklist, run against production

**Written** 2026-09-23. This runs the §4 checklist in
`news-ingest-order-handoff-2026-09-23.md` against the live Supabase project
`pqracitpmzpiqfnzlngw`. That is the project the run reports in
`Civic Awareness (Know Your Vote)/Agents/RunReports/` name, and its migration
history matches `supabase/migrations/` through `0032`.

**Every database read was a read-only `SELECT`.** Nothing was written and nothing
was enqueued. No model was called: `TYPESAFE_API_KEY` is still absent, so the
characterizer never ran in this session. The sweep was a real network run from
the container, and matching ran offline over that sweep.

---

## 1. The finding that reframes the brief

**Stages 3–5 have never run in production. As the data stands today, stage 3
cannot run at all.**

| Live table     | Rows | What it means                                                            |
| -------------- | ---- | ------------------------------------------------------------------------ |
| `news_item`    | 14   | 8 `election_news` + 6 `official_link`. **0 `candidate_news`.**           |
| `review_item`  | 0    | Nothing has ever been enqueued                                           |
| `admin_action` | 76   | All are `race_publication` changes (09-09 → 09-10). **0 news decisions** |
| `profile`      | 0    | **The table `news-enqueue.ts` builds its roster from**                   |
| `candidate`    | 296  | 106 of them are `ballot`-tier                                            |

`scripts/news-enqueue.ts` reads the roster as `profile ⋈ candidate`. `profile`
is empty, so the script stops at the check at the end of its §2 with "the
roster is empty". That check is fail-closed on purpose, and this is the case it
was written for. Until profiles are loaded, there is no automatic inlet at all.
Every stored row is operator-submitted: 8 `election_news` rows, with titles like
"Hillsborough plans 27 early-voting sites" and "HB 991 becomes law", plus 6
evergreen `official_link` rows from migration `0004`.

So the brief's §1 order is correct as code, but no live row has ever travelled
through it. The brief's §2(b) point that "the gold set is the sweep pool, not
the feed" now has a stronger form: **the feed has no candidate news in it yet,
so there is no feed population to re-measure.**

## 2. Checklist results

**Offline guardrails: all pass.** `verify-news-characterize`, `-issues`,
`-feed`, `-enqueue` and `-match` all exit 0 on `3addba0`.

**4.1 The characterizer's input population: confirmed from code and live
counts, not from a dry run.** The script selects
`issues IS NULL AND url IS NOT NULL` from `news_item`
(`scripts/news-characterize.ts:117-123`), so it reads stored rows only. Its
first real run would take all 14 live rows. **6 of those are `official_link`
rows** ("Florida Division of Elections", "Register to vote…"). The query has
no `item_type` filter, so Jev would be asked to tag evergreen resource links
with policy issues. See §4, item 2.

**4.2 The unmatched drop is counted, not silent: confirmed.** A live
`news-sweep.ts --days 14` pulled 24/24 feeds and 554 articles. That sweep was
put through `planAttachments` with a stand-in roster: the 106 live
`ballot`-tier `candidate` rows, with `office_sought` as `raceId`. Case (a) of
the race-scoped path is the only thing `raceId` drives, and the sweep never
triggers it, so the stand-in does not change these counts.

| `PlanCounts` / result | Value                                                |
| --------------------- | ---------------------------------------------------- |
| `offList`             | 0 (every swept host is a listed outlet, as expected) |
| `unmatched`           | 468 (84%)                                            |
| Attachments           | 120 rows over 86 distinct articles                   |
| — with a `named` row  | 27 articles                                          |
| — `related` only      | **59 articles (69% of what would be enqueued)**      |

Both counts are reported, so the drop is counted and the pass criterion holds.
**The part that does not hold is stage 3 as a "political" filter.** See §3.

The sweep also reported `0/0 sitemap days (0 outlets)`. The Sentinel
news-sitemap volume the spec's §4.2 was sized against (~3,400 URLs in 14
days) is not in the current sweep. Today's pool is RSS only.

**4.3 An untagged row survives: confirmed from code only.** No live row holds
`issues = '{}'`, because none has ever been characterized, and making one
would take a write. At code level, no file under `src/` reads
`news_item.issues`: `grep` finds no feed, page or component that selects or
filters on it. So a tag cannot currently remove a row from what voters see.
Re-check this when a UI starts reading issue tags.

**4.4 Issue distribution and near-duplicate rate over `news_item`: cannot be
measured yet.** There are zero tagged rows and zero candidate rows. The nearest
honest proxy is the 27 articles above that `named` a candidate. Among those, a
title-overlap check (≥ 60% shared content words) finds **3 multi-outlet
clusters covering 6 articles (22%)**. One of the three is the same outlet
running a story twice (floridianpress's "JUICE" digest and its standalone
article). Treat 22% as a small-sample figure, not a feed rate. The brief's
caution stands: do not build clustering on it.

**4.5 The §5 founder question** is unchanged, and it is still not this file's
to answer. §1 above changes one input to that decision, though. Today the
automatic inlet delivers **nothing**, not "only candidate-matched stories".

## 3. Stage 3 is a surname filter, not a political one

59 of the 86 articles stage 3 admits get there on `related` alone, meaning a
surname that one or more roster candidates share. The candidate surnames that
are ordinary English words, or very common names, do most of that work:

| Candidate (race)                     | `related` rows | Sample headline it attached to                             |
| ------------------------------------ | -------------- | ---------------------------------------------------------- |
| Robert **People** (US Rep)           | **40**         | "Iran's president delivers wartime address at UN"          |
| Laurel **Lee** (US Rep)              | 3              | "Florida couple arrested after 6-month-old … hospitalized" |
| Dan **Green** (US Rep)               | 3              | "3 teen girls hospitalized after being struck by vehicle"  |
| Scott **Singer** (US Rep)            | 2              | "Hilary Duff announces 2027 US tour dates"                 |
| Michael "Mike" **Scott** (Orange D6) | 3              | "Rick Scott Says He Agrees With Mayor Mamdani"             |
| Terrell **Thomas** (Orange Clerk)    | 2              | "Americana power couple Harber Wynn play Will's Pub show"  |

Candidates with the surnames Johnson, Lopez, Rodriguez, Garcia, Brown, Perez,
Fisher and Moore account for the rest. The approval boundary would catch every
one of these, because a person reads each row before it becomes `news_item`.
But the review queue would open at roughly 2 junk rows per real one, and one
candidate, People, would own 40 of them. This is `news-match.ts` working as
written. Its header says "ambiguity resolves toward symmetry", and a surname
that is also a common noun is maximally ambiguous. It is still not the "only
the political ones" filter the founder described.

The same run also shows `named` holding up well. The 27 articles with a `named`
row are all recognisably candidate or campaign stories: the governor's race,
Uthmeier's lawsuits, the Nixon sit-in, the Senate poll, the Dandiya ad.

## 4. Follow-ups (none done here: each is its own change)

1. **Load `profile`, or point the enqueue roster at `candidate`.** Without
   one of these, stage 3 never runs. This is the blocking item.
2. **Scope the characterizer to news.** Add `item_type IN
('candidate_news','election_news')` to the query at
   `scripts/news-characterize.ts:117`, before its first live run, so
   `official_link` rows are not billed or tagged.
3. **Decide how `related` treats common-word surnames.** One option is to
   require the first name or the office alongside the surname. Another is a
   stop-list. That trades against the symmetry rule, so it needs a founder
   call before code. Without it, "Robert People" gets 40 bad attachments a
   fortnight.
4. **Re-run 4.1 (dry run), 4.3 and 4.4 once items 1 and 2 have landed** and at
   least one batch has been approved. That is the first point at which a feed
   population exists to measure.

## 5. How to reproduce

```bash
node scripts/verify-news-{characterize,issues,feed,enqueue,match}.ts
node scripts/news-sweep.ts --days 14 > sweep.json
```

Then call `planAttachments(sweep, roster, matchArticle, u => outletForUrl(u,
OUTLETS))`, with `roster` built from
`select candidate_id, legal_name, office_sought from candidate where
ballot_status = 'ballot'`. The live counts in §1 are single `count(*)`
queries on each table.
