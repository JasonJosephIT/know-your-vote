-- 0018_publication_audit.sql
-- Publication flips get an audit home, and a door that always writes to it.
--
-- WHY: race_publication.status is the most consequential switch in the
-- product — it is what puts a race in front of voters, or pulls it back — and
-- it was the one privileged action with nowhere to log it.
--
--   * action_log (0009) is the pipeline's tool-call log. Its agent_id CHECK
--     admits only profiler/record/factchecker/orchestrator, and 0009's own
--     header states publication flips go through the founder/console, NEVER
--     through a tool call. A row there would have to impersonate an agent,
--     and that table feeds the Symmetric Scrutiny and Audit Block Rate
--     queries (CAP_Logging_Schema_v1 §4) — fiction there skews a fairness
--     metric, which is the one thing this product cannot afford.
--   * admin_action (0006) is the right register — "append-only audit of every
--     privileged action" — but subject_id is UUID NOT NULL, typed for the
--     console's own queue objects (agent_run_request, review_item). A race id
--     is TEXT ('demo-fl-house-10'), so a race never fit.
--
-- Measured 2026-09-09/10 before writing this: FL-10 was published by hand and
-- the only record is prose in race_publication.note. There is NO app write
-- path to race_publication anywhere — src/, scripts/, toollayer/ and runtime/
-- contain only reads, the demo seed, and the test harness. Flips are manual,
-- so a log that depends on the person flipping remembering to write one is a
-- log that stays empty. It did: admin_action held 0 rows.
--
-- (1) widens admin_action to carry a TEXT subject alongside the UUID one
-- (2) adds set_race_publication(), which flips and logs in one statement, so
--     the audit row cannot be forgotten or written after the fact
--
-- Idempotent: safe to re-run.

-- (1) admin_action carries either a UUID subject (the console's queue objects)
--     or a TEXT one (rows keyed by a natural id, like race_publication), never
--     both and never neither. Existing rows all have subject_id and no
--     subject_ref, so the CHECK is satisfied by construction.
ALTER TABLE admin_action ADD COLUMN IF NOT EXISTS subject_ref TEXT;
ALTER TABLE admin_action ALTER COLUMN subject_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_action_subject_one_of'
  ) THEN
    ALTER TABLE admin_action ADD CONSTRAINT admin_action_subject_one_of
      CHECK ((subject_id IS NULL) <> (subject_ref IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN admin_action.subject_ref IS
  'Natural-key subject for rows not keyed by UUID (e.g. race_publication.race_id). '
  'Exactly one of subject_id / subject_ref is set — admin_action_subject_one_of.';

-- (2) The door. Flip and log are one statement, so they commit together or
--     not at all; there is no window in which a race is live with no audit row.
--
--     SECURITY DEFINER with a pinned search_path — 0012 exists because an
--     unpinned SECURITY DEFINER function is a privilege-escalation vector, and
--     that lesson applies with more force here than it did to a balance check.
--
--     actor and reason are REQUIRED. An audit row that says who but not why is
--     the row we already had in race_publication.note, and it is not enough to
--     answer "should this have been published?" after the fact.
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
  IF p_status IS NULL OR p_status NOT IN ('draft', 'in_review', 'published') THEN
    RAISE EXCEPTION 'set_race_publication: invalid status %', p_status
      USING HINT = 'expected draft, in_review or published';
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
     transition INTO published and left alone otherwise — an unpublish keeps
     the last-published time rather than erasing it. */
  UPDATE race_publication
     SET status = p_status,
         published_at = CASE
           WHEN p_status = 'published' AND v_prior <> 'published' THEN now()
           ELSE published_at
         END
   WHERE race_id = p_race_id;

  v_action := CASE
    WHEN p_status = 'published' THEN 'publish'
    WHEN v_prior = 'published'  THEN 'unpublish'
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
  'Flip a race in or out of publication AND write its admin_action row in one '
  'statement. The only path that cannot leave the audit trail empty.';

-- Publication flips through the founder/console (service role) only — 0009's
-- rule, restated at the one place that can now perform them. Never anon,
-- never authenticated, and never the pipeline tool wrapper.
REVOKE ALL ON FUNCTION set_race_publication(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_race_publication(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- NOTE, deliberately not done here: service_role still holds direct UPDATE on
-- race_publication, so this function is the easy path, not yet the only one.
-- Revoking that UPDATE would make the door mandatory, but it is a change with
-- a blast radius this migration cannot verify (the console reads and counts
-- through the same role). Tighten it once the console's own paths are audited.
