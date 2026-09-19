-- 0029_news_item_image.sql
-- news_item.image_url — the card's hero image.
-- Founder decision 2026-09-19: a story card is a cropped 2:1 image, the outlet
-- and the title. See docs/general-election/news-fairness.md §1.
--
-- WHERE THE URL COMES FROM: the outlet's own syndication feed, and nowhere
-- else. src/lib/news-sweep.ts reads `<media:content>`, `<media:thumbnail>` and
-- an image `<enclosure>` — elements the publisher put in the feed for exactly
-- this purpose. The sweep still does NOT fetch article pages, so it does not
-- read `og:image`. That restraint is the basis of the project's position that
-- it reads syndication feeds and links back rather than crawling articles
-- (docs/general-election/news-corpus-verification-2026-09-17.md §3 item 4), and
-- it is why adding images cost zero additional requests to any publisher.
--
-- WE STORE A URL, NOT AN IMAGE. No bytes are copied: the reader's browser
-- loads the image from the publisher's own host, the way any feed reader or
-- social embed does. Nothing here creates a cached or re-hosted copy, which is
-- the same reasoning the sweep's header gives for storing a headline and a dek
-- but never the article body.
--
-- NULLABLE, AND NULL IS A REAL STATE, not a backlog. Plenty of feeds carry no
-- image at all, and the pre-image rows have none either. NULL means "no image
-- for this story" and the card has a text-only variant for it, deliberately —
-- a placeholder graphic would invent visual weight the story does not have,
-- and a missing image must never drop the story.
--
-- HTTPS ONLY is enforced in the sweep, not here. A CHECK would be the wrong
-- place: it would reject a row at write time for a cosmetic reason and lose the
-- story with it. The parser drops a non-https image URL and keeps the article.
--
-- NO INDEX. Nothing queries by image; it is read alongside the row it belongs
-- to.
--
-- Idempotent: safe to re-run.

ALTER TABLE news_item ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN news_item.image_url IS
  'Hero image for the story card, taken from the outlet''s own feed '
  '(media:content / media:thumbnail / image enclosure) — never from the '
  'article page, which the sweep does not fetch. A URL only; no bytes are '
  'copied and the reader''s browser loads it from the publisher. NULL means '
  'the feed carried no image, which is common and is not a backlog: the card '
  'has a text-only variant (docs/general-election/news-fairness.md §1).';
