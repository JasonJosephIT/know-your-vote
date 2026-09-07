/* Equal-slot news selection — news-fairness.md §2 ("Equal slots"), task N4.

   Pure and dependency-free (types only) so the fairness rule is testable
   without a DB or a browser: scripts/verify-news-slots.ts drives this file.
   A rule living inside a .tsx component could not be verified offline at all.

   THE RULE, in the order it is applied:

     1. Tier. Every `named` item is eligible before any `related` one
        (candidate-news-PRD.md §6). A story that named this candidate outranks
        one that is merely about their race, whatever the dates say; `related`
        fills only what `named` left over. Showing a real race story beats an
        empty rectangle, and it beats padding with a stale `named` item.
     2. Lean spread. Within a tier, take the item whose `lean_tag` has been
        selected fewest times so far — the newest item from each distinct lean
        before a second from any one lean.
     3. Type spread. Ties go to the item whose `type` has been selected fewest
        times, so one candidate's slots are not all opinion columns while
        another's are all reporting.
     4. Recency. Ties go to the newest `published_at`.
     5. Input order. Ties go to whichever came first, so the result is
        deterministic for identical input.

   Lean and type counts carry ACROSS the tier boundary: the spread is a
   property of the candidate's whole card set, not of each tier separately.

   An item with no source participates with `lean_tag = null` and
   `type = null` as its own bucket rather than being dropped. "No source, no
   card" (§1) is enforced at ingest by scripts/verify-news-neutrality.ts and by
   the 0014 CHECK constraint — a selector that silently swallowed rows would
   hide that failure instead of surfacing it. `'N/A'` is a real, legitimate
   lean value (a government primary document has no editorial lean) and gets
   its own bucket too; it is not a missing value.

   WHAT `n` IS NOT: this module picks no number. news-fairness.md §5 says `N`
   comes from real per-candidate counts once N5 measures them, and N5 has no
   data yet. Choosing a default here would be a guess dressed as a decision, so
   `n` is the caller's parameter and `undefined` means "apply the ordering,
   cap nothing". Shortfall is reported for the caller to STATE, never padded. */

import type { NewsSource } from "./news-labels";

/** The minimum an item must carry to be slotted. Structural on purpose: the
    read model's row type (briefs.ts `CandidateNewsItem`) satisfies it, and so
    does a fixture. */
export interface NewsSlotItem {
  published_at: string;
  /** `news_item.relation`; anything other than "related" is treated as
      `named`. NULL is pre-0017 R1 output — already candidate-scoped, so it
      belongs with `named` rather than being demoted to a tier it never had. */
  relation: string | null;
  source: Pick<NewsSource, "type" | "lean_tag"> | null;
}

export interface NewsSlotResult<T> {
  /** The chosen items, in the order the rule produced. */
  slots: T[];
  /** How many of `n` could not be filled. Always 0 when `n` is not given.
      The caller states this; it never pads. */
  shortfall: number;
}

function timeOf(published_at: string): number {
  const t = Date.parse(published_at);
  /* An unparseable date sorts oldest rather than throwing: a malformed row
     should lose a tiebreak, not blank a candidate's news section. */
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/**
 * Fill `n` news slots for one candidate by lean spread before recency.
 *
 * @param items every candidate_news row for the candidate, any order.
 * @param n     slots to fill. `undefined` (or any non-integer / negative
 *              value) orders the whole list and caps nothing.
 */
export function selectNewsSlots<T extends NewsSlotItem>(
  items: readonly T[],
  n?: number,
): NewsSlotResult<T> {
  const capped = typeof n === "number" && Number.isInteger(n) && n >= 0;
  const cap = capped ? n : Number.POSITIVE_INFINITY;

  /* Rule 1. Two pools rather than a sort key, so "named is exhausted first" is
     structural and cannot be undone by a later tiebreak. */
  const named: T[] = [];
  const related: T[] = [];
  for (const it of items) {
    (it.relation === "related" ? related : named).push(it);
  }

  const leanTaken = new Map<string | null, number>();
  const typeTaken = new Map<string | null, number>();
  const taken = (m: Map<string | null, number>, k: string | null) => m.get(k) ?? 0;

  const slots: T[] = [];

  for (const pool of [named, related]) {
    const remaining = [...pool];
    while (remaining.length > 0 && slots.length < cap) {
      let bestAt = 0;
      for (let i = 1; i < remaining.length; i++) {
        const a = remaining[i];
        const b = remaining[bestAt];
        const aLean = a.source?.lean_tag ?? null;
        const bLean = b.source?.lean_tag ?? null;
        // Rule 2 — lean spread.
        let d = taken(leanTaken, aLean) - taken(leanTaken, bLean);
        // Rule 3 — type spread.
        if (d === 0) {
          d = taken(typeTaken, a.source?.type ?? null) - taken(typeTaken, b.source?.type ?? null);
        }
        // Rule 4 — recency, newest first.
        if (d === 0) d = timeOf(b.published_at) - timeOf(a.published_at);
        // Rule 5 — input order (remaining is built in input order, so i > bestAt).
        if (d < 0) bestAt = i;
      }
      const item = remaining.splice(bestAt, 1)[0];
      slots.push(item);
      const lean = item.source?.lean_tag ?? null;
      const type = item.source?.type ?? null;
      leanTaken.set(lean, taken(leanTaken, lean) + 1);
      typeTaken.set(type, taken(typeTaken, type) + 1);
    }
  }

  return { slots, shortfall: capped ? Math.max(0, cap - slots.length) : 0 };
}
