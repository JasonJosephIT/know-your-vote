# Where the art goes (placement map, 2026-10-11)

Checked: the live site (`main`, PR #160) at 1440×900 across home, candidates, a race, a measure, news,
outlets, about, methodology and 404; and the open home layout pass, PR #161 (masthead, key dates rail,
at-a-glance tiles, news rail; its Vercel preview has an empty database, so its slots were read from code).
Visual version with a wireframe: `placement-map.html`, next to this file.

## What the site looks like now

- **No images at all.** Every page has 0 images apart from one publisher photo in the news list. The
  hand-made SVGs from July (`site/hero.svg`, `spot-*.svg`, `empty-state.svg`, `error-404.svg`) were never wired in.
- **Text in a 632px column.** Home, candidates, news, about, methodology and 404 use `max-w-[680px]`, so at
  1440px about 400px of empty cream sits on each side. Race and measure pages use 1120px.
- **Every section has the same shape:** H2, grey paragraph, white card. Section breaks are a 1px border.
- **404 is a heading and a link in an empty screen.**
- PR #161 widens home to 1120px with a 340px news rail on the right and adds an Ink masthead strip.

## Hard limits (design.md, site illustration layer)

No art in news items, in the race list, inside a race comparison, beside a candidate's name, or next to a
verdict. Race, candidate, measure and news-list content stays art-free. Art goes in page chrome, section
breaks, cards about the voter's own steps (ZIP, reminders, install), empty states and the footer.

## Placements

Kit = already made (step 1). Held = slot-specific art still to make, now sized against these slots.

| # | Page · slot | Asset | Status | How it sits |
|---|---|---|---|---|
| 1 | Home · masthead strip (PR #161) | `textures/tex-masthead-ink.webp` | Kit | Repeating background on the Ink bar; text stays on top |
| 2 | Home · lede, right of the H1 | `person-phone-reader` (or `person-kyv-tote`) on `bg-sunburst` | Kit | ~220px tall cut-out bottom-aligned to the lede; sunburst behind at low opacity; hidden under `sm` |
| 3 | Home · key dates rail stops | `sticker-sun` (Today), `sticker-envelope` (mail ballot) | Kit | 28–32px above the stop dot; only on those two stops |
| 4 | Home · at-a-glance tiles | `sticker-palm` (statewide), `sticker-magnifier` (amendments) | Kit | 36px in the tile's top-right corner, inside the `primary-muted` fill |
| 5 | Home · section breaks | `divider-zigzag` / `divider-wave` | Kit | Replaces the 1px `border-t` between home sections; `currentColor` = `accent` at 60% |
| 6 | Home · "Add your U.S. House race" card | `person-kyv-tote` | Kit | Stands on the card's top-right edge (feet overlap the border ~12px, never the input or button), 150px tall; desktop only |
| 7 | Home · reminder sign-up card | `sticker-envelope` | Kit | 56px, tilted, peeking from the card's top-left corner |
| 8 | Home · install card (PWA) | `sticker-kyv-badge` | Kit | 72px beside the install text; the badge already carries the monogram |
| 9 | Home · photo band (PR #161 marker 7) | `band-coast` | Kit | Illustrated alternate to a public-domain photo; full width, 160–220px tall, cropped to the middle |
| 10 | All pages · above the footer | `footer-town-strip` | Kit | Full-bleed, sitting on the footer's top border, 220–260px tall, `background-size: cover` at `center 55%` (one crop, never tiled: it is not seamless). A thin (<160px) banner crops it to legs; that needs its own very wide image, added to the held list |
| 11 | 680px pages at ≥1280px · side gutters | people and stickers (`person-skater`, `person-wheelchair`, `sticker-pelican`, `sticker-daisy`, `sticker-boombox`) | Kit | One figure per gutter per screen, fixed to the page edge, never beside a candidate; hidden below 1280px |
| 12 | 404 | `person-elder-reader` + `sticker-palm`, or the July `error-404.svg` | Kit | Centred above the heading, 240px |
| 13 | About · "Who's behind" | `sticker-raised-hand` beside the H1, `person-student` in the gutter | Kit | Small, decorative |
| 14 | Methodology · "No source, no quote" | `sticker-magnifier` | Kit | 64px at the section's left gutter |
| 15 | Page background (all) | `textures/tex-riso-speckle.webp` | Kit | Transparent speckle tile over `background` at full strength (already light); the paper tile is cream, not `background`, so use the speckle |
| 16 | Home · lede hero (desktop) | `hero-porch-neighbors` / `hero-main-street` | Held | Re-spec for the lede at 740px wide: art in the right 40%, clear zone left for the H1 |
| 17 | Home · key dates, all five stops | `date-*` vignettes | Held | 48px round vignettes; needs the stop spacing from `KeyDatesRail` |
| 18 | Home · three ways to vote | `way-*` panels | Held | Not built yet (not in PR #161) |
| 19 | Home · coverage map card | `map-explorer` | Held | Waits for the map card |
| 20 | Inner pages (race, measure, candidate, news) | calm-style spots | Held | Only page headers and empty states; needs calm versions of the kit |

## Not used

- News rail and news list: none. The rail hides itself when empty, so it needs no empty-state art.
- Race list, ballot questions list, judges box, race and candidate pages' comparison areas: none.

## Before wiring

1. Merge PR #161 first; slots 1–4 and 6 exist only there.
2. The page background is `#F6F3EC` and the cut-outs were keyed on cream `#F5EBD8`; they're transparent, so
   this is fine, but the cream paper tile would show as a slightly different colour. Use the speckle overlay.
3. Use the `-sm` files (about 46 KB each) everywhere except the strips on wide screens; `loading="lazy"` and
   `alt=""` (decorative), `aria-hidden` on wrappers.
