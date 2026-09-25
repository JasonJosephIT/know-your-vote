-- 0038_measure_resources_am3.sql
-- Seeds Amendment 3 (FL-AM3-general) resources from the row-by-row
-- verification in docs/general-election/measure-resources-verified-2026-09-24.md
-- (spec: docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md
-- §1/§2/§4), then flips AM3's publication to `published` in the same file
-- so the deferred gate trigger (0034) checks it at commit.
--
-- FOUNDER CALL F7 (2026-09-24): seed Amendment 3 ONLY. Amendment 1 and
-- Amendment 2 stay `listed` (ballot text only) -- see the "Decisions
-- (2026-09-24)" section added to the verified doc for why.
--
-- INCLUSION RULE (strict): a row is seeded only when the verified doc marks
-- it as actually opened -- "Yes", "Loads (browser)", "Loads (browser
-- verified)", or "Loads (via WebFetch)". A row the doc reports as "Loads (via
-- search)" (confirmed only through a WebSearch snippet, never independently
-- fetched), a 403/402 block, a paywall past the headline, or a PDF that
-- downloads but will not decode to text is NOT a verified read and is
-- excluded here, however plausible its content looks in the doc's Evidence
-- column. A row the doc flags as uncertain in `kind` or `stance` is excluded
-- even when it did load. The Gov. DeSantis row is excluded outright per the
-- founder's direction (possible AM1/AM3 quote mix-up, unresolved).
--
-- EXCLUDED -- not opened (search snippet / 403 / 402 / paywall / undecodable
-- PDF), per the verified doc's Amendment 3 table and Gaps section:
--   - flsenate.gov House staff analysis PDF (h0001z.SAC.PDF) -- downloads,
--     text not decodable
--   - edr.state.fl.us Revenue Estimating Conference PDF (impact0710.pdf) --
--     downloads, text not decodable
--   - pcpao.gov/amendment3 -- HTTP 403
--   - James Madison Institute 2026 guide -- via search only, not fetched
--   - floridapolitics.com JMI poll piece -- via search only / HTTP 402
--   - Jacksonville Today (TaxWatch "urges No") -- via search only
--   - Florida Policy Institute voter guide + fiscal-impact post -- via
--     search only
--   - ClickOrlando 2026-09-23 explainer, CBS Miami explainer, WLRN,
--     Florida Phoenix, WFLX, Tampa Bay Beacons, WCTV -- all via search only
--   - "Vote No On 3 'Math'" ad -- confirmed only via a YouTube search
--     results page, not opened directly
--   - RPOF endorsement -- no working current primary URL found; florida.gop
--     amendment pages resolve to earlier ballot cycles
--   - Senate President Albritton's release PDF -- downloads, text not
--     decodable
--   - Miami-Dade Sheriff's own post -- reported secondhand only
--     (floridapolitics.com paywalled 402; the tweet itself not opened)
--   - APA Florida / whatsatstakefl.org -- via search only, no stable URL
--   - Palm Beach Examiner's AM3 post, Bella Verde Realty, amandainformed's
--     AM3 mention -- via search only
--
-- EXCLUDED -- uncertain kind or stance, even though opened:
--   - Lake Wales city page (lakewalesfl.gov) -- a .gov page that argues a
--     position ("immediate and severe," ballot language "misleading"),
--     which conflicts with the official=>neutral rule; the doc flags its
--     kind/stance as a conflict, not a proposal.
--   - Florida Chamber of Commerce (flchamber.com/amendment3) -- the doc
--     could not confirm a formal "vote yes" endorsement; flagged for
--     reclassification, not filed as support.
--   - Gov. DeSantis -- excluded per founder direction (see above).
--   - Bella Verde Realty -- doc flags its stance as an ambiguous
--     pros/cons framing, "net leans support" is the doc's own hedge, not a
--     clean call.
--
-- INCLUDED: 14 rows, all independently opened, unambiguous kind/stance.
--   support = 2 (voteyeson3.com; Florida Realtors launch article)
--   oppose  = 4 (Florida Sheriffs Association short; Florida League of
--                Cities; 1000 Friends of Florida; Political Cortadito)
--   neutral = 8 (2 official, 6 reporting)
-- Gate (0034 §4): larger(4) <= 2 x smaller(2) = 4 -- holds at the boundary,
-- both sides >= 1. Matches the design spec's own boundary example (4 vs 2
-- passes; §4 lists 2/4, 4/2, 8/4 as passing).
--
-- SOURCE TYPE / LEAN CONVENTIONS (checked against 0014/0028/0035 before
-- writing): `type` is source.type's coarse 4-value CHECK, not the ladder's
-- `kind`. `official` rows use type='primary_doc' (the one cross-check
-- scripts/verify-measure-resources.ts makes). Everything else here is an
-- organisation or newsroom making its own case or reporting -- type=
-- 'opinion' for a stated position (argument/commentary kind), type=
-- 'factual_reporting' for straight news (reporting kind). `lean_tag` is
-- 'N/A' only for the two primary-document rows (0035's convention for a
-- government record); every other row is 'unrated' (0028's convention for an
-- entity nobody has rated) -- no lean or organisation category is assigned
-- to anyone here (spec §11 is a future, separate registry).
--
-- `note` is attribution only (who they are), never a summary of their
-- argument -- checked against scripts/verify-measure-resources.ts's own
-- heuristic (flags "would"/"will"/"means"/"because").
--
-- url_norm follows src/lib/brief-rows.ts's urlNorm(): lowercased host + path
-- with trailing slash stripped + query, no scheme. Checked before writing:
-- `grep` across supabase/migrations/*.sql found no existing source row for
-- any of the 14 URLs below, so each gets a fresh source_id.
--
-- Idempotent: source rows ON CONFLICT (url_norm) DO NOTHING, measure_resource
-- rows ON CONFLICT (measure_id, source_id) DO UPDATE (0035's style), and the
-- publication flip is an UPSERT that only raises status, never lowers it.

-- (1) Sources -- one row per outside resource, keyed by url_norm.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_dos_init_detail_am3',
   'https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110',
   'constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110',
   'Florida Dept. of State, Division of Elections', 'primary_doc', 'N/A'),
  ('src_ocfl_property_tax_am3',
   'http://ocfl.net/OpenGovernment/PropertyTaxAmendment3.aspx',
   'ocfl.net/OpenGovernment/PropertyTaxAmendment3.aspx',
   'Orange County Government, FL', 'primary_doc', 'N/A'),
  ('src_wfla_battleground_am3',
   'https://www.youtube.com/watch?v=Kc6QYIVx0XI',
   'www.youtube.com/watch?v=Kc6QYIVx0XI',
   'WFLA News Channel 8', 'factual_reporting', 'unrated'),
  ('src_voteyeson3_site',
   'https://voteyeson3.com/',
   'voteyeson3.com',
   'Vote Yes on 3', 'opinion', 'unrated'),
  ('src_floridarealtors_launch_am3',
   'https://www.floridarealtors.org/news-media/news-articles/2026/09/florida-realtors-launches-vote-yes-3-campaign',
   'www.floridarealtors.org/news-media/news-articles/2026/09/florida-realtors-launches-vote-yes-3-campaign',
   'Florida Realtors', 'opinion', 'unrated'),
  ('src_wftv_sheriffs_ad_report_am3',
   'https://www.wftv.com/news/local/florida-sheriffs-association-launches-ad-campaign-against-amendment-3/66LZUYYIPFBOROT66T2GCA62DI/',
   'www.wftv.com/news/local/florida-sheriffs-association-launches-ad-campaign-against-amendment-3/66LZUYYIPFBOROT66T2GCA62DI',
   'WFTV', 'factual_reporting', 'unrated'),
  ('src_fsa_short_am3',
   'https://www.youtube.com/shorts/i1HMUpBJ780',
   'www.youtube.com/shorts/i1HMUpBJ780',
   'Florida Sheriffs Association', 'opinion', 'unrated'),
  ('src_flcities_property_taxes_am3',
   'https://www.flcities.com/propertytaxes/',
   'www.flcities.com/propertytaxes',
   'Florida League of Cities', 'opinion', 'unrated'),
  ('src_1000fof_property_tax_am3',
   'https://1000fof.org/propertytax/',
   '1000fof.org/propertytax',
   '1000 Friends of Florida', 'opinion', 'unrated'),
  ('src_clickorlando_lake_mary_am3',
   'https://www.clickorlando.com/election-2026/2026/09/16/public-safety-leaders-urge-floridians-to-vote-no-on-amendment-3/',
   'www.clickorlando.com/election-2026/2026/09/16/public-safety-leaders-urge-floridians-to-vote-no-on-amendment-3',
   'ClickOrlando (WKMG)', 'factual_reporting', 'unrated'),
  ('src_political_cortadito_am3',
   'https://politicalcortadito.com/2026/09/03/amendment-3-daniella-levine-cava-no-campaign/',
   'politicalcortadito.com/2026/09/03/amendment-3-daniella-levine-cava-no-campaign',
   'Political Cortadito', 'opinion', 'unrated'),
  ('src_cbs12_jenny_fields_am3',
   'https://www.youtube.com/watch?v=37lN8L0PCT0',
   'www.youtube.com/watch?v=37lN8L0PCT0',
   'CBS 12 News - WPEC', 'factual_reporting', 'unrated'),
  ('src_wptv_taxwatch_tool_am3',
   'https://www.youtube.com/watch?v=EX3t4tN9a6I',
   'www.youtube.com/watch?v=EX3t4tN9a6I',
   'WPTV News', 'factual_reporting', 'unrated'),
  ('src_cbs12_backers_am3',
   'https://www.youtube.com/watch?v=r6M34w74GuI',
   'www.youtube.com/watch?v=r6M34w74GuI',
   'CBS 12 News - WPEC', 'factual_reporting', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

-- (2) Resources -- one row per source, scoped to FL-AM3-general.
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM3-general:dos-init-detail', 'FL-AM3-general', 'src_dos_init_detail_am3',
   'neutral', 'official', 'document',
   'Initiative Detail: Increased Homestead Exemption (seqnum 110)', NULL, NULL, NULL,
   'State''s own initiative-tracking record for this amendment', 1),

  ('FL-AM3-general:ocfl-property-tax', 'FL-AM3-general', 'src_ocfl_property_tax_am3',
   'neutral', 'official', 'document',
   'Property Tax Amendment 3', NULL, NULL, NULL,
   'County government''s factual explainer page', 2),

  ('FL-AM3-general:wfla-battleground-video', 'FL-AM3-general', 'src_wfla_battleground_am3',
   'neutral', 'reporting', 'video',
   'What happens if the property tax amendment passes?', NULL, NULL, 3172,
   NULL, 3),

  ('FL-AM3-general:vote-yes-on-3-site', 'FL-AM3-general', 'src_voteyeson3_site',
   'support', 'argument', 'document',
   'Vote Yes on 3', NULL, NULL, NULL,
   'Ballot committee campaigning for Amendment 3', 1),

  ('FL-AM3-general:florida-realtors-launch', 'FL-AM3-general', 'src_floridarealtors_launch_am3',
   'support', 'argument', 'article',
   'Florida Realtors Launches ''Vote Yes 3'' Campaign', NULL, '2026-09-09', NULL,
   'Trade association funding the Vote Yes on 3 committee', 2),

  ('FL-AM3-general:wftv-sheriffs-ad-report', 'FL-AM3-general', 'src_wftv_sheriffs_ad_report_am3',
   'neutral', 'reporting', 'article',
   'Florida Sheriffs Association launches ad campaign against Amendment 3', NULL, '2026-09-15', NULL,
   NULL, 4),

  ('FL-AM3-general:fsa-youtube-short', 'FL-AM3-general', 'src_fsa_short_am3',
   'oppose', 'argument', 'video',
   'Amendment 3 Rips Out Public Safety Funding', NULL, NULL, 16,
   'Law-enforcement trade association''s own campaign video', 1),

  ('FL-AM3-general:flcities-property-taxes', 'FL-AM3-general', 'src_flcities_property_taxes_am3',
   'oppose', 'argument', 'document',
   'Property Taxes', NULL, '2026-09-18', NULL,
   'Municipal government association''s advocacy page', 2),

  ('FL-AM3-general:1000-friends-property-tax', 'FL-AM3-general', 'src_1000fof_property_tax_am3',
   'oppose', 'argument', 'document',
   'Property Tax', NULL, NULL, NULL,
   'Land-use advocacy nonprofit''s own position page', 3),

  ('FL-AM3-general:clickorlando-lake-mary-presser', 'FL-AM3-general', 'src_clickorlando_lake_mary_am3',
   'neutral', 'reporting', 'article',
   'Public safety leaders urge Floridians to vote no on Amendment 3', NULL, '2026-09-16', NULL,
   NULL, 5),

  ('FL-AM3-general:political-cortadito', 'FL-AM3-general', 'src_political_cortadito_am3',
   'oppose', 'commentary', 'article',
   'Amendment 3: Daniella Levine Cava''s ''no'' campaign', 'Elaine de Valle (Ladra)', '2026-09-03', NULL,
   'Independent Miami politics blog', 4),

  ('FL-AM3-general:cbs12-jenny-fields-video', 'FL-AM3-general', 'src_cbs12_jenny_fields_am3',
   'neutral', 'reporting', 'video',
   'Will Amendment 3 lower your property taxes? Jenny Fields explains', NULL, NULL, 89,
   'TV station interview with the Martin County Property Appraiser', 6),

  ('FL-AM3-general:wptv-taxwatch-tool-video', 'FL-AM3-general', 'src_wptv_taxwatch_tool_am3',
   'neutral', 'reporting', 'video',
   'New tool helps Florida voters research Amendment 3 property taxes', NULL, NULL, 156,
   NULL, 7),

  ('FL-AM3-general:cbs12-backers-video', 'FL-AM3-general', 'src_cbs12_backers_am3',
   'neutral', 'reporting', 'video',
   'Amendment 3 backers say bigger property tax break could help Florida homeowners stay put', NULL, NULL, 216,
   NULL, 8)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;

-- (3) Publish. Both sides are present (2 support, 4 oppose; 4 <= 2x2) so
--     0034's trg_measure_balance accepts this. AM1 and AM2 are untouched --
--     no row is written for them here -- and stay `listed`.
INSERT INTO measure_publication (measure_id, status, published_at, note)
VALUES (
  'FL-AM3-general', 'published', now(),
  'Amendment 3 resources seeded from row-by-row verification, 2026-09-24 (0038). '
  'AM1/AM2 remain listed -- see the Decisions section of '
  'docs/general-election/measure-resources-verified-2026-09-24.md.'
)
ON CONFLICT (measure_id) DO UPDATE SET
  status = 'published',
  published_at = COALESCE(measure_publication.published_at, EXCLUDED.published_at),
  note = EXCLUDED.note;
