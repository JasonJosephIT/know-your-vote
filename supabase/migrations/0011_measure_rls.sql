-- RLS for the ballot-measure tables (TASK-061), following 0002 exactly:
-- anon may SELECT only what a published measure exposes, and may never write.

ALTER TABLE ballot_measure      ENABLE ROW LEVEL SECURITY;
ALTER TABLE measure_argument    ENABLE ROW LEVEL SECURITY;
ALTER TABLE measure_publication ENABLE ROW LEVEL SECURITY;

-- 0002 revoked writes across the schema, but that ran before these tables
-- existed, so the grants are repeated here rather than assumed.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ballot_measure, measure_argument, measure_publication FROM anon, authenticated;
GRANT ALL    ON ballot_measure, measure_argument, measure_publication TO service_role;
GRANT SELECT ON ballot_measure, measure_argument, measure_publication TO anon;

-- The gate rows: only published ones are visible.
CREATE POLICY anon_read_measure_publication ON measure_publication
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY anon_read_ballot_measure ON ballot_measure
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = ballot_measure.measure_id AND mp.status = 'published'
  ));

-- Arguments are reachable only through a published measure. Without this an
-- unpublished measure's arguments would be readable on their own — the same
-- leak 0002 closes for claims.
CREATE POLICY anon_read_measure_argument ON measure_argument
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = measure_argument.measure_id AND mp.status = 'published'
  ));
