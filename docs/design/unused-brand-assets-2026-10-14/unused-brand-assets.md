# Unused brand assets (2026-10-14)

Of 44 illustrations in `art-sizes.json`, 19 appear on no page. Four textures and six July SVGs are
unused too. This sorts them into what can go up now, what is retired, and the gap that placing them
won't close.

## The diversity gap

The unused people are mostly light-skinned. By eye, the elder reader, skater, wheelchair user and
point-zip man fall around `skin-1` to `skin-2`, and the student around `skin-3`. The hero walkers
already have no `skin-6` (mobile-visuals-2, decision 4). Putting these four up would make the site
lighter overall, not more varied.

What would diversify it: **generate deep-skin figures (`skin-5`, `skin-6`) first**, ideally new
versions of the elder reader and the wheelchair user. Age and disability are the parts of the cast
that are thinnest today.

## Ready to place (inside existing rules)

| Asset | Slot | Rule it follows |
|---|---|---|
| `sticker-pelican`, `sticker-daisy`, `sticker-boombox` | 680px-page side gutters at ≥1280px (placement map #11) | One per gutter per screen, never beside a candidate, hidden below 1280 |
| `sticker-orange`, `sticker-flamingo`, `sticker-palm`, `sticker-sneaker` | Same gutters, rotating by page so each page gets a different one | Same; objects have no skin, so no balance issue |
| `person-student` | About, "Who's behind" gutter (#13) | Only alongside a deeper-skin figure, or after the gap is fixed |
| `person-skater`, `person-wheelchair` | Gutters (#11) | Hold until they can be paired with a `skin-5`/`skin-6` figure |
| `person-elder-reader` | 404 (#12) | 404 already uses `error-404-funk`; swap only if wanted |
| `band-horizon` | Desktop-only break on /about or /methodology | Never on phones (it would be the LCP element) |
| `tex-florida-wallpaper` | Faint background on the 404 or the footer | New idea; no slot yet |

## Retired: don't place

- `band-coast`, `lie-footer`: retired in #164.
- `point-zip`: its skin isn't flat.
- `sticker-raised-hand`: marks on the skin, and alone it puts one skin tone forward.
- `tex-paper-grain`: cream, not `background` (placement map #15 uses the speckle instead).
- `climb-tiles`: no slot in any spec.
- July SVGs (`spot-pin`, `spot-stack`, `spot-magnifier`, `fl-map-texture`, `community-icons`,
  `methodology-diagram`) and `site/ai/`: old skin, ticks in verdict colours, baked-in text.

## Decided (founder, 2026-10-14)

- `climb-tiles` replaces `peek-card-edge` on the home coverage card ("What this guide covers"),
  desktop only. His ladder runs behind the card; only his head and hands show above the edge.
- `person-skater` goes in the right gutter of /terms, from 1400px.
- `tex-florida-wallpaper-strong` is every page's background at lg and up, under a 90% cream veil (shows ~10% on cream, never behind white cards): a founder exception recorded in design.md.
- **Follow-up:** add more of the unused art to the pages that will carry announcements (news and
  notices), using the "Ready to place" list above. People still wait for `skin-5`/`skin-6` figures,
  so the cast doesn't get lighter.

## Open decisions

1. Commission `skin-5`/`skin-6` figures before placing more people?
2. Place the object stickers in the gutters now?
3. Is the wallpaper texture wanted on the 404/footer?
