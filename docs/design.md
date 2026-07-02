---
version: alpha
name: Know Your Vote
description: A calm, trustworthy, deliberately non-partisan design system for the Know Your Vote civic web app — sage green and warm sand, humanist type, minimalist and straight-lined but never governmental.
colors:
  background: "#F6F3EC"
  surface: "#FFFFFF"
  surface-muted: "#EFEAE0"
  on-surface: "#22271F"
  on-surface-muted: "#585E52"
  border: "#E4DED2"
  border-strong: "#CFC7B6"
  primary: "#2F6B4F"
  primary-hover: "#255A41"
  primary-muted: "#E4EFE7"
  on-primary: "#FFFFFF"
  accent: "#B26836"
  accent-strong: "#8A4E24"
  accent-muted: "#F5E7D6"
  on-accent: "#FFFFFF"
  success: "#2F7D52"
  warning: "#B07A1E"
  error: "#B4402E"
  info: "#2F6E7A"
  focus-ring: "#2F6B4F"
  verdict-accurate: "#2F6B4F"
  verdict-mostly-accurate: "#5E8C6B"
  verdict-mixed: "#B07A1E"
  verdict-mostly-inaccurate: "#B4692E"
  verdict-inaccurate: "#B4402E"
  verdict-unverifiable: "#6B6F66"
typography:
  display:
    fontFamily: "Figtree, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Figtree, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Figtree, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Figtree, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  overline:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
  mono:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "999px"
spacing:
  "0": "0px"
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
  "9": "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-disabled:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    border: "1px solid {colors.border-strong}"
  button-secondary-hover:
    backgroundColor: "{colors.primary-muted}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    border: "1px solid {colors.primary}"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    border: "1px solid {colors.border-strong}"
  input-text-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    border: "2px solid {colors.primary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
    border: "1px solid {colors.border}"
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    rounded: "{rounded.none}"
    padding: "{spacing.2}"
    border: "1px solid {colors.border}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2}"
  nav-item-active:
    backgroundColor: "{colors.primary-muted}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2}"
  verdict-badge:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  party-chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  chip:
    backgroundColor: "{colors.primary-muted}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Know Your Vote Design System

## Overview

Know Your Vote is a nonpartisan civic web app that lets a Florida voter enter a ZIP code and see every candidate on their ballot presented fairly — what they say, what they've done, and what's been verified. The design must make a nervous, busy voter of *any* political stripe feel calm, welcomed, and capable. The emotional target is **trustworthy, warm, and quietly confident** — the visual equivalent of a great poll worker or reference librarian. Two anti-patterns govern everything: it must never look like a **government website** (cold, dense, bureaucratic), and it must never look **partisan** (no red-vs-blue coding, no candidate visually favored over another). Warmth carries the neutrality so it never reads as cold both-sidesing.

## Colors

The palette is built to be **calm, optimistic, and pointedly non-partisan**. The primary is a muted **sage green** (`primary` `#2F6B4F`) — trustworthy and growth-associated without belonging to either party — reserved for primary actions, active states, and key emphasis. Neutrals are **warm sand**, not cold gray: `background` `#F6F3EC` is a soft paper tone, `surface` is white for cards, and `surface-muted` provides quiet fills; text is a warm near-black (`on-surface` `#22271F`) with `on-surface-muted` for secondary copy. A warm clay **accent** (`#B26836`) adds cheerful, human punctuation — use it for small highlights, illustrative marks, and the nav's active indicator, not for large blocks (for accent-colored text use `accent-strong` to hold WCAG AA). Semantic states are deliberately muted (`success`, `warning`, `error` as a warm brick rather than a fire-engine red, `info` as a calm teal) so nothing feels alarmist. The six **verdict** colors run a restrained green→amber→brick scale for fact-check outcomes — but color is always paired with the verdict's text label; it is never the only signal. All text pairings meet at least WCAG AA (`primary` on white ≈ 5.8:1, `on-surface` on `background` ≈ 13:1).

## Typography

The type system is **humanist sans** — friendly and legible, the opposite of institutional. Headings use **Figtree** (a warm, slightly geometric humanist sans) at tight tracking; body copy uses **Inter**, a workhorse chosen for its exceptional small-size legibility on phones. A monospace (**IBM Plex Mono**) is reserved for source citations, dates, and data snippets so the "receipts" feel precise. The scale is purposeful: `display` and `h1` for hero and page titles, `h2`/`h3` for race and section headings, `body-lg` for the reassuring intro sentences, `body`/`body-sm` for the substance, `label` for buttons and controls, `caption` for meta and badges, and `overline` (uppercased in use, wide-tracked) for small section eyebrows. We deliberately avoid **Public Sans** and other USWDS/government typefaces — the whole point is to not look like a `.gov`. Never set long body copy in the display face, and never go below `body-sm` (14px) for anything a voter must read.

## Layout

Spacing follows a **4px base scale** (`spacing.1` = 4px through `spacing.9` = 96px) applied with a **comfortable-to-generous** rhythm — calm needs whitespace. Content sits in a centered container (max ~1120px) with a narrower reading measure (~680px) for prose-heavy briefs and the methodology page, so lines never run too long to scan. The signature layout is the **side-by-side race view**: candidates render in equal-width columns on desktop and an equal-treatment stacked/tabbed layout on mobile, so no candidate ever gets more visual space than another — equal space is enforced structurally, not left to eyeballing. The four-section navigation docks to the **bottom on mobile** (thumb-reachable) and the **top on desktop**. Default to single-column, generously-spaced mobile layouts and let desktop widen; density should feel unhurried, never packed.

## Elevation & Depth

Depth is **border-led and mostly flat**, which reads clean and modern rather than heavy or officious. Separation comes primarily from the warm `border`/`border-strong` tokens and surface/background contrast, not drop shadows. Reserve soft shadows for genuinely floating elements: `elevation-1` (a barely-there `0 1px 3px rgba(34,39,31,0.06)`) for raised cards on hover, and `elevation-2` (`0 4px 12px rgba(34,39,31,0.08)`) for the docked nav bar, popovers, and dialogs. Avoid stacked or hard shadows entirely — the brand is airy and trustworthy, and over-elevation would make it feel like a dashboard or a government portal.

## Shapes

The shape language is **minimalist and straight-lined with a small, consistent softening** — restrained radii, never bubbly. Cards use `rounded.lg` (12px), buttons and inputs use `rounded.md` (8px), and small interactive tags (chips, verdict badges, party chips) use `rounded.full` for a friendly pill that signals "tappable." Structural dividers and the nav bar stay square (`rounded.none`) to keep the overall impression crisp and orderly. The slight-but-consistent rounding is what keeps "professional and informative" from tipping into "cold and bureaucratic," while the straight structural lines keep it from tipping into "playful toy."

## Components

**Buttons:** `button-primary` (sage fill, white label) is the single strong call-to-action per view — "See my ballot," "Take the quiz." `button-secondary` is an outlined/quiet variant on `surface` with a `border-strong` edge; on hover it fills with `primary-muted`. `button-primary-disabled` drops to `surface-muted` with muted text. **Inputs:** `input-text` carries a `border-strong` edge that thickens to a 2px `primary` ring on focus (`input-text-focus`) — focus is always clearly visible for keyboard users. **Cards** are the workhorse container: white surface, 1px `border`, `lg` radius, generous `spacing.5` padding. **Navigation:** `nav-bar` is a bordered surface bar; `nav-item` is quiet by default and becomes `nav-item-active` with a `primary-muted` background and `primary-hover` text plus a small accent indicator. **Verdict badges** use the `caption` type in a pill; the background stays neutral `surface-muted` and the **verdict color is applied to a leading dot and the label text**, so meaning survives for colorblind users and never shouts. **Party chips** are intentionally uniform — the *same* neutral `surface-muted` treatment for REP, DEM, NPA, and every other party, carrying only the text label. This is a hard rule: parties are never color-coded. **Chips** (saved filters, issue tags) use the soft `primary-muted` fill.

## Do's and Don'ts

**Do:**
- Give every candidate identical visual weight — equal columns, equal type, equal spacing. Fairness is a layout invariant.
- Keep one primary (sage) action per view; let everything else stay quiet and calm.
- Always pair verdict and status color with a text label or icon — never rely on color alone.
- Use warm sand neutrals and generous whitespace to keep the tone human and unhurried.
- Reserve the clay accent for small, cheerful moments (active nav, highlights, illustrative marks).

**Don't:**
- Never color-code parties or candidates red/blue (or any partisan hue). Party chips are uniform and neutral, always.
- Never adopt a government-portal look — no dense tables of cold gray, no hard shadows, no Public Sans / USWDS styling.
- Never let the accent or verdict reds dominate; they punctuate, they don't drive.
- Never set body copy in the display face or shrink readable text below 14px.
- Never use alarmist, saturated colors — the app is calm and reassuring, even when a fact-check verdict is "Inaccurate."
