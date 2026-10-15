# Source check: FL-SEN re-run (2026-10-15)

Follows `source-check-2026-10-09.md` and `moody-pipeline-gap-2026-10-09.md`.
Question (news-fairness.md §2): Moody 1 live story vs Nixon 7 — did our
pipeline miss something, or is the skew real? Read-only; nothing was written
to the DB.

## Answer

**The live 1-vs-7 is a review backlog, not an ingestion gap.** No
`candidate_news` review item has been decided since **2026-10-06 23:49 UTC**.
Every live row predates the 10-09 fixes; everything ingested since sits in
`review_item` as pending, for both candidates:

| Candidate | Live | Pending | Pending, published 09-15 → 10-15 | Queued by the daily cron since 10-09 | Pending with the surname in the headline | Outlets (pending) |
|---|---|---|---|---|---|---|
| Ashley Moody (REP) | 1 | 40 | 37 | 12 | 26 | 8 |
| Angie Nixon (DEM) | 7 | 57 | 51 | 18 | 42 | 12 |
| Neil J. Gillespie (NPA) | 0 | 0 | 0 | 0 | 0 | 0 |

Sourced in the window (live + pending): **Moody 38, Nixon 58, Gillespie 0.**
The missed WUSF 10-01 Moody story is now pending. NBC Miami 3869181 is not, and
cannot be while NBC is on `AI_POLICY_HOLD` (founder call, unchanged).

**Labels**
- Moody vs Nixon: **real skew, smaller than it looked** (38 vs 58, ratio 0.65,
  under the digest's 3× flag). Nixon gets more regional coverage of campaign
  events (Sanders tour, USF/UCF stops, TPS, PolitiFact), and our registered
  outlets cover her across 12 newsrooms against 8 for Moody. Moody's heaviest
  coverage is national (Fox News, Newsweek, Daily Beast), and none of those
  outlets is registered. That limit applies to every candidate and is not
  Moody-specific.
- Gillespie: **real skew** (unchanged). Voter-guide listings only; no story
  about him in any outlet found.

**To make the counts visible:** an operator has to work the queue in
`/admin/review` (~500 pending candidate_news items across all races). This is
the human gate, and no code change can stand in for it.

## The remaining ingestion gap, fixed in this PR

After the 10-09 fixes, the daily cron catches nearly everything. A read-only
archive backfill for 10-08 → 10-15 (`news-backfill.ts --from 2026-10-08`, then
`news-enqueue.ts --candidates-only --dry-run`) found **104** candidate
attachments. The cron had queued **96**. The 8 it missed all came from feeds
that hold less than a day:

| Outlet | Missed | Depth seen by the cron, 10-10 → 10-14 |
|---|---|---|
| cbsnews.com/miami | 5 (FL-25, FL-26 race previews) | 12.6h–20.9h |
| wlrn.org | 2 (1 Jolly, 1 Nixon) | down to 23.5h |
| wfsu.org | 1 (Jolly) | — |

Moody missed 0 of 11 and Nixon 1 of 19, so this gap is not Moody-specific. It
is still a pipeline gap, though, and it hits every candidate a shallow outlet
covers. **Fix:** the sweep now runs at 11:00 and 23:00 UTC (`vercel.json`
`0 11,23 * * *`, `CADENCE_HOURS = 12`), the same cadence for every outlet. The
14-day window and the dedupe are unchanged, so the second run only adds what
fell off the feed between runs. wtsp.com and wftv.com (14–22h deep) are covered
by the same change. The backfill's URL-archive pre-filter under-reaches
summary-only mentions, so 8 is a lower bound.

The 8 missed rows were **not** enqueued here. They can be enqueued with the
same two commands (founder-approved form, runbook §9):

```bash
node scripts/news-backfill.ts --from 2026-10-08 > backfill.json
node scripts/news-enqueue.ts --candidates-only < backfill.json
```

## Spot check against the web

Searched registered outlets for October Senate stories ("Ashley Moody" /
"Angie Nixon", extended). Of 8 distinct in-window URLs found, 7 are queued or
live. The 1 miss is Nixon's WUSF "pep rally-style campaign stop" (10-05),
published before the WUSF sitemap backstop went live on 10-10 and after the
10-09 backfill cut-off. A run of the command above, with `--from 2026-10-05`,
reaches it.

## SQL used (all SELECT)

```sql
-- per-candidate live/pending
select c.candidate_id,
 (select count(*) from news_item n where n.candidate_id=c.candidate_id and n.item_type='candidate_news') live,
 (select json_object_agg(s,k) from (select status s, count(*) k from review_item
   where payload->>'item_type'='candidate_news' and payload->>'candidate_id'=c.candidate_id group by 1) x) review
from candidate c where c.candidate_id in ('FL-DOE-89119','FL-DOE-90009','FL-DOE-89955');

-- last decision
select max(decided_at) from review_item where payload->>'item_type'='candidate_news';

-- cron runs since 10-09 (depth lines)
select started_at, items_written, summary from agent_run where agent='R1' and started_at>='2026-10-09';

-- backfill dry-run attachments vs queue: VALUES(url,candidate_id,...) anti-joined
-- to review_item (payload url+candidate_id) and news_item (url+candidate_id)
```
