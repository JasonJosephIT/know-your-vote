/* The incumbency line on candidate cards (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.1,
   §3.5 and §3.11; D1 to D3, each Recommended pending founder confirmation).
   The only place in src/ that reads candidate.is_incumbent or the
   incumbency columns 0049 adds.

   What a voter sees once SHOW_INCUMBENT_CHIP is true: one line under the
   party chip on every card in a race, "<label>: Yes" or "<label>: No", as
   plain caption text (IncumbencyLine, src/components/features/RosterLines.tsx).
   The label is the same on every card in the race; only the value differs,
   as the name does. It replaces the "Incumbent" chip, which only an
   incumbent got: a label some candidates get and others do not is what the
   house rule forbids, so a chip shown only when true is not offered (D2).

   Each label states a fact that is true of the person beside it (D1). A
   member of a body counts whatever seat they hold, so on FL-20, where
   Wasserman Schultz holds District 25 under the map she was elected on, the
   line says she is a member of the U.S. House, never that she holds
   District 20. "Holds this office now" is used only for an office one
   person holds.

   All or none per race: incumbencyFor returns the line only when every
   ballot candidate in the race has incumbency_verified_at (0049). A
   candidate added later without a source hides the line for the whole race
   instead of reading "No", because before 0049 false only meant "unknown"
   (0031:41-43, 0038).

   Computed at render, on the rows the cached loaders return (the race page
   and the candidate page call incumbencyFor), so a change here, the flip
   included, takes effect on the deploy that ships it (§3.9).
   race.incumbent_id and race.is_open_seat stay unread in src/: the line
   carries the fact a voter needs (D4).

   ------------------------------------------------------------------------
   TO FLIP (set SHOW_INCUMBENT_CHIP to true) only when every one of these
   holds, with the query output pasted into the flip PR (spec §3.11):
   1. 0049_roster_completeness is applied live and its DO block passed.
   2. Every ballot candidate carries a source. Must return 0:
        SELECT count(*) FROM candidate c
         WHERE c.ballot_status = 'ballot'
           AND EXISTS (SELECT 1 FROM race r WHERE c.candidate_id = ANY (r.candidate_ids))
           AND c.incumbency_verified_at IS NULL;
   3. Every race agrees with its candidates. Must return no rows:
        SELECT r.race_id
          FROM race r
          CROSS JOIN LATERAL (
            SELECT count(*) FILTER (WHERE c.is_incumbent)                         AS n_inc,
                   max(c.candidate_id) FILTER (WHERE c.is_incumbent)              AS one_inc,
                   coalesce(bool_or(c.is_incumbent AND c.candidate_id = r.incumbent_id), false) AS named_ok
              FROM candidate c
             WHERE c.candidate_id = ANY (r.candidate_ids) AND c.ballot_status = 'ballot') s
         WHERE r.is_open_seat <> (r.incumbent_id IS NULL)
            OR (r.incumbent_id IS NOT NULL AND NOT s.named_ok)
            OR (s.n_inc = 1 AND r.incumbent_id IS DISTINCT FROM s.one_inc);
   4. node scripts/verify-incumbent-chip.ts passes, including the label
      check over the 53 production race ids.
   5. The display is merged and deployed with the flag still false, and its
      live check is done.
   6. The founder says yes by Thu 10-15 (D3), and the flip PR is merged and
      deployed by Fri 10-16 18:00 EDT. If any of these misses, the flag stays
      false through Nov 3.
   The flip PR sets the constant, changes the one expectation in
   scripts/verify-incumbent-chip.ts that pins it, and adds the methodology
   paragraph (§3.5). A wrong value anywhere is handled the other way round
   (§3.10): one line setting it back to false hides the line on every race
   at once and writes nothing; under D3 it then stays off through Nov 3.
   FLIPPED 2026-10-09 with the founder's yes: 0049 applied live, gate
   queries 2 and 3 both 0, the display (#144) deployed and checked live.
   The query output is in the flip PR.
   ------------------------------------------------------------------------ */
export const SHOW_INCUMBENT_CHIP: boolean = true;

/* The label table (§3.5), keyed on race_id, first match wins. A race_id no
   row matches gets no label, and its race shows no line. */
const LABELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^FL-\d+-general$/, "Member of the U.S. House now"],
  [/^FL-SEN-general$/, "Member of the U.S. Senate now"],
  [/^FL-(GOV|ATG|CFO|AGR|ORA-MAYOR|ORA-CLERK)-general$/, "Holds this office now"],
  [/^FL-BRO-CC[A-Z0-9]*-general$/, "Member of the Broward County Commission now"],
  [/^FL-DAD-CC[A-Z0-9]*-general$/, "Member of the Miami-Dade County Commission now"],
  [/^FL-HIL-CC[A-Z0-9]*-general$/, "Member of the Hillsborough County Commission now"],
  [/^FL-ORA-CC[A-Z0-9]*-general$/, "Member of the Orange County Commission now"],
  [/^FL-BRO-SB[A-Z0-9]*-general$/, "Member of the Broward County School Board now"],
  [/^FL-DAD-SB[A-Z0-9]*-general$/, "Member of the Miami-Dade County School Board now"],
  [/^FL-HIL-SB[A-Z0-9]*-general$/, "Member of the Hillsborough County School Board now"],
  [/^FL-ORA-SB[A-Z0-9]*-general$/, "Member of the Orange County School Board now"],
];

export function incumbencyLabel(raceId: string): string | null {
  for (const [pattern, label] of LABELS) if (pattern.test(raceId)) return label;
  return null;
}

/** One race's line: the label every card in it shows, and each ballot
    candidate's value, true for Yes and false for No. */
export interface Incumbency {
  label: string;
  byCandidate: Readonly<Record<string, boolean>>;
}

/** The fields incumbencyFor reads. incumbency_verified_at is optional
    because a row read before 0049 was applied has no such field, and
    missing means "not set". */
export interface IncumbencyRow {
  candidate_id: string;
  is_incumbent: boolean;
  incumbency_verified_at?: string | null;
}

/** The race's line, or null when no card in it shows one: the flag is off,
    the race has no label or no candidates, or any candidate lacks a source. */
export function incumbencyFor(
  race: { race_id: string },
  candidates: readonly IncumbencyRow[]
): Incumbency | null {
  if (!SHOW_INCUMBENT_CHIP) return null;
  const label = incumbencyLabel(race.race_id);
  if (!label || candidates.length === 0) return null;
  if (!candidates.every((c) => Boolean(c.incumbency_verified_at))) return null;
  const byCandidate: Record<string, boolean> = {};
  for (const c of candidates) byCandidate[c.candidate_id] = c.is_incumbent === true;
  return { label, byCandidate };
}

/** One card's text, "<label>: Yes" or "<label>: No" from one template, or
    null when its race shows no line. */
export function incumbencyLine(
  incumbency: Incumbency | null,
  candidateId: string
): string | null {
  if (!incumbency || !Object.hasOwn(incumbency.byCandidate, candidateId)) return null;
  return `${incumbency.label}: ${incumbency.byCandidate[candidateId] ? "Yes" : "No"}`;
}
