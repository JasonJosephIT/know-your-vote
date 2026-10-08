# Runbook: the candidate-news inlet, and migration 0014

**Written** 2026-10-04 for launch handoff §5 (`launch-handoff-2026-10-04.md`).
**Status: not run.** It could not be run from the session that wrote it, for
the reason in §1.

This file gives the exact commands, in order, for:

- the first live run of the candidate-news inlet (sweep, enqueue, approve,
  characterize);
- applying migration 0014 (news source required);
- rolling either one back.

Three founder calls shape what the inlet produces. Each has a recommended
default in code that one constant flips. They are listed in §2 and recorded
as pending in `stream-surface-handoff.md` §7. A fourth recommendation, on R3's
cadence, is in §7 below.

---

## 0. What the pipeline is

Ingest filters first and Jev labels afterwards (`news-ingest-order-handoff-2026-09-23.md` §1):

| # | Stage | Command / place | Reads | Writes |
| - | ----- | --------------- | ----- | ------ |
| 1 | Sweep | `scripts/news-sweep.ts` | RSS from the outlet list (GET only) | nothing; prints JSON |
| 2 | Enqueue | `scripts/news-enqueue.ts` | the sweep on stdin; the roster (`profile` ⋈ `candidate`, ballot tier) | `source` (one row per outlet, `outlet:<domain>`) and `review_item` (`pending`, source `agent:R1`) |
| 3 | Approve | `/admin/review` → `POST /api/admin/review/:id/decision` | the queued item | `news_item` (one row per approved item), `admin_action` |
| 4 | Characterize | `scripts/news-characterize.ts` | stored `candidate_news` / `election_news` rows with `issues IS NULL` | `issues`, `characterized_by`, `characterized_at` |

Nothing reaches a voter before stage 3, and stage 3 is a person reading each
row. Candidate news then shows on candidate pages (`CandidateNews`). It does
not show on `/news`, because enqueued rows carry a `race_id` and no county, and
`/news` only adds race scopes for a ZIP it is given.

## 1. Why this could not run here, and the environment each step needs

The session that wrote this had no `SUPABASE_SERVICE_ROLE_KEY` and no
`TYPESAFE_API_KEY`. Vercel production holds the values as `SUPABASE` and `JEV`
(created 2026-08-31). Since #109 (2026-10-05) the app reads `SUPABASE` as the
service-role key (`src/lib/server-keys.ts`). Nothing reads `JEV`, and the
scripts below read only `SUPABASE_SERVICE_ROLE_KEY` and `TYPESAFE_API_KEY`
from `.env.local`. Everything in this file that touched production was a
read-only `SELECT` through the Supabase MCP, plus one sweep (step 1, GET
requests to listed outlets only).

Scripts read keys from `.env.local` in the repo root (`scripts/env-local.ts`;
gitignored; a worktree falls back to the main checkout's). Never commit it, and
never paste a key into a doc or a PR.

| Step | `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_SERVICE_ROLE_KEY` | `TYPESAFE_API_KEY` | Other |
| ---- | -------------------------- | --------------------------- | ------------------ | ----- |
| 1 sweep | – | – | – | outbound HTTPS |
| 2 enqueue, `--dry-run` included | ✔ | ✔ (the roster read comes before the dry-run exit) | – | – |
| 3 approve in production | ✔ | ✔ in Vercel production, held there as `SUPABASE` (read since #109, `src/lib/server-keys.ts`); no rename needed | – | `ADMIN_EMAILS` and Supabase Auth (`admin-dashboard/roadmap.md`); the console is closed without them |
| 3 approve locally (`npm run dev`) | ✔ | ✔ in `.env.local` | – | `ADMIN_EMAILS` in `.env.local` |
| 4 characterize, `--dry-run` included | ✔ | ✔ | ✔ | – |

`NEXT_PUBLIC_SUPABASE_URL` is `https://pqracitpmzpiqfnzlngw.supabase.co`.

**Until #109 (2026-10-05) the production news cron answered 503, for the same
reason.** `/api/cron/refresh-news` creates a service client and returned
`503 "Service credentials missing — feed left intact."` because nothing read
`SUPABASE`. Since #109 the service client reads it. The cron's first run with
the key is the 10:00 UTC run on 2026-10-05, which has not been observed. That
cron does not sweep. It inserts one `pipeline_event` "Race published: …" row
per published race. See §6.

## 2. Founder calls this inlet depends on: recommended defaults, all pending

| Call | Recommended (pending founder confirmation) | Where | To flip |
| ---- | ------------------------------------------ | ----- | ------- |
| N, news slots per candidate | **3** | `src/lib/news-slots.ts` `NEWS_SLOTS_PER_CANDIDATE` | Change the number. **Not wired**: the candidate page still passes no `slots` (pre-check P3). |
| Surnames that are also common words | **`title_and_surname`**: a bare surname attaches only as "Rep. Lee" / "Commissioner Smith", for every candidate alike | `src/lib/news-match.ts` `SURNAME_ONLY_RULE` | `"bare_surname"` restores the old behaviour exactly |
| A policy story that names no candidate | **`"drop"`**: no automatic inlet before Nov 3; operator submission stays the path | `src/lib/news-enqueue.ts` `UNMATCHED_ARTICLE_POLICY` | `"policy_inlet"` is not built; the enqueue script refuses to run with it |

Each constant's comment carries the rationale and the 2026-10-04 measurement.
In short, a 30-day sweep (545 articles) run against the live roster (82
candidates, 36 races) gave these results:

- **The surname rule.** The old rule produced 75 `related` attachments, of
  which at most one was about the candidate (Robert People alone took 37).
  The recommended rule produces 0 and leaves the 51 `named` attachments
  untouched.
- **N.** 69 of 82 candidates had no `named` story. Among the 13 who did, the
  median was 2 and the top was 14.
- **Lean.** All 545 articles came from outlets rated `unrated`.

## 3. Pre-checks, before any write

- **P1. Offline guardrails all exit 0.**
  ```bash
  for f in sweep match enqueue characterize issues feed slots ungated labels outlets; do
    node scripts/verify-news-$f.ts || echo "FAILED: $f"
  done
  ```
- **P2. The three calls in §2 are confirmed or consciously left at the
  recommendation.** Record which in `stream-surface-handoff.md` §7.
- **P3. N is wired. This is a hard gate** from news-fairness.md's N4 note, and
  candidate news must not go live without it:
  ```bash
  grep -n "CandidateNews candidateId" "src/app/(public)/candidates/[candidateId]/page.tsx"
  ```
  Both call sites must pass `slots={NEWS_SLOTS_PER_CANDIDATE}`. Today they pass
  nothing, so every stored story would show, uncapped.
- **P4. The candidate-news header copy matches what ships.** `CandidateNews.tsx`
  says "On-the-record events, restated neutrally and cited — no polls, no
  endorsements, no hot takes." Swept rows are the outlet's own headline, not a
  restatement, and the sweep does not exclude poll stories (the 09-23 run
  matched a Senate poll). Have the copy owner reword it, or confirm it, first.
- **P5. Baseline counts** (read-only):
  ```sql
  SELECT item_type, count(*), count(*) FILTER (WHERE source_id IS NULL) AS no_source,
         count(*) FILTER (WHERE issues IS NULL) AS uncharacterized
    FROM news_item GROUP BY item_type;
  SELECT kind, source, status, count(*) FROM review_item GROUP BY 1,2,3;
  SELECT count(*) FROM source WHERE source_id LIKE 'outlet:%';
  ```
  On 2026-10-04: 8 `election_news` and 6 `official_link`, all with no source
  and all uncharacterized; 0 `review_item`; 0 `outlet:` sources.
- **P6. Decide whether migration 0014 goes first.** Recommended: yes, using
  §4, once this branch's approve-path change is deployed. The inlet works
  either way, because the approve path now resolves a source before it
  inserts.

## 4. Migration 0014 (news source required): the apply steps

**What it is.** `0014_news_fairness.sql` adds
`news_item_agent_source_check`:
`CHECK (item_type NOT IN ('candidate_news','election_news') OR source_id IS NOT NULL)`.
It also attributes four primary-era `election_news` rows to their government
publishers. It is the code form of news-fairness.md N1, "no source, no card".
`mcp list_migrations` on 2026-10-04 shows it **not applied**: there is no
`news_fairness` entry, and `pg_constraint` has no
`news_item_agent_source_check`.

**What changed since it was written.** Live now holds **eight** `election_news`
rows with no source, not four. Applied alone, 0014 fails on the other four and
rolls back. A PGlite simulation of the live state confirmed this: it reported
"check constraint news_item_agent_source_check … is violated by some row",
with nothing left behind. **`0042_news_source_backfill.sql` attributes those
four**: three government notices as `primary_doc`/`N/A`, and one Ballotpedia
story as `factual_reporting`/`unrated`. The Ballotpedia attribution is
recommended and pending founder confirmation; the file's marked block says how
to delete the row instead. The same simulation, applying 0042 and then 0014,
passed: 0 agent rows without a source, every `source_id` resolving, a re-run a
no-op, a new sourceless row refused, and the delete-instead flip also
applying.

**Precondition (a) from 0014's header is met on this branch.** The approve
path (`src/app/api/admin/review/[id]/decision/route.ts`) now resolves a source
before it inserts. `describeNewsInsertError` now names
`news_item_agent_source_check` instead of blaming 0005. It must be **deployed**
before 0014 is applied. Otherwise the live console still inserts with no
source, and every approval fails with the wrong migration named.

Steps:

1. Merge and deploy this branch.
2. Pre-check (read-only):
   ```sql
   -- (a) Exactly these eight ids may appear. Any other id: stop and attribute it first.
   SELECT id, url FROM news_item
    WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL ORDER BY id;
   --   126725c6-… 1ae20884-… 4c787ba7-… 7d95cfb2-… 8d12a9b1-… 9b4a9bf0-… bbc7a4c8-… ce038b86-…
   -- (b) Not applied yet: expect 0 rows.
   SELECT conname FROM pg_constraint WHERE conname = 'news_item_agent_source_check';
   -- (c) None of the eight pages has a source row yet: expect 0 rows (true on 2026-10-04).
   SELECT source_id, url_norm FROM source WHERE url_norm IN (
     'www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276',
     'www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232',
     'browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites',
     'www.votehillsborough.gov/281/2026-Primary-Election',
     'www.votehillsborough.gov/291/2026-General-Election',
     'www.flsenate.gov/Session/Bill/2026/991',
     'dos.fl.gov/elections/for-voters/election-dates',
     'news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november');
   ```
   If (c) returns rows, the steps still work: 0042 resolves by `url_norm`.
   0014's four UPDATEs set literal ids, though, so check that each returned
   `source_id` is the one 0014 names.
3. Apply **0042 first**, then **0014**. Each file is one transaction. Use
   Supabase MCP `apply_migration` with names `news_source_backfill`, then
   `news_fairness`, or paste each file into the SQL editor.
4. Post-check:
   ```sql
   SELECT count(*) FROM news_item
    WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL;  -- expect 0
   SELECT n.id, s.publisher, s.type, s.lean_tag
     FROM news_item n JOIN source s USING (source_id) WHERE n.item_type = 'election_news';  -- expect 8
   ```
   Then load `/news` (GET). The eight cards now show a publisher, and
   "Official document" for the government ones. That is a visible change.
5. Update the 0014 and 0042 rows in `supabase/migrations/README.md`.

Rollback for 0014:

```sql
ALTER TABLE news_item DROP CONSTRAINT IF EXISTS news_item_agent_source_check;
```

That alone restores the old behaviour. The attributions can stay: each names
the page's real publisher. To undo them as well, run
`UPDATE news_item SET source_id = NULL WHERE id IN (<the eight ids>)` and then
delete the eight `src_gov_*` / `src_ballotpedia_*` source rows. **MCP `DELETE`s
hang** (launch handoff §3), so run deletes from the Supabase SQL editor.

## 5. The inlet: steps in order

Run from the repo root with `.env.local` holding the §1 keys.

1. **Sweep** (GET only, writes nothing):
   ```bash
   node scripts/news-sweep.ts --days 30 > /tmp/kyv-sweep.json
   ```
   Expect the stderr line `swept N/24 feeds … -> ~550 articles`. On 2026-10-04
   it read 23/24 feeds; `newsserviceflorida.com` answered HTTP 429.
2. **Enqueue, dry run** (reads the roster, writes nothing):
   ```bash
   node scripts/news-enqueue.ts --dry-run < /tmp/kyv-sweep.json > /tmp/kyv-enqueue.jsonl
   ```
   Read the counts line. On the 2026-10-04 data, with the recommended surname
   rule, expect about 51 attachments, all `named` and 0 `related`, with about
   507 matching no candidate and a roster of 82. A large `related` count means
   `SURNAME_ONLY_RULE` is `bare_surname`. Every line of the `.jsonl` is the
   exact payload that would be queued.
3. **Enqueue for real:**
   ```bash
   node scripts/news-enqueue.ts < /tmp/kyv-sweep.json
   ```
   This writes one `source` row per outlet used (`outlet:<domain>`, lean
   `unrated`) and the `review_item` rows. Pairs already queued or published
   are skipped.
4. **Review and approve** in `/admin/review`, one row at a time. For each
   approval, the route:
   - re-runs the neutrality lint (a banned term refuses the row, and it stays
     pending);
   - resolves the source: the payload's own source id first, checked against
     the story's URL (below), then the URL's listed outlet, then an existing
     source row for that exact page. There is no official fall-through: a
     government URL with no source id resolves only to its own page row
     (news-source-integrity spec §3.2.2, D7);
   - inserts.

   **A source id in the payload is checked against the story's URL** before
   it is used, so a payload cannot attribute one publisher's story to another:
   - `outlet:<domain>` only when the URL belongs to that outlet. Every swept
     story carries its own outlet's id, so the sweep's items pass.
   - `official:<domain>` only on an `election_news` item that names no
     candidate and no race, and only when the URL is on that entry of
     `src/lib/official-sources.ts` (17 bodies: the Division of Elections, the
     four covered Supervisors, the Legislature, the courts). The route writes
     that body's source row from the list (`primary_doc` / `N/A`, publisher as
     listed) if it is missing, and refuses if a row for that host already
     exists with another type or lean. R3's queue,
     `scripts/election-news.ts queue`, is what writes these ids.
   - any other id (a `src_*` page row) only when that row's `url_norm` is
     this story's (`urlNorm` of its URL).

   A failed check names the mismatch. Anything it refuses stays pending with
   the reason in `apply_error`. An operator hand-add from a page off the
   outlet list, a government page included, needs a `source` row for that
   page first, with the page's true type (an agency's advocacy page is
   `opinion`, as 0040 typed FDACS's statement). That is the same pattern 0014,
   0040 and 0042 use.

   **Five outlets are refused outright, and a page source row does not help.**
   Stories from `apnews.com`, `miamiherald.com`, `tampabay.com`,
   `orlandosentinel.com` and `sun-sentinel.com` are refused until their
   `leanTag` is signed off in `src/lib/news-sources.ts` (gate C7-a, a founder
   act). These are the five outlets on the list with `leanTag: null`. The
   resolver stops at "on the list, lean not signed off" before it looks for a
   page row, on purpose: a page row would put a lean on the card that nobody
   signed off for that outlet. Before 2026-10-04 the approve path set no
   `source_id`, so these stories went in sourceless. Now an operator cannot
   post an AP or Herald story through the console at all. The sweep never
   reads these five anyway (the same lean gate, and for three of them the AI
   crawler policy hold), so this only affects operator hand-adds. The founder
   decides which way to go (stream-surface-handoff.md §7).
5. **Characterize, dry run** (now scoped to `candidate_news` and
   `election_news`; `official_link` is never read):
   ```bash
   node scripts/news-characterize.ts --dry-run --limit 20
   ```
   Every printed id must be a stored news row. The first run also picks up the
   eight `election_news` rows.
6. **Characterize for real:**
   ```bash
   node scripts/news-characterize.ts --limit 50
   ```
   Note the provenance string it prints (`jev:jev-1.13.0/tax-…/q-…`); the
   rollback needs it.
7. **Post-checks:** re-run the P5 counts, then load one candidate page that
   has rows (GET). Check that it shows at most N cards, with the publisher on
   each and the shortfall line where fewer exist. Run
   `node scripts/verify-news-neutrality.ts` (live mode) for the source embed.

### Rolling the inlet back

- **Queued, not approved:** reject them in the console, which keeps the audit
  trail. To bulk-reject them in SQL instead:
  `UPDATE review_item SET status='rejected', decided_at=now(), decision_note='inlet rollback' WHERE kind='manual_news' AND source='agent:R1' AND status='pending';`
- **Approved rows:** `news_item` has no `created_at`, so find the rows through
  the approved items:
  ```sql
  SELECT n.id FROM news_item n
    JOIN review_item r ON r.kind = 'manual_news' AND r.source = 'agent:R1'
     AND r.status = 'approved' AND r.applied_at >= '<run start, UTC>'
     AND n.url = r.payload->>'url'
     AND COALESCE(n.candidate_id, '') = COALESCE(r.payload->>'candidate_id', '')
   WHERE n.item_type = 'candidate_news';
  ```
  Delete those ids from the SQL editor, not the MCP. Candidate pages cache
  for an hour (`unstable_cache`, tags `races` and `candidate:<id>`).
- **Characterizer writes:**
  `UPDATE news_item SET issues = NULL, characterized_by = NULL, characterized_at = NULL WHERE characterized_by = '<provenance>';`
- **`outlet:` source rows** can stay. They describe outlets, and nothing shows
  them unless a news row points at one.
- **The founder calls:** flip the constants in §2. Nothing else depends on
  them.

## 6. What the news cron does now that the service key is readable

`/api/cron/refresh-news` runs daily at 10:00 UTC. Since #109 it reads the
service-role key as `SUPABASE`, so its first run (10:00 UTC, 2026-10-05, not
yet observed) inserts one `pipeline_event` per published race not yet
announced: **36 rows at once** on 2026-10-04's data, because live had 0
`pipeline_event` rows. Each is dated with the race's `published_at`, and each
carries #107's summary:

> "This race passed the Balance Audit and was approved for publishing, so
> what each candidate says, quoted from their own site, is now live."

#107 replaced the old "equal space and comparable scrutiny" wording before the
key became readable, so no row carries it. The route belongs to the
coordinator's package, not this one.

## 7. R3 cadence in the final weeks: recommended, pending

`refresh-agents-plan.md` §8 question 2 defaulted to "graduate R3 to a daily
Vercel cron in the final 8 weeks". That window opened on 2026-09-08 and passed
without a decision. The newest `news_item` is dated 2026-09-09.

**Recommended (pending founder confirmation): move R3 to daily on Cowork for
2026-10-05 → 2026-11-03.** Change the scheduled task's schedule from
`0 9 * * 3` to `0 9 * * *`. Do not build ADR-001 Option B now.

- **The dates are dense.** The registration deadline is 10-05, the
  vote-by-mail request deadline 10-22, early voting runs 10-24 to 10-31, and
  Election Day is 11-03. A Wednesday-only run can trail a changed early-voting
  site by six days.
- **Option B is a build.** It needs a new `/api/cron/*` route, a model key in
  Vercel (`TYPESAFE_API_KEY`; production's `JEV` is read by nothing), the
  service-role key (readable as `SUPABASE` since #109), allowlist config and
  monitoring, all written and reviewed in the last four weeks. ADR-001 itself
  says Cowork's weakness is reliability ("runs while the app is open; a missed
  slot runs on next launch"). That is acceptable if the app is opened daily.
- **R3 must write a source.** It writes `election_news` rows. Once 0014 is
  applied, a row without a `source_id` is refused. R3's prompt lives in the
  Cowork task, outside this repo. Add "register each page as a `source` row
  (Tier 1 pages: `primary_doc`, lean `N/A`) and set `source_id`" before 0014
  goes live.
- **To flip:** leave the weekly schedule, or build Option B after Nov 3 with
  the same brief.

## 8. Verified in the writing session, and not

| Claim | How |
| ----- | --- |
| 0014 is not applied; 8 sourceless `election_news` rows; 0 `review_item`; 82 profiles across 36 races; 0 `outlet:` sources | read-only `SELECT`s and `list_migrations`, 2026-10-04 |
| 0014 alone fails on live-shaped data; 0042 then 0014 applies cleanly and is idempotent | PGlite simulation of the live state (scratch, not in the repo); `verify-migrations.mjs` passes with 0042 in the fresh-database order |
| The surname, N and policy measurements | live sweep (GET) through the real `planAttachments` and `matchArticle` with the live roster |
| The approve path resolves a source before inserting | `verify-news-enqueue.ts` §8, plus mutation checks (insert without the source, resolve after insert) |
| **Not verified:** any enqueue, approval or characterize run; the admin console end to end; Jev's output on real rows; the 0014 apply itself | keys absent; no production writes allowed from this session |
