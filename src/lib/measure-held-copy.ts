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
      "Supporters of Amendment 1 have published their case in their own words. Its opponents have so far only listed themselves as opposed, without giving reasons we can show you. We show both sides once each has made its own case.",
      "The Legislature's journals record how every member voted on this amendment, but no member filed a written explanation of their vote.",
    ],
    updated: "2026-09-26",
  },
};

export function heldNote(measureId: string): HeldNote | null {
  return HELD_NOTES[measureId] ?? null;
}
