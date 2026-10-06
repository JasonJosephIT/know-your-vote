/* The order candidates are listed in, everywhere a race shows its candidates:
   Florida's own order for the November ballot, so the page reads in the same
   order as the voter's sample ballot.

   Partisan races, s. 101.151(3), Fla. Stat. (2025):
     (a) "The names of the candidates of the party that received the highest
         number of votes for Governor in the last election in which a
         Governor was elected shall be placed first for each office on the
         general election ballot ... the names of the candidates of the party
         that received the second highest vote for Governor shall be placed
         second for each office".
     (b) "Minor political party candidates shall have their names appear on
         the general election ballot following the names of recognized
         political parties, in the same order as they were qualified,
         followed by the names of candidates with no party affiliation, in the
         order as they were qualified."
   The last governor's race was 2022: the Republican candidate won and the
   Democrat came second, so for the 2026 general REP is first and DEM second.
   That comes from the statute and the 2022 result, not from us. It flips only
   when a later governor's race does, and PARTY_RANK below is the one place to
   change it then.

   Nonpartisan races, s. 105.041(2): "The names of candidates for election to
   each nonpartisan office shall be listed in alphabetical order." The county
   ballots alphabetize by surname (the Orange County composite sample ballot
   for Nov 3 2026 lists Zack Green before Jimm Middleton for Soil and Water
   District 5), and so does this.

   Qualifying order is not in any feed we read. The DoE export has no
   qualifying date, so race.candidate_ids carries it: migration 0044 put
   every general race's array in ballot order, taking FL-GOV's from the
   Orange County composite sample ballot (FL-GOV is the only 2026 race with
   more than one minor-party or no-party candidate). Within a rank, position
   in candidate_ids decides.

   This replaced a sort by position in candidate_ids alone. The intake
   pipeline filled that array sorted by candidate-ID string, and the county
   seeds in whatever order the county list came in, so on 2026-10-05 17 of the
   25 contested partisan races were out of ballot order and 11 listed the
   Democrat ahead of the Republican.

   Pure and dependency-free, so scripts/verify-ballot-order.ts drives it with
   no build and no database. */

export interface BallotOrderCandidate {
  candidate_id: string;
  legal_name: string;
  party: string | null;
}

/* Codes that are not a party affiliation. "" is how Orange, Broward and
   Hillsborough record a nonpartisan seat and NOP is how Miami-Dade does
   (party-label.ts rule 3). WRI is the write-in marker, never a party, and
   write-ins are kept out of candidate_ids anyway (data-architecture.md D1). */
const NOT_A_PARTY = new Set(["", "NOP", "WRI"]);

/* s. 101.151(3)(a) after the 2022 governor's race, then (3)(b). Any other
   code is a minor party (LPF, IND = Independent Party of Florida, CPF, GRE,
   the schema's catch-all "other", ...). */
const PARTY_RANK = new Map([
  ["REP", 0],
  ["DEM", 1],
]);
const MINOR_PARTY_RANK = 2;
const NO_PARTY_RANK = 3;

const code = (party: string | null | undefined) =>
  (party ?? "").trim().toUpperCase();

/** Whether the race is partisan: any candidate carries a party code,
    NPA included (a no-party candidate in a partisan race is still on a
    partisan ballot line). Nonpartisan seats carry "" or NOP for everyone. */
export function isPartisanRace(
  candidates: ReadonlyArray<Pick<BallotOrderCandidate, "party">>
): boolean {
  return candidates.some((c) => !NOT_A_PARTY.has(code(c.party)));
}

/** Where a party's candidates sit on a partisan general-election ballot. A
    candidate with no code at all in a partisan race is read as no party,
    the weaker claim, and listed with NPA. */
export function partyRank(party: string | null | undefined): number {
  const c = code(party);
  const major = PARTY_RANK.get(c);
  if (major !== undefined) return major;
  if (c === "NPA" || NOT_A_PARTY.has(c)) return NO_PARTY_RANK;
  return MINOR_PARTY_RANK;
}

const SUFFIX = /^(?:jr|sr|ii|iii|iv|v)\.?$/i;

/** The surname a nonpartisan ballot alphabetizes on: the last word of the
    legal name once a quoted nickname ('Kenneth "Ken" Gay') and a generational
    suffix ("Victor M. Torres Jr.", "Roberto Fernandez III") are set aside.
    A hyphenated surname stays whole ("Bendross-Mindingall").

    Limit: an unhyphenated two-word surname is read by its last word, since
    legal_name does not mark where the surname starts. No 2026 nonpartisan
    race in coverage turns on it; "Jeannette Quinones Hernandez" against
    "Victor M. Torres Jr." sorts the same on either reading. */
export function surnameOf(legalName: string): string {
  const words = legalName
    .replace(/["“”][^"“”]*["“”]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/,+$/, ""))
    .filter(Boolean);
  while (words.length > 1 && SUFFIX.test(words[words.length - 1])) {
    words.pop();
  }
  return words[words.length - 1] ?? "";
}

/* "en" with base sensitivity: case and accents do not reorder anyone
   ("Peña" sorts as "Pena"), and the result does not depend on the server's
   locale. */
const compareText = (a: string, b: string) =>
  a.localeCompare(b, "en", { sensitivity: "base" });

/** The candidates of ONE race, in Florida's ballot order (see the header).

    `ballotOrder` is the race's candidate_ids. It breaks ties inside a party
    rank (the qualifying order of minor-party and no-party candidates) and
    nothing else: the party rule decides first, so a stored array that lists
    the Democrat first still comes out Republican first. A candidate missing
    from it sorts after those present. Nonpartisan races ignore it.

    The input may be a subset of the race (the directory's name search), and
    the subset comes out in the same relative order as the whole race. Legal
    name, then candidate_id, end every comparison so the result never depends
    on the order the database returned rows in. */
export function orderCandidates<T extends BallotOrderCandidate>(
  candidates: readonly T[],
  ballotOrder: readonly string[]
): T[] {
  const byId = (a: T, b: T) =>
    a.candidate_id < b.candidate_id
      ? -1
      : a.candidate_id > b.candidate_id
        ? 1
        : 0;
  const lastResort = (a: T, b: T) =>
    compareText(a.legal_name, b.legal_name) || byId(a, b);

  if (!isPartisanRace(candidates)) {
    return [...candidates].sort(
      (a, b) =>
        compareText(surnameOf(a.legal_name), surnameOf(b.legal_name)) ||
        lastResort(a, b)
    );
  }

  const position = new Map(ballotOrder.map((id, i) => [id, i]));
  const at = (c: T) => position.get(c.candidate_id) ?? Number.MAX_SAFE_INTEGER;
  return [...candidates].sort(
    (a, b) =>
      partyRank(a.party) - partyRank(b.party) ||
      at(a) - at(b) ||
      lastResort(a, b)
  );
}

/* The order of OFFICES, for the lists of races (the landing page's statewide
   rows and the races view): s. 101.151(2)(a), Fla. Stat. (2025), checked
   2026-10-05:
     "The ballot must include the following office titles above the names of
      the candidates for the respective offices in the following order: ...
      2. The office titles of United States Senator and Representative in
      Congress. 3. The office titles of Governor and Lieutenant Governor;
      Attorney General; Chief Financial Officer; Commissioner of
      Agriculture; ..."
   Keyed on race.office as stored, which says "United States Representative"
   for the statute's "Representative in Congress". The lists used to sort by
   level descending, then race_id, which put Commissioner of Agriculture
   first and the U.S. Senate last (interface review 2026-10-05). An office
   not named here (county seats, any future title) sorts after these, in
   race_id order, so nothing is dropped and nothing jumps the queue. */
const OFFICE_ORDER = [
  "United States Senator",
  "United States Representative",
  "Governor",
  "Attorney General",
  "Chief Financial Officer",
  "Commissioner of Agriculture",
];

export function officeRank(office: string): number {
  const i = OFFICE_ORDER.indexOf(office.trim());
  return i === -1 ? OFFICE_ORDER.length : i;
}

/** Races in ballot order of their offices, race_id breaking ties. */
export function orderRaces<T extends { office: string; raceId: string }>(
  races: readonly T[]
): T[] {
  return [...races].sort(
    (a, b) =>
      officeRank(a.office) - officeRank(b.office) ||
      (a.raceId < b.raceId ? -1 : a.raceId > b.raceId ? 1 : 0)
  );
}
