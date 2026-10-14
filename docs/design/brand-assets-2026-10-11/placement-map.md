# Where the art goes (placement map, 2026-10-11)

Checked: knowyour.vote at 1440×900 and 375×812 across home, candidates, a race, a measure, news, outlets,
about, methodology and 404. **Updated after PR #161 merged** (2026-10-11 08:50, live): the home page now has
the Ink masthead, the key dates rail inside the deadline card, at-a-glance tiles and a sticky 340px news rail.
Visual version with a wireframe: `placement-map.html`, next to this file.

## What the site looks like now

- **No images at all.** Every page has 0 images apart from one publisher photo in the news list. The
  hand-made SVGs from July (`site/hero.svg`, `spot-*.svg`, `empty-state.svg`, `error-404.svg`) were never wired in.
- **Text in a 632px column.** Home, candidates, news, about, methodology and 404 use `max-w-[680px]`, so at
  1440px about 400px of empty cream sits on each side. Race and measure pages use 1120px.
- **Every section has the same shape:** H2, grey paragraph, white card. Section breaks are a 1px border.
- **404 is a heading and a link in an empty screen.**
- **Home after PR #161:** 1120px grid, a 684px main column and a sticky 340px news rail with publisher photos.
  The H1 now runs as one full-width line, the intro paragraph is full width, and the house-race step is a
  plain section, not a card. The photo band and three-ways-to-vote panels were not built. On a phone the
  home page is 6,129px tall (measured 2026-10-11), so phone art stays minimal: one small still piece
  per section break, from the closed list in design.md (see `docs/design/mobile-visuals-2026-10-11/`).

## Hard limits (design.md, site illustration layer)

No art in news items, in the race list, inside a race comparison, beside a candidate's name, or next to a
verdict. Race, candidate, measure and news-list content stays art-free. Art goes in page chrome, section
breaks, cards about the voter's own steps (ZIP, reminders, install), empty states and the footer.

## Placements

Kit = already made (step 1). Held = slot-specific art still to make, now sized against these slots.

| # | Page · slot | Asset | Status | How it sits |
|---|---|---|---|---|
| 1 | Home · masthead strip (live) | `textures/tex-masthead-ink.webp` | Kit | Repeating background on the Ink bar; text stays on top |
| 2 | Home · lede, right of the intro paragraph | hero walk: 8 walkers stroll past in one procession over `bg-sunburst` (`site/rotator/`, sharp frames; `HeroRotator.tsx`; the swap demo `hero-rotator.html` is archived) | Built | The H1 spans the column, so the paragraph narrows to ~58% at ≥1024px and the figure (~190px) sits beside it, sunburst feathered behind; hidden below `lg` |
| 3 | Home · key dates card | `sticker-sun` | Kit | 56px, peeking from the card's top-right corner. Nothing on the stops: their dots carry the past / today / next state |
| 4 | Home · "On this page" jump list (was the at-a-glance tiles, 5 races · 17 candidates · 3 questions) | `sticker-magnifier` | Kit | 30px beside the "On this page" label, lg only. `sticker-palm` retired here with the count tiles (home readability A6, 2026-10-13); the asset stays in the kit |
| 5 | Home · section breaks | `divider-zigzag` / `divider-wave` | Kit | Replaces the 1px `border-t` between home sections; `currentColor` = `accent` at 60% |
| 6 | Home · "Add your U.S. House race" section | `person-kyv-tote` | Kit | The section is plain, not a card: the figure (160px) stands to the right of the ZIP row, bottom-aligned with it, never over the input or button; desktop only |
| 7 | Home · reminder sign-up card | `sticker-envelope` | Kit | 56px, tilted, peeking from the card's top-left corner |
| 8 | Home · install card (PWA) | `sticker-kyv-badge` | Kit | 72px beside the install text; the card only renders when the browser offers install |
| 9 | Home · photo band (not built in PR #161) | `band-coast` | Waits for the band | Illustrated alternate to a public-domain photo; full width, 160–220px tall, cropped to the middle |
| 10 | All pages · above the footer | `footer-town-strip` | Kit | Full-bleed, sitting on the footer's top border, 220–260px tall, `background-size: cover` at `center 55%` (one crop, never tiled: it is not seamless). A thin (<160px) banner crops it to legs; that needs its own very wide image, added to the held list |
| 11 | 680px pages (not home, now 1120px) at ≥1280px · side gutters | people and stickers (`person-skater`, `person-wheelchair`, `sticker-pelican`, `sticker-daisy`, `sticker-boombox`) | Kit | One figure per gutter per screen, fixed to the page edge, never beside a candidate; hidden below 1280px |
| 12 | 404 | `person-elder-reader` + `sticker-palm`, or the July `error-404.svg` | Kit | Centred above the heading, 240px |
| 13 | About · "Who's behind" | `sticker-raised-hand` beside the H1, `person-student` in the gutter | Kit | Small, decorative |
| 14 | Methodology · "No source, no quote" | `sticker-magnifier` | Kit | 64px at the section's left gutter |
| 15 | Page background (all) | `textures/tex-riso-speckle.webp` | Kit | Transparent speckle tile over `background` at full strength (already light); the paper tile is cream, not `background`, so use the speckle |
| 16 | Home · lede hero (desktop) | `hero-porch-neighbors` / `hero-main-street` | Held | Re-spec for the lede at 740px wide: art in the right 40%, clear zone left for the H1 |
| 17 | Home · key dates, all five stops | `date-*` vignettes | Held | 48px round vignettes; needs the stop spacing from `KeyDatesRail` |
| 18 | Home · three ways to vote | `way-*` panels | Held | Not built yet (not in PR #161) |
| 19 | Home · coverage map card | `map-explorer` | Held | Waits for the map card |
| 20 | Inner pages (race, measure, candidate, news) | calm-style spots | Held | Only page headers and empty states; needs calm versions of the kit |

### Phone slots (below lg, built 2026-10-11, extended 2026-10-14)

The closed list in design.md ("Art on phones"). Most are a second, `lg:hidden` piece beside a desktop
twin of another size; a piece drawn the same size at every width is one element. All are static and
lazy. The plans, measurements and budgets are in `docs/design/mobile-visuals-2026-10-11/` and
`docs/design/mobile-visuals-2026-10-14/` (round 2: decisions 1A–5A, 6B).

| Page · slot | Asset | Size | How it sits |
|---|---|---|---|
| Home · key dates card | `sticker-sun` (-xs) | 36px | Inside the card's top-right corner, rising 24px into the gap above; nothing above the card moves |
| Home · "On this page" | `sticker-magnifier` (-xs) | 30px | 8px after the label, bottom-aligned; one element at every width. Rises 12px into the gap above, 20px clear of the registration link, 8px above the chips |
| Home · between the statewide races and the ballot questions | wave divider | 12px band | Only when both lists render, at every width; no figure, never inside either list |
| Home · zigzag after the ballot list | `sit-divider` (-xs) | 88px | Seated on the band at the right; px margins keep it 12px clear of the list and 16px clear of the House h2 |
| Home · coverage card | `pet-cat-peek` (-xs) | 64px | Peeks over the card's top edge at the right; the h2 carries `pr-[108px]` |
| Home · wave after the coverage card | `walker-row` (-xs) | 48px | All eight hero walkers, still, one height, a fixed order; stands on the wave at the right; never on a screen with a candidate list |
| Home · install card | `sticker-kyv-badge` (-xs) | 48px | In flow, left of "Get the app", untilted |
| Home · reminder card | `sticker-envelope` | 40px | Unchanged |
| All pages · footer | `footer-town-strip-750` | full width, max 184px | One 750w phone file below sm. Whole town up to about 434px; from there to sm, capped at 184px and cropped from the top (sky, then roofs, never a person) |
| 404 | `error-404-funk` | 120px | Own row above the h1 |
| Error page | `error-404-funk` | 120px | The 404's piece, own row above the h1; one plain img (220px from lg), since the page is a client component |
| Methodology | `method-receipts` | 112px | Own row under the header (first to drop) |
| Methodology · "No source, no quote" | `sticker-magnifier` (-xs) | 30px | In the heading's row, after the words; the heading wraps beside it |
| About · after "What this is" | `walker-row` (-xs) | 48px | Its own row; cached from home |
| About · "Get in touch" | `pet-dog-sit` (-xs) | 56px | In the heading's row, after the words |

Line icons (`src/components/ui/Glyphs.tsx`) are product UI, not art, so they are not slots: one per
sample-ballot tile, keyed by task (ballot sheet, pin, calendar, mail; 20px); one before each key-dates
link (calendar, bell; 1em); and one on every /privacy heading (20px, the same treatment for each). None
has a tick, a filled shape or an oval, and none marks a candidate, party, race, a measure's YES/NO, a
verdict or a news item.

## Not used

- News rail and news list: none. The rail hides itself when empty, so it needs no empty-state art.
- Race list, ballot questions list, judges box, race and candidate pages' comparison areas: none.

## Before wiring

1. PR #161 is merged, so slots 1, 3, 4, 5, 6, 7 and 10 can be wired now; slot 2 needs the paragraph-width change; slot 9 needs the photo band.
2. The page background is `#F6F3EC` and the cut-outs were keyed on cream `#F5EBD8`; they're transparent, so
   this is fine, but the cream paper tile would show as a slightly different colour. Use the speckle overlay.
3. Use the `-sm` files (about 46 KB each) everywhere except the strips on wide screens; `loading="lazy"` and
   `alt=""` (decorative), `aria-hidden` on wrappers.
