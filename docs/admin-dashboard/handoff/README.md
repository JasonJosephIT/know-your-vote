# Operator Console — Developer Handoff

Engineering handoff specs for the `/admin` operator console, one file per roadmap phase. Source of truth for tokens is `src/app/globals.css` (`@theme`) and `docs/design.md`; Phase A1 is documented **as built** (it exists in code), Phases A2–A5 are documented **as target** (to be built to this spec).

| Phase | Surface | Spec |
|---|---|---|
| Foundations | Tokens, layout, honest-degradation, a11y, responsive | this file |
| A1 | Sign-in, console shell, nav, DegradedBanner, six empty states | [phase-a1-foundation.md](phase-a1-foundation.md) |
| A2 | Overview — six live R4 panels + neutrality-lint verdict | [phase-a2-monitor.md](phase-a2-monitor.md) |
| A3 | Submit forms, approval queue, decision flow, log + badge | [phase-a3-submit-review.md](phase-a3-submit-review.md) |
| A4 | Agents — run triggers, request state, run history | [phase-a4-agents.md](phase-a4-agents.md) |
| A5 | Site — deployments, errors, analytics links-out | [phase-a5-site.md](phase-a5-site.md) |

> **Rule zero — use tokens, never raw values.** Every measurement below is a Tailwind v4 utility backed by a `@theme` token. If a spec says `p-5`, that is the 24px spacing token, not Tailwind's default 20px (the scale is overridden in `globals.css`).

---

## 1. Design tokens

### Color (utility → hex → usage)

| Utility | Hex | Usage |
|---|---|---|
| `bg-background` | `#f6f3ec` | App canvas (the admin overlay fill) |
| `bg-surface` | `#ffffff` | Cards, header/nav bars, code chips |
| `bg-surface-muted` | `#efeae0` | Degraded banners, inset/empty wells |
| `text-on-surface` | `#22271f` | Primary text |
| `text-on-surface-muted` | `#585e52` | Secondary text, empty-state copy, captions |
| `border-border` | `#e4ded2` | Card / bar dividers |
| `border-border-strong` | `#cfc7b6` | Inputs, banners, secondary-button outline |
| `text-primary` `bg-primary` | `#2f6b4f` | Brand, primary CTAs, active nav, links |
| `bg-primary-hover` | `#255a41` | Primary CTA hover |
| `bg-primary-muted` | `#e4efe7` | Success / "sent" / positive info wells |
| `text-on-primary` | `#ffffff` | Text on primary fills |
| `text-accent` | `#b26836` | Warm accent, secondary emphasis |
| `text-warning` | `#b07a1e` | **Degraded** label ("Not configured") |
| `text-error` | `#b4402e` | Denied / destructive / failure |
| `text-success` | `#2f7d52` | Applied / healthy |
| `text-info` | `#2f6e7a` | Neutral informational |
| `text-verdict-*` | see `globals.css` | Neutrality-lint / fact verdict chips (A2/A3) |

Opacity modifiers are allowed on theme colors (e.g. `border-primary/40` on the "sent" well). Verified building under Tailwind v4.

### Typography (utility → size / line / weight → usage)

| Utility | Spec | Usage |
|---|---|---|
| `text-display` | 2.5rem / 1.1 / 700 | Marketing only — not used in console |
| `text-h1` | 2rem / 1.15 / 700 | Sign-in title |
| `text-h2` | 1.5rem / 1.2 / 600 | Section page titles (Overview, Queue, …) |
| `text-h3` | 1.25rem / 1.3 / 600 | Header wordmark "Operator Console", card group headers |
| `text-body` | 1rem / 1.6 | Form inputs, body copy |
| `text-body-sm` | .875rem / 1.5 | Panel/section descriptions, most console copy |
| `text-label` | .9375rem / 1.2 / 600 | Button labels, form field labels |
| `text-caption` | .8125rem / 1.4 / 500 | Meta (email, timestamps, sign-out, chips) |
| `text-overline` | .75rem / 1.3 / 700 / .08em | Panel titles / eyebrows (UPPERCASE feel) |
| `text-mono` | .875rem / 1.5 | Code chips, IDs, diffs, payload keys (`font-mono`) |

Fonts resolve via `next/font` CSS vars: `font-heading` (Figtree, h1–h4 auto), `font-body` (Inter, default), `font-mono` (IBM Plex Mono).

### Spacing, radius, elevation

- **Spacing scale** (overridden): `1`=4 · `2`=8 · `3`=12 · `4`=16 · `5`=24 · `6`=32 · `7`=48 · `8`=64 · `9`=96 px. Console rhythm: page stack `gap-5` (24), card grids `gap-4` (16), inside-card `gap-2` (8), main padding `px-4 py-6 md:px-5`.
- **Radius**: `rounded-sm` 4 (chips, tab focus) · `rounded-md` 8 (inputs, buttons, banners) · `rounded-lg` 12 (cards) · `rounded-full` (pills/badges).
- **Elevation**: `shadow-elevation-1` (resting), `shadow-elevation-2` (raised/nav). Console is mostly flat-on-canvas; reserve shadows for overlays/menus.

---

## 2. Layout system

| Element | Spec |
|---|---|
| Admin root overlay | `fixed inset-0 z-50 overflow-y-auto bg-background text-on-surface` — covers the voter chrome for the whole `/admin` subtree; viewport-relative so voter body-padding never bleeds in. `src/app/admin/layout.tsx`. |
| Authed shell | header (`bg-surface border-b border-border`) + `AdminNav` + `main`. `src/app/admin/(console)/layout.tsx`. |
| Content column | `mx-auto w-full max-w-[1120px] px-4 py-6 md:px-5` |
| Card | `rounded-lg border border-border bg-surface p-5 text-on-surface` (the `Card` primitive) |
| Panel grid | `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` |
| Narrow form column | `max-w-[440px]` centered (sign-in, single-column forms) |

Reuse the existing primitives — **do not** hand-roll: `Card` (`src/components/ui/Card.tsx`), `Button` (`variant="primary"|"secondary"`, `src/components/ui/Button.tsx`), `Input` (`src/components/ui/Input.tsx`). New shared console pieces: `DegradedBanner`, `AdminNav` (`src/components/admin/`).

---

## 3. The honest-degradation idiom (the console's spine)

Every panel/action degrades honestly (roadmap Build Philosophy 10; design.md §6). Three distinct states — **never** collapse them:

| State | When | Rendering |
|---|---|---|
| **Empty** | Queried successfully, nothing there | Muted `text-body-sm text-on-surface-muted` line inside a `Card` (e.g. "No items awaiting review."). A real measured zero. |
| **Degraded** | Can't query — a dependency is absent (env var, migration, closed laptop) | **`<DegradedBanner missing="…">`** naming the exact thing. Never a fake zero, never blank. |
| **Error** | Query attempted and failed at runtime | `role="alert"` banner (`border-border-strong bg-surface-muted`, `text-error` label) + retry affordance where possible. |

`DegradedBanner({ missing, children })` — `src/components/admin/DegradedBanner.tsx`. `missing` is the literal dependency name (env var / migration / "Claude app closed"). `children` is optional guidance. This is the single idiom; the §6 failure table maps every dependency to the `missing` string to show:

| Dependency absent | `missing=` |
|---|---|
| `VERCEL_API_TOKEN` / `SENTRY_AUTH_TOKEN` | that var name |
| Migration 0005 | `"migration 0005 (candidate_contact)"` |
| Migration 0006 | `"migration 0006 (ops tables)"` |
| Claude app closed | `"the Claude desktop app (requests execute when it's open)"` |
| Supabase unreachable | `"Supabase (unreachable)"` |

---

## 4. Accessibility baseline (applies to every phase)

- **Focus**: global `:focus-visible` → 2px `focus-ring` outline, 2px offset (`globals.css`). Never remove; custom controls must show it.
- **Roles**: `role="status"` (aria-live polite) for non-urgent async info (link sent, degraded); `role="alert"` for errors / denied. One per message, not nested.
- **Nav**: `<nav aria-label>`; active item `aria-current="page"`.
- **Controls are real**: `<button>`/`<a>`/`<form>` — no click-divs. Sign-out and decisions are real `<form action={serverAction}>` so they work without client JS.
- **Targets**: interactive height ≥ 40px (buttons `py-3`, tabs `py-3`). Icon-only controls need `aria-label`.
- **Contrast**: token pairs above meet AA for body text on their surfaces; keep `text-on-surface-muted` for ≥ caption size only.
- **Overlay hygiene**: voter `SectionNav` returns `null` on `/admin` — hidden chrome must leave the DOM/tab order, not just be painted over.

---

## 5. Responsive baseline

Tailwind breakpoints: `sm` 640 · `md` 768 · `lg` 1024. Console targets one operator on any device.

| Viewport | Behavior |
|---|---|
| Mobile (< 640) | Single column; panel grids collapse to 1-col; nav tabs scroll horizontally (`overflow-x-auto`, no wrap); header email hidden (`hidden sm:inline`); forms full-width in the 440 column. |
| Tablet (≥ 640 `sm`) | Panel grids 2-col; header email visible. |
| Desktop (≥ 1024 `lg`) | Panel grids 3-col; full shell. |

The root overlay is `fixed inset-0` (viewport-relative) so there is **no** dead space from the voter nav's body padding at any width (verified 375 + desktop).

---

## 6. Motion

Minimal by design. Interactive color changes use `transition-colors` (~150ms, default easing). No entrance/parallax animation. Any future spinner/skeleton must honor `prefers-reduced-motion: reduce` (swap to a static state). Client polling never faster than 30s (design.md §5 Caching) — surface refreshes are silent, not animated.
