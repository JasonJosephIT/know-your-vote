-- RLS for block_district, following 0002 and 0011 exactly. It is a district
-- map: public reference data with nothing voter-specific in it, so anon reads
-- all of it and writes none of it.

ALTER TABLE block_district ENABLE ROW LEVEL SECURITY;

-- 0002 revoked writes across the schema before this table existed, so the
-- grants are repeated here rather than assumed.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON block_district FROM anon, authenticated;
GRANT ALL    ON block_district TO service_role;
GRANT SELECT ON block_district TO anon;

CREATE POLICY anon_read_block_district ON block_district
  FOR SELECT TO anon
  USING (true);
