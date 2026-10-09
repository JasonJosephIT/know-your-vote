-- 0050_content_freeze.sql
-- The content-freeze guard for the 2026 general election
-- (docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md
-- §3.6.2; founder decision BC9, recommended pending founder confirmation).
--
-- From 2026-10-18 04:00 UTC (Sun 00:00 EDT) to 2026-11-04 05:00 UTC (Wed
-- 00:00 EST), ballot content changes only by a correction. Outside that
-- window every trigger below returns at once and changes nothing. Applied
-- Thu 10-15, it is inert until the window opens and stops by itself when it
-- closes; no step is needed to end it.
--
-- WHAT IT REFUSES. Inside the window, a write to a frozen table raises
-- P0001 "Ballot content is frozen until Election Day (content_freeze).
-- Corrections only: docs/general-election/corrections/README.md", unless
-- current_setting('kyv.freeze_correction', true) is non-blank. Then it
-- raises a NOTICE carrying that value and lets the write through. A
-- correction is one transaction:
--   BEGIN; SET LOCAL kyv.freeze_correction = '<correction file>'; ...; COMMIT;
-- and a correction migration applied in the window starts with
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
--
-- Statement-level (every INSERT, UPDATE, DELETE or TRUNCATE, even one that
-- touches no row): claim, claim_source, position, issue, profile,
-- ballot_measure, measure_resource, candidate_contact,
-- candidate_social_account, zip_district, block_district.
--
-- Row-level, with exceptions. "Changes only X" means every column whose
-- value differs between OLD and NEW is in X, compared as
-- to_jsonb(OLD) - X = to_jsonb(NEW) - X. On every row-level table an UPDATE
-- that changes nothing passes.
--   race_publication, measure_publication: an UPDATE whose new status is
--     'listed' passes, so an emergency takedown never waits on the setting.
--     A publish needs the setting.
--   candidate: an UPDATE that changes only site_last_verified_at passes.
--   race: an UPDATE that changes only info_last_verified_at and key_dates
--     passes (R2's freshness stamp; key_dates is election logistics approved
--     by a human in /admin, BC18).
--   source: INSERT always passes (news intake upserts outlet rows,
--     src/lib/news-intake.ts). UPDATE and DELETE are refused only for a row
--     referenced by claim_source or measure_resource.
-- Each row-level table also gets a statement-level TRUNCATE trigger.
-- election_event is deliberately not guarded, so a reminder date correction
-- is never slowed by it.
--
-- WHY SECURITY DEFINER. As INVOKER, a writer with no SELECT on
-- content_freeze (cap_tool_wrapper, anon, authenticated) would get
-- "permission denied for table content_freeze" even outside the window. The
-- function is owned by postgres, pins search_path to '' and names every
-- table schema-qualified (0012). EXECUTE is revoked by name from PUBLIC,
-- anon, authenticated, cap_tool_wrapper and cap_readonly, because REVOKE
-- FROM PUBLIC alone leaves Supabase's default grants in place (0020).
-- Triggers do not consult EXECUTE, so the revoke stops no write.
--
-- WHAT IT IS NOT. A security boundary: any session that can write can also
-- set the setting or disable a trigger. It stops accidental writes (a stale
-- brief.sql re-run, an agent's upsert, a migration applied by mistake) and
-- makes every frozen write name its correction file. The control is still
-- the founder's yes on every correction.
--
-- The five PGlite check scripts set kyv.freeze_correction = 'pglite replay'
-- before they replay migrations, so CI keeps passing inside the window.
--
-- Idempotent: safe to re-run. A re-run keeps an existing content_freeze row
-- as it is (ON CONFLICT DO NOTHING).

-- (1) The window: one row, id = 1.
CREATE TABLE IF NOT EXISTS public.content_freeze (
  id        INT         PRIMARY KEY CHECK (id = 1),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL,
  note      TEXT        NOT NULL CHECK (btrim(note) <> ''),
  CONSTRAINT content_freeze_window_ordered CHECK (ends_at > starts_at)
);

ALTER TABLE public.content_freeze ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_freeze FROM anon, authenticated;

INSERT INTO public.content_freeze (id, starts_at, ends_at, note) VALUES (
  1,
  '2026-10-18 04:00+00',
  '2026-11-04 05:00+00',
  '2026 general election: ballot content changes only by a correction, '
  'from Sun 2026-10-18 00:00 EDT to Wed 2026-11-04 00:00 EST. '
  'See docs/general-election/corrections/README.md.'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.content_freeze IS
  'The content-freeze window (0050). Inside it, refuse_during_content_freeze() '
  'refuses writes to ballot content unless kyv.freeze_correction is set.';

-- (2) The guard.
CREATE OR REPLACE FUNCTION public.refuse_during_content_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_frozen     BOOLEAN;
  v_pass       BOOLEAN := false;
  v_old        JSONB;
  v_new        JSONB;
  v_correction TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.content_freeze
     WHERE pg_catalog.now() >= starts_at AND pg_catalog.now() < ends_at
  ) INTO v_frozen;

  IF v_frozen AND TG_LEVEL = 'ROW' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      v_old := pg_catalog.to_jsonb(OLD);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      v_new := pg_catalog.to_jsonb(NEW);
    END IF;

    IF TG_OP = 'UPDATE' AND v_old = v_new THEN
      v_pass := true;  -- changes nothing
    ELSIF TG_TABLE_NAME IN ('race_publication', 'measure_publication') THEN
      v_pass := TG_OP = 'UPDATE' AND (v_new ->> 'status') = 'listed';
    ELSIF TG_TABLE_NAME = 'candidate' THEN
      v_pass := TG_OP = 'UPDATE'
        AND (v_old - 'site_last_verified_at') = (v_new - 'site_last_verified_at');
    ELSIF TG_TABLE_NAME = 'race' THEN
      v_pass := TG_OP = 'UPDATE'
        AND (v_old - ARRAY['info_last_verified_at', 'key_dates'])
          = (v_new - ARRAY['info_last_verified_at', 'key_dates']);
    ELSIF TG_TABLE_NAME = 'source' THEN
      v_pass := TG_OP = 'INSERT'
        OR (
          NOT EXISTS (SELECT 1 FROM public.claim_source
                       WHERE source_id = (v_old ->> 'source_id'))
          AND NOT EXISTS (SELECT 1 FROM public.measure_resource
                           WHERE source_id = (v_old ->> 'source_id'))
        );
    END IF;
  END IF;

  -- COALESCE: a branch that ever yields NULL refuses (fails closed).
  IF v_frozen AND NOT COALESCE(v_pass, false) THEN
    -- btrim: a setting of only whitespace names no correction file.
    v_correction := pg_catalog.btrim(
      COALESCE(pg_catalog.current_setting('kyv.freeze_correction', true), ''));
    IF v_correction = '' THEN
      RAISE EXCEPTION 'Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md'
        USING ERRCODE = 'P0001',
              DETAIL = pg_catalog.format('%s on public.%s', TG_OP, TG_TABLE_NAME);
    END IF;
    RAISE NOTICE 'content_freeze: % on public.% allowed as a correction (kyv.freeze_correction = %)',
      TG_OP, TG_TABLE_NAME, v_correction;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.refuse_during_content_freeze() OWNER TO postgres;

COMMENT ON FUNCTION public.refuse_during_content_freeze() IS
  'Trigger function for the content freeze (0050). Inert outside content_freeze; '
  'inside it, refuses writes to ballot content unless kyv.freeze_correction is set.';

-- By name, not just FROM PUBLIC (0020).
REVOKE ALL ON FUNCTION public.refuse_during_content_freeze()
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;

-- (3) Statement-level triggers: every write to these tables.
DROP TRIGGER IF EXISTS trg_content_freeze ON public.claim;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.claim
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.claim_source;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.claim_source
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.position;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.position
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.issue;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.issue
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.profile;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.profile
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.ballot_measure;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.ballot_measure
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.measure_resource;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.measure_resource
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.candidate_contact;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.candidate_contact
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.candidate_social_account;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.candidate_social_account
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.zip_district;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.zip_district
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.block_district;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.block_district
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

-- (4) Row-level triggers with the exceptions above, plus TRUNCATE.
DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.race_publication;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.race_publication
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.race_publication;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.race_publication
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.measure_publication;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.measure_publication
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.measure_publication;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.measure_publication
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.candidate;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.candidate
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.candidate;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.candidate
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.race;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.race
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.race;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.race
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.source;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.source
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.source;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.source
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();
