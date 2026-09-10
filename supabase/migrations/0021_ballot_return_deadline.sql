-- 0021_ballot_return_deadline.sql
-- Adds the vote-by-mail RETURN deadline to election_event, plus the `rule`
-- column that says how any deadline is satisfied.
--
-- WHY: election_event carried the date a ballot may be *requested* by
-- (0008, general_2026 = 2026-10-22) but never the date it must be *back* by.
-- For a vote-by-mail voter that is the last deadline and the one with no
-- second chance, and it is the one voters most reliably get wrong, because
-- the intuition carried over from tax returns — "a postmark counts" — is
-- exactly false here. The Division of Elections states it without hedging
-- (https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/, page last
-- updated 2026-01-14):
--
--   "A returned voted ballot must be received, regardless of postmark, by
--    the Supervisor of Elections' office no later than 7:00 pm (local time)
--    on Election Day. ... Untimely received ballots are otherwise not
--    counted."
--
-- Cross-checked against the federal FVAP feed
-- (https://www.fvap.gov/xml-api/Florida/deadline-dates.xml, fetched
-- 2026-09-09), which carries the same rule as a "Ballot Return" row dated
-- 2026-11-03T19:00:00, "Return by Mail: Received by", "Within the U.S.".
--
-- WHY `rule` IS A COLUMN AND NOT A CONSTANT IN CODE: the whole point of this
-- table is that dates are DATA a human verifies against details_url before
-- anything sends (F4). "Received by" vs "postmarked by" is part of the fact
-- being verified, not decoration on it — a row whose date is right and whose
-- rule is wrong still misinforms a voter, and the founder checking the row
-- should be checking both. It is functionally determined by event_type
-- today only because every row is statewide FL; county rows and other
-- states are the reason it is per-row.
--
-- WHY NO TIME-OF-DAY COLUMN: the deadline is 7:00 p.m. local, and
-- event_date is a bare DATE. Storing the time would make the ICS entry a
-- timed VEVENT, which needs a VTIMEZONE block for "local time" to mean
-- anything — real machinery for one statutory constant that is identical
-- for every FL election (it is poll-closing time). The hour therefore lives
-- in the display label in src/lib/notifications/ics.ts, where all other
-- user-facing wording already lives (templates.ts §0.3: copy exists in
-- exactly one place, never in a database string). If a second state ever
-- lands here, that is the moment this becomes a column.
--
-- SCOPE — DOMESTIC. The seeded rule is the one that governs voters in the
-- U.S. Florida grants overseas voters a 10-day extension for the General
-- (ballot postmarked or dated by Election Day), and FVAP carries that as a
-- separate "Outside the U.S." row. This product addresses Florida voters at
-- a Florida ZIP; modelling the UOCAVA path would mean a voter_type axis on
-- every row to serve an audience the app does not have. Deliberately out of
-- scope — do not "fix" this by widening the rule of the existing row, which
-- would tell a domestic voter a postmark counts.
--
-- NO REMINDER IS SCHEDULED BY THIS FILE. The row reaches voters through the
-- .ics calendar only (src/lib/notifications/ics.ts). Adding a T-7/T-1 email
-- means a new template and a new send path, which is a separate decision
-- with its own F4 verification — see REMINDER_OFFSETS in schedule.ts.
--
-- CONSTRAINT NAME: election_event's event_type CHECK was written inline in
-- 0007_notifications.sql and named by Postgres, so nothing in this repo has
-- ever asserted its name. Same hazard 0019 documented for candidate: drop
-- the wrong name and the old five-value CHECK survives beside the new one,
-- the migration reports success, and every ballot_return_deadline row is
-- still rejected. The guard below makes that half-application loud.
--
-- Idempotent: safe to re-run.

-- (1) Widen event_type. Widening rejects no existing row.
-- The pairing constraint added in (5) also mentions event_type, so it comes
-- off first: otherwise a RE-RUN trips the guard below on 0021's own work and
-- aborts, which is how this was caught.
ALTER TABLE election_event DROP CONSTRAINT IF EXISTS election_event_rule_required_check;
ALTER TABLE election_event DROP CONSTRAINT IF EXISTS election_event_event_type_check;

DO $$
DECLARE stale TEXT;
BEGIN
  SELECT string_agg(conname, ', ') INTO stale
    FROM pg_constraint
   WHERE conrelid = 'election_event'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%event_type%';
  IF stale IS NOT NULL THEN
    RAISE EXCEPTION
      'election_event.event_type still carries CHECK constraint(s) %; drop them by name before re-running 0021, or ballot_return_deadline rows will keep being rejected', stale;
  END IF;
END $$;

ALTER TABLE election_event ADD CONSTRAINT election_event_event_type_check
  CHECK (event_type IN
    ('registration_deadline','vbm_request_deadline','ballot_return_deadline',
     'early_voting_start','early_voting_end','election_day'));

-- (2) The rule column. Machine tokens, never display copy — the label a
-- voter reads is derived from these in code, so a row can never smuggle
-- wording into an email.
ALTER TABLE election_event ADD COLUMN IF NOT EXISTS rule TEXT;

ALTER TABLE election_event DROP CONSTRAINT IF EXISTS election_event_rule_check;
ALTER TABLE election_event ADD CONSTRAINT election_event_rule_check
  CHECK (rule IS NULL OR rule IN ('postmarked_by','received_by'));

-- (3) Backfill before the pairing constraint below can be satisfied.
-- registration_deadline is postmarked_by: FVAP's rule for the mailed
-- application. Online and in-person registration must simply be COMPLETE by
-- the same date, which the label in ics.ts says — postmarked_by is the
-- laxest of the three, so it can never make a voter miss the deadline by
-- believing it. vbm_request_deadline is received_by: "no later than 5 p.m.
-- on the 12th day before the election" (same DoE page as above).
UPDATE election_event SET rule = 'postmarked_by'
 WHERE event_type = 'registration_deadline' AND rule IS NULL;
UPDATE election_event SET rule = 'received_by'
 WHERE event_type = 'vbm_request_deadline' AND rule IS NULL;

-- (4) The return-deadline rows: same day as the election, 7 p.m. local.
-- details_url is the vote-by-mail page rather than 0008's election-dates
-- page, because that is the page that actually states this rule — every
-- send cites its source, so the citation has to carry the claim.
-- ON CONFLICT DO NOTHING against uq_election_event_scope, as 0008.
INSERT INTO election_event (event_type, election, event_date, rule, details_url) VALUES
  ('ballot_return_deadline', 'primary_2026', '2026-08-18', 'received_by', 'https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/'),
  ('ballot_return_deadline', 'general_2026', '2026-11-03', 'received_by', 'https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/')
ON CONFLICT DO NOTHING;

-- (5) Every deadline carries a rule; nothing else may. Added last, once the
-- backfill has made it satisfiable. This is the constraint that stops a
-- future ballot_return_deadline row being inserted rule-less and rendering
-- as a bare date — the exact failure this migration exists to prevent.
ALTER TABLE election_event ADD CONSTRAINT election_event_rule_required_check
  CHECK (
    CASE
      WHEN event_type IN ('registration_deadline','vbm_request_deadline','ballot_return_deadline')
        THEN rule IS NOT NULL
      ELSE rule IS NULL
    END
  );

COMMENT ON COLUMN election_event.rule IS
  'How the deadline is satisfied, as a machine token rendered into copy by '
  'src/lib/notifications/ics.ts — never shown raw. received_by = must be in '
  'the Supervisor of Elections'' hands by the date (vote-by-mail requests, '
  'and ballot returns, which are due 7 p.m. local on election day REGARDLESS '
  'OF POSTMARK); postmarked_by = a mailed item postmarked by the date counts. '
  'NULL for early_voting_start/end and election_day, which are not deadlines. '
  'Domestic rules only — Florida''s overseas 10-day extension is not modelled '
  '(see 0021 header).';
