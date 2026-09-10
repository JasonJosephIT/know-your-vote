/* "This contest is not on your ballot" — decision D-B (founder 2026-09-07).

   Florida marks a candidate `UNO` when nobody filed against them, and
   F.S. 101.151(7) then keeps that contest off the general ballot entirely:
   there is no line to vote on and the candidate takes the office. FL-10 is in
   exactly that shape this cycle, as are state senate districts 4 and 16 and 28
   state house districts (ballots-handoff.md §2, finding F2).

   The founder's decision was to CARRY the DoE's code — migration 0023 widened
   `candidate.qualifying_status` and `intake.py` maps `UNO -> 'unopposed'` —
   rather than derive the state here. The derivation ("one ballot-tier
   candidate and no write-in") was rejected because it cannot see the
   difference between FL-10 and a race whose other candidates withdrew AFTER
   qualifying: that survivor is `qualified`, their ballot is already printed,
   and the derivation would tell a voter their race does not exist.

   NOT the same thing as the Balance Audit's `unopposed` flag (A3, set in
   toollayer/cap_toollayer/synthesis.py as `len(audited) == 1`). That one means
   "there was nobody to compare against", which is true of the withdrawn-
   opponents race too, and it is what the race page's existing single-candidate
   copy answers to. This is the stronger claim — there is no contest on the
   ballot — and the whole point of D-B is that the two cannot be collapsed.

   Pure and dependency-free (the one import is type-only, so it is erased at
   runtime) — scripts/verify-unopposed.ts drives it, same split as
   party-label.ts and measure-balance.ts. */

import type { Candidate } from "@/types/schema";

/** Whether this race is not printed on any ballot.

    `hasWriteIn` is the second half of the legal test and cannot be read off
    the candidates: a qualified write-in IS opposition, so the office appears
    on the ballot with the candidate's name and a blank write-in line under it.
    The app never shows write-ins (data-architecture.md D1), but one existing
    still decides this — and it is the caller's job to look, because D1's
    filtering removes them before the race brief is built. */
export function isUnopposedContest(
  ballotCandidates: ReadonlyArray<Pick<Candidate, "qualifying_status">>,
  hasWriteIn: boolean
): boolean {
  return (
    ballotCandidates.length === 1 &&
    ballotCandidates[0].qualifying_status === "unopposed" &&
    !hasWriteIn
  );
}
