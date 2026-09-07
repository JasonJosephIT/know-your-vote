---
title: KYV Voice & Tone
version: 1.0
status: active
source-of-truth: docs/design.md (visual), this file (verbal)
companion: docs/brand-assets-roadmap.md, docs/asset-generation-guide.md
last-updated: 2026-07-05
applies-to: site copy, metadata, PWA manifest, marketing, email, social
---

# KYV Voice & Tone

`design.md` governs how KYV *looks*. This file governs how it *sounds*. It captures the
copy voice reflected in the latest `src/app/layout.tsx` and `src/app/manifest.ts` so every
page, button, and blurb on the main site can speak the same way.

## The shift, in one line

We kept the calm, trustworthy foundation and made the **marketing voice warmer, punchier,
and more conversational** — plain-spoken and a little bit playful, without ever getting loud,
partisan, or spin-y. Think *a sharp friend who actually read the ballot for you*, not a
government pamphlet and not a hype account.

## Canonical lines (use these verbatim)

- **Primary title / tagline:** "Know Your Vote, Know Your Ballot, Know Your Options"
- **Short name:** "Know Your Vote"
- **Lead description:** "See everyone on your ballot, what they say, what they've done, and
  all facts no cap. Every claim linked to a source."
- **OG / social title:** "Know Your Vote — Your Ballot, Your Options"
- **OG / social description:** "See everyone on your ballot what they say, what they've done,
  and all facts no cap."

The **triadic "Know Your ___, Know Your ___, Know Your ___"** structure is now a signature
device — reuse it for section headers and campaigns (e.g. "Know the Race, Know the Record,
Know the Receipts"). Keep it to three beats; don't stretch it to four.

## Voice principles

1. **Plain over formal.** Short sentences, everyday words, active voice. "See everyone on
   your ballot," not "View a comprehensive roster of candidates."
2. **Warm and a little playful — on the wrapper, not the facts.** Casual asides and light
   slang ("all facts, no cap") are welcome in headlines, intros, empty states, and social.
   They **never** appear inside a fact-check verdict, a source citation, or a candidate's
   stated position. The receipts stay straight-faced.
3. **Confident, never hype.** No exclamation-point energy, no "revolutionary," no urgency
   bait. Calm confidence is still the baseline; the new voice is warmer, not louder.
4. **Non-partisan is a verbal rule too.** No dunking, no "expose," no side implied. We
   describe; we never editorialize or infer motive. Slang is allowed; a *slant* is not.
5. **Second person, reader-owned.** "your ballot," "your options" — the voter owns it. KYV
   is the helpful guide, not the authority.

## Do / Don't

**Do**

- Lead with what the voter gets: their ballot, laid out fairly, with receipts.
- Use the triad structure and the "no cap" register for top-of-funnel/marketing copy.
- Keep verbs concrete: see, check, compare, read the source.
- Pair every claim with "linked to a source" language — it's our whole promise.

**Don't**

- Don't let slang touch a verdict, a source line, a party chip, or a candidate quote.
- Don't imply a winner, a villain, or a "gotcha." Equal space, equal scrutiny — in words too.
- Don't stack hype adjectives or use urgency/countdown pressure.
- Don't drift into `.gov` formalese either — the fix for stiff copy is *warmer*, not longer.

## Before → after (from the metadata change)

| Surface | Before | After |
|---|---|---|
| Title | "Know Your Vote — Your ballot, laid out fairly" | "Know Your Vote, Know Your Ballot, Know Your Options" |
| Description | "…what's been verified. Equal space, equal scrutiny, every claim linked to a source." | "…and all facts no cap. Every claim linked to a source." |
| OG title | "Know Your Vote — Your ballot, laid out fairly" | "Know Your Vote — Your Ballot, Your Options" |
| Register | reference-librarian calm | reference-librarian calm **+ warm, plain-spoken, lightly playful** |

## Register map (where the voice dials up vs. down)

- **Dial up (warm/playful):** hero headline, taglines, empty/success states, social captions,
  marketing email subject lines, onboarding nudges.
- **Neutral (plain + calm):** body copy, buttons, form labels, help text, methodology intro.
- **Dial down (precise, literal, zero slang):** fact-check verdicts and their labels, source
  citations, candidate stated positions, party chips, legal/footer, error and status messages.

This mirrors the visual rule in `design.md`: the *logo* carries the warmth so the *product UI*
can stay calm. Here, the *headlines* carry the warmth so the *receipts* can stay exact.

## Two things to confirm (flagged, not decided)

1. **Scope wording — "Florida" vs "local/your ballot."** The new copy drops "Florida" for the
   broader "your ballot" / "your local ballot." The product is currently Florida-scoped
   (see the PRD). If Florida-only is still the reality, either keep "Florida" in at least the
   description or make sure the ZIP flow makes the scope obvious, so the broad wording doesn't
   over-promise. If national expansion is the intent, this copy is already pointed the right way.
2. **"No cap" longevity & clarity.** It reads great now and signals "straight facts" to most
   readers, but it's slang that can date or miss with some audiences. Keep it as a *flavor*
   line (hero/social), and make sure a plain-language equivalent ("just the facts, all sourced")
   is always one scroll away for anyone it doesn't land with.

## Where this is wired today

- `src/app/layout.tsx` — `metadata.title`, `description`, `openGraph.*`
- `src/app/manifest.ts` — `name`, `description`
- Next: apply the register map to homepage hero, section headers, CTAs, and email subject lines.
