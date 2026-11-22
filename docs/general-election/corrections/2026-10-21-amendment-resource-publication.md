# Publish reviewed Amendment 1 and 2 resources: explicit founder freeze exception

- Reported by / how: founder in this Codex chat, 2026-10-21; PR #218 source review.
- The claim: new verified outside resources are absent from https://knowyour.vote/measures/FL-AM1-general and https://knowyour.vote/measures/FL-AM2-general.
- Evidence: four primary pages fetched and read on 2026-10-21 (all HTTP 200):
  - https://pbcdemocraticparty.org/no-on-1-2-3-yes-on-our-schools-parks-and-libraries/
  - https://hillsboroughcountydemocrats.org/vote
  - https://unionhall.aflcio.org/browardcounty/2026-broward-afl-cio-endorsements
  - https://www.miamidadedems.org/official-2026-endorsements

- A correction under README "What is a correction"? No. These are newly found amendment statements. This is an explicit founder-authorized exception to the freeze, not a claim that the additions are factual corrections. The freeze stays enabled; only this transaction names this exception.
- Founder: “mkae the new articles live” (2026-10-21), following review and the instruction to keep AM1 below the boundary unless more qualifying support-side sources appear. The immediately preceding scope was the original five rows plus Miami-Dade AM2, with Miami-Dade AM1 held.
- Scope: six argument/oppose resources across four primary pages. Two AM1 rows (Palm Beach, Broward); four AM2 rows (Palm Beach, Hillsborough, Broward, Miami-Dade). Bare endorsement lists remain labelled as supplying no reasons. Existing records and publication status are unchanged. Miami-Dade AM1 remains a verified finding held from seeding; it is not disqualified.
- Live preflight: anon reads AM1 published, 4 support / 5 oppose / 12 neutral; AM2 published, 5 support / 4 oppose / 9 neutral. No new source is already a resource.
- Expected postflight: AM1 4 / 7 / 12, below the 4 / 8 boundary; AM2 5 / 8 / 9. Both remain published and pass the existing gate.
- Apply: paired .sql file, one transaction; validates publication/support baseline, final counts and balance. Uses existing source URL normalization and leaves existing rows intact on conflict. Re-running leaves resource counts unchanged and does not duplicate the audit entry.
- Rollback: in one founder-authorized correction transaction, delete only the six resource_ids listed in the paired SQL after confirming they are the newly inserted rows. Leave source rows and the append-only audit intact. This restores the original valid counts. No rollback has run.
- Applied: 2026-10-22 00:52:14 UTC (October 21 EDT), through the production Supabase SQL editor on project pqracitpmzpiqfnzlngw; paired transaction committed. No migration was registered; this is the runbook SQL-editor correction/exception path. Audit actor founder, action note, subject FL-AM1-general,FL-AM2-general.
- Database checked live: anon reads all six new resources with exact expected counts; Miami-Dade AM1 absent; content_freeze window unchanged. Vercel production tags `measures`, `measure:FL-AM1-general`, and `measure:FL-AM2-general` invalidated successfully. After background regeneration, both public pages returned HTTP 200/cache HIT containing all six approved links; the held AM1 Miami-Dade link is absent. Public verification URLs: https://knowyour.vote/measures/FL-AM1-general and https://knowyour.vote/measures/FL-AM2-general.
- Validation: full migration replay in PGlite, correction applied twice with exact counts and no duplicate audit entry; anon sees all six additions; AM3 unchanged; freeze setting remains local to the transaction. Resource lint: six rows, zero advisory findings. Balance/visibility checks pass. Independent Standards and Spec reviews found no blockers.
