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
| **0013** | `0013_general_election.sql` — `candidate.ballot_status`, party CHECK dropped (`docs/general-election/data-architecture.md` §2, ingest A1) | **reserved, not written** |
| **0014** | `0014_news_fairness.sql` — agent news rows must carry a `source_id` (`docs/general-election/news-fairness.md` §3, N1) | **reserved, not written** |
| 0015 | `0015_general_election_copy.sql` — UPDATEs the seeded registration-link `news_item` row off primary-era copy (`docs/general-election/data-ingest.md` B6) | applied 2026-09-07 |
| 0016 | `0016_news_county.sql` — `news_item.county_fips` + `idx_news_item_county` (`docs/general-election/candidate-news-PRD.md` §7, task C9) | applied 2026-09-07 (recorded in `schema_migrations` as **`news_county`**, without the `0016_` prefix 0015 has — match by content, not by name) |
| 0017 | `0017_news_relation.sql` — `news_item.relation` (`named`/`related`) + `idx_news_item_candidate_relation` (`docs/general-election/candidate-news-PRD.md` §6, task C8) | written 2026-09-07, **not yet applied** |
| 0018+ | free | — |

Verify applied state with `SELECT version, name FROM supabase_migrations.schema_migrations`
(read-only) rather than trusting this table; update the table when it drifts.
