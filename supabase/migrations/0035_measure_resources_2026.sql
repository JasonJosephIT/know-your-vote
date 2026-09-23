-- 0035_measure_resources_2026.sql
-- Outside resources for Amendments 1-3 (0034). Spec §9 F7 / §10.
--
-- THIS FILE IS A SKELETON. It seeds the one resource the repo can already
-- vouch for: the Division of Elections' booklet, which 0030 cites as
-- full_text_url and which is the official text every voter can check. Every
-- further row — the joint resolutions, staff analyses, studies, explainers,
-- editorials, video — is the founder's editorial call and is added here by
-- extending the two INSERTs below. Spec §10 lists the candidates found on
-- 2026-09-23, per side and per tier, with the gate risks. Run
-- scripts/verify-measure-resources.ts on this file before applying it.
--
-- Nothing here can publish a measure: there are no support or oppose rows,
-- so measure_sides_balanced() is false for all three and each stays
-- `listed` (ballot text only). Publishing is a separate, later act.
--
-- Idempotent: ON CONFLICT DO UPDATE on the resource, DO NOTHING on the
-- source (url_norm is the natural key, 0014's rule). If a source row for
-- this URL already exists under ANOTHER source_id, the three resource rows
-- below fail their FK — check first with:
--   SELECT source_id FROM source
--    WHERE url_norm LIKE 'files.floridados.gov/media/711355/%';
-- and, if a row comes back, change the three source_id values to it.

INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_fldos_amend_booklet_2026',
   'https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
   'files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
   'Florida Division of Elections', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM1-general:booklet', 'FL-AM1-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0),
  ('FL-AM2-general:booklet', 'FL-AM2-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0),
  ('FL-AM3-general:booklet', 'FL-AM3-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;
