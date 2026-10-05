-- 0033_listed_publication.sql
-- A `listed` publication tier: the ballot roster becomes readable before any
-- brief is written, and not one claim becomes readable with it.
--
-- WHY: RLS (0002, 0011) lets anon read race, candidate and ballot_measure only
-- when the race/measure has a publication row at status = 'published', and
-- 'published' means "the audited brief" -- every candidate Profile has
-- balance_check_passed. Measured 2026-09-23 on the live project: 53 general
-- races (17 federal, 4 state, 32 county), 106 ballot-tier candidates, 3
-- amendments with verbatim ballot text, and ZERO profile / issue / position /
-- claim rows and ZERO race_publication / measure_publication rows. So every
-- voter-facing surface is dark by construction: the home page says the ballot
-- is not published, /candidates lists nothing, every race page says "still in
-- review". Nothing seeded this week (0030, 0031, 0032, the official sites) can
-- reach a voter until a brief is written and audited -- weeks of work per race.
--
-- But the product's non-negotiable is about CLAIMS ("every claim traceable to
-- a source"; "a race is publicly reachable only when every candidate Profile
-- has balance_check_passed"). Who is on the ballot, their party as filed,
-- their official site, whether the seat was already decided, and an
-- amendment's ballot text are public record from the Division of Elections
-- and the county Supervisors of Elections. They are not editorial content and
-- there is nothing in them for the Balance Audit to balance.
--
-- THE TIER, between in_review and published:
--
--   draft / in_review  anon reads nothing                      invisible
--   listed             race, candidate (ballot tier, via        "who is on the
--                      race.candidate_ids), race_publication     ballot"
--                      .status, verified candidate_social_
--                      account; ballot_measure, measure_
--                      publication.status
--   published          everything, exactly as before            the audited brief
--
-- THE SAFETY ARGUMENT, and it is the whole of it: the policies on profile,
-- issue, position, claim, claim_source and measure_argument are NOT touched by
-- this file. Each still reads `rp.status = 'published'` / `mp.status =
-- 'published'` exactly as 0002 and 0011 wrote them, and none of them mentions
-- 'listed'. A listed race therefore cannot leak an unaudited claim, position
-- or measure argument, whatever rows exist beneath it -- the database refuses,
-- not the UI. verify-migrations.mjs pins this with a listed race that DOES
-- carry a profile, issue, claim and claim_source, and asserts anon sees none
-- of them.
--
-- WHAT A LISTED CANDIDATE IS: visible through `candidate_id = ANY(race.
-- candidate_ids)` for a listed-or-published race. race.candidate_ids only ever
-- holds BALLOT-tier ids (data-architecture.md D1, founder 2026-09-07: write-ins
-- and excluded filers -- DEF/DNQ/WIT/REM -- are kept out of candidate_ids by
-- intake), so a write-in or a defeated filer stays invisible here exactly as
-- it does on a published race. The pre-existing profile-in-published-race
-- path is kept alongside it, unchanged.
--
-- MEASURES: 0010's enforce_measure_balance fires its check only when
-- NEW.status = 'published' (confirmed in 0012's rewrite too), and 0010's
-- argument-side trigger only guards measures whose publication row is
-- 'published'. So a `listed` measure with zero arguments is accepted, and its
-- arguments stay editable freely -- which is right: nothing about the
-- arguments is shown until the balanced set is published.
--
-- THE DOOR: set_race_publication (0018/0020) is recreated so 'listed' is a
-- valid p_status. admin_action.action carries no CHECK (0006: free TEXT), so
-- the flip gets its own verbs -- 'list' entering listed, 'unlist' leaving it
-- -- rather than the anonymous 'set_status', because "who put this roster in
-- front of voters, and why" is the question the audit row exists to answer.
-- 'publish' / 'unpublish' keep their meaning and take precedence (published
-- -> listed is an unpublish: the brief came down). published_at semantics are
-- unchanged: stamped entering 'published' only; listing never stamps it.
--
-- SEEDED ROWS: every active-election race (race.election = 'general', i.e.
-- ACTIVE_ELECTION_KIND in src/lib/election.ts) with no race_publication row
-- gets one at 'draft', so the door has a row to flip -- set_race_publication
-- refuses a race with none. Draft is invisible, so this changes nothing a
-- voter can see. No measure_publication rows are inserted: the go-live flip
-- (scripts/list-ballot-2026.sql) inserts them at 'listed' directly, since
-- measures have no door function.
--
-- ORDER OF OPERATIONS (docs/general-election/listed-tier-2026-09-23.md): the
-- listing UI deploys first, then this file, then list-ballot-2026.sql by
-- hand. Applying this file alone makes nothing visible: it widens what
-- `listed` COULD show, and no row holds it.
--
-- Idempotent: safe to re-run (CHECKs dropped by name and re-added, policies
-- dropped IF EXISTS and recreated, the seed skips races that have a row, and
-- the closing assertion compares before/after rather than absolute counts, so
-- a re-run after go-live does not trip it).

-- (1) Widen both status CHECKs. Default-named by 0001/0010 (confirmed live and
--     in PGlite: race_publication_status_check, measure_publication_status_
--     check). Drop by name then re-add, the 0023/0032 pattern -- a stale CHECK
--     left beside the new one would still reject every 'listed' row.
ALTER TABLE race_publication DROP CONSTRAINT IF EXISTS race_publication_status_check;
ALTER TABLE race_publication ADD CONSTRAINT race_publication_status_check
  CHECK (status IN ('draft','in_review','listed','published'));

ALTER TABLE measure_publication DROP CONSTRAINT IF EXISTS measure_publication_status_check;
ALTER TABLE measure_publication ADD CONSTRAINT measure_publication_status_check
  CHECK (status IN ('draft','in_review','listed','published'));

COMMENT ON COLUMN race_publication.status IS
  'draft/in_review = invisible to anon; listed = roster only (race, ballot-tier '
  'candidates via candidate_ids, verified socials) -- NO profile/issue/position/'
  'claim; published = the audited brief (0002, 0033). Moves only through '
  'set_race_publication().';
COMMENT ON COLUMN measure_publication.status IS
  'draft/in_review = invisible to anon; listed = ballot_measure row only (ballot '
  'text) -- NO measure_argument; published = balanced arguments too, enforced by '
  'trg_measure_balance (0010, 0033).';

-- (2) The door, recreated with 'listed'. Same signature, SECURITY DEFINER,
--     pinned search_path, RETURNS admin_action -- CREATE OR REPLACE keeps the
--     ACL, but the grants are re-stated below anyway (0020's lesson).
CREATE OR REPLACE FUNCTION set_race_publication(
  p_race_id TEXT,
  p_status  TEXT,
  p_actor   TEXT,
  p_reason  TEXT
) RETURNS admin_action
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prior  TEXT;
  v_action TEXT;
  v_row    admin_action;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('draft', 'in_review', 'listed', 'published') THEN
    RAISE EXCEPTION 'set_race_publication: invalid status %', p_status
      USING HINT = 'expected draft, in_review, listed or published';
  END IF;
  IF p_actor IS NULL OR btrim(p_actor) = '' THEN
    RAISE EXCEPTION 'set_race_publication: actor is required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'set_race_publication: reason is required';
  END IF;

  SELECT status INTO v_prior
    FROM race_publication WHERE race_id = p_race_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'set_race_publication: no race_publication row for %', p_race_id;
  END IF;

  /* published_at means "when it went live", so it is stamped on the
     transition INTO published and left alone otherwise -- an unpublish keeps
     the last-published time rather than erasing it, and listing a race never
     stamps it (a roster is not the audited brief going live). */
  UPDATE race_publication
     SET status = p_status,
         published_at = CASE
           WHEN p_status = 'published' AND v_prior <> 'published' THEN now()
           ELSE published_at
         END
   WHERE race_id = p_race_id;

  /* publish/unpublish first, so published -> listed reads as the brief
     coming down (unpublish), not as a listing. */
  v_action := CASE
    WHEN p_status = 'published' THEN 'publish'
    WHEN v_prior = 'published'  THEN 'unpublish'
    WHEN p_status = 'listed'    THEN 'list'
    WHEN v_prior = 'listed'     THEN 'unlist'
    ELSE 'set_status'
  END;

  INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
  VALUES (
    p_actor, v_action, 'race_publication', p_race_id,
    jsonb_build_object(
      'prior_status', v_prior,
      'new_status',   p_status,
      'reason',       p_reason
    )
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION set_race_publication(TEXT, TEXT, TEXT, TEXT) IS
  'Flip a race between draft / in_review / listed / published AND write its '
  'admin_action row in one statement (0018, 0033). The only path that cannot '
  'leave the audit trail empty.';

-- Re-stated from 0020, by name: FROM PUBLIC alone is what failed on Supabase.
REVOKE ALL ON FUNCTION public.set_race_publication(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;
GRANT EXECUTE ON FUNCTION public.set_race_publication(TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- (3) The six roster policies. Each is dropped by name and recreated; the
--     other six anon policies (profile, issue, position, claim, claim_source,
--     measure_argument) are deliberately left as 0002/0011 wrote them. That
--     is the safety argument in the header -- do not "tidy" them into this
--     file.

-- The gate rows themselves: a listed race's status is readable, so the UI can
-- tell "roster" from "brief" without guessing.
DROP POLICY IF EXISTS anon_read_published ON race_publication;
CREATE POLICY anon_read_published ON race_publication
  FOR SELECT TO anon
  USING (status IN ('listed', 'published'));

DROP POLICY IF EXISTS anon_read_race ON race;
CREATE POLICY anon_read_race ON race
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = race.race_id AND rp.status IN ('listed', 'published')
  ));

-- A candidate is visible EITHER through a published race's profile (0002,
-- unchanged) OR by being named in the candidate_ids of a listed-or-published
-- race. The second path is what makes the roster readable with zero profile
-- rows. candidate_ids holds ballot-tier ids only (D1), so write-in and
-- excluded filers stay hidden on both paths.
DROP POLICY IF EXISTS anon_read_candidate ON candidate;
CREATE POLICY anon_read_candidate ON candidate
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM profile p
      JOIN race_publication rp ON rp.race_id = p.race_id
      WHERE p.candidate_id = candidate.candidate_id AND rp.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM race r
      JOIN race_publication rp ON rp.race_id = r.race_id
      WHERE candidate.candidate_id = ANY (r.candidate_ids)
        AND rp.status IN ('listed', 'published')
    )
  );

-- Only verified handles, and only for a candidate visible by the rule above.
-- The verified gate is unchanged: an unverified handle is a claim about who
-- runs an account, and listing does not make that claim.
DROP POLICY IF EXISTS anon_read_social ON candidate_social_account;
CREATE POLICY anon_read_social ON candidate_social_account
  FOR SELECT TO anon
  USING (
    status = 'verified'
    AND (
      EXISTS (
        SELECT 1 FROM profile p
        JOIN race_publication rp ON rp.race_id = p.race_id
        WHERE p.candidate_id = candidate_social_account.candidate_id
          AND rp.status = 'published'
      )
      OR EXISTS (
        SELECT 1 FROM race r
        JOIN race_publication rp ON rp.race_id = r.race_id
        WHERE candidate_social_account.candidate_id = ANY (r.candidate_ids)
          AND rp.status IN ('listed', 'published')
      )
    )
  );

DROP POLICY IF EXISTS anon_read_measure_publication ON measure_publication;
CREATE POLICY anon_read_measure_publication ON measure_publication
  FOR SELECT TO anon
  USING (status IN ('listed', 'published'));

-- The ballot text is readable at listed; its arguments are not
-- (anon_read_measure_argument, 0011, untouched).
DROP POLICY IF EXISTS anon_read_ballot_measure ON ballot_measure;
CREATE POLICY anon_read_ballot_measure ON ballot_measure
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = ballot_measure.measure_id
      AND mp.status IN ('listed', 'published')
  ));

-- (4) Draft rows for every active-election race that has none, and an
--     assertion that this migration made nothing visible. Compared
--     before/after rather than as absolute counts, so a re-run after the
--     go-live script has listed everything still passes.
DO $$
DECLARE
  v_listed_before    INT;
  v_published_before INT;
  v_listed_after     INT;
  v_published_after  INT;
  v_inserted         INT;
BEGIN
  SELECT
    (SELECT count(*) FROM race_publication WHERE status = 'listed')
      + (SELECT count(*) FROM measure_publication WHERE status = 'listed'),
    (SELECT count(*) FROM race_publication WHERE status = 'published')
      + (SELECT count(*) FROM measure_publication WHERE status = 'published')
  INTO v_listed_before, v_published_before;

  INSERT INTO race_publication (race_id, status)
  SELECT r.race_id, 'draft'
    FROM race r
   WHERE r.election = 'general'
     AND NOT EXISTS (
       SELECT 1 FROM race_publication rp WHERE rp.race_id = r.race_id
     );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  SELECT
    (SELECT count(*) FROM race_publication WHERE status = 'listed')
      + (SELECT count(*) FROM measure_publication WHERE status = 'listed'),
    (SELECT count(*) FROM race_publication WHERE status = 'published')
      + (SELECT count(*) FROM measure_publication WHERE status = 'published')
  INTO v_listed_after, v_published_after;

  IF v_listed_after <> v_listed_before OR v_published_after <> v_published_before THEN
    RAISE EXCEPTION
      '0033 changed visibility: listed % -> %, published % -> % (it must only seed draft rows)',
      v_listed_before, v_listed_after, v_published_before, v_published_after;
  END IF;

  RAISE NOTICE '0033: seeded % draft race_publication row(s); listed=%, published=% (unchanged)',
    v_inserted, v_listed_after, v_published_after;
END $$;
