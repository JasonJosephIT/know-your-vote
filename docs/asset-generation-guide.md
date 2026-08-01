---
title: KYV Asset Generation Guide (for agents)
version: 1.0
audience: asset-generating agents
source-of-truth: docs/design.md
roadmap: docs/brand-assets-roadmap.md
theme-css: public/brand/kyv-artifact-theme.css
last-updated: 2026-07-05
---

# KYV Asset Generation Guide

This tells an agent **how** to produce a Know Your Vote asset so that it is (a) on-brand,
(b) correct for its medium, and (c) cohesive with everything already made. Read it before
generating anything. The *what* and *at-what-size* lives in
[`docs/brand-assets-roadmap.md`](./brand-assets-roadmap.md); the *design language* lives in
[`docs/design.md`](./design.md) — this guide is the bridge between them.

Work **iteratively and in order**: identity core first (Phase 0), then borrow its exact
treatment into every later asset. Never generate a set in one blind pass — make one, check
it against the checklist, log it, then make the next so each inherits the last.

---

## 0 · The five rules that override everything

1. **Map to a token or stop.** Every color = a `design.md` token (or its resolved hex).
   Every radius, space, and type size = a token. If you reach for a value that isn't in the
   system, you're wrong — add it to `design.md` first or pick the nearest token.
2. **Non-partisan is non-negotiable.** No red/blue or any partisan hue; no party
   color-coding; no candidate given more space, sharper light, or a warmer tone than
   another. This holds on a 16px favicon as firmly as on a hero.
3. **Build for the medium — don't bake what the medium renders live.**
   - **Site/app + web artifacts** render text and buttons as live HTML → your image carries
     **no headlines, body copy, labels, or CTAs.** Illustration and shape only.
   - **OG cards, email graphics, store screenshots, splash** have *no* live text layer →
     bake the (minimal) text there, and only there.
4. **Cohesion is the deliverable.** Anchor every piece in KYV Green + Cream + Ink, humanist
   calm, restrained radii, generous whitespace. A new asset should look like the same studio
   made it five minutes after the last one.
5. **Logo discipline.** Four colorways only. Wordmark (`kyv-logo-official.svg`) at/above
   120px; acronym monogram (`kyv-logo-acronym.svg`) below that or in any square/1:1 slot.
   Never recolor, rebuild in a font, stretch, add effects, or place near candidate imagery.

## 1 · The token palette you draw from

Pull these from `design.md`; do not retype approximate hex from memory.

- **Brand anchor:** Green `#2F6B4F`, Cream `#F5EBD8`, Ink `#22271F`.
- **Neutrals (warm sand, never cold gray):** `background #F6F3EC`, `surface #FFFFFF`,
  `surface-muted #EFEAE0`, `border #E4DED2`, `border-strong #CFC7B6`, text `on-surface
  #22271F` / `on-surface-muted #585E52`.
- **Accent (clay, punctuation only):** `accent #B26836`, `accent-strong #8A4E24` (use for
  accent-colored *text* to hold AA).
- **Verdict scale (fact-check only, always with a text label):** accurate `#2F6B4F` →
  mostly-accurate `#5E8C6B` → mixed `#B07A1E` → mostly-inaccurate `#B4692E` → inaccurate
  `#B4402E` → unverifiable `#6B6F66`.
- **Marketing (support only, marketing surfaces only):** `harvest-gold #E3A72E`,
  `burnt-orange #C1541C`, `brick #7A2E1E`, `olive #6B7A3A` on cream. Green + Cream must still
  dominate.
- **Type:** Figtree (headings), Inter (body), IBM Plex Mono (citations/dates/data).
- **Contrast:** every text pairing ≥ WCAG AA. Green-on-white ≈ 5.8:1; ink-on-background ≈ 13:1.

## 2 · Per-surface generation recipes

### Site / Web imagery (illustration, icons, hero, OG)
- Default format **SVG**; export PNG only when a raster is required.
- Palette: Green + Cream anchor, clay accent for small warm moments, muted neutrals for depth.
- Motifs: ballots, a Florida silhouette, a location pin, a magnifier ("receipts"), stacked
  lines, checkmarks — abstract and civic, never a donkey/elephant, flag-as-partisan, or eagle-seal.
- **No baked text or buttons** except the OG card (wordmark + one short standfirst line).
- Icons: 24px grid, ~1.5px stroke, rounded joins, single-color (`on-surface` or `primary`).
- Depth is border-led and flat; reserve `elevation.1/2` for genuinely floating elements.

### Mobile icons & launch
- App/adaptive/maskable icons use the **Reversed** colorway (cream monogram on KYV Green).
- Use the **acronym monogram**, never the wordmark — it must survive circular and
  rounded-square masks. Keep letterforms inside the platform safe zone (≈80% for maskable).
- Splash: monogram or wordmark centered on `background`, lots of calm space, **no tagline text**.
- Store screenshots: device frame + real UI crop + **one** short caption; equal-treatment data,
  never candidate favoritism or fabricated results.

### Web artifacts (HTML, not images)
- Do **not** generate a picture. Generate **markup + CSS** that imports the shared theme.
- Import `public/brand/kyv-artifact-theme.css`, then use only `kyv-*` helpers and token
  utilities (`bg-primary`, `text-on-surface`, `rounded-lg`, `p-5`, `shadow-elevation-2`…).
- Never define a color in the artifact. If you need one that isn't a token, it doesn't exist.
- Enforce the layout invariants: equal columns per candidate, one primary action per view,
  neutral uniform party chips, verdict meaning on dot+label not fill.
- See §3 for the CSS you scaffold and how.

### Email graphics
- Bake text into email images (no reliable web fonts), use **inline resolved hex** (not CSS
  variables — clients strip them), keep images few and light, give every image real `alt`.
- Buttons are **bulletproof HTML/table buttons** in `#2f6b4f`, never an image.
- Provide a **Mono Cream** logo PNG for dark-mode fallback; content width ≤ ~600px; test
  light and dark. Never depend on `kyv-artifact-theme.css` variables inside an email.

## 3 · Creating CSS for web artifacts (Tailwind v4)

Web artifacts stay consistent because they all pull the **same token file** the app uses.
The app defines tokens in `src/app/globals.css` via Tailwind v4 `@theme`; artifacts pull a
mirror of it, `public/brand/kyv-artifact-theme.css`. **Do not invent a parallel token set** —
extend the shared one.

**Scaffold for a new artifact (build or CDN Tailwind v4):**

```css
/* artifact.css */
@import "tailwindcss";
@import "../public/brand/kyv-artifact-theme.css";   /* KYV tokens + kyv-* helpers */

/* Only artifact-SPECIFIC layout goes here. No colors, no new brand values. */
```

```html
<!-- artifact.html -->
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="artifact.css">
</head>
<body>
  <main class="kyv-container">
    <section class="kyv-card">
      <p class="text-overline text-on-surface-muted">On your ballot</p>
      <h2 class="text-h2">U.S. House · District 10</h2>
      <!-- equal columns; each candidate identical weight -->
      <div class="grid grid-cols-2 gap-5">
        <article><span class="kyv-party-chip">REP</span> …</article>
        <article><span class="kyv-party-chip">DEM</span> …</article>
      </div>
      <span class="kyv-verdict-badge" style="color: var(--color-verdict-mixed)">Mixed</span>
      <button class="kyv-btn-primary">See details</button>
    </section>
  </main>
</body>
```

**Rules when writing artifact CSS:**
- Import the theme; never hardcode a hex. `#2F6B4F` in an artifact = a bug.
- Reach for the helpers first (`.kyv-card`, `.kyv-btn-primary`, `.kyv-chip`,
  `.kyv-party-chip`, `.kyv-verdict-badge`, `.kyv-container`, `.kyv-measure`); use token
  utilities for the rest.
- Party chips: always `.kyv-party-chip` (uniform neutral). Never restyle them per party.
- Verdict color goes on the badge's `color` (drives the dot + text), never the fill.
- One `.kyv-btn-primary` per view; everything else `.kyv-btn-secondary` or quiet.
- If a genuinely new reusable pattern emerges, add it to `kyv-artifact-theme.css` **and** note
  it in `design.md` — so the app and every future artifact inherit it. Don't fork it locally.
- For a static export (e.g. a shareable stat PNG), still build it as themed HTML, then render
  to image — so it matches the live components pixel for pixel.

## 4 · Before / after checklists

**Before generating, confirm:**
- [ ] I found this asset's row in the roadmap (dimensions, format, colorway, priority).
- [ ] I know which colorway applies and which tokens I'll use.
- [ ] I know what my medium renders live, so I know what NOT to bake in.
- [ ] I checked the cohesion ledger (§5) for an existing sibling to match.

**After generating, verify:**
- [ ] Every color/radius/space traces to a `design.md` token (or its resolved hex).
- [ ] **Non-partisan:** no partisan hue, no party coding, no candidate favored.
- [ ] Medium fit: no baked text/buttons on live-text surfaces; minimal baked text elsewhere
      is legible and sourced.
- [ ] Logo: correct colorway, correct mark (wordmark vs monogram), full clearspace, not near
      candidate imagery.
- [ ] Contrast ≥ AA for any text; nothing below 14px a voter must read.
- [ ] Cohesion: sits beside the previous asset as one brand. Calm, warm, not `.gov`, not toy.
- [ ] Logged in the cohesion ledger so the next agent reuses it.

## 5 · Cohesion ledger (append as you go)

Log every produced asset so the next agent extends the set instead of reinventing it. Keep it
append-only.

| Date | Asset | File | Surface | Colorway | Notes / reused-from |
|---|---|---|---|---|---|
| 2026-07-05 | Official wordmark | `public/brand/kyv-logo-official.svg` | all | Official | Canonical wordmark |
| 2026-07-05 | Acronym monogram | `public/brand/kyv-logo-acronym.svg` | all | Official | Compact/square companion |
| 2026-07-05 | Artifact theme CSS | `public/brand/kyv-artifact-theme.css` | web artifacts | all | Token mirror of globals.css |
| 2026-07-05 | Favicon (master) | `public/brand/site/favicon.svg` | Site/Web | Official | Square KYV monogram, vector paths (font-independent), simplified for small sizes |
| 2026-07-05 | Favicon PNGs | `public/brand/site/favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Site/Web | Official | Rasterized from favicon.svg (ImageMagick) |
| 2026-07-05 | Favicon ICO | `public/brand/site/favicon.ico` | Site/Web | Official | 16/32/48 multi-size, from favicon.svg |
| 2026-07-05 | OG / social card | `public/brand/site/og-card.png` | Site/Web | Official on cream | Reuses `kyv-logo-official.svg` wordmark + one standfirst "See who's on your Florida ballot." |
| 2026-07-05 | Hero illustration | `public/brand/site/hero.svg` | Site/Web | Official + accent | Ballot card + receipt lines + check, abstract FL, pin, magnifier; no text |
| 2026-07-05 | Spot: pin | `public/brand/site/spot-pin.svg` | Site/Web | Official + accent | Location pin on abstract map; matches hero motifs |
| 2026-07-05 | Spot: magnifier | `public/brand/site/spot-magnifier.svg` | Site/Web | Official + accent | Magnifier over source lines; reuses hero receipt/check treatment |
| 2026-07-05 | Spot: stack | `public/brand/site/spot-stack.svg` | Site/Web | Official + accent | Equal-weight ballot rows; reuses hero row treatment |
| 2026-07-05 | Empty-state art | `public/brand/site/empty-state.svg` | Site/Web | Muted Official | Empty ballot envelope, calm; no text |
| 2026-07-05 | 404 / error art | `public/brand/site/error-404.svg` | Site/Web | Muted (no red) | Pin wandered off map fragment; friendly, non-alarmist |
| 2026-07-05 | UI icon set | `public/brand/site/icons.svg` | Site/Web | on-surface / primary | 24px grid, 1.5px stroke, currentColor sprite: search, ballot, pin, check, info, share, filter, calendar, home, back |
| 2026-07-05 | FL map texture | `public/brand/site/fl-map-texture.svg` | Site/Web | Mono / muted | Uniform unshaded districts; no party coding |
| 2026-07-05 | Methodology diagram | `public/brand/site/methodology-diagram.svg` | Site/Web | Official + accent | 3-bucket model (stated_position / verifiable_fact / outside_opinion), equal buckets |
| 2026-07-05 | App icon (iOS) | `public/brand/mobile/app-icon-ios.svg`, `app-icon-ios-1024.png` (+ 180/120/87/60) | Mobile | Reversed | Cream K/Y/V monogram on solid KYV Green; reuses the stroke-based monogram geometry from `site/favicon.svg`; generous clearspace, no wordmark/text/gloss |
| 2026-07-05 | Adaptive icon (Android) | `public/brand/mobile/adaptive-icon-fg.svg`+`adaptive-icon-bg.svg` (+ 432/108 PNGs) | Mobile | Reversed | Separate fg (cream monogram, transparent) + bg (solid green) layers; monogram kept inside the 66dp safe circle so it survives circular & squircle masks; same monogram as app-icon |
| 2026-07-05 | Maskable icon | `public/brand/mobile/maskable-icon.svg`, `maskable-icon-512.png` | Mobile | Reversed | Cream monogram centered in the 80% safe circle on full-bleed green; no edge detail; reuses app-icon monogram |
| 2026-07-05 | Splash / launch screen | `public/brand/mobile/splash.svg`, `splash-1242x2688.png`, `splash-828x1792.png` | Mobile | Official on `#F6F3EC` | KYV Green monogram (Official mark on light paper field) centered with a soft ink shadow; lots of calm space; NO text/tagline; matches `favicon.svg` Official build |
| 2026-07-05 | PWA manifest icons | `public/brand/mobile/pwa-icon-192.png`, `pwa-icon-512.png`, `pwa-icon-maskable-192.png`, `pwa-icon-maskable-512.png`, `manifest.icons.json` | Mobile | Reversed | 'any' icons = app-icon monogram; 'maskable' = maskable-icon; JSON snippet lists all four for wiring into the web app manifest |
| 2026-07-05 | Notification / status icon | `public/brand/mobile/notification-icon.svg`, `notification-icon-24.png` | Mobile | Mono Ink | Simplest single-color K/Y/V monogram silhouette at 24px, transparent bg (OS tints); same monogram, no color/detail |
| 2026-07-05 | App Store / Play screenshots | `public/brand/mobile/screenshot-1-ballot.svg`, `screenshot-1-ballot.png`, `screenshot-2-race.svg`, `screenshot-2-race.png` | Mobile | Official | 1290×2796 composited (device frame + neutral KYV UI crop + one baked caption each). Equal-treatment race view: identical columns, uniform neutral party chips, placeholder "Candidate A/B", verdict as dot+label; reuses design.md components + compact green monogram |
| 2026-07-05 | Feature graphic (Play) | `public/brand/mobile/feature-graphic.png` (+ `feature-graphic-base.svg`) | Mobile | Official on cream | 1024×500; official `kyv-logo-official.svg` wordmark composited on cream + one standfirst line, not crammed |
| 2026-07-05 | Embeddable race card | `public/brand/artifacts/embed-race-card.html` | Web Artifacts | Official | Live HTML; imports `kyv-artifact-theme.css`; equal-width `.kyv-card` columns per candidate, uniform neutral `.kyv-party-chip` (Party X / Party Y placeholders), verdict via `.kyv-verdict-badge` dot+label, one `.kyv-btn-primary`; reuses design.md race-view + verdict-badge components |
| 2026-07-05 | "How we verify" explainer | `public/brand/artifacts/how-we-verify.html` | Web Artifacts | Official | Live HTML; 3 equal buckets (stated_position / verifiable_fact / outside_opinion) as a calm flat diagram, placeholder source links, descriptive only (no motive/editorializing); mirrors `site/methodology-diagram.svg` 3-bucket model |
| 2026-07-05 | Verdict badge component | `public/brand/artifacts/verdict-badge.html` | Web Artifacts | Verdict scale | Demo of `.kyv-verdict-badge` across all six verdicts; color drives dot+label only (never fill), neutral `surface-muted` fill constant; includes copy-paste snippet |
| 2026-07-05 | Shareable stat / pull-quote | `public/brand/artifacts/share-stat.html` (PNG not rendered — no browser renderer in workspace) | Web Artifacts | Official (Green+Cream) | Fixed 1200×630 themed card, one neutral placeholder fact + one source line, Green field / Cream type dominate; authored as themed HTML master for later rasterization |
| 2026-07-05 | Interactive ZIP→ballot demo | `public/brand/artifacts/zip-ballot-demo.html` | Web Artifacts | Official | Live ZIP input + one `.kyv-btn-primary` ("See my ballot"); inline vanilla JS validates 5-digit ZIP and reveals an equal-treatment result reusing the race-card pattern (uniform chips, dot+label verdicts); no external libs |
| 2026-07-05 | Email header banner | `public/brand/email/header-banner-base.svg`, `email-header-banner.png` | Email | Official on cream | 1200×300 @2x (displays 600×150). Official `kyv-logo-official.svg` wordmark composited (ImageMagick) on cream #F5EBD8 with ample clearspace; NO CTA/dense text. Reuses og-card/feature-graphic compositing technique. Inline resolved hex. |
| 2026-07-05 | Email footer mark | `public/brand/email/footer-mark.svg`, `footer-mark.png` | Email | Mono Ink | 240×80. Stroke-based K/Y/V monogram (reuses `site/favicon.svg` geometry) in single Ink #22271F + "Know Your Vote / NONPARTISAN · FLORIDA" microline; no social-partisan icons; transparent bg |
| 2026-07-05 | Dark-mode fallback logo | `public/brand/email/logo-dark-mode.svg`, `logo-dark-mode.png` | Email | Mono Cream | Cream #F5EBD8 K/Y/V monogram on transparent, padded (320×320 @2x); NO green (inverts poorly); reuses favicon/footer monogram geometry; for `prefers-color-scheme:dark` swap |
| 2026-07-05 | Reminder hero (deadline) | `public/brand/email/reminder-hero-base.svg`, `reminder-hero.png` | Email | Official + harvest-gold | 1200×600. Calm desk-calendar motif with harvest-gold #E3A72E circled day + green check + baked placeholder date "Register by Oct 5"; NO alarmist countdown red, NO candidate imagery; small wordmark top-left; reuses hero.svg ballot/check treatment |
| 2026-07-05 | Email icon chips | `public/brand/email/icon-chips.svg`, `icon-chip-calendar.png`, `icon-chip-check.png`, `icon-chip-pin.png` | Email | Mono/Official (primary) | 48×48 each. Single-color green #2F6B4F glyphs (calendar/check/pin), heavy stroke + rounded joins, no fine detail so they read small; reuses `site/icons.svg` + hero motif language |
| 2026-07-05 | Reference email template | `public/brand/email/email-template.html` | Email | Official | ≤600px table-based, fully inline-styled transactional email; uses header banner + reminder hero + 3 icon chips + footer mark (all `alt`-texted); BODY is live inline-styled HTML; CTA is a BULLETPROOF HTML/table button in #2f6b4f (NOT an image); comment documents dark-mode fallback logo swap; does NOT reference kyv-artifact-theme.css |
| 2026-07-18 | Community-life icon set | `public/brand/site/community-icons.svg` | Site/Web | on-surface/primary (currentColor) | Sibling to `site/icons.svg`; parks/streets/civic-life motifs |
| 2026-07-19 | AI illustration set (8 candidates, style-matched to user samples) | public/brand/site/ai/higgs-manifest.md | Site/Web + social | Official + marketing accents | Higgsfield Recraft V4.1 vector, palette-locked; pending CDN retrieval; candidates only, do not replace hand-authored SVGs |
| _next…_ | | | | | |

---

**One-line summary for a busy agent:** *Find the asset in the roadmap, build it from
`design.md` tokens, leave out anything the medium renders live, keep it non-partisan and calm,
match the last asset, log it.*
