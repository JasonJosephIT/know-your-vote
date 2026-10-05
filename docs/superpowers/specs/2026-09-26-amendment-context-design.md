# Amendment context: publish AM2, explain AM1, re-check weekly

**Date:** 2026-09-26 · **Status:** approved in session (founder)
**Builds on:** `docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md`
(the ladder, the 2× gate) and the evidence in
`docs/general-election/measure-resources-verified-2026-09-24.md`, including its
"Widened search, 2026-09-26" section.

## Founder calls (2026-09-26)

| # | Call | Decision |
| - | ---- | -------- |
| C1 | How to file Rep. Eskamani's signed "Explanation of Vote for Sequence Number 256" (House Journal No. 31, April 25, 2025, on CS/HJR 1215) | `argument` / `oppose`. A named person makes the case in her own words; the Journal is where it was published. |
| C2 | Publish Amendment 2 | **Yes.** Draft it; the founder sees the counts before it is applied. |
| C3 | Amendment 1 | Stays `listed`. Its page shows the verified neutral material and a note specific to AM1 explaining why no sides are shown. |
| C4 | Held-page scope | Neutral resources (`stance = 'neutral'`) become readable for `listed` measures. Sided rows stay readable only once a measure is `published`. |
| C5 | Re-check | A weekly cloud routine re-checks AM1 (and AM2 while it's new) for primary-source statements. It opens a PR only when it finds something, and it never applies a migration or publishes anything. |

## 1. `0040`: Amendment 2 resources and publish

This follows the same shape as `0038` (AM3):
- **Sources:** `INSERT … ON CONFLICT (url_norm) DO NOTHING`.
- **Resources:** each resource's `source_id` is resolved by `url_norm` subquery, with `ON CONFLICT (measure_id, source_id) DO UPDATE`.
- **Publish:** a three-CTE publish block that writes an `admin_action` row only when the status actually changes.

Inclusion rules (the same as `0038`, plus one new rule):
- A row goes in only if the verified doc marks it as actually opened. That includes the browser-opened table dated 2026-09-26. Rows seen only as snippets, 403s, 402s or behind a paywall are excluded and listed in the header.
- A row whose kind or stance the doc flags as uncertain is excluded. That covers the sisusari Substack post (stance reads undecided) and the LWV Vote411 PDF. The LWV PDF may be a neutral synopsis rather than LWV's own case, so it is included only if the doc confirms it is LWV's own position. Otherwise it is excluded and named.
- **New: one row per organisation per side.** When the same organisation has several pages (Florida Farm Bureau's news post and its `/yeson2/` page), take the single fullest page, the one that states reasons. This stops one voice filling a column.
- Titles are verbatim, and `note` is attribution only (≤140 chars, no "would", "will", "means" or "because").
- For the Eskamani row:
  - URL: the House Journal PDF (the `loaddoc.aspx` link for No. 31, April 25, 2025).
  - Publisher: "Florida House of Representatives".
  - Author: "Rep. Anna V. Eskamani".
  - Format: `document`; `published_at`: `2025-04-25`.
  - Note: `Signed vote explanation, House Journal, April 25, 2025`.
  - `source.type` is `primary_doc`, but the row's `kind` is `argument`. Because `verify-measure-resources.ts` only flags `official` on a non-`primary_doc` source, this is allowed. Say so in the header comment.
- **Gate:** both sides must have at least one row, and the larger side must be at most 2× the smaller. The header shows the counts. If the gate doesn't pass honestly, stop and report. Don't pad.

## 2. `0041`: neutral rows visible while listed, plus AM1's neutral rows

- **Policy:** replace `anon_read_measure_resource` so anon can read a row when its measure is `published`, **or** when the row's `stance = 'neutral'` and its measure is `listed`. No other change to the gate or triggers.
- **Seed:** AM1's opened neutral rows from the verified doc: its official records (DoS record, Senate and House bill pages), the James Madison Institute guide (`analysis` / `neutral`), and the news rows that were opened (WUSF, CBS Miami, Ocala Gazette, WFLA, Bradenton Times). Snippet-only rows are excluded, as before.
- `verify-migrations.mjs`:
  - anon reads the neutral rows of a listed fixture measure;
  - anon reads **no** support or oppose rows of a listed measure;
  - published behaviour is unchanged.

## 3. Read layer and page for a held measure

- `MeasureListing` gains `neutral: MeasureResourceWithSource[]`, filled for `listed` measures from the neutral rows now readable. For published measures it stays the brief's own `neutral`.
- `MeasureResourceLadder.tsx` exports its "Understand it first" block as `MeasureNeutralBlock`, so the held page renders the same block, with the same tier ordering and labels.
- New `src/lib/measure-held-copy.ts`: a map from measure id to `{ paragraphs: string[]; updated: "YYYY-MM-DD" }`, plus `heldNote(id)`. It holds AM1's note. Every sentence describes our process and the record, never the amendment's merits. Measures without an entry keep today's generic card.
- AM1 copy (final wording, reviewable in the PR):
  > Supporters and opponents of Amendment 1 have been quoted in news coverage, listed above, but we haven't yet found either side making its case in its own words, such as a statement, testimony or a page it published itself. We add a side only from its own words.
  >
  > The Legislature's journals record how every member voted on this amendment, but no member filed a written explanation of their vote.
  >
  > We look for new statements every week. This note was last updated September 26, 2026.
- Page order for a held measure: header, threshold, "What the ballot says", the neutral block (if any rows), the held note card, then the footer. The YES and NO columns never render for a held measure.

## 4. Weekly routine

A cloud routine (the `schedule` skill), weekly:
- It searches for AM1 primary-source statements on both sides, and for AM2 NO- or YES-side organisations' own cases.
- It uses the Session B method (fetch and read every page; own words only).
- It writes findings to a dated section of the verified doc on a branch and opens a PR **only** when something new passes the rules. Otherwise it reports "no change".
- It never applies migrations or changes publication.

## Verification

- All existing verify scripts pass: `verify-measure-resources` on 0040 and 0041, `verify-measure-balance`, `verify-migrations`, `verify-ballot-seeds`. `verify-ballot-seeds` must be updated from "exactly one published measure" to AM3 and AM2.
- New checks: anon visibility for neutral versus sided rows on a listed measure; `heldNote` entries are well formed; the listed page source never renders a support or oppose column.
- Browser (after apply): AM2 shows both columns; AM1 shows the neutral block and its note, with no YES/NO columns.
