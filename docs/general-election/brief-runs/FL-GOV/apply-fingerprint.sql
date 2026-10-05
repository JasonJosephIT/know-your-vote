SELECT
 (SELECT count(*) FROM claim WHERE race_id='FL-GOV-general') AS n_claims,
 (SELECT md5(string_agg(claim_id||'|'||candidate_id||'|'||issue_id||'|'||text||'|'||bucket||'|'||attributed::text||'|'||coalesce(verification,'')||'|'||coalesce(verdict,''), E'\n' ORDER BY claim_id COLLATE "C")) FROM claim WHERE race_id='FL-GOV-general') AS claims,
 (SELECT md5(string_agg(cs.claim_id||'|'||s.url_norm||'|'||s.url||'|'||s.type, E'\n' ORDER BY cs.claim_id COLLATE "C", s.url_norm COLLATE "C")) FROM claim_source cs JOIN claim c USING (claim_id) JOIN source s USING (source_id) WHERE c.race_id='FL-GOV-general') AS claim_sources,
 (SELECT md5(string_agg(position_id||'|'||candidate_id||'|'||issue_id||'|'||array_to_string(claim_ids,',')||'|'||attributed::text||'|'||coverage||'|'||stance_summary, E'\n' ORDER BY position_id COLLATE "C")) FROM position WHERE race_id='FL-GOV-general') AS positions,
 (SELECT md5(string_agg(issue_id||'|'||tier||'|'||coalesce(candidate_id,'')||'|'||title||'|'||display_order::text, E'\n' ORDER BY issue_id COLLATE "C")) FROM issue WHERE race_id='FL-GOV-general') AS issues,
 (SELECT md5(string_agg(candidate_id||'|'||array_to_string(facts,',')||'|'||array_to_string(positions,',')||'|'||array_to_string(opinions,',')||'|'||audit::text, E'\n' ORDER BY candidate_id COLLATE "C")) FROM profile WHERE race_id='FL-GOV-general') AS profiles;
