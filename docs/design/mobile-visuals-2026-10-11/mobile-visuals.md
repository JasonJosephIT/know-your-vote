# Phone art: reconciled build spec (2026-10-11)

The founder asked: "what about having visuals for the mobile site". This is the one plan made from the
two judges' final specs. The before-and-after mockups at 375px are in `mobile-visuals.html`, next to
this file. Open that file from this folder: it loads the real art from `public/brand/site/` by
relative path.

**Status: approved and built (founder, 2026-10-11: decisions 1, 2A, 3A, 4A).** The design.md line is in "Art on phones".

## Today on a 375px phone

- The home page is 6,129px tall. Its first screen shows no art, only the speckled masthead strip.
- The only brand image on the home page is the footer town strip, cropped to about 79px.
- About, news, methodology, race and 404 pages show no art above the footer. Most page art is
  gated to `lg` (64rem) or `sm`.
- The hero walk (8 walkers) is `hidden lg:block`. Below 64rem the page fetches only its 1x1 blank
  `<source>`.

## The plan in one paragraph

Phones get no motion and no person in the first screen. A static 36px sun sits on the key-dates
card. After that, one small static piece sits at each section break the voter scrolls past: a seated
reader on the zigzag, a cat over the coverage card, and a badge on the install card. The town shows
uncropped at the bottom of every page. There is one spot each on the 404, `/methodology` and
`/about`. Home first load adds 17.8KB of new art and 0px above the key-dates card.

## How the two specs were reconciled

Both judges chose Design 2 (section rhythm on edges). They agree on six of the eight placements,
down to the pixel. Where they differed, the call went to neutrality first, then performance, then the
stricter layout rule.

| Point | Judge 1 | Judge 2 | Call | Why |
|---|---|---|---|---|
| Coverage-card figure | Cat, 64px (46.7KB; h2 wraps below 402px, +29px) | Peeking man, 56px (31.6KB; one-line h2 from 375px) | **Cat** | Neutrality outranks performance here. On a phone the man's face would be the largest single face on the home page, and he would be a second person at a different size from the seated reader. design.md asks for equal size and attention. The cat costs 15.1KB more and +29px at 320–401px. The man is option B in decision 3. |
| Install-card badge | 48px, in flow, left of "Get the app" | 40px, absolute, straddling the top border, `rotate-6` | **48px in flow, no tilt** | It never overlaps the block above or the card's own text. No static tilt on new phone pieces. It reads as the familiar app-icon install pattern. Its cost (0 to +20px) applies only when the card renders. |
| Sun classes | `-top-[24px] right-[12px]` | `-top-5 right-3` | **Bracketed px** | The values are the same. Bracketed px so nobody reads this theme's spacing scale as Tailwind's. |
| Footer ratio below sm | `aspect-[1200/509]` | `aspect-[2400/1018]` | **`aspect-[1200/509]`** | It is the same ratio. This one matches the file that is served. |
| design.md phone line | A closed, enumerated list | A general rule with size ranges | **Closed list, plus the general rule's clauses** | A closed list is the stricter rule: any new phone piece needs a design.md change. |
| `/methodology` | Lowest priority | First to drop | **Include, flagged first to drop** | Both judges included it. Decision 4 offers dropping it, or footer-only inner pages. |
| 404 LCP | n/a | The taller lazy footer strip may become the 404's LCP | **Accept, note it** | The 404 is not a landing page, and the strip may already be its LCP today: at 375px it is 29.6k px² against the h1's 24k px². |
| Verify widths | Includes 402 and 1024 | Includes 360 and 390 | **Union of both** | 402 is where the cat's h2 stops wrapping. 1023/1024 is the lg edge. |

## Ground rules for this PR

- **Pair pattern.** Each phone piece is a second `<Art>`/`<LedgeArt>` with `lg:hidden`, placed next to
  the existing `hidden lg:block` desktop piece. Art takes a fixed px height, so one element cannot be
  responsive. The `display:none` twin's lazy image never loads. `ReminderSignupCta` uses the same
  pattern.
- **Loading.** Art's defaults only: `loading="lazy" decoding="async"`, no `fetchPriority`, never
  `eager`. `eager` is reserved for the hero lead, and an eager image under `display:none` still
  downloads. Art picks the `-xs` file automatically at height <= 96 when one exists.
- **Spacing.** This theme's scale is 1=4, 2=8, 3=12, 4=16, 5=24, 6=32, 7=48, 8=64, 9=96px. Utilities
  above 9 fall back to Tailwind's 0.25rem multiplier (`lg:pr-44` = 11rem). Every clearance below is a
  bracketed px value. Do not write `mt-7` (48px here), `-top-5` (-24px here) or `h-8` (64px) expecting
  Tailwind defaults. Never guard a px figure with a rem value.
- **No motion below lg.** No `animate-*`, transitions, hover effects or keyframes, and no static tilt on
  new pieces. `HeroRotator.tsx`, `HeroRotator.module.css`, `hero-walk.ts` and
  `scripts/verify-hero-walk.ts` stay untouched. With no phone motion, `prefers-reduced-motion` needs no
  new branch.
- **No overhang.** No negative left or right offsets on phone pieces. Every piece sits inside the
  content box, so there is no sideways scroll at 320px.
- **Decorative only.** Art already renders `aria-hidden`, `alt=""`, `pointer-events-none`,
  `select-none` and `draggable={false}`, with no tab stops. Nothing new is focusable. All art scrolls
  with the page, so nothing sits in the fixed bottom nav's thumb zone.
- **No new client component. No new image files. No `sm`/`md` gates** except the footer's `sm`.

## Placements

Sizes are width × height in CSS px. Heights are measured at 375px unless stated.

| # | Where | Piece (file, size on disk) | Phone size | Height cost | Loads |
|---|---|---|---|---|---|
| 1 | Home: key-dates card corner | `sticker-sun-xs.webp` (192×192, 17.8KB) | 36×36 | 0px at every width | First screen, right after layout |
| 2 | Home: zigzag after the ballot list | `sit-divider-sm.webp` (395×600, 32.9KB) | 58×88 | +40px | Lazy, y≈3,210 (within the 3G margin) |
| 3 | Home: over the coverage card | `pet-cat-peek-sm.webp` (600×435, 46.7KB) | 88×64 | +29px at 320–401px, 0 from 402px | Lazy, y≈3,830 |
| 4 | Home: install card (only when it renders) | `sticker-kyv-badge-xs.webp` (189×192, 12.7KB) | 47×48 | 0 to +20px, only with the card | Lazy, only with the card |
| 5 | Every public page: footer below sm | `footer-town-strip-sm.webp` (1200×509, 129.8KB, already fetched) | 375×159 (was 79) | +68 to +92px | Lazy, 0 new bytes |
| 6 | 404: above the h1 | `error-404-funk-sm.webp` (472×600, 55.7KB) | 94×120 | +52px at 375×812, 0 at 430×932 | Lazy, in view |
| 7 | `/methodology`: under the header (first to drop) | `method-receipts-sm.webp` (600×519, 63.9KB) | 129×112 | +144px | Lazy, in view (y≈464–576) |
| 8 | `/about`: beside "Get in touch" | `pet-dog-sit-xs.webp` (102×192, 9.4KB) | 30×56 | +27px | Lazy |

### 1) Home first screen: sun on the key-dates card

- File: `src/components/features/DeadlineBanner.tsx`, inside `<aside aria-label="Key dates">`
  (already `relative px-4 py-4`), directly before the existing 56px lg sun.
- Code: `<Art name="sticker-sun" height={36} className="absolute -top-[24px] right-[12px] lg:hidden" />`
- Position at 375px: x 303–339, y 544–580. It rises 24px into the 32px `gap-6` under the lede, ending
  about 8px below the lede box. Its bottom is 12px into the card's 16px top padding, so the first text
  line clears it by about 4–7px. At 430px it sits at x 358–394.
- The first `<p>` gets no phone right padding. The clearance is vertical and in px, so it holds at any
  width, line length or root font size. The existing `lg:pr-[28px]` stays.
- The key-dates card stays at y=568 (375), 495 (430) and 641 (320).
- LCP: 1,296px² against the lede's ~66k px², so the LCP element stays text.
- Rewrite the sun comment ("lg+ only") to describe the phone twin.

### 2) Home: seated reader on the zigzag after the ballot list

- File: `src/app/(public)/page.tsx`, the zigzag wrapper.
- Change `className="relative lg:mt-[72px]"` to
  `className="relative mt-[28px] mb-[12px] lg:mt-[72px] lg:mb-0"`.
- Inside the existing `<div className="absolute inset-x-0 top-1/2">`, next to the 150px piece:
  `<LedgeArt name="sit-divider" height={88} edge="top" className="right-0 lg:hidden" />`
- Ledge 0.618 puts 54px of figure above the band's centre line and 34px below it.
- Clearances: about 12px below the end of the ballot list (the art never goes over the list), and
  about 16px above the House h2. Check both district states: no district ("Add your U.S. House race")
  and a saved district ("Your U.S. House race" / "No U.S. House race on your ballot").
- Rewrite the comment block above it: the phone sitter, the px margins and the reason for them.

### 3) Home: cat over the coverage card

- File: `src/components/features/CoverageSummary.tsx`.
- In the existing `<div className="relative">` around the `<dl>`, next to the lg `peek-card-edge`:
  `<LedgeArt name="pet-cat-peek" height={64} edge="top" className="right-[12px] lg:hidden" />`
- `h2#coverage`: `text-h2 lg:mt-12 lg:pr-44` becomes `text-h2 pr-[108px] lg:mt-12 lg:pr-44`. The px
  guard is the figure's 88px, plus the 12px inset, plus 8px of air.
- Ledge 0.882: the head rises 56px above the card's top border. The paws dip about 8px into row 1's
  12px top padding, clear of "Every Florida voter".
- Below about 402px the h2 balances to "What this / guide covers" (+29px). From 402px it is one line,
  and the cat's top stays at least 8px under the wave.
- Rewrite the component's art comment, including why it is the cat (decision 3).

### 4) Home: install card badge

- Renders only on Android Chrome with `beforeinstallprompt`, or on iOS Safari, when not standalone and
  not dismissed.
- File: `src/components/features/InstallCard.tsx`. Make it the first child of the existing
  `<div className="flex items-start gap-4">`, before the 72px `hidden shrink-0 lg:block` badge:
  `<Art name="sticker-kyv-badge" height={48} className="shrink-0 lg:hidden" />`
- It sits left of "Get the app", like a familiar app-icon install row. The dismiss X (`absolute top-3
  right-3`) is untouched.
- The text column narrows from 277px to 214px at 375px.
- Replace the comment "lg+ only: on phones the card keeps its single column".
- The reminder card's 40px envelope stays exactly as it is, tilt included (it is existing art).

### 5) Every public page: the full town in the footer below sm

- File: `src/components/nav/SiteFooter.tsx`.
- Strip wrapper: `aspect-[2400/504]` becomes
  `aspect-[1200/509] max-h-[184px] sm:aspect-[2400/504] sm:max-h-none`. All other wrapper classes stay.
- Wrap the `<img>` in `<picture className="block h-full w-full">`. Its first child is
  `<source media="(width < 40rem)" srcSet="/brand/site/illustrations/footer-town-strip-sm.webp" width={1200} height={509} />`.
  The existing `<img>` stays exactly as it is: `src`, `srcSet` (1200w/2400w), `sizes`, `alt=""`,
  `width={1200}`, `height={509}`, `loading="lazy"`, `decoding="async"`,
  `className="h-full w-full object-cover object-bottom"`.
- Sizes: 320×136 (+69px), 375×159 (+80px), 390×165, 430×182 (+92px). It is capped at 184px from about
  434px to 639px, which crops only sky because of `object-bottom`. From sm up, the crop is today's
  exactly.
- Bytes: 0 new, since the file is already fetched. Phones always get the 129.8KB `-sm` file. That
  should close the WebKit case where 402–440px @3x iPhones pick the 445.8KB 2400w file (about 316KB
  saved per view). Confirm in Safari Web Inspector before claiming it. The range syntax needs Safari
  16.4+. On older iOS the `<source>` is skipped and the `<img>` behaves as it does today, so nothing
  regresses.
- Rewrite the crop comment: the crop exists for wide screens, and at phone width the uncropped strip
  cuts no heads. Drop "one of the three pieces allowed on a phone".

### 6) 404

- File: `src/app/not-found.tsx`, as `main`'s first child, before the 220px `hidden lg:block` piece:
  `<Art name="error-404-funk" height={120} className="lg:hidden" />`
- It sits on its own row above the h1, left-aligned by `items-start`, with `gap-4` (16px) below. The h1
  stays the largest text element.
- Height: with the full footer, +52px at 375×812 (812 to 864); 0 at 430×932. "See the races we cover"
  stays in the first screen.
- Replace the comment "rule 4 has no 404 exception".

### 7) `/methodology` (lowest priority; drop first if the budget tightens)

- File: `src/app/(public)/methodology/page.tsx`, between `</header>` and the first `<section>`, next to
  the existing 220px piece: `<Art name="method-receipts" height={112} className="self-center lg:hidden" />`
- It sits on its own row, under no text, above every numbered or sourced section.
- +144px on a 24,389px page. 14k px² against a 327×328 header, so text stays the LCP.

### 8) `/about`

- File: `src/app/(public)/about/page.tsx`, the "Get in touch" section.
- Replace `<h2 className="text-h2">Get in touch</h2>` with
  `<div className="flex items-end gap-3"><h2 className="text-h2">Get in touch</h2><Art name="pet-dog-sit" height={56} className="shrink-0 lg:hidden" /></div>`.
  Keep the 1400px+ gutter dog.
- It sits beside the heading only, never beside the paragraph or the mailto link. +27px.

## Docs and comments (same PR)

- `docs/design.md` "Site illustration layer": add the approved phone line (decision 1).
- Rewrite the comments that encode the old phone rule ("below lg only the dividers, the footer strip
  and the reminder envelope"):
  - `src/components/brand/Art.tsx` header ("Below lg most art must be hidden")
  - `src/components/brand/SectionDivider.tsx` line 4 ("One of the three pieces of art that also shows
    on phones")
  - `src/components/nav/SiteFooter.tsx` (the crop and "one of the three pieces" comment)
  - `src/components/features/ReminderSignupCta.tsx` ("the one piece of art that also shows on phones")
  - `src/app/not-found.tsx` ("rule 4 has no 404 exception")
  - `src/app/globals.css` body-texture note (lines 165–172). The speckle texture stays off phones;
    only the list of phone allowances changes.
  - The `InstallCard`, `CoverageSummary`, `DeadlineBanner` and `page.tsx` zigzag comments.
- `docs/design/brand-assets-2026-10-11/placement-map.md`: replace "6,770px" with 6,129px (measured
  2026-10-11), and add the phone slots.

## Budget (KB = KiB, measured from the files)

| Page | New art bytes | Height change |
|---|---|---|
| Home, first load (4G lazy margin ~1,250px) | 17.8KB (sun), plus ~6KB of existing textures and masks | 0px above the key-dates card |
| Home, first load on 3G or slower (2,500px margin) | 50.7KB (sun + sitter) | |
| Home, full scroll | 97.4KB (sun 17.8 + sitter 32.9 + cat 46.7) | +149px at 375 (zigzag 40 + h2 wrap 29 + footer 80), +132px at 430 |
| Home, full scroll with the install card | 110.1KB max | up to +20px more |
| 404 | 55.7KB | +52px at 375×812 |
| `/methodology` | 63.9KB | +144px, plus the footer |
| `/about` | 9.4KB | +27px, plus the footer |
| News, race, candidates, candidate, measure, privacy, terms | 0KB | Footer only: +80px (375), +92px (430) |

- All art on home, with the existing strip (129.8KB), envelope (10.7KB, when reminders are live) and
  masthead (~6KB), comes to about 256KB at most. The desktop hero walk alone is 252KB.
- The footer adds 0 new bytes, and it may save about 316KB per view on 402–440px @3x iPhones (to
  confirm in Safari).
- CLS: 0. Art reserves width and height, and the footer box is sized by aspect ratio.
- LCP stays text on every page, except possibly the 404 (see the reconciliation table).

## Motion

None below lg. Every phone piece is a still image with no animation, transition, hover or tilt. The
hero walk and its 1x1 blank `<source>` below 64rem do not change. Reduced-motion users see exactly
what everyone else sees on a phone.

## Do not

- Put the hero walk, HeroRotator, any walker or any rotator frame on phones. Do not change its lg gate
  or its 1x1 blank `<source>`.
- Put a person in the phone first screen (unless the founder picks 2B), or add a second sun (no
  masthead sticker).
- Put art above the key-dates card (H1, lede, masthead), or anywhere that moves it off y=568 at 375px.
- Put art in, over or beside the ballot list (y 1106–3196), the at-a-glance tiles, the news rail,
  NewsFeed or its empty states (filtered or unfiltered), the `/news` header, race, candidates,
  candidate or measure pages, or anything beside a candidate, verdict or comparison.
- Use `band-coast` or `band-horizon` on phones (they would become the LCP element), or
  `about-neighbors` below lg (167.7KB, loads with the page).
- Use `hang-masthead` or `lean-card-side` on phones.
- Use `eager` or `fetchPriority` on any phone piece.
- Add motion, static tilt, a new client component or new image files.
- Use `sm`/`md` gates (except the footer's `sm`), rem clearances, or negative left/right offsets on
  phone pieces.
- Put any first-screen art larger in area than the lede or the H1.
- Change the footer crop at sm and up.
- Touch the reminder envelope.

## Verify

- Widths 320, 360, 375, 390, 402, 430, 768, 1023, 1024 and 1280:
  `document.documentElement.scrollWidth === innerWidth` at each.
- Key-dates card top: 568 at 375×812, 495 at 430×932, 641 at 320. These must not change.
- `getBoundingClientRect` clearances:
  - sun vs the lede and the card's first line
  - sitter vs the end of the list and the House h2, with no district and with a saved district
  - cat vs the wave and the h2 (at least 8px), at 375 and at 402+
- Force the InstallCard with `window.dispatchEvent(new Event('beforeinstallprompt'))`, and check the
  badge with the reminder card on and off.
- Network panel: at 375px none of the lg twins load; at 1280px none of the phone twins load, and
  neither does the 1x1 hero source.
- Lighthouse mobile: the LCP element is still text on home, about, news and methodology.
- axe reflow at 320px, 200% text zoom and a 20px root font. 400% zoom.
- Safari Web Inspector on a 430px @3x iPhone: the footer's `currentSrc` is the `-sm` file.
- `npm run verify-all`, lint and `tsc`. `scripts/verify-hero-walk.ts` stays green. No verify script
  asserts art classes (checked with grep).

## Follow-ups (not this PR)

- Derive 192px `-xs` files for `sit-divider`, `pet-cat-peek` and `error-404-funk` (a resize of
  existing masters, plus `xs/<name>` in `art-sizes.json`). That saves about 45–60KB.
- A ~750w phone file for the footer strip.
- If the founder wants people above the fold later: eight ~8KB `-xs` walker crops for a static,
  equal-size procession row (decision 2C).
- A ~750w resize of `about-neighbors` (about 60–70KB) if a wide `/about` piece is wanted on phones.

## Founder decisions

1. **Write the phone rule into design.md (this gates the build).** Today the rule ("below lg only the
   dividers, the footer strip and the reminder envelope") lives only in code comments and commit
   9cdf49c. Without a line in design.md, a later reviewer will take the phone art out again.
   **Recommended: approve this line** for "Site illustration layer":
   > Below lg, art is a closed list: the key-dates sun (36px), one seated reader on the zigzag after
   > the ballot list (88px), the cat over the coverage card (64px), the install-card badge (48px), the
   > reminder envelope (40px), the section dividers, the footer town strip shown uncropped below sm
   > (max 184px), and one spot each on the 404 (120px), /methodology (112px) and /about (a 56px dog
   > beside "Get in touch"). Each is static, lazy and fixed in px, sits on an edge or its own row, and
   > never sits under text. None go in lists, news, or race, candidate or measure pages. No motion
   > below lg. Anything else on a phone needs a change to this line.
2. **What goes in the phone's first screen.**
   - **(A) Recommended:** the 36px sun on the key-dates card only. No person above the fold, 0px
     added, 17.8KB, the deadline stays put, and it is the slot desktop already uses.
   - (B) One random walker beside "Florida" (Design 1). That adds +44px and pushes the deadline card
     down on the 390–440px iPhones most voters carry. It needs a headline restyle, and it puts a lone
     figure next to the word "candidates", where it can read as a candidate.
   - (C) Later: a static, equal-size row of all eight walkers from new ~8KB `-xs` crops (~45KB, ~+60px,
     pushes the deadline down, needs new files).
3. **The figure over the coverage card.**
   - **(A) Recommended: the cat**, 64px, 46.7KB. No lone person on the phone home page; the h2 wraps
     below 402px (+29px).
   - (B) The peeking man at 56px, 31.6KB: the piece desktop already uses, with a one-line h2 from
     375px. But he becomes the largest single face on the phone home page, at a different size from
     the seated reader.
4. **Inner pages on phones.**
   - **(A) Recommended:** the 404 spot (55.7KB), the `/about` dog beside "Get in touch" (9.4KB) and the
     `/methodology` receipts (63.9KB). Methodology is the first to drop.
   - (A−) The same without `/methodology`.
   - (B) The footer strip only on inner pages.
   - In every option: no `about-neighbors` on phones (167.7KB, loads with the page), and no art in
     news empty states. design.md bans art in news slots, and a filtered empty state must not read
     as a finding.
