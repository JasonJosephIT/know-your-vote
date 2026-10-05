-- 0034_measure_resources.sql
-- A ballot question points at what OTHER people say about it, ordered by the
-- kind of source. This replaces the case-for/case-against that we would have
-- written ourselves.
--
-- Spec: docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md
-- (founder direction 2026-09-23). Read §1 for the ladder and §9 for the
-- calls this file proceeds on.
--
-- WHAT CHANGES: measure_argument (0010) held sentences we composed, one
-- source each, both sides within one. Zero rows ever existed live (read
-- 2026-09-23, docs/general-election/listed-tier-2026-09-23.md §1). It is
-- DROPPED here, with its two triggers, and measure_resource takes its place:
-- one row per outside resource — an official document, a study, a news
-- explainer, an editorial, a video — with the credibility tier a function of
-- `kind` and nothing else. src/lib/measure-ladder.ts fixes the ORDER of the
-- five kinds; this file fixes the five VALUES.
--
-- THE SAFETY ARGUMENT transfers from 0033 word for word: the anon policy on
-- measure_resource reads mp.status = 'published' and never 'listed'. A listed
-- measure shows its ballot text and not one resource, whatever rows sit
-- beneath it.
--
-- THE SYMMETRY RULE is relaxed from "within one" to "both sides present and
-- the larger at most twice the smaller" (spec §4, founder call F2). 0010's
-- rule was written for sentences we could balance by writing one more; a
-- list of outside material can only be balanced by finding, and keeping a
-- well-covered side's sixth link off the page over a 6-vs-4 count is not a
-- rule a voter would recognise. Neutral rows are not a side and do not count.
-- The rule holds in both places 0010 put it: on the publication row, and on
-- every resource write to a published measure (deferred, so a multi-row edit
-- is judged on its result).
--
-- source (0000) is NOT changed. Its four `type` values are coarser than
-- `kind`; the ladder lives on this app-owned row. scripts/verify-measure-
-- resources.ts flags the one contradiction that matters (kind = 'official'
-- on a source whose type is not 'primary_doc').
--
-- Idempotent: safe to re-run.

-- (1) Retire the written-argument model. CASCADE takes its policy, index and
--     the resource-side trigger (which lives on the dropped table).
DROP TABLE IF EXISTS measure_argument CASCADE;

-- (2) The resource.
CREATE TABLE IF NOT EXISTS measure_resource (
  resource_id      TEXT PRIMARY KEY,
  measure_id       TEXT NOT NULL REFERENCES ballot_measure(measure_id) ON DELETE CASCADE,
  -- No source, no render — the NOT NULL 0010 put on measure_argument.
  -- publisher, url, type and lean_tag come from here, never duplicated.
  source_id        TEXT NOT NULL REFERENCES source(source_id),
  stance           TEXT NOT NULL,
  kind             TEXT NOT NULL,
  format           TEXT NOT NULL,
  title            TEXT NOT NULL,          -- the resource's own title, verbatim
  author           TEXT,                   -- byline, speaker, or channel name
  published_at     DATE,                   -- NULL when the resource is undated
  duration_seconds INT,                    -- video/audio only
  -- ≤140 chars of ATTRIBUTION, never summary: "Sponsor of the joint
  -- resolution", "Legislature's own staff analysis" (spec F4).
  note             TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT measure_resource_measure_id_source_id_key UNIQUE (measure_id, source_id)
);

-- Named CHECKs, dropped and re-added so a re-run cannot leave a stale one
-- beside a new one (0023/0028/0033 lesson).
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_stance_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_stance_check
  CHECK (stance IN ('support','oppose','neutral'));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_kind_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_kind_check
  CHECK (kind IN ('official','analysis','reporting','argument','commentary'));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_format_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_format_check
  CHECK (format IN ('document','article','video','audio'));

-- Official documents and news are neutral by definition. A newsroom piece
-- that takes a side is an editorial, and is filed as `argument`.
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_neutral_kinds;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_neutral_kinds
  CHECK (kind NOT IN ('official','reporting') OR stance = 'neutral');

-- A position or a take is somebody's case; it cannot sit in the shared block.
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_sided_kinds;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_sided_kinds
  CHECK (kind NOT IN ('argument','commentary') OR stance <> 'neutral');

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_duration_format;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_duration_format
  CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND format IN ('video','audio')));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_note_length;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_note_length
  CHECK (note IS NULL OR char_length(note) <= 140);

CREATE INDEX IF NOT EXISTS idx_measure_resource_scope
  ON measure_resource (measure_id, stance, display_order);

COMMENT ON TABLE measure_resource IS
  'Outside material about a ballot measure, one row per link. The credibility '
  'tier is a function of `kind` (src/lib/measure-ladder.ts) and never a '
  'per-row judgment; `format` is not credibility; `source.lean_tag` is not a '
  'sort key. Anon reads rows only through a published measure (0034).';
COMMENT ON COLUMN measure_resource.note IS
  'Attribution only, <=140 chars ("Sponsor of the joint resolution"). Never a '
  'summary of what the resource argues — that would be our writing.';

-- (3) RLS, a copy of 0011's argument policy with the table renamed.
ALTER TABLE measure_resource ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON measure_resource FROM anon, authenticated;
GRANT ALL    ON measure_resource TO service_role;
GRANT SELECT ON measure_resource TO anon;

DROP POLICY IF EXISTS anon_read_measure_resource ON measure_resource;
CREATE POLICY anon_read_measure_resource ON measure_resource
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = measure_resource.measure_id AND mp.status = 'published'
  ));

-- (4) The gate. Same three function names as 0010/0012 (CREATE OR REPLACE
--     keeps 0012's pinned search_path posture; it is restated anyway), now
--     counting resources under the 2x rule.
CREATE OR REPLACE FUNCTION public.measure_sides_balanced(m_id TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT s > 0 AND o > 0 AND GREATEST(s, o) <= 2 * LEAST(s, o)
  FROM (
    SELECT COUNT(*) FILTER (WHERE stance = 'support') AS s,
           COUNT(*) FILTER (WHERE stance = 'oppose')  AS o
    FROM public.measure_resource WHERE measure_id = m_id
  ) c;
$$;

CREATE OR REPLACE FUNCTION public.enforce_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND NOT public.measure_sides_balanced(NEW.measure_id) THEN
    RAISE EXCEPTION
      'measure % cannot be published: both sides must be present and the larger at most twice the smaller',
      NEW.measure_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_published_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target TEXT := COALESCE(NEW.measure_id, OLD.measure_id);
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.measure_publication
    WHERE measure_id = target AND status = 'published'
  ) AND NOT public.measure_sides_balanced(target) THEN
    RAISE EXCEPTION
      'measure % is published: both sides must be present and the larger at most twice the smaller',
      target;
  END IF;
  RETURN NULL;
END;
$$;

-- trg_measure_balance on measure_publication survives from 0010 and now
-- calls the redefined function. Recreated anyway so a fresh database and the
-- live one end in the same state.
DROP TRIGGER IF EXISTS trg_measure_balance ON measure_publication;
CREATE TRIGGER trg_measure_balance
  BEFORE INSERT OR UPDATE ON measure_publication
  FOR EACH ROW EXECUTE FUNCTION public.enforce_measure_balance();

-- The resource-side guard, deferred to statement end (0010's reasoning).
DROP TRIGGER IF EXISTS trg_measure_resource_balance ON measure_resource;
CREATE CONSTRAINT TRIGGER trg_measure_resource_balance
  AFTER INSERT OR UPDATE OR DELETE ON measure_resource
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_published_measure_balance();

COMMENT ON COLUMN measure_publication.status IS
  'draft/in_review = invisible to anon; listed = ballot_measure row only (ballot '
  'text) -- NO measure_resource; published = the two-sided resource list too, '
  'enforced by trg_measure_balance (0010, 0033, 0034).';
