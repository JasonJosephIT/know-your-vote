-- 0028_source_lean_unrated.sql
-- Add 'unrated' to source.lean_tag's CHECK.
-- See docs/general-election/lean-ratings-fetched-2026-09-19.md §7 and
-- src/lib/news-labels.ts rule 3.
--
-- WHY: 'N/A' and "nobody has rated this" are different facts, and until now the
-- schema could only say the first. 'N/A' means a lean DOES NOT APPLY — a
-- government primary document has no editorial lean. The news corpus in
-- src/lib/news-sources.ts is 37 outlets, of which 31 carry no published bias
-- rating, and that is structural rather than a backlog: AllSides, Ad Fontes and
-- Media Bias/Fact Check rate national and large-metro outlets. The 2026-09-19
-- fetch found all 36 rating pages it sought for the 12 outlets that have them,
-- and there is no equivalent page to find for WSVN, WFTV, Le Floridien, The
-- Westside Gazette or América TeVé. Waiting does not produce one.
--
-- Forcing those 31 into 'N/A' would tell a voter a lean does not apply to a
-- local television newsroom, which is false. Leaving them NULL is not available
-- either: lean_tag is NOT NULL (0000), and `usableOutlets()` treats a null
-- leanTag as "not signed off", so those outlets can never be swept at all.
-- 'unrated' is the third option, and it is the one that is true.
--
-- IT PRINTS, UNLIKE 'N/A'. news-fairness.md §1 shows lean on every card because
-- "the reader judges the outlet themselves". A blank where a rating would go
-- lets the reader supply an assumption instead, so `newsLabels()` renders
-- 'unrated' as "No independent rating" — the word "independent" says no outside
-- agency rates this outlet, not that CAP declined to rate it.
--
-- WHAT THIS DOES NOT DO: it does not designate a single row. Every `leanTag` in
-- src/lib/news-sources.ts is still null, so `usableOutlets()` still returns 0
-- and the sweep still does nothing. Assigning 'unrated' to a row is the founder
-- gate C7-a act (the module header explains why a coding agent must not make
-- it), and the UNRATED basis text already anticipates it: "the founder signs
-- off an explicit 'no rating' designation". This migration only makes that
-- designation a legal value to write.
--
-- CONSEQUENCE FOR SLOT SELECTION, stated so it is not discovered later:
-- src/lib/news-slots.ts rule 2 takes the newest item per distinct lean before a
-- second from any one lean. 'unrated' becomes one bucket like any other, which
-- is the correct behaviour — it does not over-represent unrated outlets. But if
-- 31 of 37 outlets end up 'unrated', that bucket holds most of the corpus and
-- the intended spectrum rotation has little left to rotate between. That is a
-- fact about Florida local-news rating coverage, not a defect in the selector,
-- and news-fairness.md §5's per-candidate variance work is where it lands.
--
-- CONSTRAINT NAME: like 0023's, this CHECK was written inline in
-- 0000_pipeline_read_models.sql and named by Postgres, so nothing in this repo
-- ever asserted its name. Dropping the wrong name would leave the old
-- six-value CHECK in place beside the new one — the migration would report
-- success and every 'unrated' row would still be rejected, with the constraint
-- list as the only evidence. The guard below turns that silent
-- half-application into a loud one. Same reasoning as 0023; same shape.
--
-- NO DATA CHANGE. No existing row is rewritten: widening a CHECK cannot
-- invalidate a row that already satisfied it, and every current source row
-- keeps the value it has. Nothing is backfilled to 'unrated' here — see WHAT
-- THIS DOES NOT DO above.
--
-- Idempotent: safe to re-run.

ALTER TABLE source DROP CONSTRAINT IF EXISTS source_lean_tag_check;

DO $$
DECLARE stale TEXT;
BEGIN
  SELECT string_agg(conname, ', ') INTO stale
    FROM pg_constraint
   WHERE conrelid = 'source'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%lean_tag%';
  IF stale IS NOT NULL THEN
    RAISE EXCEPTION
      'source.lean_tag still carries CHECK constraint(s) %; drop them by name before re-running 0028, or unrated rows will keep being rejected', stale;
  END IF;
END $$;

ALTER TABLE source ADD CONSTRAINT source_lean_tag_check
  CHECK (lean_tag IN ('left','center-left','center','center-right','right','N/A','unrated'));

COMMENT ON COLUMN source.lean_tag IS
  'Disclosed editorial lean, never a verdict (news-fairness.md §1). '
  'left..right are published ratings. N/A means a lean DOES NOT APPLY to this '
  'kind of source (a government primary document). unrated means a lean '
  'applies and no rating agency has published one — structural for local '
  'outlets, which AllSides / Ad Fontes / MBFC do not cover '
  '(docs/general-election/lean-ratings-fetched-2026-09-19.md §7). The two are '
  'not interchangeable: N/A renders as nothing, unrated renders as '
  '"No independent rating".';
