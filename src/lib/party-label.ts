/* Party display rules (data-architecture.md D2).

   Migration 0013 dropped `candidate.party`'s CHECK so the DoE `PartyCode` is
   stored verbatim — IND, LPF and CPF are all printed ballot lines in the
   target races and were being flattened into `other`. That moves the burden
   onto display logic, so this file is pure and dependency-free and
   scripts/verify-party-label.ts drives it. Same split as news-labels.ts, and
   for the same reason: the rules below are neutrality rules, not styling.

   1. Never an empty chip. A blank pill reads as a value the voter is meant to
      interpret. MGT is the case that forced this — the DoE ships it with an
      EMPTY PartyDesc, so a fallback assuming a label exists prints nothing
      inside a visible container.
   2. WRI is not a party. It is the write-in marker occupying the PartyCode
      column, and a chip reading "WRI" would present an unknown affiliation as
      a known one. (Write-ins are excluded from the app entirely under D1;
      this is the belt to that brace, at one condition.) */

import type { Party } from "@/types/schema";

/** What to print for a party code, or null for "print no chip at all".

    A code renders as itself. There was a LABELS map here mapping REP→"REP",
    LPF→"LPF" and so on; a mutation test proved every row except `other` was
    an identity the fallback already produced, so the map was documentation
    pretending to be logic — and worse, it invited adding a row for each new
    code when adding one would change nothing. If a real label is ever wanted
    (LPF → "Libertarian"), reintroduce a map for the codes that differ, not
    for all of them. */
export function partyLabel(party: Party | null | undefined): string | null {
  const code = (party ?? "").trim();
  if (!code || code === "WRI") return null;
  /* The schema's catch-all bucket is the one code that is not a real DoE
     PartyCode, so it is the one that needs prose. */
  return code === "other" ? "Other" : code;
}
