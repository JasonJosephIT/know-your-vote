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
   its own bucket too; it is not a missing value. So is `'unrated'` (migration
   0028 — a lean applies and no rating agency has published one), and it is a
   DIFFERENT bucket from both `'N/A'` and null: collapsing it into null would
   let a sourced item and an unattributed one compete as one lean, and treating
   it as matching any lean would let two unrated outlets take slots before a
   rated one. scripts/verify-news-slots.ts fixture U pins both.

   Worth knowing when reading a real card set: most of a LOCAL news corpus has
   no published rating, so once the founder designates those rows the
   `'unrated'` bucket holds the bulk of the corpus and rule 2 has little left to
   rotate between. The rule still behaves correctly; there is simply less
   spectrum in the data than the rule can express (news-fairness.md §5).

   WHAT `n` IS NOT: a default inside the selector. news-fairness.md §5 says `N`
   comes from real per-candidate counts, so `n` stays the caller's parameter
   and `undefined` still means "apply the ordering, cap nothing". Shortfall is
   reported for the caller to STATE, never padded. The recommended value the
   caller should pass is NEWS_SLOTS_PER_CANDIDATE below, which comes from the
   first measurement and is not yet wired to any caller. */

import type { NewsSource } from "./news-labels";

/* ---- FOUNDER CALL: N, the news slots per candidate -------------------
   RECOMMENDED (PENDING FOUNDER CONFIRMATION), 2026-10-04: N = 3. Launch
   handoff §5; the pending decision is recorded in
   docs/general-election/stream-surface-handoff.md §7.

   THE MEASUREMENT. news-fairness.md §5 says to pick N from real
   per-candidate counts. The first ones were taken on 2026-10-04 with
   scripts/news-sweep.ts --days 30 (545 articles) and
   planAttachments against the live enqueue roster (82 ballot candidates with
   a profile, 36 races). Note these are sweep-pool counts, not approved rows:
     - 69 of 82 candidates had no `named` story at all;
     - 13 had at least one, with a median of 2 among them;
     - the most covered was 14 (FL-SEN), against 0 for another candidate in
       the same race. Six candidates had 3 or more.
     - Every swept story came from an outlet rated 'unrated', because all 24
       usable outlets are, so rule 2 (lean spread) has one bucket to rotate
       through today.

   WHY 3. It sits just above the median of covered candidates, so it binds
   only on the handful the press covers most. Inside a race it turns a 14-to-0
   layout into 3-to-0 plus the stated shortfall line, which is the "equal
   slots" promise of news-fairness.md §2. While every outlet is 'unrated', a
   larger N would add more stories of the same lean, not more spread. And 3
   cards with hero images is a short section on a phone.

   NOT WIRED, ON PURPOSE. The hard gate in news-fairness.md's N4 note still
   stands: N must be passed to CandidateNews before candidate_news rows go
   live. The caller is src/app/(public)/candidates/[candidateId]/page.tsx,
   which renders <CandidateNews candidateId=… /> twice with no `slots`.
   Wiring is one prop at each call site: slots={NEWS_SLOTS_PER_CANDIDATE}.
   It must be at least 1, because `slots={0}` with stories present would
   print the "No stories" line falsely (stream-surface-handoff.md §4).

   TO FLIP: change the number. Re-measure once the first batch of
   candidate_news rows has been approved; that is when N5's real
   denominator exists. */
export const NEWS_SLOTS_PER_CANDIDATE = 3;

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
