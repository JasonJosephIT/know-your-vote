---
title: KYV Brand Assets Roadmap
version: 1.1
status: in progress
source-of-truth: docs/design.md
companion: docs/asset-generation-guide.md
last-updated: 2026-10-11
---

# KYV Brand Assets Roadmap

This is the master inventory of every brand asset Know Your Vote needs, organized by
surface (**site/web, mobile, web artifacts, email**) with a **medium-specific spec** for
each. It is a planning document: it says *what* to build, *at what dimensions*, *in which
colorway*, and *what each asset must and must not contain*. It does **not** produce the
assets — agents generate them iteratively using `docs/asset-generation-guide.md`, which
turns each row below into an on-brand file.

Every asset here inherits the design system in [`docs/design.md`](./design.md). Colors,
type, spacing, radius, and logo rules are **not restated** — they are referenced. If an
asset would need a color or token that isn't in `design.md`, it must be added there first.

## Governing principles (apply to every asset)

1. **Tokens or nothing.** Every color, radius, and spacing value maps to a `design.md`
   token. No off-palette hex, ever.
2. **Non-partisan is a hard invariant.** No red/blue coding, no candidate favored, no
   party color-coding — on a favicon, an email banner, or a hero alike.
3. **Build for the medium; don't duplicate what the medium renders.** Site/app imagery
   carries **no baked-in headlines, body text, buttons, or CTAs** — the page renders those
   as live HTML on top. Bake text only into media that has no live text layer (OG cards,
   email graphics, app-store screenshots).
4. **Cohesion over cleverness.** A new asset must look like it came from the same studio as
   the last one: same green/cream/ink anchor, same humanist calm, same restraint.
5. **Logo discipline.** Only the four approved colorways; wordmark above min width, acronym
   monogram below it or in square/1:1 slots. Never near candidate imagery.

## Colorway shorthand (from design.md → Brand & Logo)

- **Official** — green/cream/ink on a light field (`background`, `surface`, or cream).
- **Reversed** — cream + ink letterforms on solid KYV Green or Ink.
- **Mono Ink** `#22271F` / **Mono Cream** `#F5EBD8` — single-color contexts.
- **Marketing** — retro-harvest tones (`harvest-gold`, `burnt-orange`, `brick`, `olive`)
  as *support only*, anchored by Green + Cream. Marketing surfaces only — never product UI.

---

## 1 · Site / Web

Next.js app + marketing pages. **Rule of the surface:** the site renders all text and
buttons as live, translatable, accessible HTML — so raster/vector imagery here is
**decorative or illustrative only, with no in-image copy or controls.** The one exception is
the social-share (OG) card, which is consumed *outside* the site as a flat image and
therefore does carry baked text.

| Asset | Format | Dimensions | Colorway | Must contain | Must NOT contain | Priority |
|---|---|---|---|---|---|---|
| Favicon set | SVG + ICO + PNG | 16, 32, 48px + `favicon.svg` | Official / Mono | KYV acronym monogram, square | Wordmark (illegible small), text | P0 |
| Header wordmark | SVG | ≥120px wide | Official | `kyv-logo-official.svg` | Effects, recoloring | P0 (exists) |
| Header monogram (compact) | SVG | 32–40px | Official | `kyv-logo-acronym.svg` | — | P0 (exists) |
| OG / social share card | PNG (or dynamic OG) | 1200×630 | Official on cream | Wordmark, one short standfirst line, no candidate | Candidate photos, partisan color, dense text | P0 |
| Hero illustration | SVG (preferred) | fluid, ~1440×720 art | Official + soft accent | Abstract civic motifs (ballot, map of FL, checkmark), whitespace | **Headlines, buttons, CTA text** | P1 |
| Section spot illustrations | SVG | ~480×360 each | Official + accent | Small warm marks (a pin, a magnifier "receipts", a stack of lines) | Text labels (page renders them) | P1 |
| Empty-state / no-results art | SVG | ~360×280 | Muted official | Calm, reassuring motif | Sad/alarming imagery, text | P1 |
| Icon set (UI) | SVG | 24px grid, 1.5px stroke | `on-surface` / `primary` | Consistent stroke, rounded joins | Filled partisan symbols | P1 |
| FL district/map textures | SVG | fluid | Mono / muted | Neutral geographic shapes | Party-shaded regions | P2 |
| Methodology / trust diagram | SVG | fluid | Official | The 3-bucket model (stated_position / verifiable_fact / outside_opinion) as a calm diagram | Editorializing labels | P2 |
| 404 / error illustration | SVG | ~360×280 | Muted | Friendly, low-key | Alarmist red | P2 |

**Anti-`.gov` reminder:** no dense cold-gray tables, no hard shadows, no USWDS/Public Sans
styling in any diagram or illustration.


### 1b · Site illustration library (2026-10-11)

The page art for the homepage layout in `docs/design/layout-2026-10-11/` (masthead strip, key-dates rail,
at-a-glance tiles, statewide races, ZIP + coverage-map cards, three ways to vote, news column, photo band,
footer). These are **not** widgets or controls: they are images that sit in or behind those sections and give
the page people, texture and the brand's retro warmth. Rules (from `design.md` → *Site illustration layer*):

- **Two styles, both approved.** *Funk* (70s screen-print × 90s funk, marketing palette) for the homepage and
  top-of-funnel moments; *Calm* (flat editorial, calm palette) for inner pages. Anchored by the July Higgsfield
  references in `public/brand/site/ai/` (`v2-*` = funk, the rest = calm).
- **Image slots only.** No art in news slots (publisher photos or text only), inside a race comparison, beside
  a candidate or next to a verdict. The photo band (layout marker 7) prefers a public-domain Florida photo;
  `band-old-capitol` and `band-coast` are the illustrated alternates.
- **People:** stylized and never real; a mix of ethnicities, ages and abilities across the set; a group gives
  every person equal size and attention.
- **No text in any image;** every colour snapped to tokens by the generator. Images only for now; motion later.
- **Formats:** WebP, master + `-sm` half size; spots, stickers and people have transparent backgrounds.
  Textures are seamless tiles; dividers use `currentColor` so CSS picks the token.

| # | Slot (layout section) | File (`public/brand/`) | Style | AR | Subject |
|---|---|---|---|---|---|
| 1 | hero | `site/illustrations/hero-porch-neighbors.webp` (+ `-sm`) | Funk | 3:2 | three neighbors of different ages sitting together on the front steps of a small Florida bungalow, each reading their own copy of the same plain printed booklet |
| 2 | hero | `site/illustrations/hero-main-street.webp` (+ `-sm`) | Funk | 3:2 | a lively main-street scene: a small storefront with a rounded awning, a shopkeeper with big curly hair in the doorway, a stylish customer with an afro walking past carrying a tote bag and a boombox, a rounded tree, a lamppost, small zigzag bolts and geometric confetti in the sky |
| 3 | hero | `site/illustrations/hero-community-park.webp` (+ `-sm`) | Funk | 3:2 | a sunny community park: one person with long curls sitting on a bench with a small dog, another person with a big afro dancing nearby with one arm raised, a rounded tree, a lamppost, bushes, small zigzag bolts and geometric confetti in the air |
| 4 | hero (phone) | `site/illustrations/hero-mobile-reader.webp` (+ `-sm`) | Funk | 4:5 | one confident person with a big afro and a checkered jacket walking forward while reading a folded plain paper booklet, a huge 70s sunburst of rays behind them, a palm on one side, zigzag bolts around |
| 5 | hero (calm alternate) | `site/illustrations/hero-porch-neighbors-calm.webp` (+ `-sm`) | Calm | 3:2 | three neighbors of different ages sitting together on the front steps of a small house, each reading their own copy of the same plain booklet, potted plants and a rounded tree |
| 6 | key dates | `site/illustrations/date-registration.webp` (+ `-sm`) | Funk | 1:1 | a hand holding a pencil next to a clipboard with a single big checkmark and blank lines |
| 7 | key dates | `site/illustrations/date-today.webp` (+ `-sm`) | Funk | 1:1 | a 70s rising sun with chunky rays over a simple wavy horizon |
| 8 | key dates | `site/illustrations/date-mail-ballot.webp` (+ `-sm`) | Funk | 1:1 | a hand dropping a plain blank envelope into a rounded curbside mailbox on a post |
| 9 | key dates | `site/illustrations/date-early-voting.webp` (+ `-sm`) | Funk | 1:1 | three people of different ages standing in a short relaxed line outside a small library doorway with a rounded awning, morning light |
| 10 | key dates | `site/illustrations/date-election-day.webp` (+ `-sm`) | Funk | 1:1 | a plain blank folded paper ballot sliding into the slot of a simple wooden box |
| 11 | at a glance | `site/illustrations/glance-statewide.webp` (+ `-sm`) | Funk | 1:1 | a small historic domed capitol building with cream-and-burnt-orange striped window awnings, two palms beside it |
| 12 | at a glance | `site/illustrations/glance-amendments.webp` (+ `-sm`) | Funk | 1:1 | a short stack of three plain paper documents with blank lines and a big round magnifying glass resting on top |
| 13 | at a glance | `site/illustrations/glance-house.webp` (+ `-sm`) | Funk | 1:1 | a small rounded house with a big map location pin floating above its roof |
| 14 | statewide races | `site/illustrations/neighbors-grid.webp` (+ `-sm`) | Funk | 3:2 | a grid of six equal square framed portrait panels, each a different stylized person with no facial features (blank face), different hairstyles (afro, curls, braids, bun, short grey, long waves) and 70s collared clothing |
| 15 | ZIP card | `site/illustrations/zip-phone.webp` (+ `-sm`) | Funk | 4:5 | one cheerful stylish person with big curly hair standing beside a giant smartphone taller than them, one hand raised, the phone screen showing only blank rounded rectangles, a small rounded tree |
| 16 | coverage map card | `site/illustrations/map-explorer.webp` (+ `-sm`) | Funk | 1:1 | a person in a bucket hat and wide trousers unfolding a large blank paper road map, a palm behind them |
| 17 | three ways to vote | `site/illustrations/way-mail.webp` (+ `-sm`) | Funk | 4:3 | a person at a kitchen table filling in a blank paper form with a pen, a plain envelope and a coffee mug beside them, a window with a palm outside |
| 18 | three ways to vote | `site/illustrations/way-early.webp` (+ `-sm`) | Funk | 4:3 | a person with a tote bag walking toward a small public library building in the morning sun, a bicycle parked out front |
| 19 | three ways to vote | `site/illustrations/way-election-day.webp` (+ `-sm`) | Funk | 4:3 | a smiling person stepping out of a community center doorway giving a thumbs up, a small blank round sticker on their shirt |
| 20 | three ways to vote (calm) | `site/illustrations/way-mail-calm.webp` (+ `-sm`) | Calm | 4:3 | a person at a kitchen table filling in a blank paper form with a pen, a plain envelope and a mug beside them |
| 21 | three ways to vote (calm) | `site/illustrations/way-early-calm.webp` (+ `-sm`) | Calm | 4:3 | a person with a tote bag walking toward a small public library building, a bicycle out front |
| 22 | three ways to vote (calm) | `site/illustrations/way-election-day-calm.webp` (+ `-sm`) | Calm | 4:3 | a person stepping out of a community center doorway giving a thumbs up, a small blank round sticker on their shirt |
| 23 | news column empty state | `site/illustrations/news-empty.webp` (+ `-sm`) | Calm | 1:1 | a relaxed person sitting on a park bench reading a blank folded newspaper, a small bird beside them |
| 24 | 404 page | `site/illustrations/error-404-funk.webp` (+ `-sm`) | Funk | 1:1 | a puzzled person holding a blank paper map upside down, a small dog looking up at them, a signpost with blank arrow signs |
| 25 | footer | `site/illustrations/footer-town-strip.webp` (+ `-sm`) | Funk | 4:1 | a long panoramic strip of a small Florida town: palms, low storefronts with rounded awnings, a lamppost, a water tower, a pelican on a dock post, a few small people walking and cycling |
| 26 | photo band (illustrated alternate) | `site/illustrations/band-old-capitol.webp` (+ `-sm`) | Funk | 4:1 | a wide panorama of a historic domed capitol building with striped awnings between tall palms, a broad sky with a sunburst and confetti, a few small people on the lawn |
| 27 | photo band (illustrated alternate) | `site/illustrations/band-coast.webp` (+ `-sm`) | Funk | 4:1 | a wide panorama of a Florida coastline: a wooden fishing pier, pelicans, gentle waves, palms and a low sun with chunky rays, two people walking on the sand |
| 28 | stickers | `site/illustrations/sticker-boombox.webp` (+ `-sm`) | Funk | 1:1 | a chunky 90s boombox with two round speakers |
| 29 | stickers | `site/illustrations/sticker-sun.webp` (+ `-sm`) | Funk | 1:1 | a smiling 70s sun with wavy rays |
| 30 | stickers | `site/illustrations/sticker-palm.webp` (+ `-sm`) | Funk | 1:1 | a single leaning palm tree on a small mound of sand |
| 31 | stickers | `site/illustrations/sticker-pelican.webp` (+ `-sm`) | Funk | 1:1 | a brown pelican standing on a wooden post |
| 32 | stickers | `site/illustrations/sticker-orange.webp` (+ `-sm`) | Funk | 1:1 | a Florida orange with two leaves and a cut half beside it |
| 33 | stickers | `site/illustrations/sticker-raised-hand.webp` (+ `-sm`) | Funk | 1:1 | a raised open hand with a patterned sleeve cuff |
| 34 | stickers | `site/illustrations/sticker-magnifier.webp` (+ `-sm`) | Funk | 1:1 | a big magnifying glass over a curled paper receipt with blank lines |
| 35 | stickers | `site/illustrations/sticker-flamingo.webp` (+ `-sm`) | Funk | 1:1 | a flamingo standing on one leg, coloured burnt orange and clay (not pink) |
| 36 | stickers | `site/illustrations/sticker-daisy.webp` (+ `-sm`) | Funk | 1:1 | a 70s daisy flower with chunky rounded petals |
| 37 | stickers | `site/illustrations/sticker-sneaker.webp` (+ `-sm`) | Funk | 1:1 | a chunky 90s high-top sneaker with zigzag details, no brand marks |
| 38 | stickers | `site/illustrations/sticker-envelope.webp` (+ `-sm`) | Funk | 1:1 | a plain blank envelope with a big checkmark stamp shape and small motion lines |
| 39 | people | `site/illustrations/person-phone-reader.webp` (+ `-sm`) | Funk | 3:4 | full-body young woman with long box braids and a cropped jacket scrolling on her phone while walking |
| 40 | people | `site/illustrations/person-elder-reader.webp` (+ `-sm`) | Funk | 3:4 | full-body older man with grey hair, reading glasses and a cardigan, reading a plain booklet |
| 41 | people | `site/illustrations/person-student.webp` (+ `-sm`) | Funk | 3:4 | full-body college student with a backpack and headphones around the neck, waving |
| 42 | people | `site/illustrations/person-skater.webp` (+ `-sm`) | Funk | 3:4 | full-body teenager in baggy 90s clothes riding a skateboard, arms out for balance |
| 43 | people | `site/illustrations/person-wheelchair.webp` (+ `-sm`) | Funk | 3:4 | full-body person using a wheelchair, a tote bag on their lap, smiling and pointing forward |
| 44 | background textures | `site/textures/tex-paper-grain.webp` | Code (tokens) | tile | cream paper grain tile |
| 45 | background textures | `site/textures/tex-riso-speckle.webp` | Code (tokens) | tile | transparent ink speckle overlay tile |
| 46 | background textures | `site/textures/tex-halftone.svg` | Code (tokens) | tile | halftone dot tile |
| 47 | background textures | `site/textures/tex-checker.svg` | Code (tokens) | tile | olive and burnt-orange checker tile |
| 48 | masthead strip | `site/textures/tex-masthead-ink.webp` | Code (tokens) | tile | ink strip grain tile |
| 49 | section dividers | `site/textures/divider-zigzag.svg` | Code (tokens) | tile | zigzag rule |
| 50 | section dividers | `site/textures/divider-wave.svg` | Code (tokens) | tile | wavy rule |
| 51 | section dividers | `site/textures/divider-checker.svg` | Code (tokens) | tile | checker strip |
| 52 | hero backdrop | `site/textures/bg-sunburst.svg` | Code (tokens) | tile | 70s sunburst rays |

**Status (2026-10-11).** Built: the layout-independent kit, 20 images (all 11 stickers incl. the logo badge, the
5 people + `person-kyv-tote`, `footer-town-strip`, `band-coast`), and the 9 textures and dividers. Held until the
homepage sections are built in `src/`: the slot-specific art (heroes, key-date vignettes, at-a-glance spots,
ways-to-vote panels, neighbors grid, ZIP and map card spots, empty and 404 states, `band-old-capitol`). Each will
be re-specified against the real section sizes with its anchor (behind the headline, leaning on a card edge,
sitting on the footer), its clear zone for live text and its size on the page.

**Hero walk (2026-10-11).** The home lede figure is eight walkers over the still sunburst: the phone reader, a
nurse, a lineworker, a boat captain, a teacher, a student, a chef and a runner with a blade prosthetic, all
mid-stride to the right at one scale. They stroll left to right in one slow procession, each walking from its
single still pose (a 4px step bob with a 1px dip, a ±0.6° sway about the feet, a ground ellipse that narrows as
the body rises); every 5.12s the next one passes the sun. It loops for as long as the page is open (founder,
2026-10-11): each 40.96s lap every walker crosses once for the same time, and a Pause button stops it.
The walker in the still is drawn at random per page view, so each leads equally often. Reduced motion shows the
still only; below lg nothing loads. Sharp frames in `public/brand/site/rotator/` (`scripts/brand-assets/rotator.py`);
the motion is CSS (`src/components/brand/HeroRotator.module.css`, numbers in `hero-walk.ts`, checked by
`scripts/verify-hero-walk.ts`). The earlier blur-swap version is archived in
`docs/design/brand-assets-2026-10-11/hero-rotator.html`.

**Phone walker row (2026-10-14).** On phones the same eight stand still in one row (`walker-row-xs/-sm`,
`scripts/brand-assets/compose.py row`), 48px tall, after "What this guide covers" on home and after "What
this is" on /about. **Known gap, logged by founder decision 4B (2026-10-14):** the eight span `skin-1` to
`skin-5`; none is `skin-6`, so "a set of people spans the range" is not yet met, on the desktop hero or the
row. A pixel re-tone of the fisherman to `skin-6` was tried and withdrawn because his ink eyes fade (about
1.26:1). The fix is to regenerate him: `assets.json` pins him to `skin-6`, and `generate.py` enforces it.
His eyes need drawing so they read on the deepest tone: the founder approved small cream eye whites for
him (2026-10-14). Then re-run `rotator.py` and `compose.py row`, and re-run `verify-hero-walk`
and `verify-walker-row`.

**Open decision (from the layout pass):** a serif for display sizes only (Newsreader or Source Serif 4,
replacing Figtree at `display`/`h1`). The art works with either; it is a type decision for `design.md`.

---

## 2 · Mobile

The web app is responsive; "mobile" assets are the icon/launch family and store presence.
**Rule of the surface:** launch/icon art is baked (no live text layer), but keep it a *mark*,
not a poster — the monogram carries it. Store screenshots are composited (device frame +
live-looking UI + one caption), so caption text may be baked there.

| Asset | Format | Dimensions | Colorway | Must contain | Must NOT contain | Priority |
|---|---|---|---|---|---|---|
| App icon (iOS) | PNG | 1024×1024 (+ downscales) | Reversed (cream monogram on green) | Acronym monogram, generous clearspace | Wordmark, text, gloss | P0 |
| Adaptive icon (Android) | SVG/PNG | 108×108dp fg + bg layers | Reversed | Monogram on separate fg layer, green bg layer | Bleed into safe zone | P0 |
| Maskable icon | PNG | 512×512, safe zone ⌀ | Reversed | Monogram centered in 80% safe circle | Detail near edges | P0 |
| Splash / launch screen | SVG/PNG | per-device, centered | Official on `background` | Monogram or wordmark, lots of calm space | Loading text, taglines | P1 |
| PWA `manifest` icons | PNG | 192, 512 (+ maskable) | Reversed | — | — | P1 |
| Notification / status icon | SVG (mono) | 24px, single-color | Mono Ink/Cream silhouette | Simplest monogram silhouette | Color, detail | P2 |
| App Store / Play screenshots | PNG | store specs (e.g. 1290×2796) | Official | Device frame, real UI crop, **one** short caption per shot | Fake data, partisan framing, candidate favoritism | P2 |
| Feature graphic (Play) | PNG | 1024×500 | Official on cream | Wordmark + one line | Screenshots crammed, dense text | P2 |

**Touch-target & safe-zone note:** respect each platform's safe zone; the monogram must
survive circular *and* rounded-square masks without clipping the letterforms.

---

## 3 · Web Artifacts

Standalone, embeddable HTML/interactive pieces (share widgets, methodology explainers,
"how we verify" mini-pages, embeddable race cards) that live outside the app but must look
identical to it. **Rule of the surface:** these are *built in CSS, not baked as images.*
Text, buttons, and layout are live HTML styled with the shared theme — so almost nothing
here is a "graphic file." The deliverable is **markup + the KYV theme CSS**, which is why
the artifact theme (`public/brand/kyv-artifact-theme.css`) exists and why the generation
guide folds CSS creation in.

| Artifact | Delivery | Colorway | Built with | Must contain | Must NOT contain | Priority |
|---|---|---|---|---|---|---|
| Artifact theme CSS | `kyv-artifact-theme.css` | all | Tailwind v4 `@theme` | Full token set + component helpers | Off-token values | P0 (done) |
| Embeddable race card | HTML + theme | Official | `.kyv-card`, equal columns | Equal visual weight per candidate, neutral party chips | Color-coded parties, unequal columns | P1 |
| "How we verify" explainer | HTML + theme | Official | tokens + calm diagram | 3-bucket model, source-linked | Motive/editorializing | P1 |
| Verdict badge component | HTML/CSS snippet | verdict scale | `.kyv-verdict-badge` | Dot + text label always paired | Color-only meaning | P1 |
| Shareable stat / pull-quote | HTML → PNG export | Official/marketing | tokens | One fact + source line | Partisan spin | P2 |
| Interactive ZIP→ballot demo | HTML + theme | Official | live inputs, `.kyv-btn-primary` | One primary action per view | Multiple competing CTAs | P2 |

**Consistency mechanism:** every artifact imports `kyv-artifact-theme.css` and uses only
`kyv-*` helpers and token utilities. No artifact defines its own colors. See the CSS section
of `docs/asset-generation-guide.md`.

---

## 4 · Email Graphics

Transactional + civic-reminder email (Resend is already a dependency). **Rule of the
surface:** email clients are hostile — no reliable web fonts, no CSS variables, patchy CSS,
dark-mode inversion. So email graphics **bake their text and use inline, resolved hex**, and
every image needs a real `alt`. Keep images few and light; the email body itself is
HTML-with-inline-styles, not one giant image.

| Asset | Format | Dimensions | Colorway | Must contain | Must NOT contain | Priority |
|---|---|---|---|---|---|---|
| Email header banner | PNG (@2x) | 1200×300 (600×150 display) | Official on cream | Wordmark, ample clearspace | CTA buttons (use live HTML button), dense text | P0 |
| Email footer mark | PNG | 240×80 | Mono Ink | Monogram + "nonpartisan" microline | Social-partisan icons | P0 |
| Logo for dark-mode fallback | PNG | transparent, padded | Mono Cream | Cream monogram on transparent | Green (inverts poorly) | P1 |
| Reminder hero (deadline) | PNG | 1200×600 | Official + `harvest-gold` accent | Calm civic motif + baked date | Alarmist countdown red, candidate imagery | P1 |
| Icon chips (inline) | PNG | 48×48 | Mono/official | Simple single-color glyph | Fine detail (renders muddy) | P2 |

**Email hard rules:** max ~600px content width; buttons are bulletproof HTML/table buttons
using `--color-primary` resolved to `#2f6b4f`, **not** an image; every image `alt`-texted so
the email reads with images off; test light + dark. Never rely on `kyv-artifact-theme.css`
variables *inside* email — copy resolved hex inline.

---

## Phased build order

**Phase 0 — Identity core (unblocks everything).** Favicon set, app icon + adaptive/maskable,
OG card, email header + footer mark. These are the first thing anyone sees and every other
asset borrows their treatment.

**Phase 1 — Product surface.** Hero + section illustrations, UI icon set, empty/error states,
embeddable race card + verdict badge + "how we verify" explainer, splash, PWA icons, email
reminder hero + dark-mode logo.

**Phase 1b — Site illustration library (2026-10-11).** The 52 images and textures in §1b, then wiring them
into the homepage sections. Motion (animated stickers, parallax, video loops) is a later phase.

**Phase 2 — Reach & polish.** FL map textures, methodology diagram, store screenshots + Play
feature graphic, shareable stat cards, interactive ZIP→ballot demo, inline email icon chips.

**Definition of done for any asset:** (1) every value maps to a `design.md` token; (2) passes
the non-partisan check; (3) contains only what its medium doesn't render live; (4) sits beside
the previous asset without looking like a different brand; (5) logged so the next agent reuses,
not reinvents, it (see the cohesion ledger in the generation guide).
