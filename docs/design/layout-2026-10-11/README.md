# Homepage layout pass (2026-10-11)

Research and proposal only. Nothing in `src/` was changed. A visual version with wireframes is in `homepage-layout.html`, next to this file.

## What makes the live site look AI-made (checked at 1440×900 on knowyour.vote)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | critical | `main` is `max-w-[680px]`. On a 1440px screen, more than half the width is empty cream, so the page reads like a document or a chat reply, not a publication. | Use a 12-column grid at ≥1024px: the ballot takes 8 columns and a news rail takes 4. Keep the single column on phones. |
| 2 | major | The page is 4,310px tall and has 1 image (the logo). There's nothing to look at, only text. | Add a map, a dates rail and outlet thumbnails (below). These are visuals built from data we already hold, not stock decoration. |
| 3 | major | Every section has the same shape: H2, a grey paragraph, then a card list. The subhead under the H1 is 50 words. | Vary the section shapes. Cut the hero subhead to one line. Move explanations into captions and `<details>`. |
| 4 | major | There's no masthead or dateline. News sites show the date and what's happening today, and this page doesn't. | Add a masthead strip: today's date · days to Election Day · the next deadline. |
| 5 | minor | Inter for body text is the most common default in AI-built UIs. Figtree headings don't help. | Use a serif for the display size only (for example Newsreader or Source Serif 4). **Coordinate with the brand-assets session first.** |

## Proposed sections

1. **Masthead strip.** Example: "Sunday, Oct 11 · 23 days to Election Day · Mail ballot requests close Oct 22". Built from the dates we already have.
2. **Florida election news rail** (the "general news" column). Right column on desktop; a section after the ballot on mobile. Newest first, no hand-picking. Each item shows the outlet name, the time and the headline, plus a thumbnail when one exists. Tabs: Statewide / South FL / Tampa Bay / Central / North (the `metro` field already exists). Ends with "Where the news comes from".
3. **Key dates rail.** A horizontal timeline with past / today / upcoming states.
4. **Ballot at a glance.** Tiles with real counts: statewide races, amendments, candidates.
5. **Coverage map.** An SVG of Florida's counties, shaded for the ones where we list county races. We already hold the GeoJSON.
6. **Three ways to vote.** Mail / early / Election Day, as three panels, each with its own dates.
7. **Photography band** (optional). Public-domain Florida civic photos (Old Capitol, polling places) from Florida Memory or Openverse. No candidates, nothing partisan.

## Neutrality checks

- The news rail is ordered by time only. When one candidate gets more coverage, the rail shows that; it isn't corrected (AGENTS.md).
- Statewide items only on the home page, as today (HomeNews already excludes candidate-scoped rows).
- Candidate headshots: all or none per race. Never some.
- Map shading means "covered by this guide", never party.

## Data on hand (live DB, 2026-10-11)

- 97 news items: 66 from the last 7 days, 21 with an image, 15 outlets.
- Only **9** are statewide. The home rail would be thin unless it also shows metro and county items, or the pipeline brings in more statewide items.
- 299 candidates and 0 headshots (there's no photo column).

## Resources

**Ready now, no setup:**
- Openverse photos (CC0/public domain, no key)
- Iconify icons
- Our county GeoJSON, for the map
- Firecrawl gov search
- The claude-image-generation and Higgsfield tools, for texture and illustration only

**Needs you:**
- Canva and Figma connectors: authorize them in claude.ai connector settings if the brand session wants to hand off there.
- Optional: a Pixabay API key, for more polished stock photos.
- Decision: whether to show outlet `og:image` thumbnails, which are hotlinked from publishers. Common practice, but a copyright grey area.
- Decision: a headshot policy, and where photos would come from (official office portraits are public domain for federal officeholders; campaign photos need permission).
