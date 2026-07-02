-- Removes every fictional demo- fixture row (reverse dependency order).
DELETE FROM race_publication WHERE race_id LIKE 'demo-%';
DELETE FROM candidate_social_account WHERE candidate_id LIKE 'demo-%';
DELETE FROM position WHERE position_id LIKE 'demo-%';
DELETE FROM claim_source WHERE claim_id LIKE 'demo-%';
DELETE FROM claim WHERE claim_id LIKE 'demo-%';
DELETE FROM issue WHERE issue_id LIKE 'demo-%';
DELETE FROM profile WHERE candidate_id LIKE 'demo-%';
DELETE FROM candidate WHERE candidate_id LIKE 'demo-%';
DELETE FROM race WHERE race_id LIKE 'demo-%';
DELETE FROM news_item WHERE title LIKE 'DEMO:%';
DELETE FROM source WHERE source_id LIKE 'demo-%';
