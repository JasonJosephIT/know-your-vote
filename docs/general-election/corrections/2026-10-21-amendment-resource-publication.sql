-- Approved resource additions from PR #218 and the October 21 primary-source re-check.
-- Founder explicitly requested publication during the freeze; see the paired .md.
-- AM1 Miami-Dade remains held. No existing resource or publication state is changed.
BEGIN;
SELECT set_config('kyv.freeze_correction', 'docs/general-election/corrections/2026-10-21-amendment-resource-publication.md', true);
LOCK TABLE measure_resource IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF (SELECT count(*) FROM measure_publication WHERE measure_id IN ('FL-AM1-general','FL-AM2-general') AND status = 'published') <> 2 THEN
    RAISE EXCEPTION 'Expected both amendments already published';
  END IF;
  IF (SELECT count(*) FROM measure_resource WHERE measure_id = 'FL-AM1-general' AND stance = 'support') <> 4
     OR (SELECT count(*) FROM measure_resource WHERE measure_id = 'FL-AM2-general' AND stance = 'support') <> 5 THEN
    RAISE EXCEPTION 'Support baseline changed; re-review before applying';
  END IF;
END $$;

INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_pbcdems_amendments_2026', 'https://pbcdemocraticparty.org/no-on-1-2-3-yes-on-our-schools-parks-and-libraries/', 'pbcdemocraticparty.org/no-on-1-2-3-yes-on-our-schools-parks-and-libraries', 'Palm Beach County Democratic Party', 'opinion', 'unrated'),
  ('src_hillsborough_dems_vote_2026', 'https://hillsboroughcountydemocrats.org/vote', 'hillsboroughcountydemocrats.org/vote', 'Hillsborough County Democratic Party', 'opinion', 'unrated'),
  ('src_broward_aflcio_endorsements_2026', 'https://unionhall.aflcio.org/browardcounty/2026-broward-afl-cio-endorsements', 'unionhall.aflcio.org/browardcounty/2026-broward-afl-cio-endorsements', 'Broward County AFL-CIO', 'opinion', 'unrated'),
  ('src_miamidade_dems_endorsements_2026', 'https://www.miamidadedems.org/official-2026-endorsements', 'www.miamidadedems.org/official-2026-endorsements', 'Miami-Dade Democratic Party', 'opinion', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order) VALUES
  ('FL-AM1-general:pbcdems-2026', 'FL-AM1-general', (SELECT source_id FROM source WHERE url_norm = 'pbcdemocraticparty.org/no-on-1-2-3-yes-on-our-schools-parks-and-libraries'), 'oppose', 'argument', 'article', 'NO on 1, 2, 3, YES on Our Schools, Parks and Libraries', 'Communications Committee Chair', '2026-10-07', NULL, 'Palm Beach County Democratic Party''s own amendment recommendations', 6),
  ('FL-AM2-general:pbcdems-2026', 'FL-AM2-general', (SELECT source_id FROM source WHERE url_norm = 'pbcdemocraticparty.org/no-on-1-2-3-yes-on-our-schools-parks-and-libraries'), 'oppose', 'argument', 'article', 'NO on 1, 2, 3, YES on Our Schools, Parks and Libraries', 'Communications Committee Chair', '2026-10-07', NULL, 'Palm Beach County Democratic Party''s own amendment recommendations', 5),
  ('FL-AM2-general:hillsborough-dems-2026', 'FL-AM2-general', (SELECT source_id FROM source WHERE url_norm = 'hillsboroughcountydemocrats.org/vote'), 'oppose', 'argument', 'article', 'Make A Plan to Vote | Hillsborough County Democratic Party', NULL, NULL, NULL, 'Hillsborough County Democratic Party''s own voter guide', 6),
  ('FL-AM1-general:broward-aflcio-2026', 'FL-AM1-general', (SELECT source_id FROM source WHERE url_norm = 'unionhall.aflcio.org/browardcounty/2026-broward-afl-cio-endorsements'), 'oppose', 'argument', 'article', '2026 Broward AFL-CIO Endorsements', NULL, NULL, NULL, 'Broward County AFL-CIO''s own endorsement list; no reasons supplied', 7),
  ('FL-AM2-general:broward-aflcio-2026', 'FL-AM2-general', (SELECT source_id FROM source WHERE url_norm = 'unionhall.aflcio.org/browardcounty/2026-broward-afl-cio-endorsements'), 'oppose', 'argument', 'article', '2026 Broward AFL-CIO Endorsements', NULL, NULL, NULL, 'Broward County AFL-CIO''s own endorsement list; no reasons supplied', 7),
  ('FL-AM2-general:miamidade-dems-2026', 'FL-AM2-general', (SELECT source_id FROM source WHERE url_norm = 'www.miamidadedems.org/official-2026-endorsements'), 'oppose', 'argument', 'article', '2026 Official Endorsements', NULL, NULL, NULL, 'Miami-Dade Democratic Party''s own endorsement list; no reasons supplied', 8)
ON CONFLICT (measure_id, source_id) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM measure_resource WHERE measure_id = 'FL-AM1-general' AND stance = 'oppose') <> 7
     OR (SELECT count(*) FROM measure_resource WHERE measure_id = 'FL-AM2-general' AND stance = 'oppose') <> 8
     OR NOT measure_sides_balanced('FL-AM1-general')
     OR NOT measure_sides_balanced('FL-AM2-general') THEN
    RAISE EXCEPTION 'Unexpected final counts or balance; entire transaction rolls back';
  END IF;
END $$;
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
SELECT 'founder', 'note', 'measure_publication', 'FL-AM1-general,FL-AM2-general',
       jsonb_build_object('reason', 'Explicit founder publication request: docs/general-election/corrections/2026-10-21-amendment-resource-publication.md',
                          'am1', '4 support / 7 oppose; Miami-Dade AM1 held', 'am2', '5 support / 8 oppose')
WHERE NOT EXISTS (SELECT 1 FROM admin_action WHERE detail->>'reason' = 'Explicit founder publication request: docs/general-election/corrections/2026-10-21-amendment-resource-publication.md');
COMMIT;
SELECT measure_id, stance, count(*) FROM measure_resource WHERE measure_id IN ('FL-AM1-general','FL-AM2-general') GROUP BY 1,2 ORDER BY 1,2;
