/* What a held (listed) ballot measure's page says in place of the YES/NO
   columns (spec docs/superpowers/specs/2026-09-26-amendment-context-design.md
   §3). Every sentence is about our process or the public record, never the
   measure's merits. `updated` changes only when the note changes, so the
   page never claims a check it did not make. Measures without an entry keep
   the page's generic card. */

export interface HeldNote {
  paragraphs: string[];
  updated: string; // YYYY-MM-DD
}

export const HELD_NOTES: Record<string, HeldNote> = {
  "FL-AM1-general": {
    paragraphs: [
      "Supporters and opponents of Amendment 1 have been quoted in news coverage, listed above, but we haven't yet found either side making its case in its own words, such as a statement, testimony or a page it published itself. We add a side only from its own words.",
      "The Legislature's journals record how every member voted on this amendment, but no member filed a written explanation of their vote.",
    ],
    updated: "2026-09-26",
  },
};

export function heldNote(measureId: string): HeldNote | null {
  return HELD_NOTES[measureId] ?? null;
}
