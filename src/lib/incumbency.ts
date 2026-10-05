/* Whether a candidate card shows the "Incumbent" chip (CandidateBrief on a
   published race, ListedCandidateCard on a listed one). The only place in
   src/ that reads candidate.is_incumbent.

   ------------------------------------------------------------------------
   Recommended (pending founder confirmation): show the chip for nobody
   until every ballot candidate's is_incumbent has been set from a verified
   source. Until then SHOW_INCUMBENT_CHIP is false and both cards render no
   chip at all.

   Why. A read-only SELECT on production, 2026-10-05: is_incumbent is true
   for exactly one of the 106 ballot-tier candidates, Patricia "Patti" Rendon
   (FL-VF-HIL-2672), unopposed in the listed race FL-HIL-SB4-general. 0038 set
   that one row by hand. Every other sitting officeholder on the ballot
   (Moody, Castor, Salazar, Wasserman Schultz, Uthmeier, Simpson, and the
   county commissioners and school board members running for their own
   seats) is false, because false has only ever meant "unknown": 0031 left it
   false where the county lists do not state incumbency, 0038 says so again,
   and the B4 incumbency write (docs/general-election/data-ingest.md §7, B4)
   has code but has never run against the live database. The same run fills
   race.incumbent_id (null on all 53 races) and race.is_open_seat (false on
   all 53), which is why nothing in src/ reads those either.

   So the chip did not mark incumbents. It marked one, and beside her every
   other incumbent read as a challenger. The card header is identical for
   every candidate on purpose (equal space and equal scrutiny are layout
   invariants, CandidateBrief), and a label that one person in 106 gets breaks
   that as surely as a wider column would.

   Fixed in code, not data. Clearing Rendon's flag would hide the chip today
   too, but it would delete a true fact and leave the display one hand-set row
   away from the same problem. Gating the display is what keeps a partly
   filled column from reaching a voter, whichever rows get filled next.

   TO FLIP (set SHOW_INCUMBENT_CHIP to true) only when all of these hold:
   - every ballot-tier candidate (ballot_status = 'ballot', the ones any race
     lists) has is_incumbent set from a verified source: the B4 FEC run for
     the federal seats, and an official roster (the Division of Elections, the
     county Supervisor of Elections, the body's own member page) for the
     state and county ones;
   - a false on any of them is a checked "not the sitting officeholder", not
     a default;
   - race.incumbent_id agrees with it (the incumbent's id where one runs).
   Nothing else needs editing: both cards call showIncumbentChip, and
   scripts/verify-incumbent-chip.ts checks that nothing else renders the chip
   or reads the incumbency columns.
   ------------------------------------------------------------------------ */
export const SHOW_INCUMBENT_CHIP: boolean = false;

/* Pure, and takes only the one field, so verify-incumbent-chip.ts can drive
   it under plain node with no Candidate row. */
export function showIncumbentChip(candidate: {
  is_incumbent: boolean;
}): boolean {
  return SHOW_INCUMBENT_CHIP && candidate.is_incumbent;
}
