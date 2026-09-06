-- Ballot measures (TASK-061). App-owned, like the four tables in 0001: the
-- pipeline owns candidate races, and this app never creates or modifies a
-- pipeline table, so the constitutional amendments live here.
--
-- Numbering note: docs/general-election-pivot.md penciled this in at 0012,
-- leaving 0010/0011 for TASK-058 and TASK-060. It takes 0010 instead because
-- those two landed later than this one, and a gap would mean a lower-numbered
-- migration arriving after a higher one had already been applied.
--
-- Three tables mirroring the race pattern exactly, so the read layer, the
-- publication gate, and the RLS posture all work the way they already do for
-- races:
--
--   ballot_measure       the measure itself (official text, threshold)
--   measure_argument     sourced cases for and against
--   measure_publication  the gate — public only at status='published'

CREATE TABLE ballot_measure (
  measure_id      TEXT PRIMARY KEY,
  election        TEXT NOT NULL,          -- 'general_2026', per election_event
  -- Ballot order as printed. Amendment 1/2/3 in 2026; TEXT because local
  -- measures are lettered, not numbered.
  number          TEXT NOT NULL,
  official_title  TEXT NOT NULL,
  ballot_summary  TEXT NOT NULL,          -- the text as it appears on the ballot
  full_text_url   TEXT NOT NULL,          -- official source for the full text
  placed_by       TEXT NOT NULL CHECK (placed_by IN ('legislature','citizen_initiative','commission','local')),
  -- Florida requires 60% for a constitutional amendment, and most voters
  -- believe a simple majority passes one. Stored rather than hardcoded
  -- because local measures differ.
  threshold_pct   NUMERIC(5,2) NOT NULL CHECK (threshold_pct > 0 AND threshold_pct <= 100),
  jurisdiction    TEXT NOT NULL DEFAULT 'FL',  -- 'FL' = statewide
  display_order   INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_ballot_measure_election ON ballot_measure (election, display_order);

-- The case for and against. `side` is the whole neutrality mechanism: the UI
-- gives each side the same room, and the publication gate below refuses to
-- publish a measure whose sides are lopsided.
CREATE TABLE measure_argument (
  argument_id  TEXT PRIMARY KEY,
  measure_id   TEXT NOT NULL REFERENCES ballot_measure(measure_id) ON DELETE CASCADE,
  side         TEXT NOT NULL CHECK (side IN ('support','oppose')),
  text         TEXT NOT NULL,
  -- Same rule as claims: no source, no render. NOT NULL enforces at the
  -- database what briefs.ts enforces with an inner join for claims.
  source_id    TEXT NOT NULL REFERENCES source(source_id),
  -- true when the argument is a named group's stated position rather than a
  -- neutral description of effect.
  attributed   BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_measure_argument_scope ON measure_argument (measure_id, side, display_order);

-- Publication gate, mirroring race_publication (0001).
CREATE TABLE measure_publication (
  measure_id   TEXT PRIMARY KEY REFERENCES ballot_measure(measure_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','in_review','published')),
  published_at TIMESTAMPTZ,
  note         TEXT
);

-- The symmetry rule, enforced in the database rather than trusted to a
-- reviewer.
--
-- A candidate race has campaigns on both sides producing material; a ballot
-- measure often does not, so "whatever we found" skews toward whichever side
-- is better organized. Publishing that asymmetry under a neutrality promise
-- is the failure this guards against — on the one part of the ballot where
-- nobody else is checking.
--
-- Tolerance matches the Balance Audit's posture for candidates: both sides
-- must be present, and neither may exceed the other by more than one
-- argument. A measure that cannot meet it stays in review, which is the
-- honest outcome, not a bug.
CREATE OR REPLACE FUNCTION measure_sides_balanced(m_id TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FILTER (WHERE side = 'support') > 0
     AND COUNT(*) FILTER (WHERE side = 'oppose')  > 0
     AND ABS(
           COUNT(*) FILTER (WHERE side = 'support')
         - COUNT(*) FILTER (WHERE side = 'oppose')
         ) <= 1
  FROM measure_argument WHERE measure_id = m_id;
$$;

CREATE OR REPLACE FUNCTION enforce_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND NOT measure_sides_balanced(NEW.measure_id) THEN
    RAISE EXCEPTION
      'measure % cannot be published: support and oppose arguments must both exist and differ by at most one',
      NEW.measure_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_measure_balance
  BEFORE INSERT OR UPDATE ON measure_publication
  FOR EACH ROW EXECUTE FUNCTION enforce_measure_balance();

-- Guarding the publication row alone is not enough: a measure published while
-- balanced could be skewed afterwards by deleting an opposing argument, and
-- the gate above would never re-run. The invariant has to hold on the
-- argument side too, so the same rule is checked whenever a published
-- measure's arguments change.
CREATE OR REPLACE FUNCTION enforce_published_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target TEXT := COALESCE(NEW.measure_id, OLD.measure_id);
BEGIN
  IF EXISTS (
    SELECT 1 FROM measure_publication
    WHERE measure_id = target AND status = 'published'
  ) AND NOT measure_sides_balanced(target) THEN
    RAISE EXCEPTION
      'measure % is published: support and oppose arguments must both exist and differ by at most one',
      target;
  END IF;
  RETURN NULL;  -- AFTER trigger; return value is ignored
END;
$$;

-- AFTER, and deferred to statement end, so a multi-row edit that is balanced
-- once complete is judged on its result rather than mid-flight.
CREATE CONSTRAINT TRIGGER trg_measure_argument_balance
  AFTER INSERT OR UPDATE OR DELETE ON measure_argument
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_published_measure_balance();
