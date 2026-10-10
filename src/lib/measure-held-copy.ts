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

/* AM1, corrected 2026-10-04 (launch handoff §4, founder decision 9). The
   2026-09-26 wording said the officials and organisations opposing AM1 had
   "only listed themselves as opposed, without giving their reasons". The
   reporting this same page links contradicts that: CBS Miami and WUSF quote
   the governor's stated reasons from his post on X, and the Ocala Gazette
   quotes Florida AFL-CIO testimony against it. What is true, and what keeps
   the page held, is narrower: we have read the supporters' case at its own
   source (RPOF's release), but not yet an opponent's. FEA's and LWV
   Florida's own pages list them as opposed with no reasons, and the
   governor's post and the AFL-CIO testimony are known only through that
   reporting (measure-resources-verified-2026-09-24.md). The note now says
   that, names no one on either side, and points to the reporting for both
   sides' reasons. Keeping AM1 neutral-only is the recommendation pending
   founder confirmation (ballots-handoff.md §7). */
export const HELD_NOTES: Record<string, HeldNote> = {
  "FL-AM1-general": {
    paragraphs: [
      "Supporters and opponents of Amendment 1 have both given reasons for their positions, and the news reports above quote them.",
      "We add for and against columns only from each side's own case, read at its own source: a statement, testimony or page it published itself. We have read the supporters' case that way, but not yet the opponents', so neither column is shown yet.",
      "The Legislature's journals record how every member voted on this amendment, but no member filed a written explanation of their vote.",
    ],
    updated: "2026-10-04",
  },
};

export function heldNote(measureId: string): HeldNote | null {
  return HELD_NOTES[measureId] ?? null;
}
