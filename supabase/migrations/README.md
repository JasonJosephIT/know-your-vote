# Migration numbering ledger

Numbers are claimed **here first**, then the file is written. Three collisions
in one week (`0010`/`0011`, `0012`/`0013`, `0012` again) all came from planning
docs assigning "the next number" independently while other branches shipped.

Rules:

1. Files apply in filename order, and an applied number can never be reused or
   reordered (`0010_ballot_measure.sql` explains why a gap is worse than a rename).
2. Before writing a migration, take the next free number below, add a row, and
   land that row in the same PR as the file — or in a docs PR first if the file
   is still weeks out.
3. Planning docs reference the number **from this table**; when a number moves,
   this table moves first and the docs follow.

| # | File | State (live project `pqracitpmzpiqfnzlngw`) |
|---|---|---|
| 0000–0008 | pipeline read models … election seed | applied 2026-07 |
| 0009 | `0009_action_log_roles.sql` | applied 2026-09-07 |
| 0010 | `0010_ballot_measure.sql` | applied 2026-09-07 |
| 0011 | `0011_measure_rls.sql` | applied 2026-09-07 |
| 0012 | `0012_measure_function_search_path.sql` | applied 2026-09-07 |
| 0013 | `0013_general_election.sql` — `candidate.ballot_status`, party CHECK dropped (`docs/general-election/data-architecture.md` §2, A1) | applied 2026-09-07, **out of order** — written after 0014–0017 and applied after them, though numbered before. Recorded as **`general_election`**. Safe only because nothing in 0014–0017 touches `candidate`, which was checked. A fresh database applies it first instead; both orders are valid because the statements are independent. |
| **0014** | `0014_news_fairness.sql` — agent news rows must carry a `source_id` (`docs/general-election/news-fairness.md` §3, N1) | **written, NOT yet applied live** — out of order (numbered before 0015-0017, all of which are already live; checked that none touches `source_id`/`item_type`/`source`). Carries a data fix for four live `election_news` rows with no source (attributes each to its publishing government body; see file header). **PRECONDITION before applying live:** (a) the admin console's manual-news approve path (`src/lib/admin/effects.ts`, Stream S) must set `source_id` on the `news_item` rows it inserts, and its `describeNewsInsertError` must distinguish `news_item_agent_source_check` — today it inserts no source and describes every `23514` as "migration 0005 not applied", so applying first makes every approved manual news item fail with the wrong cause named; (b) re-run the REST check for NULL-source `candidate_news`/`election_news` rows immediately before applying (a stray row makes `ADD CONSTRAINT` fail loudly — intended, but it should be a known outcome). |
| 0015 | `0015_general_election_copy.sql` — UPDATEs the seeded registration-link `news_item` row off primary-era copy (`docs/general-election/data-ingest.md` B6) | applied 2026-09-07 |
| 0016 | `0016_news_county.sql` — `news_item.county_fips` + `idx_news_item_county` (`docs/general-election/candidate-news-PRD.md` §7, task C9) | applied 2026-09-07 (recorded in `schema_migrations` as **`news_county`**, without the `0016_` prefix 0015 has — match by content, not by name) |
| 0017 | `0017_news_relation.sql` — `news_item.relation` (`named`/`related`) + `idx_news_item_candidate_relation` (`docs/general-election/candidate-news-PRD.md` §6, task C8) | applied 2026-09-07 (recorded as **`news_relation`**, same prefix-less naming as `0016`) |
| **0018** | `0018_publication_audit.sql` — `admin_action.subject_ref` (TEXT subjects) + `set_race_publication()`, the flip-and-log door | **applied 2026-09-10** (recorded as `publication_audit`, prefix-less like 0016/0017) — publication flips had no audit home: `action_log`'s `agent_id` CHECK admits only the four pipeline agents and 0009 states flips never move through a tool call, while `admin_action.subject_id` is `UUID NOT NULL` and a race id is TEXT. There is no app write path to `race_publication` at all, so flips are manual and a log that relies on the flipper remembering stays empty — it did (0 rows). Additive: new nullable column, `subject_id` NOT NULL dropped, a one-of CHECK satisfied by every existing row, a new SECURITY DEFINER function with `search_path` pinned (0012's lesson) and EXECUTE granted to `service_role` only. FL-10's 2026-09-09 manual publish was backfilled into `admin_action` with its true `created_at` and `detail.backfilled = true`; a live smoke test re-asserted `demo-fl-house-15` (no-op flip, audit row written). |
| 0019 | `0019_zip_statewide.sql` — TASK-060's statewide `zip_district` reseed (`docs/general-election-pivot.md`, `docs/general-election/local-session.md`) | **reserved, file not written** — claimed here per rule 2's "docs PR first if the file is still weeks out", because TASK-060 is blocked on two Census crosswalk downloads that need a machine with real network. Reserving it stops the number moving a fourth time (it has been 0011 → 0018 → 0019 already). Data-only: `DELETE FROM zip_district` + `INSERT`, exactly like `0003`. |
| **0020** | `0020_publication_door_only.sql` — explicit EXECUTE revoke on `set_race_publication`, and `REVOKE UPDATE ON race_publication FROM service_role` | **PARTIALLY applied live 2026-09-10 — read this before assuming either half.** **(a) The EXECUTE revoke IS applied**, out-of-band and ahead of this file, because 0018 shipped the function with `anon` and `authenticated` holding EXECUTE on the live project: Supabase's `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS` wrote explicit grants at CREATE time, and 0018's `REVOKE ... FROM PUBLIC` does not remove an explicit grant to a named role. The function is SECURITY DEFINER owned by `postgres`, so the public anon key could flip any race. Live ACL is now `postgres | service_role` only; `admin_action` showed no flip but this session's two. **(b) The UPDATE revoke is NOT applied** — written and harness-verified, awaiting the founder's go-ahead. Until it lands, `service_role` still holds direct UPDATE and the door is the easy path, not the only one. |
| 0021+ | free | — |

Verify applied state with `SELECT version, name FROM supabase_migrations.schema_migrations`
(read-only) rather than trusting this table; update the table when it drifts.
