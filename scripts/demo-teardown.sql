-- Removes every fictional demo- fixture row (reverse dependency order).
--
-- Step 2 of the launch gate: the app cannot go public while a voter can see a
-- fictional candidate. Run this only after TASK-066's real content is in.
--
-- Two tables were added after this script was written and are easy to miss,
-- because neither has demo rows today:
--
--   candidate_contact  (PR #12) — its candidate_id FK is NO ACTION, not
--     CASCADE, so once intake populates contacts the DELETE FROM candidate
--     below fails with a foreign-key violation. Latent until launch day,
--     which is exactly when it would fire.
--   ballot_measure + measure_argument + measure_publication (0010/0011) —
--     the measure tables cascade from ballot_measure, but they are listed
--     explicitly so this file stays a readable inventory rather than relying
--     on delete rules staying as they are.
--
-- Verified by schema inspection (information_schema delete_rule), not by
-- execution — running it needs a database with demo rows to destroy. Dry-run
-- it inside BEGIN … ROLLBACK before trusting it on launch day.

DELETE FROM race_publication WHERE race_id LIKE 'demo-%';
DELETE FROM candidate_social_account WHERE candidate_id LIKE 'demo-%';
DELETE FROM candidate_contact WHERE candidate_id LIKE 'demo-%';
DELETE FROM position WHERE position_id LIKE 'demo-%';
DELETE FROM claim_source WHERE claim_id LIKE 'demo-%';
DELETE FROM claim WHERE claim_id LIKE 'demo-%';
DELETE FROM issue WHERE issue_id LIKE 'demo-%';
DELETE FROM profile WHERE candidate_id LIKE 'demo-%';
DELETE FROM candidate WHERE candidate_id LIKE 'demo-%';
DELETE FROM race WHERE race_id LIKE 'demo-%';
DELETE FROM news_item WHERE title LIKE 'DEMO:%' OR race_id LIKE 'demo-%';

-- Measures (0010/0011). measure_argument and measure_publication cascade from
-- ballot_measure; listed anyway so nothing is left to a delete rule.
DELETE FROM measure_publication WHERE measure_id LIKE 'demo-%';
DELETE FROM measure_argument WHERE measure_id LIKE 'demo-%';
DELETE FROM ballot_measure WHERE measure_id LIKE 'demo-%';

-- Sources last: claims, issues, social accounts and measure arguments all
-- reference them with NO ACTION.
DELETE FROM source WHERE source_id LIKE 'demo-%';
