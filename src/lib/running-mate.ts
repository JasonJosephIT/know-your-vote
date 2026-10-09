/* The running-mate line on every Governor card (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.6; D5
   and D6, Recommended pending founder confirmation). The only place in src/
   that reads candidate.running_mate and its source columns (0049).

   Florida elects the governor and lieutenant governor as one ticket. The
   Division of Elections' candidate export has no running-mate field; its
   per-candidate canDetail page does (§2.6), and 0049 stores each ticket's
   name from that page with the page's URL and the read date.

   All or none: runningMatesFor returns names only when every ballot
   candidate in the race has running_mate; otherwise null, and no card in the
   race shows the line. There is no constant: the gate is the data, and 0049
   fills all eight tickets in one statement after a reviewed read. Clearing
   one row's three columns (the takedown in §3.10) hides all eight. Only a
   Governor row can hold a running mate (a CHECK in 0049), so no other race
   shows the line. No link, party, photo or page for a running mate: every
   ticket gets exactly the name, as stored.

   TO FLIP (D5: store only, show nothing until after Nov 3): make
   runningMatesFor return null. The columns stay.

   Relative imports with the extension: plain-Node scripts import this
   (scripts/roster-reads-lib.ts, scripts/verify-running-mate.ts). */

import { decodeEntities } from "./candidate-site.ts";

/** D6: decode HTML entities, turn non-breaking spaces into spaces, collapse
    every run of whitespace (spaces, tabs, CR, LF) to one space, trim.
    Nothing else changes: case, accents and punctuation stay as printed.
    Fail-closed: an entity the decoder does not know (say `&ntilde;`) throws,
    so a half-decoded name can never be stored. */
export function normalizeDoeText(raw: string): string {
  const decoded = decodeEntities(raw).replace(/\xa0/g, " ");
  const leftover = decoded.match(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i);
  if (leftover) {
    throw new Error(`normalizeDoeText: undecoded entity ${leftover[0]} in ${JSON.stringify(raw)}`);
  }
  return decoded.replace(/\s+/g, " ").trim();
}

/** By candidate_id, the running mate each Governor card prints. */
export type RunningMates = Readonly<Record<string, string>>;

/** The fields runningMatesFor reads. running_mate is optional because a row
    read before 0049 was applied has no such field, and missing means "not
    set". */
export interface RunningMateRow {
  candidate_id: string;
  running_mate?: string | null;
}

/** Every candidate's running mate, only when each one in the race has one;
    null when the race is empty or any candidate has none. */
export function runningMatesFor(candidates: readonly RunningMateRow[]): RunningMates | null {
  if (candidates.length === 0) return null;
  const names: Record<string, string> = {};
  for (const c of candidates) {
    const name = c.running_mate;
    if (!name || !name.trim()) return null;
    names[c.candidate_id] = name;
  }
  return names;
}

/** One card's line, "Running mate for Lieutenant Governor: <name>", or null
    when its race shows none. */
export function runningMateLine(runningMates: RunningMates | null, candidateId: string): string | null {
  if (!runningMates || !Object.hasOwn(runningMates, candidateId)) return null;
  return `Running mate for Lieutenant Governor: ${runningMates[candidateId]}`;
}
