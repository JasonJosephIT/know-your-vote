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
      this is the belt to that brace, at one condition.)
   3. NOP is not a party either, and arrives for the same structural reason.
      Florida school board races are nonpartisan by constitution, and several
      county offices are nonpartisan by charter — those ballots print no party
      at all. The counties disagree only on how they say so: Miami-Dade's
      candidate list emits the code NOP, while Orange, Broward and
      Hillsborough leave the field blank for the very same kind of race. Rule
      1 already handles the blank; without this, the identical fact would
      render as a chip reading "NOP" in one county and as nothing in the next.
      Same reasoning as WRI — a non-affiliation must not be printed as an
      affiliation. */

import type { Party } from "@/types/schema";
import { partyRank } from "./ballot-order.ts";

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
  if (!code || code === "WRI" || code === "NOP") return null;
  /* The schema's catch-all bucket is the one code that is not a real DoE
     PartyCode, so it is the one that needs prose. */
  return code === "other" ? "Other" : code;
}

/* What each code means, for the one legend line above a list of candidates
   (interface review 2026-10-05: DoE codes such as NPA and LPF are jargon to
   most voters, and nothing explained them). The chips and rows keep the code
   exactly as the ballot prints it, the same form for every party; the
   legend says once what the codes in that list stand for.

   The names are the Division of Elections' own PartyDesc for each code, as
   the candidate file carries them (docs/general-election/data-ingest.md,
   intake run). One edit: NPA's "No Party Affiliation (Partisan)" drops
   "(Partisan)", the DoE's marker for a no-party candidate in a partisan
   race, which is every place this legend appears. IND is the Independent
   Party of Florida, a party, which is exactly the kind of thing a voter
   would otherwise misread. A code with no entry here is left out of the
   legend rather than guessed at. */
const PARTY_NAMES: Record<string, string> = {
  REP: "Republican Party of Florida",
  DEM: "Florida Democratic Party",
  CPF: "Constitution Party of Florida",
  IND: "Independent Party of Florida",
  LPF: "Libertarian Party of Florida",
  NPA: "no party affiliation",
};

/** One sentence naming every party code in `parties`, in ballot order (the
    two major parties, then minor parties, then NPA), or null when there is
    nothing to explain (a nonpartisan list). */
export function partyLegend(
  parties: ReadonlyArray<Party | string | null | undefined>
): string | null {
  const codes = [
    ...new Set(
      parties
        .map((p) => partyLabel(p as Party))
        .filter((c): c is string => c !== null && c in PARTY_NAMES)
    ),
  ].sort((a, b) => partyRank(a) - partyRank(b) || (a < b ? -1 : a > b ? 1 : 0));
  if (codes.length === 0) return null;
  return `Party codes, as the ballot prints them: ${codes
    .map((c) => `${c}, ${PARTY_NAMES[c]}`)
    .join("; ")}.`;
}
