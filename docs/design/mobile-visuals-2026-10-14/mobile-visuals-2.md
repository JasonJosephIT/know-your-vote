# Phone visuals, round 2: reconciled build spec (2026-10-14)

The founder asked: "Can I have more visuals in the mobile site". This is the single plan made from
the two judges' final specs (both picked Design 3, "best judgement", with grafts from Designs 1 and
2). Base: `origin/main` 66793f1. The before-and-after mockups at 375px, the inner-page frames, the
placements table and the decision form are in `mobile-visuals-2.html`, next to this file. Open it
from this folder: it loads the real art from `public/brand/site/` by relative path.

**Status: decided 2026-10-14: 1A, 2A, 3A, 4A, 5A, 6B (all as recommended). Being built as PRs 1–4.** The six founder decisions are at the end. PR 1 and PR 2 must
merge by **Fri Oct 16**: the freeze hashes are written Sat Oct 17, and the freeze runs from
Oct 18 04:00 UTC to Nov 4 05:00 UTC.

Round 1 (`docs/design/mobile-visuals-2026-10-11/`) explains what was turned down then and why. This
round keeps its rules: no person in the first screen, nothing moves below lg, and no art in or
beside a list, news, verdict, or race, candidate or measure page.

## The plan in one paragraph

Phones get more pictures without adding any to the first screen, to the lists, or to the frozen
candidate pages. Five things change:
- a magnifier beside "On this page";
- line icons on the voter's own tasks (the sample-ballot tiles, the key-dates actions and the four
  /privacy headings);
- a wave at the seam between the statewide races and the ballot questions;
- one still row of all eight hero walkers, the same height and evenly spaced, standing on the wave
  after the coverage card and reused once on /about;
- the 404's spot on the error page.

Three resized files pay for all of it. The phone home page's art goes from **227.2KB to about
107KB**, and every other page gets about 95KB lighter. Nothing moves, nothing new goes in the first
screen except a 14px inline calendar icon, and the home page grows 68px (5,530 → about 5,598px at
375).

## How the two judges were reconciled

The judges agree on most of the plan. Where they differed, the call went to neutrality first, then
the evidence, then risk.

| Point | Judge 1 | Judge 2 | Call | Why |
|---|---|---|---|---|
| Walker-row file | 3x, ~696×144, ~35KB | 2x, ~466×96, ~21KB | **2x** (3x is the fallback) | Evidence: the 2x test file is 19.5KB and the 3x one 32.7KB (`scratchpad/judge/row-96.webp`, `row-144.webp`). Each face is about 6px tall at 48px, so 3x adds no detail anyone can see. Lower bytes is the lower risk. If it looks soft in Safari on a 3x iPhone, ship the 3x file (+14KB). |
| Placing the walker row | `LedgeArt` plus a new `ledges.json` entry | `Art` with `absolute bottom-[6px] right-0` | **`Art`, absolute** | Measured today: all eight walker files have their soles on the last pixel row (0px of transparent padding below the feet). The composite's bottom edge is therefore the sole line, and no ledge entry is needed. |
| "On this page" magnifier | Drop `hidden lg:block` from the existing piece | Add an `lg:hidden` twin | **Drop the gate** | It is the same file at the same 30px at every width, so one element does the job. The pair pattern exists for pieces with two sizes. |
| /methodology magnifier | 40px in a flex row, about +11px | 30px in a flex row, 0px | **30px** | The same size as "On this page" and no added height. Both judges agree it must be in the flow: an absolutely placed sticker overflows the column at 320px with a 20px root font. |
| /privacy | A 40px envelope beside one heading (+29px, 10.7KB) | Line icons on all four headings (0px, 0KB) | **Four icons** | Neutrality: every heading gets the same mark, so no one section gets more weight than the others. Risk: 0KB and 0px at 375. |
| Error page | Import `Art` (with a 120px and a 220px twin) | A plain `<img>`, phone only | **One plain `<img>`, 120px, 220px from lg** | `error.tsx` is `"use client"`, and importing `Art` would pull `art-sizes.json` into client JS. One img sized by class matches the 404 at both widths. |
| Sample-ballot legend (no district) | Dropped | A decision, recommended yes | **Decision 6, recommended no** | Neutrality is equal (it shows only the tasks every county row has). The evidence is split. Risk decides: +54px on a page recent passes worked to shorten, four new labels to approve, and icon-and-label pairs right above five disclosure rows read as tappable. |
| PR split | Two PRs | Four PRs | **Four** | The file swap that must land before the freeze isn't held up by the decisions on new pictures. |
| Ballot icon | "Blank ovals and lines" | Same | **A sheet with three ruled lines, no ovals** | My finding: at 20px a 1.75 stroke closes any oval narrower than about 3.5px into a solid dot. That reads as a filled-in ballot oval, the thing the glyph rule forbids. |
| Skin-6 method | Re-tone with `generate.py skinmask` | Swap the exact skin-5 pixels | **Swap first, regenerate if the eyes fade** | My finding: the fisherman's eyes are drawn in ink (#22271F). Ink on skin-5 is 2.1:1 today; on skin-6 it would be 1.25:1. The swap is cheap, but his eyes may disappear at hero size, so decision 4 carries that check. |
| Home budget | ~121.5KB (3x row) | ~107KB (2x row) | **~107KB** | It follows from the 2x row. |

Corrections both judges already made, confirmed again today:
- `SharedBallot.tsx` already reads races and measures (`Promise.all`, lines 66-69), so the seam wave
  needs no new data read.
- The key-dates card's top is at y 381 at 375 today. Round 1's 568 is out of date.
- `methodology/page.tsx` already imports `Art` (line 11).
- No verify script pins the classes or strings this plan edits. I grepped `scripts/` for the
  magnifier, the footer srcset, the tile markup, the key-date link classes and the privacy headings.
  The only rule this touches is `verify-motion`'s check that "Motion on phones" comes right after
  "Art on phones" in design.md, so the new line replaces the old paragraph in place.

## Ground rules (carried over from round 1)

- **Spacing scale.** This theme's scale is 1=4, 2=8, 3=12, 4=16, 5=24, 6=32, 7=48, 8=64, 9=96px.
  Write px in brackets (`size-[20px]`, `mt-[24px]`, `bottom-[6px]`). `size-5` is 24px here, not 20px.
- **Loading.** Art's defaults only: lazy, decoding async, no `fetchPriority`, never `eager`. Art picks
  the `-xs` file by itself at a height of 96px or less once `xs/<name>` is in `art-sizes.json`.
- **No motion.** No `animate-*`, transitions, hover effects or tilt on anything new.
  `HeroRotator`, its CSS, `hero-walk.ts` and `verify-hero-walk.ts` stay as they are.
- **No overhang.** No negative side offsets, so nothing scrolls sideways at 280-430px.
- **Decorative only.** `aria-hidden`, `alt=""`, `pointer-events-none`, `select-none`, no tab stop.
  Every icon sits beside words that already say the same thing.
- **No new client component.** Everything new is a server component, except the one img added to
  the existing client `error.tsx`.

## Placements

Sizes are width × height in CSS px at 375 unless stated. KB is on disk (1KB = 1KiB). "Est" sizes are
conservative. My test resizes today came in under them (see "New assets").

| # | Page | Where and how | File (frozen?) | Size | KB | Height | PR |
|---|---|---|---|---|---|---|---|
| 1 | Every page | Footer town strip below sm: the `<source media="(width < 40rem)">` points at the new 750w file, `width={750} height={318}`. Box, ratio and `max-h-[184px]` unchanged | `src/components/nav/SiteFooter.tsx` (no) | 375×159 | ~35, was 129.8 | 0 | 1 |
| 2 | Home | Seated reader on the zigzag: same placement and size; Art picks the new `-xs` file | `art-sizes.json` (no) | 58×88 | ~10.6, was 32.9 | 0 | 1 |
| 3 | Home | Cat over the coverage card: same; new `-xs` file | `art-sizes.json` (no) | 88×64 | ~12.7, was 46.7 | 0 | 1 |
| 4 | Home (all widths) | Wave between `#statewide-races` and `<BallotQuestions />`, only when both lists render | `src/components/features/SharedBallot.tsx` (**FROZEN**) | 327×12 | 0 (mask already fetched) | +44 | 2 |
| 5 | /methodology | 30px magnifier after the "No source, no quote" h2, in a flex row, `lg:hidden` | `src/app/(public)/methodology/page.tsx` (**FROZEN**) | 33×30 | 10.4, or 0 when cached | 0 (about 1) | 2 |
| 6 | Home | The existing magnifier beside "On this page" loses `hidden lg:block`, so it shows at every width | `src/components/features/BallotAtAGlance.tsx` (no) | 33×30 at x 119-151, y 1136-1166 | +10.4 on phones | 0 | 3 |
| 7 | Home | One 20px line icon per sample-ballot tile, keyed by `tile.key`: Ballot, Pin, Calendar, Mail. The same four in every county row and the state row | `VotingResources.tsx` + `src/components/ui/Glyphs.tsx` (no) | 20×20 | 0 requests, ~1.5KB of HTML | 0 to +21 per tile note that wraps | 3 |
| 8 | Home, first screen | A 1em Calendar icon before "Add these dates to your calendar (downloads a file)", and a Bell icon before "Get deadline reminders by email" when that link renders. The five stops stay plain | `DeadlineBanner.tsx` (no) | 14×14 | 0 | 0 | 3 |
| 9 | /privacy | A 20px icon in each of the four h2s: Phone, Pin, Mail, Chart | `src/app/(public)/privacy/page.tsx` (no) | 20×20 | 0 | 0 at 320/375/390/430, +29 at 360 | 3 |
| 10 | Error page | The 404's spot above the h1, as one plain `<img>`: 120px, 220px from lg | `src/app/error.tsx` (no) | 94×120 | 55.7, 0 if the 404 was seen | about +136, re-centred | 3 |
| 11 | Home | The eight-walker row standing on the wave after the coverage card, right-aligned, `lg:hidden` | `src/app/(public)/page.tsx` (no) | ~231×48 at x 120-351, y ~4984-5032 | ~21 | +24 | 4 |
| 12 | /about | The same row on its own row after "What this is", `lg:hidden` | `src/app/(public)/about/page.tsx` (no) | ~231×48 | 0 when cached, ~21 cold | +72 | 4 |
| (13) | Home, no district | Only if decision 6 is A: a four-item legend under the sample-ballot h2 | `VotingResources.tsx` (no) | 327×46 | 0 | +54 | 3 |

Home positions at 375 after all four PRs (no district, no install card, no reminder card):
- h1 135, key-dates card 381-739: unchanged.
- "Sample ballot and how to vote" 751, "On this page" 1148, statewide races 1292-2182: unchanged.
- Seam wave 2214-2226, then ballot questions 2258 (was 2214).
- Sitter 2996, House 3100, news 3537, coverage 4329.
- Walker row ~4984-5032, standing on the wave at 5026.
- Footer strip ~5130. The page is about 5,598px tall.

The first screen (y 45-739) is unchanged except for the inline calendar icon.

### PR 1: lighter files (not frozen; merge by Fri Oct 16)

No visible change. `SiteFooter` is not in `FROZEN_FILES`, but it renders on every frozen page, so
the swap lands before the freeze.

```tsx
// SiteFooter.tsx: the phone <source> only; the <img> and its srcSet stay as they are
<source
  media="(width < 40rem)"
  srcSet="/brand/site/illustrations/footer-town-strip-750.webp"
  width={750}
  height={318}
/>
```

```jsonc
// art-sizes.json
"xs/sit-divider": [174, 264],
"xs/pet-cat-peek": [265, 192],
```

- Update the `Art.tsx` header comment: an `-xs` file is 2-3x its phone height (192px tall for
  stickers, 264px for the sitter). The sitter's ledge (0.618) and the cat's (0.882) are fractions,
  so an exact proportional resize keeps them.
- Update the SiteFooter comment: phones get the 750w file. It is a single file, not a srcset with a
  `sizes` attribute, because with `sizes` WebKit picked the 2400w file on 402px+ @3x iPhones.

### PR 2: frozen files (merge by Fri Oct 16, or drop until after Nov 4)

Ship it as its own small PR. If it misses Friday, drop it: never edit these files inside the freeze.

```tsx
// SharedBallot.tsx, between the statewide </section> and <BallotQuestions />
import { SectionDivider } from "@/components/brand/SectionDivider";
...
{/* Where the candidates end: a ballot question is a distinct kind of
    thing (the note below). Only when both lists render. */}
{races.length > 0 && measures.length > 0 && <SectionDivider variant="wave" />}
<BallotQuestions />
```

- It shows at every width, desktop included.
- `SectionDivider` is a server component, so `verify-shared-ballot`'s no-client-JS rule holds.

```tsx
// methodology/page.tsx, the "No source, no quote" section
<section className="flex flex-col gap-2">
  <div className="flex items-end gap-2">
    <h2 className="text-h2">No source, no quote</h2>
    <Art name="sticker-magnifier" height={30} className="shrink-0 lg:hidden" />
  </div>
  <p className="text-body">Every quote links to the page it came from, …</p>
</section>
```

- The heading text ends at x 240 at 375, so the sticker sits at x 248-281 on the same line.
- With larger text the h2 wraps beside the sticker instead of overflowing.
- No other change to /methodology. Its other prose seams sit next to blocks where art is forbidden.

This PR also carries the new design.md line (below), once decision 2 approves it. If PR 2 is
dropped, PR 3 carries the line.

### PR 3: icons, magnifier, error spot, docs (not frozen; aim for Oct 16, may slip)

**Glyphs** (`src/components/ui/Glyphs.tsx`). Seven new glyphs on the shared `svg` props (20-unit
grid, 1.75 stroke, currentColor, `aria-hidden`), each taking an optional `className` that replaces
the default `inline-block size-[1em] shrink-0`. These are the shapes in the HTML mockup, as a starting
point; check them at 20px and at 14px.

```tsx
export function BallotGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="4.5" y="2.75" width="11" height="14.5" rx="1.5" />
      <path d="M7.5 7h5M7.5 10h5M7.5 13h3" strokeLinecap="round" />
    </svg>
  );
}
// PinGlyph:      <path d="M10 17.25s-5.25-4.75-5.25-8.75a5.25 5.25 0 0 1 10.5 0c0 4-5.25 8.75-5.25 8.75z"/> <circle cx="10" cy="8.5" r="1.75"/>
// CalendarGlyph: <rect x="3.5" y="4.5" width="13" height="12" rx="2"/> <path d="M3.5 8.5h13M7 2.75v3.5M13 2.75v3.5"/>
// MailGlyph:     <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="1.75"/> <path d="M3.5 6l6.5 5 6.5-5"/>
// BellGlyph:     <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.25 1.75H4.25z"/> <path d="M8.5 17.25a1.6 1.6 0 0 0 3 0"/>
// PhoneGlyph:    <rect x="5.75" y="2.75" width="8.5" height="14.5" rx="1.75"/> <path d="M9 14.25h2"/>
// ChartGlyph:    <path d="M3.5 3.5v13h13"/> <path d="M7.5 13.5v-3M11 13.5V7M14.5 13.5V9"/>
```

None of them has a tick, a filled shape or an oval. The ballot is a ruled sheet, and the calendar is
a plain grid.

**Sample-ballot tiles** (`VotingResources.tsx`, `TaskTiles`):

```tsx
const TILE_GLYPH = {
  "sample-ballot": BallotGlyph,
  "polling-place": PinGlyph,
  "early-voting": CalendarGlyph,
  mail: MailGlyph,
} as const;
...
{tiles.map((t) => {
  const Glyph = TILE_GLYPH[t.key];
  return (
    <li key={t.key}>
      <a /* classes unchanged */>
        <span className="flex items-start gap-3">
          <Glyph className="block size-[20px] shrink-0" />
          <span className="flex flex-col gap-0.5">{/* label and note, unchanged */}</span>
        </span>
        <ExternalGlyph />
        <span className="sr-only">, {who} (opens in a new tab)</span>
      </a>
    </li>
  );
})}
```

- The icon is the tile's currentColor (`text-primary-hover` on `primary-muted`).
- The link's name still starts with the visible label (WCAG 2.5.3).
- The text column loses 32px, so a note that wrapped once may wrap twice:
  - with a district saved: +21px at 375 (Miami-Dade's "Asks for your name and date of birth"), 0 at 430;
  - per opened county row with no district: +18px (+39 for the state row) at 375, +78 at 320.

**Key-dates actions** (`DeadlineBanner.tsx`):
- The shared `link` class becomes
  `"inline-flex min-h-[24px] w-fit items-start gap-[6px] text-body-sm underline underline-offset-2"`.
- `<CalendarGlyph className="mt-[0.25em] block size-[1em] shrink-0" />` goes before the calendar
  link's text, and `<BellGlyph … />` before the reminders link's text.
- The calendar link already wraps to two lines at 375, so the height cost is 0. The five stops stay
  plain, keeping the 10-11 call "nothing on the stops".

**"On this page"** (`BallotAtAGlance.tsx`):
- Remove `hidden lg:block` from the existing `<Art name="sticker-magnifier" height={30} … />`.
- Its classes become `absolute bottom-0 left-[calc(100%+8px)]`.
- It sits 20px clear of the registration link above and 8px above the chips and their focus rings.
- Update the comment.

**/privacy:** each of the four h2s becomes:

```tsx
<h2 className="flex items-start gap-2 text-h2">
  <PhoneGlyph className="mt-[4px] block size-[20px] shrink-0 text-primary" />
  What stays on your device
</h2>
```

The four headings and their icons:
- Phone: "What stays on your device"
- Pin: "When you type an address"
- Mail: "The one thing we ever store"
- Chart: "Analytics, advertising, and errors"

The heading's accessible name is unchanged, because the svg is `aria-hidden`.

**Error page** (`src/app/error.tsx`, first child of `main`, above the h1):

```tsx
<span aria-hidden="true" className="pointer-events-none select-none">
  {/* eslint-disable-next-line @next/next/no-img-element -- a pre-sized WebP;
      Art would pull art-sizes.json into this client chunk */}
  <img
    src="/brand/site/illustrations/error-404-funk-sm.webp"
    alt="" width={472} height={600}
    loading="lazy" decoding="async" draggable={false}
    className="block h-[120px] w-auto max-w-none lg:h-[220px]"
  />
</span>
```

**Legend** (only if decision 6 is A, no-district branch, under the h2 and before the intro):
- A `<ul className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-3 gap-y-2">` of
  icon-plus-label items. Each icon is 20px in `text-primary`, and each label is `text-body-sm
  text-on-surface-muted`.
- The labels are Sample ballot, Where to vote, Early voting and Voting by mail.
- It shows only the keys every county row has, in tile order. It has no fill, border or underline.

**Docs** in the same PR:
- Replace design.md's "Art on phones" paragraph in place with the line below.
- Update the phone-slots table in `docs/design/brand-assets-2026-10-11/placement-map.md`.
- Update the comments in `Art.tsx`, `BallotAtAGlance.tsx` and `page.tsx`.

### PR 4: the walker row (not frozen; after decisions 3 and 4; target about Oct 20)

1. **Re-tone the fisherman (decision 4A).** Edit the full master, `walker-fisherman.webp`
   (775×1200):
   - Flood-fill from seed points on his face, ears, neck, forearms and hands, within ±8 per channel
     of skin-5 `#7E4A2C`. Fill each region with skin-6 `#4F2E1D`.
   - Re-encode at q80, method 6.
   - Derive `walker-fisherman-sm.webp` from it (half size, q78, method 6), and re-run
     `scripts/brand-assets/rotator.py` for `rotator/walker-fisherman.webp`.
   - Diff before and after: only skin pixels may change. The flood fill must not reach his jacket,
     boots or tackle box.
   - **Check his eyes** at hero size (about 240px tall) and at 48px. They are ink on skin: 2.1:1
     against skin-5 today, 1.25:1 against skin-6.
   - If they fade, don't hand-paint them. Regenerate him in the same pose through the pipeline
     (`generate.py` → `skinmask` → `post`, with skin-6 forced for this slug), then run `rotator.py`.
   - Re-run `verify-hero-walk`, and note the change in `assets.json`.
   - The share card (`og-card-walkers.png`: phone reader, teacher, chef and prosthetic) and the email
     hero (lineworker and student) don't use him, so neither changes.
2. **Compose the row.** Add `row()` to `scripts/brand-assets/compose.py`, importing `WALKERS` from
   `rotator.py`, which mirrors `hero-walk.ts`:

   ```python
   def row(height, gap, out):
       figs = []
       for slug in WALKERS:  # hero order; soles are on each file's last row (measured 2026-10-14)
           im = Image.open(ILL / f"{slug}.webp").convert("RGBA")
           im = im.crop(im.getbbox())
           figs.append(im.resize((round(im.width * height / im.height), height), Image.Resampling.LANCZOS))
       canvas = Image.new("RGBA", (sum(f.width for f in figs) + gap * (len(figs) - 1), height), (0, 0, 0, 0))
       x = 0
       for f in figs:
           canvas.alpha_composite(f, (x, 0))
           x += f.width + gap
       canvas.save(out, "WEBP", quality=78, method=6)
       return canvas.size
   ```

   - Write `walker-row-xs.webp` at `row(96, 4, …)`: about 462×96, about 21KB.
   - Write `walker-row-sm.webp` at `row(300, 12, …)`. It exists only so the ArtName key resolves
     and is never fetched at 48px.
   - Add `"walker-row": [w, 300]` and `"xs/walker-row": [w, 96]` to `art-sizes.json`, with the
     printed sizes.
   - The order is fixed, as on the share card. The figures are all on screen at once, so rotating
     the lead per view adds nothing.
3. **Home** (`page.tsx`). The `<SectionDivider variant="wave" />` after `<CoverageSummary />` becomes:

   ```tsx
   {/* The eight hero walkers, still and equal height, on the wave (design.md
       "Art on phones"). Their soles are the file's bottom edge, so bottom-[6px]
       stands them on the band's centre line; 24px above the band keeps their
       heads ~14px clear of the coverage card. Never on a screen with a
       candidate list. */}
   <div className="relative mt-[24px] lg:mt-0">
     <SectionDivider variant="wave" />
     <Art name="walker-row" height={48} className="absolute bottom-[6px] right-0 lg:hidden" />
   </div>
   ```

   - Right-aligned, so it stays clear of the reminder envelope (`left-0`) when reminders are live.
     At 320 the two overlap 9px horizontally, with about 14px of vertical clearance.
4. **/about.** Place `<Art name="walker-row" height={48} className="lg:hidden" />` right after the
   "What this is" section, before the `hidden lg:block` about-neighbors piece. It costs +72px (48 +
   the column's 24px gap) and is cached from home.

## New assets

My test resizes today, from the shipped q80 masters with `cwebp -q 78 -m 6`, all came in under
the budget figures. The budget keeps the more conservative numbers.

| File | Size | Made from | Test | Budget |
|---|---|---|---|---|
| `footer-town-strip-750.webp` | 750×318 | `footer-town-strip.webp` (2400×1018), exact ratio | 31.2KB | ~35KB (900w fallback ~47KB if soft) |
| `sit-divider-xs.webp` | 174×264 | `sit-divider.webp` | 7.7KB | ~10.6KB |
| `pet-cat-peek-xs.webp` | 265×192 | `pet-cat-peek.webp` | 9.9KB | ~12.7KB |
| `walker-row-xs.webp` | ~462×96 | `row()` above | 19.5KB | ~21KB (3x fallback ~35KB) |
| `walker-row-sm.webp` | ~1,440×300 | `row()` above | — | never fetched on phones |
| `walker-fisherman.webp`, `-sm`, `rotator/walker-fisherman.webp` | unchanged | re-tone (PR 4, step 1) | — | ±1KB |

Commands for the three resizes:

```sh
cd public/brand/site/illustrations
cwebp -q 78 -m 6 -resize 750 318 footer-town-strip.webp -o footer-town-strip-750.webp
cwebp -q 78 -m 6 -resize 174 264 sit-divider.webp      -o sit-divider-xs.webp
cwebp -q 78 -m 6 -resize 265 192 pet-cat-peek.webp     -o pet-cat-peek-xs.webp
```

- **Tooling:** `cwebp` is at `/usr/local/bin`. The row and the re-tone need Pillow. The user-site
  Pillow under `/usr/local/bin/python3` fails to import `_imaging` (an architecture mismatch), so
  run them the way `rotator.py`'s header says:
  `uv run --python 3.12 --with pillow python scripts/brand-assets/compose.py`.
- `/tmp/kyv-raw` (the pipeline's raw files and skin masks) is gone, so regenerating the fisherman
  means a new image generation.

## The proposed design.md line

Replace the "Art on phones" paragraph in place, as one paragraph, so "Motion on phones" still
follows it (`verify-motion`):

> **Art on phones (founder, 2026-10-11; extended 2026-10-14).** Below lg, art is a closed list.
> Home: the key-dates sun (36px), the magnifier beside "On this page" (30px, the same piece at every
> width), a wave between the statewide races and the ballot questions (never inside either list),
> one seated reader on the zigzag after the ballot list (88px), the cat over the coverage card
> (64px), one still row of all eight hero walkers at one height standing on the wave after the
> coverage card (48px), the install-card badge (48px) and the reminder envelope (40px). Every page:
> the section dividers, and the footer town strip shown uncropped below sm from its 750px phone file
> (max 184px). Inner pages: one spot each on the 404 and the error page (120px, the same piece) and
> on /methodology (112px), plus a 30px magnifier beside /methodology's "No source, no quote"; on
> /about, the same walker row on its own row after "What this is" and a 56px dog beside "Get in
> touch". Each piece is static, lazy and fixed in px; it sits on an edge, on its own row or in a
> heading row after the words, and never under text. None go in lists, news, or race, candidate or
> measure pages, and the walker row never shares a screen with a candidate list. No motion below lg.
> Line icons drawn in Glyphs.tsx (20-unit grid, 1.75 stroke, currentColor, aria-hidden) are product
> UI, not art, at every width: they mark a voter's own task (the sample-ballot tiles, the key-dates
> actions) or a prose page's headings (/privacy), always beside words that say the same thing; they
> never mark a candidate, party, race, a measure's YES/NO, a verdict or a news item, and they carry
> no tick, filled shape or ballot oval. Anything else on a phone needs a change to this line. The
> plans, sizes and budgets behind it are in `docs/design/mobile-visuals-2026-10-11/` and
> `docs/design/mobile-visuals-2026-10-14/`.

Edits by decision:
- Decision 3 C (/about only) or D (no row): drop or trim the walker-row clauses.
- Decision 5 B or C: drop the wave clause, the /methodology magnifier clause, or both.
- Decision 6 A: add "and their legend" after "the sample-ballot tiles".

## KB budget per page (375px)

KB is on disk, for the art alone. It excludes the masthead textures and the divider masks, about
6KB, which don't change.

| Page | Today | After | What makes it up | Height |
|---|---|---|---|---|
| Home, no district (no install or reminder card) | 227.2 | **~107** | sun 17.8, magnifier 10.4, sitter-xs ~10.6, cat-xs ~12.7, walker row ~21, footer ~35 (test files: ~97) | +68 (5,530 → ~5,598) |
| Home, district saved | 227.2 | ~107 | same | +89 (+21 tile wrap) |
| Home, first screen (y 45-739) | 17.8 + ~4.9 textures | unchanged | one inline 14px icon | 0 |
| /about | 139.2 | ~65 cold, ~44 after home | dog 9.4, walker row ~21 (cached), footer ~35 | +72 |
| /privacy | 129.8 | ~35 | footer; icons inline | 0 (+29 at 360) |
| /methodology | 193.7 | ~109, ~99 after home | receipts 63.9, magnifier 10.4 (cached), footer ~35 | 0 (about 1) |
| Error page | 129.8 | ~91 | spot 55.7 (cached if the 404 was seen), footer ~35 | ~+136, re-centred |
| 404 | 185.5 | ~91 | spot 55.7, footer ~35 | 0 |
| Race, candidate, measure, news, outlets, /candidates, /terms | 129.8 | ~35 | footer only, no visual change | 0 |

- **Conditional pieces:** the install badge (+12.7) and the reminder envelope (+10.7), as today.
- **Requests on home:** +2 (the magnifier and the walker row). The three swaps replace files and
  add no requests. The magnifier sits inside Chrome's lazy-load margin, so it loads with the page.
  The row loads lazily.
- **Without PR 4:** home is ~86KB. **Without PR 1:** add about 151KB to home and 95KB to every
  other page.

## Checks

### Neutrality

- **Nothing new in or beside the forbidden places.** Nothing is added in or beside a candidate or
  race list, a ballot question, the judges aside, news, a verdict, a measure's YES/NO, or any race,
  candidate, measure, news or outlet page. Those pages only get the lighter footer file.
- **The seam wave has no figure.** It looks the same whatever races are on the ballot, and it does
  what SharedBallot's own comment asks: a ballot question should not be mistaken for a race.
- **The walker row:**
  - It is one composite of the hero's eight, the same height and evenly spaced, in a fixed order.
  - Eight figures echo FL-GOV's eight candidates, so the row never goes near a candidate list or in
    the first screen.
  - On home it is about 2,800px below the statewide list. Its top is 723px below the end of the news,
    and a phone screen shows 694px between the bars, so they never share a screen.
  - /about names no candidates.
- **Skin.** By exact pixel count the eight walkers are skin-1, 2, 2, 3, 4, 4, 5 and 5. None is
  skin-6, so "a set of people spans the range" fails at the deep end. The row puts all eight side by
  side, which makes the gap easier to see than in the desktop walk. Decision 4 fixes it before the
  row ships.
- **Icons:**
  - They are keyed by task, never by county, so every county and the state row get the same four.
  - None has a tick, a filled shape or an oval, and none uses a party or verdict colour.
  - There is no handshake (it reads as a deal) and no check (it reads as "verified").
- **Privacy icons.** Every heading gets one, so no section is singled out. The chart describes
  site usage, not polling.
- **Not used:**
  - point-zip (its skin is not flat);
  - hang-masthead (off its bar it reads as two raised fists);
  - sticker-raised-hand (marks on the skin, and alone it puts one skin tone forward);
  - band-coast and the sea band;
  - the July SVGs (ticks in verdict colours, baked-in text);
  - everything in `public/brand/site/ai/` (the old skin).

### Accessibility and performance

- **Decoration:**
  - All art goes through `Art`, or the plain img on the error page, so it has `aria-hidden`,
    `alt=""`, no pointer events and no tab stop.
  - Icons are `aria-hidden` SVG beside words that say the same thing.
  - Link names, heading names and the tiles' sr-only text are unchanged.
- **Motion:** none added, at any width. `verify-motion` and `verify-hero-walk` stay green.
- **Layout stability:**
  - Every box is reserved: Art's width and height, the footer's aspect ratio, and the icons sized by
    class. CLS stays 0.
  - LCP stays text on every page. The first screen only gains a 14px inline icon.
- **Reflow:**
  - The walker row is ~231px wide. At 280px the column is 232px; at 320 it is 272.
  - The /methodology sticker is in the flow and wraps with the heading.
  - There are no negative side offsets.
- **Contrast:** the icons repeat their words, so WCAG 1.4.11 doesn't apply. They use `primary` or
  `primary-hover` on white or on `primary-muted`, and they follow forced colours because they use
  currentColor.
- **Images:**
  - The 750w footer is 2x density at 375 and 1.74x at 430. Check it in Safari on a 3x iPhone before
    claiming the saving.
  - The 2x walker row needs the same check.

## Verify (each PR)

- **Widths:** `scrollWidth === innerWidth` at 280, 320, 360, 375, 390, 402, 430, 768, 1023, 1024
  and 1280.
- **Clearances,** with `getBoundingClientRect`, for no district, `FL-27|12086` and `FL-10|12095`:
  - the magnifier against the registration link above and the chips below;
  - the seam wave between the two lists;
  - the walker row at least 12px below the coverage card;
  - the walker row against the reminder envelope at 320, with reminders forced on.
- **Network:**
  - At 375, no lg twin loads.
  - At 1280, no `walker-row-xs` and no `footer-town-strip-750` loads.
  - Measure in a visible viewport: a hidden browser pane fetches every lazy image.
- **Safari Web Inspector** on a 430px @3x iPhone: the footer's `currentSrc` is the 750 file. Check
  the walker row's sharpness.
- **axe reflow** at 320, 200% text, a 20px root font and 400% zoom.
- **Lighthouse mobile:** the LCP element is text on home, /about, /privacy and /methodology.
- **Scripts:** `npm run verify-all`, including `verify-home-layout`, `verify-motion`,
  `verify-hero-walk`, `verify-shared-ballot`, `verify-site-footer` and `verify-freeze`. Then lint
  and `tsc`.
- **PR 2 only:** run `verify-freeze` after the merge, before the Sat Oct 17 hashes are written.

## Not in this round

- The first-screen walker row (Design 1). It reverses decision 2A, pushes "Add these dates to your
  calendar" under the bottom nav at 375×812, and puts eight figures under "what each candidate
  says".
- The sea band (+136px, a keyed crop with a grain risk), band-coast and lie-footer (retired in #164).
- The kyv-tote figure on the House step. It bunches up with the sitter, and the FL-10 branch rule
  applies.
- The way-* and date-* vignettes. They need generation, and the date ones would reverse "nothing
  on the stops".
- The palm on /methodology's last heading (next to the ballot-question ordering block), and the
  saved-candidates "+" glyph (low value, frozen file).
- Measure and /news header art. Round 1 excluded both, and the measure page freezes.
- **Separate follow-up:** move `public/brand/site/ai/` (4.8MB of archive art with the old skin,
  deployed and publicly reachable) out of `public/`.

## Founder decisions

Each has a recommended option. The HTML file has these as a form with the recommended answers
already chosen, plus a "Copy as markdown" button.

1. **Ship the lighter files (PR 1) by Fri Oct 16?**
   - **(A) Recommended: yes.** A 750w phone footer, and `-xs` files for the sitter and the cat. Every
     page looks the same: home art drops about 151KB and every other page 95KB.
   - (B) No.
2. **Approve the extended "Art on phones" line**, including the clause that Glyphs.tsx line icons
   are product UI on the voter's own tasks and /privacy's headings, never with ticks or ovals. This
   gates PRs 2-4.
   - **(A) Recommended: approve.**
   - (B) Approve only the 0KB items (the icons, the seam wave and the magnifier) and add no new
     pictures.
3. **Where the eight-walker row goes on phones.**
   - **(A) Recommended:** 48px, standing on the wave after "What this guide covers", and once on
     /about after "What this is". The first screen stays as it is (decision 2A holds), the row is
     about 2,800px from any candidate list, and it costs +24px on home and ~21KB, cached across both
     pages.
   - (B) Design 1's first-screen row between the lede and the key-dates card. Not recommended: +68px,
     the calendar link goes under the bottom nav, and eight figures sit under "what each candidate
     says".
   - (C) /about only.
   - (D) No walker row.
4. **The darkest skin tone.** No walker is skin-6 today.
   - **(A) Recommended:** re-tone the fisherman from skin-5 to skin-6 before the row ships. This
     changes his master, `-sm` and hero frame; no share or email card uses him. If his ink eyes fade
     (1.25:1 on skin-6, against 2.1:1 today), regenerate him in the same pose instead. The row waits
     for whichever passes.
   - (B) Ship the row with today's eight, the same set as the desktop hero, and log the gap.
5. **Frozen files: merge by Fri Oct 16, or drop until after Nov 4.**
   - **(A) Recommended:** the wave between the statewide races and the ballot questions in
     SharedBallot.tsx (0KB, +44px, desktop too), and the 30px magnifier beside "No source, no quote"
     on /methodology (0px, cached file).
   - (B) The wave only.
   - (C) Neither. Nothing else depends on them.
6. **A sample-ballot legend when no district is saved.**
   - (A) Four plain items under the h2: Sample ballot, Where to vote, Early voting and Voting by mail,
     with the tile icons. It costs +54px and four new labels for you to approve.
   - **(B) Recommended: no legend.** The icons show inside opened county rows and on a saved
     district's tiles. Icon-and-label pairs above the county rows would read as buttons.
