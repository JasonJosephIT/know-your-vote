# What to make next (2026-10-11)

**Status: all made (2026-10-11).** Files: `site/illustrations/` (UI characters, pets, page pieces, bands),
`site/textures/` (wallpaper, corner sunburst, halftone edge), `site/og-card-walkers.png`,
`email/reminder-hero-walkers.png`. Edge positions for every UI character: `site/illustrations/ledges.json`.

Proposal after the skin pass. Visual version with the three UI-character samples placed on real edges:
`next-assets.html`, next to this file. Rules still apply: no art in news items, race lists, comparisons, beside
a candidate (candidate headshots landed in PR #162), or over a control.

## Skin pass: where people appear

| Where | Status |
|---|---|
| 28 kit + walker images in `site/illustrations/` | Brand skin tokens (done earlier today) |
| 10 style references in `site/ai/refs/` | Brand skin applied now, so new generations inherit flat token skin |
| July Higgsfield originals `site/ai/*.svg`, `hero-90s.webp` | Archive only, old skin; never ship (noted in the manifest) |
| Email, mobile, icons, July hand-made SVGs | No people |
| Candidate headshots (PR #162) | Real photos, not art; untouched |

## A · Characters that live on the UI (kind `ledge`)

The generator draws a bar for the pose, measures it, edits it out, and writes where the real edge goes to
`site/illustrations/ledges.json` (fraction of height). CSS puts that line on the UI edge.

| # | Asset | Sits on | Status |
|---|---|---|---|
| A1 | `peek-card-edge` | Top edge of the reminder card or the "What this guide covers" card; fingers over the border | Made |
| A2 | `sit-divider` | A zigzag divider or a card's top-right corner, legs in front; the card keeps its right ~40% free of text, or she sits where her legs hang past the card's edge | Made |
| A3 | `hang-masthead` | Under the Ink masthead strip, in the right gutter (≥1280px only) | Made |
| A4 | `lean-card-side` | Leaning on a card's right edge, arms crossed (vertical ledge) | Made |
| A5 | `climb-tiles` | Short ladder up to the at-a-glance tiles' top edge | Made |
| A6 | `lie-footer` | Lying on top of the footer strip, reading, a dog asleep beside | Made |
| A7 | `point-zip` | Standing right of the ZIP row, pointing at the field (never covering it) | Made |
| A8 | `pets` | A cat peeking and a dog sitting, for 404 and empty states (no skin) | Made |

## B · Backgrounds

| # | Asset | Where | Notes |
|---|---|---|---|
| B1 | Florida motif wallpaper tile | About, 404, methodology page background | Palms, oranges, pelicans, suns, bolts in cream-on-cream at very low contrast; seamless 512 tile |
| B2 | Wavy horizon band | Behind "What this guide covers" heading | Low sea and sun band, 21:9, faded at the top |
| B3 | Corner sunbursts | Card corners (reminder, install) | Quarter sunburst SVG, code-made |
| B4 | Thin footer panorama | Under 160px footer band | Needs a 6:1 image: two 21:9 halves generated to join, or code-composited |
| B5 | Checker and halftone section edges | Top of the masthead, bottom of the hero | Code-made from the existing tiles |

## C · Page pieces

| # | Asset | Page | Style |
|---|---|---|---|
| C1 | Neighbors grid with brand skin | About · "Who's behind" | Funk, equal panels |
| C2 | Checking the receipts | Methodology · "How a quote gets here" | Calm |
| C3 | Lost with an upside-down map | 404 | Funk (held set) |
| C4 | Reading the ballot paper | Measure pages · page header only | Calm |
| C5 | Reading the paper on a bench | News page header (not the list) | Calm |
| C6 | Walkers line-up OG card | Social share, baked wordmark + one line | Funk |
| C7 | Reminder email hero with a walker | Email | Funk, baked date |

## D · Motion (later)

Hero walk (built: one procession, CSS only). Sticker pop parked: there are no swaps any more, and a pop would break the no-bounce rule (raise with the founder if wanted back); peeker that ducks on scroll, hanger that swings.

Rough cost to make A4–A8, B1–B2, B4 and C1–C7: ~20 generations plus skin masks, about $5.
