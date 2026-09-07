---
title: KYV Brand Assets Roadmap
version: 1.0
status: planning
source-of-truth: docs/design.md
companion: docs/asset-generation-guide.md
last-updated: 2026-07-05
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

**Phase 2 — Reach & polish.** FL map textures, methodology diagram, store screenshots + Play
feature graphic, shareable stat cards, interactive ZIP→ballot demo, inline email icon chips.

**Definition of done for any asset:** (1) every value maps to a `design.md` token; (2) passes
the non-partisan check; (3) contains only what its medium doesn't render live; (4) sits beside
the previous asset without looking like a different brand; (5) logged so the next agent reuses,
not reinvents, it (see the cohesion ledger in the generation guide).
