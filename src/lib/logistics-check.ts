/* R2's logistics checks: the decidable half (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.6).

   R2 checks what voters act on and proposes changes; it never changes a
   voter-facing value. Statewide and federal qualifying statuses come from the
   Division of Elections' candidate extract, county statuses from the four
   VoterFocus lists, both read by code. Official dates are read by the agent
   from each election_event row's own details_url and compared here. What
   differs becomes a pending review item: a `gated_diff` on
   candidate.qualifying_status, or a `date_mismatch` against election_event,
   whose approval records the finding and writes nothing (D3). A covered
   county office a list shows with a live filer and no race row of ours, and
   each candidate the list (county) or the extract (statewide and House) and
   our race disagree on (MISSING, EXTRA), is a report line: a missing race or
   candidate is a migration, never a review item.

   Pure: no fetch, no clock, no database. scripts/logistics-check.ts is the
   I/O around these rules; scripts/verify-logistics-check.ts drives this file
   offline. No rule here reads party. Relative imports with the extension:
   plain-Node scripts import this. */

import { normalizeName } from "./candidate-leads.ts";
import { canonicalizeUrl, decodeEntities, isSameSite, looksLikeBotChallenge } from "./candidate-site.ts";
import { coveredCounty } from "./counties.ts";
import type { BallotRosterCandidate } from "./news-intake.ts";
import { NAME_VARIANTS } from "./news-match.ts";
import { supervisorSite } from "./supervisors.ts";
import {
  DateMismatchPayloadSchema,
  GatedDiffPayloadSchema,
  type DateMismatchElectionEventPayload,
  type GatedDiffPayload,
} from "../types/admin.ts";
export type QualifyingStatus = "qualified" | "unopposed" | "elected_in_primary" | "withdrawn" | "other";

/** Who R2's review items say proposed them. */
export const R2_SOURCE = "agent:R2";
/** The governor race: its candidates' DoE pages name their running mates. */
export const GOVERNOR_RACE_ID = "FL-GOV-general";
/** A statewide date may cite only the Division of Elections' own site. */
export const STATEWIDE_DATE_HOST = "dos.fl.gov";
export const MAX_DATE_OBSERVATIONS = 30;
export const MAX_UNREADABLE = 20;
/* ---- the Division of Elections extract (FL-DOE candidates) -------------- */

export const DOE_EXTRACT_URL = "https://dos.elections.myflorida.com/candidates/extractCanList.asp";
export const DOE_ELECTION_ID = "20261103-GEN";
export type DoeOfficeGroup = "FED" | "CAB";

/** The POST form, as intake.py's _default_doe_fetch sends it
    (Civic Awareness (Know Your Vote)/toollayer/cap_toollayer/intake.py:825-831). */
export function doeExtractForm(group: DoeOfficeGroup): Record<string, string> {
  return {
    elecID: DOE_ELECTION_ID,
    office: group,
    status: "All",
    cantype: "ALL",
    FormSubmit: "Download Candidate List",
  };
}

/** The candidate's own Division of Elections page: the URL a gated_diff
    cites, since the extract is a POST an operator cannot open. <n> is the
    number in FL-DOE-<n>. */
export const canDetailUrl = (account: string): string =>
  `https://dos.elections.myflorida.com/candidates/canDetail.asp?account=${encodeURIComponent(account)}`;

/** A TypeScript copy of intake.py's `_STATUS` (intake.py:137-141).
    scripts/verify-logistics-check.ts reads the Python source and fails when
    the two differ. */
export const DOE_STATUS: Readonly<Record<string, QualifyingStatus>> = {
  QUA: "qualified",
  UNO: "unopposed",
  WIT: "withdrawn",
  DEF: "withdrawn",
  DNQ: "withdrawn",
  REM: "withdrawn",
  XTL: "other",
  DEC: "other",
};

/** The extract's office group for an FL-DOE candidate's race level: U.S.
    Senate and House are FED; Governor and the Cabinet are CAB
    (docs/general-election/data-ingest.md §1). */
export function doeOfficeGroup(level: string): DoeOfficeGroup | null {
  return level === "federal" ? "FED" : level === "state" ? "CAB" : null;
}

/** One extract row, with ONLY the columns R2 needs. */
export interface DoeStatusRow {
  acctNum: string;
  officeCode: string;
  juris: string;
  statusCode: string;
  /** StatusDesc as the extract prints it: "Qualified", "Withdrew". */
  statusDesc: string;
  /** NameFirst NameLast, for report lines. */
  name: string;
  /** PartyCode WRI. The party itself is not kept. */
  writeIn: boolean;
}

/** Parse the tab-separated extract, keeping AcctNum, OfficeCode, Juris1num,
    StatusCode, StatusDesc, the first and last name and whether PartyCode is
    WRI, and dropping every other column here, in memory: the file carries
    addresses, phones, emails and treasurers (intake.py:12-16), and none of
    that, nor any party, may reach a file the CLI writes. null when the text
    is not the extract (a missing column: an error or challenge page). */
export function parseDoeExtract(text: string): DoeStatusRow[] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const header = lines[0].split("\t").map((h) => h.trim());
  const at = ["AcctNum", "OfficeCode", "Juris1num", "StatusCode", "StatusDesc", "NameFirst", "NameLast", "PartyCode"].map((h) =>
    header.indexOf(h),
  );
  if (at.some((i) => i < 0)) return null;
  const [iAcct, iOffice, iJuris, iStatus, iDesc, iFirst, iLast, iParty] = at;
  const rows: DoeStatusRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const col = (i: number) => (cols[i] ?? "").trim();
    if (!col(iAcct)) continue;
    rows.push({
      acctNum: col(iAcct),
      officeCode: col(iOffice),
      juris: col(iJuris),
      statusCode: col(iStatus),
      statusDesc: col(iDesc),
      name: `${col(iFirst)} ${col(iLast)}`.trim(),
      writeIn: col(iParty) === "WRI",
    });
  }
  return rows;
}

/* intake.py's _NO_DISTRICT_RACES; a U.S. House row is FL-<n>-general. */
const DOE_NO_DISTRICT: Readonly<Record<string, string>> = {
  GOV: "FL-GOV-general",
  ATG: "FL-ATG-general",
  CFO: "FL-CFO-general",
  AGR: "FL-AGR-general",
  USS: "FL-SEN-general",
};

/** The race an extract row files under, named as intake.py names it, or null
    for an office the guide does not carry. A cross-check only: an account
    found under another office is a report line, never a diff. */
export function doeRaceId(officeCode: string, juris: string): string | null {
  const flat = DOE_NO_DISTRICT[officeCode];
  if (flat) return flat;
  if (officeCode === "USR" && /^\d{1,3}$/.test(juris)) return `FL-${Number(juris)}-general`;
  return null;
}

/* ---- VoterFocus (FL-VF candidates) ------------------------------------- */

export function voterFocusListUrl(slug: string): string {
  return `https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=${encodeURIComponent(slug)}`;
}

/** VoterFocus label → qualifying_status (spec §3.6; labels from
    docs/general-election/roster-recalibration-2026-09-21.md §5). Withdrawn,
    Defeated and Did not qualify are `withdrawn`, as `_STATUS` maps WIT, DEF
    and DNQ. "Qualified Write-In", and any label not here, has no mapping:
    a report line, never a diff. */
export const VOTERFOCUS_STATUS: Readonly<Record<string, QualifyingStatus>> = {
  Qualified: "qualified",
  Runoff: "qualified",
  Unopposed: "unopposed",
  Elected: "elected_in_primary",
  Withdrawn: "withdrawn",
  Defeated: "withdrawn",
  "Did not qualify": "withdrawn",
};

export interface VoterFocusRow {
  /** The `ca=` number in the row's link; FL-VF-<PREFIX>-<ca> is our id. */
  ca: string | null;
  /** As VoterFocus prints it: "Marleine Bastien (NOP)", 'Patricia "Patti" Rendon'. */
  name: string;
  /** "County Mayor", "School Board, Dist. 1". */
  office: string;
  /** The row's status, the last status span; null when the row has none. */
  label: string | null;
}

const text = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Parse one county's candidate list, as the page was on 2026-10-08: each
    office is a `officename` div ("Office: County Mayor"), followed by one
    `detailrow candidate` div per filer holding a link with `ca=<n>`, a name
    cell, and a status cell "(Active-<span>Label</span>)" or
    "(<span>Inactive</span>-<span>Label</span>)". The label is the LAST
    status span. Empty when nothing parses: the caller reports it. */
export function parseVoterFocus(html: string): VoterFocusRow[] {
  const rows: VoterFocusRow[] = [];
  for (const block of html.split(/<div class="col-xs-12 officename">/i).slice(1)) {
    const end = block.indexOf("</div>");
    const office = text(end < 0 ? "" : block.slice(0, end)).replace(/^Office:\s*/i, "");
    for (const row of block.split(/<div class="col-xs-12 detailrow candidate/i).slice(1)) {
      const href = /<a class="rowlink" href="([^"]*)"/i.exec(row)?.[1] ?? "";
      const ca = /[?&;]ca=(\d+)/.exec(href)?.[1] ?? null;
      const name = /cf_indent" role="gridcell">([\s\S]*?)<\/div>/i.exec(row)?.[1];
      const status = /<span class="for-screen-reader">status<\/span>([\s\S]*?)<\/div>/i.exec(row)?.[1] ?? "";
      if (name === undefined) continue;
      const labels = [...status.matchAll(/<span class='statustext[^']*'>([^<]*)<\/span>/gi)].map((m) => text(m[1]));
      rows.push({ ca, name: text(name), office, label: labels.at(-1) ?? null });
    }
  }
  return rows;
}

export type VoterFocusMatch =
  | { kind: "match"; row: VoterFocusRow }
  | { kind: "none" }
  | { kind: "ambiguous"; count: number };

/** A roster candidate's row in their county's list, by normalizeName (spec
    §3.6). When the name matches several rows, the one whose `ca=` equals our
    id's last part wins (0031 built FL-VF-ORA-1236 from ca=1236); otherwise
    the match is ambiguous, a report line. */
export function matchVoterFocus(
  candidate: { candidateId: string; legalName: string },
  rows: readonly VoterFocusRow[],
): VoterFocusMatch {
  const key = normalizeName(candidate.legalName);
  const hits = rows.filter((r) => normalizeName(r.name) === key);
  if (hits.length === 1) return { kind: "match", row: hits[0] };
  if (hits.length === 0) return { kind: "none" };
  const ca = candidate.candidateId.split("-").at(-1);
  const byId = hits.filter((r) => r.ca === ca);
  return byId.length === 1 ? { kind: "match", row: byId[0] } : { kind: "ambiguous", count: hits.length };
}

/** The labels of a filer still in the contest or already its winner:
    Qualified, Runoff, Unopposed, Elected. A covered office with one of these
    needs a race row of ours. */
export const LIVE_LABELS: readonly string[] = Object.keys(VOTERFOCUS_STATUS).filter(
  (l) => VOTERFOCUS_STATUS[l] !== "withdrawn",
);

/* Countywide offices the guide carries, by race.district prefix (0031):
   Orange's mayor and clerk. The guide carries no other county's. */
const COUNTYWIDE_SEATS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  ORA: { "County Mayor": "MAYOR", "Clerk of the Courts": "CLERK" },
};

/** The race.district a VoterFocus office would be ours under, for the
    offices the guide carries (0031, 0032, 0057): each covered county's
    commission and school board seats, and Orange's mayor and clerk. The four
    lists spell them differently: "County Commission District 01" (Miami-Dade),
    "County Commissioner District 2" and "School Board Dist. 1" (Orange),
    "County Commission, Dist. 2" and "School Board, At Large 8" (Broward),
    "County Commissioner, Dist. 1" and "School Board Member, Dist. 2"
    (Hillsborough). undefined for an office the guide does not carry (county
    judges, community councils, CDDs and other special districts); null for
    one that reads like a covered office but does not parse: a report line. */
export function voterFocusSeat(prefix: string, office: string): string | null | undefined {
  const o = office.replace(/\s+/g, " ").trim();
  const seat = (code: string, n?: string) => `${prefix}-${code}${n === undefined ? "" : `-${Number(n)}`}`;
  let m = /^County Commission(?:er)?,? (?:District|Dist\.) (\d+)$/i.exec(o);
  if (m) return seat("CC", m[1]);
  m = /^School Board(?: Member)?,? (?:District|Dist\.) (\d+)$/i.exec(o);
  if (m) return seat("SB", m[1]);
  m = /^School Board,? At[- ]Large,? (?:District |Dist\. )?(\d+)$/i.exec(o);
  if (m) return seat("SBAL", m[1]);
  if (/^School Board Chair$/i.test(o)) return seat("SBCHAIR");
  const countywide = COUNTYWIDE_SEATS[prefix];
  if (countywide?.[o]) return seat(countywide[o]);
  if (/county commission|school board/i.test(o) || (countywide && /\b(mayor|clerk)\b/i.test(o))) return null;
  return undefined;
}

/** A VoterFocus name without the party code it prints after it, so no
    party reaches a report line: "Marleine Bastien (NOP)" → "Marleine Bastien". */
const withoutParty = (name: string): string => name.replace(/\s*\([A-Z]{2,4}\)$/, "");

/* ---- county rosters: every candidate, both directions ------------------ */

/** A candidate a county race row's candidate_ids names. */
export interface CountyRaceCandidate {
  candidateId: string;
  legalName: string;
  qualifyingStatus: string;
  ballotStatus: string;
}

/** A county race row as `check` reads it, whatever its publication: a draft
    race is ours, and listing it is a founder call, not R2's. */
export interface CountyRace {
  raceId: string;
  district: string;
  candidates: readonly CountyRaceCandidate[];
}

/** One covered office: VoterFocus's still-running filers against our race's. */
export interface RosterOffice {
  county: string;
  /** As the list prints it; null for a race of ours that no office on the list reads as. */
  office: string | null;
  district: string;
  /** null when we have no race row for the office. */
  raceId: string | null;
  /** VoterFocus's still-running filers, "Name (Label)". */
  running: string[];
  /** Our race's still-running candidates. */
  ours: string[];
  missing: string[];
  extra: string[];
  /** Pairs a person should confirm: a name-variant match, or an id whose names differ. */
  confirm: string[];
}

/** The label VoterFocus gives a qualified write-in. Founder rule D1 (0013):
    a write-in is kept out of race.candidate_ids, so it is never still running
    here, and one of ours that VoterFocus shows as a write-in is EXTRA. */
const WRITE_IN_LABEL = "Qualified Write-In";

const isLive = (r: VoterFocusRow): boolean => r.label !== null && LIVE_LABELS.includes(r.label);

/** In the race on our side: the ballot tier (D1) and not withdrawn. */
const runningOurs = (c: CountyRaceCandidate): boolean => c.ballotStatus === "ballot" && c.qualifyingStatus !== "withdrawn";

/** The first and last word of a normalised name (empty for a one-word name),
    and the words of any quoted nickname, which normalizeName drops. Hyphens
    split, so a double surname compares on its last part. */
function nameKey(name: string): { first: string; last: string; nick: string[] } {
  const nick = [...name.matchAll(/["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]/g)]
    .flatMap((m) => normalizeName(m[1]).split(" "))
    .filter(Boolean);
  const words = normalizeName(name).replace(/-/g, " ").split(" ").filter(Boolean);
  return words.length < 2 ? { first: "", last: "", nick } : { first: words[0], last: words.at(-1) as string, nick };
}

/** A loose match, for a person to confirm: the same surname, and a first name
    that is the other's first name, its quoted nickname ('Kenneth "Ken" Gay'),
    or a short form of it ("Rob" for "Robert"). */
export function looseNameMatch(a: string, b: string): boolean {
  const x = nameKey(a);
  const y = nameKey(b);
  if (!x.last || x.last !== y.last) return false;
  const fits = (p: typeof x, q: typeof x) =>
    p.first !== "" && (p.first === q.first || q.nick.includes(p.first) || (p.first.length >= 3 && q.first.startsWith(p.first)));
  return fits(x, y) || fits(y, x);
}

/** Every covered office on one county's list against our county races, both
    ways: MISSING is a filer still in the race (LIVE_LABELS) with no candidate
    of ours; EXTRA is a candidate of ours VoterFocus no longer lists as
    running (withdrawn, defeated, did not qualify, a write-in, under another
    office, or absent). Pairs on the `ca=` id our FL-VF-<PREFIX>-<ca> id
    carries, else on normalizeName within the office, else on NAME_VARIANTS
    or looseNameMatch, which is a CONFIRM line; so is anything not compared.
    Headings that read as one seat are one office. A covered office with a
    live filer and no race row is #178's `office:` line. Report lines only. */
export function compareCountyRoster(
  county: { name: string; raceDistrictPrefix: string },
  rows: readonly VoterFocusRow[],
  races: readonly CountyRace[],
): { offices: RosterOffice[]; report: string[] } {
  const prefix = county.raceDistrictPrefix;
  const report: string[] = [];
  const offices: RosterOffice[] = [];
  const show = (r: VoterFocusRow) => `${withoutParty(r.name)} (${r.label ?? "no label"})`;
  const quote = (name: string) => JSON.stringify(name);
  const caNote = (r: VoterFocusRow) => (r.ca ? `, ca=${r.ca}` : "");
  const idCa = (candidateId: string) => new RegExp(`^FL-VF-${prefix}-(\\d+)$`).exec(candidateId)?.[1] ?? null;
  const byCa = new Map(rows.flatMap((r) => (r.ca ? [[r.ca, r] as const] : [])));

  /* Our races by seat, each candidate once. A second race row for a seat is
     not compared, and says so. */
  const raceBy = new Map<string, CountyRace>();
  for (const race of races.filter((r) => r.district.startsWith(`${prefix}-`))) {
    const candidates = race.candidates.filter((c, i, all) => all.findIndex((x) => x.candidateId === c.candidateId) === i);
    const first = raceBy.get(race.district);
    if (!first) {
      raceBy.set(race.district, { ...race, candidates });
      continue;
    }
    offices.push({
      county: county.name, office: null, district: race.district, raceId: race.raceId, running: [],
      ours: candidates.filter(runningOurs).map((c) => c.legalName), missing: [], extra: [],
      confirm: [`a second race row for ${race.district}, beside ${first.raceId}; not compared`],
    });
  }

  /* Each heading's seat, and the covered offices by seat, in page order. */
  const seatOf = new Map<string, string | null | undefined>();
  const bySeat = new Map<string, { headings: string[]; filers: VoterFocusRow[] }>();
  for (const r of rows) {
    if (!seatOf.has(r.office)) {
      const seat = voterFocusSeat(prefix, r.office);
      seatOf.set(r.office, seat);
      if (seat === null && rows.some((x) => x.office === r.office && isLive(x))) {
        report.push(`office: ${county.name}'s VoterFocus office ${JSON.stringify(r.office)} reads like a covered seat but does not parse; not checked for a race row`);
      }
    }
    const seat = seatOf.get(r.office);
    if (typeof seat !== "string") continue;
    const office = bySeat.get(seat) ?? { headings: [], filers: [] };
    if (!office.headings.includes(r.office)) office.headings.push(r.office);
    office.filers.push(r);
    bySeat.set(seat, office);
  }

  /* Why one of ours, running on our side, is not running in `seat` on the
     list: an EXTRA reason, or a CONFIRM when it cannot be compared. */
  const notRunning = (c: CountyRaceCandidate, seat: string): { extra: string } | { confirm: string } => {
    const ca = idCa(c.candidateId);
    const row = ca === null ? undefined : byCa.get(ca);
    if (!row) return { extra: `not on ${county.name}'s VoterFocus list` };
    const rowSeat = seatOf.get(row.office);
    if (row.label === null || (!VOTERFOCUS_STATUS[row.label] && row.label !== WRITE_IN_LABEL)) {
      return { confirm: `${c.legalName} (${c.candidateId}) is ${JSON.stringify(row.label ?? "(no label)")} on VoterFocus, which has no mapping; not compared` };
    }
    if (rowSeat === seat) return { extra: `${row.label} on VoterFocus` };
    if (isLive(row) && typeof rowSeat !== "string") {
      return { confirm: `${c.legalName} (${c.candidateId}) is ${row.label} under ${JSON.stringify(row.office)}, which does not read as ${seat}; not compared` };
    }
    return { extra: `listed under ${row.office} on VoterFocus (${row.label}${caNote(row)})` };
  };

  for (const [seat, { headings, filers }] of bySeat) {
    const office = headings.join(" / ");
    const live = filers.filter(isLive);
    const race = raceBy.get(seat);
    if (!race && live.length === 0) continue;
    const entry: RosterOffice = {
      county: county.name,
      office,
      district: seat,
      raceId: race?.raceId ?? null,
      running: live.map(show),
      ours: (race?.candidates ?? []).filter(runningOurs).map((c) => c.legalName),
      missing: [],
      extra: [],
      confirm: [],
    };
    offices.push(entry);
    if (!race) {
      entry.missing = live.map(show);
      report.push(`office: ${county.name}'s VoterFocus list has ${office} with ${entry.missing.join(", ")}, and there is no ${seat} race row`);
      continue;
    }

    /* Pair each of ours with a row: the id first, for every candidate, so a
       name match never takes a row another candidate's id holds. */
    const pair = new Map<string, VoterFocusRow>();
    const taken = new Set<VoterFocusRow>();
    const elsewhere = new Set<string>();
    const unsure = new Map<string, number>();
    const unsureRows = new Map<VoterFocusRow, string>();
    for (const c of race.candidates) {
      const ca = idCa(c.candidateId);
      const row = ca === null ? undefined : byCa.get(ca);
      if (!row) continue;
      if (seatOf.get(row.office) !== seat) {
        elsewhere.add(c.candidateId);
        continue;
      }
      pair.set(c.candidateId, row);
      taken.add(row);
      if (normalizeName(row.name) !== normalizeName(c.legalName) && !looseNameMatch(row.name, c.legalName)) {
        entry.confirm.push(`ours ${quote(c.legalName)} (${c.candidateId}) is ca=${row.ca}, which VoterFocus names ${quote(withoutParty(row.name))}`);
      }
    }
    for (const how of ["name", "variant"] as const) {
      for (const c of race.candidates) {
        if (pair.has(c.candidateId) || elsewhere.has(c.candidateId) || unsure.has(c.candidateId)) continue;
        const spellings = [c.legalName, ...(NAME_VARIANTS[c.candidateId] ?? [])];
        const hits = filers.filter(
          (r) =>
            !taken.has(r) &&
            (how === "name"
              ? normalizeName(r.name) === normalizeName(c.legalName)
              : spellings.some((s) => normalizeName(s) === normalizeName(r.name) || looseNameMatch(s, r.name))),
        );
        if (hits.length > 1) {
          unsure.set(c.candidateId, hits.length);
          for (const r of hits) unsureRows.set(r, c.legalName);
          entry.confirm.push(`ours ${quote(c.legalName)} (${c.candidateId}) matches ${hits.length} rows: ${hits.map(show).join(", ")}`);
        }
        if (hits.length !== 1) continue;
        pair.set(c.candidateId, hits[0]);
        taken.add(hits[0]);
        if (how === "variant") {
          entry.confirm.push(`ours ${quote(c.legalName)} (${c.candidateId}) paired with VoterFocus ${quote(withoutParty(hits[0].name))}${caNote(hits[0]).replace(", ", " (")}${hits[0].ca ? ")" : ""} on a name variant`);
        }
      }
    }

    const pairedWith = new Map([...pair].map(([id, row]) => [row, id]));
    for (const r of live) {
      const id = pairedWith.get(r);
      const c = id === undefined ? undefined : race.candidates.find((x) => x.candidateId === id);
      if (c && runningOurs(c)) continue;
      const twin = unsureRows.get(r);
      entry.missing.push(
        c
          ? `${show(r)}, whom ours has as ${c.qualifyingStatus}, ${c.ballotStatus} (${c.candidateId})`
          : twin === undefined
            ? show(r)
            : `${show(r)}, not paired: ours ${quote(twin)} matches more than one row`,
      );
    }
    for (const c of race.candidates.filter(runningOurs)) {
      const row = pair.get(c.candidateId);
      if (row && isLive(row)) continue;
      const n = unsure.get(c.candidateId);
      if (n !== undefined) {
        entry.extra.push(`${c.legalName} (${c.candidateId}), matches ${n} rows on VoterFocus; not paired`);
        continue;
      }
      const why = row
        ? row.label === null || (!VOTERFOCUS_STATUS[row.label] && row.label !== WRITE_IN_LABEL)
          ? { confirm: `${c.legalName} (${c.candidateId}) is ${JSON.stringify(row.label ?? "(no label)")} on VoterFocus, which has no mapping; not compared` }
          : { extra: `${row.label} on VoterFocus` }
        : notRunning(c, seat);
      if ("extra" in why) entry.extra.push(`${c.legalName} (${c.candidateId}), ${why.extra}`);
      else entry.confirm.push(why.confirm);
    }
  }

  /* A race of ours that no covered office on the list reads as. */
  for (const race of raceBy.values()) {
    if (bySeat.has(race.district)) continue;
    const ours = race.candidates.filter(runningOurs);
    const entry: RosterOffice = {
      county: county.name, office: null, district: race.district, raceId: race.raceId, running: [],
      ours: ours.map((c) => c.legalName), missing: [], extra: [], confirm: [],
    };
    for (const c of ours) {
      const why = notRunning(c, race.district);
      if (!("extra" in why)) entry.confirm.push(why.confirm);
      else if (why.extra.startsWith("not on ")) {
        entry.extra.push(`${c.legalName} (${c.candidateId}), no office on ${county.name}'s VoterFocus list reads as ${race.district}`);
      } else entry.extra.push(`${c.legalName} (${c.candidateId}), ${why.extra}`);
    }
    offices.push(entry);
  }

  for (const o of offices) {
    if (o.raceId === null) continue;
    const where = `${county.name} ${o.office ?? o.district} (${o.raceId})`;
    for (const m of o.missing) report.push(`roster: MISSING ${where}: VoterFocus lists ${m}, and our race does not`);
    for (const x of o.extra) report.push(`roster: EXTRA ${where}: ${x}`);
    for (const k of o.confirm) report.push(`roster: CONFIRM ${where}: ${k}`);
  }
  return { offices, report };
}

/* ---- statewide and U.S. House rosters: every candidate, both directions --- */

/** A statewide or U.S. House race row as `check` reads it, whatever its publication. */
export interface DoeRace {
  raceId: string;
  /** "federal" or "state": which extract group it is read from. */
  level: string;
  office: string;
  candidates: readonly CountyRaceCandidate[];
}

/** One statewide or House race: the DoE extract's still-running filers against ours. */
export interface DoeRosterRace {
  raceId: string;
  /** Our race's office; null when we have no race row for a statewide race. */
  office: string | null;
  /** The extract's still-running filers, "Name (StatusDesc)". */
  running: string[];
  ours: string[];
  missing: string[];
  extra: string[];
  confirm: string[];
}

/** The codes of a filer still in the race: qualified, or unopposed (the one
    candidate of a decided seat, as FL-10). Intake's ballot tier, D1. */
const DOE_RUNNING: readonly string[] = ["QUA", "UNO"];

/** Every statewide and House race of ours against the DoE extract, both
    ways, keyed on AcctNum (our id is FL-DOE-<AcctNum>): MISSING is a filer
    still running (QUA or UNO, not a write-in) with no running candidate of
    ours; EXTRA is a candidate of ours the extract shows withdrawn, defeated,
    not qualified or removed, as a write-in (D1 keeps write-ins out of
    candidate_ids), under another office, or not at all. A filer with a code
    DOE_STATUS does not know is a CONFIRM line. A race whose extract group
    was not read is not compared (its status lines say so). A statewide race
    with a still-running filer and no race row is an `office:` line. Report
    lines only. */
export function compareDoeRoster(
  extract: CheckInput["doe"],
  races: readonly DoeRace[],
): { races: DoeRosterRace[]; report: string[] } {
  const report: string[] = [];
  const out: DoeRosterRace[] = [];
  const byAcct = new Map<string, DoeStatusRow>();
  for (const rows of Object.values(extract)) for (const r of rows ?? []) byAcct.set(r.acctNum, r);
  const filersOf = (raceId: string) => [...byAcct.values()].filter((r) => doeRaceId(r.officeCode, r.juris) === raceId);
  const isRunning = (r: DoeStatusRow) => DOE_RUNNING.includes(r.statusCode) && !r.writeIn;
  const show = (r: DoeStatusRow) => `${r.name} (${r.statusDesc || r.statusCode})`;
  const showId = (r: DoeStatusRow) => `${r.name} (${r.statusDesc || r.statusCode}, FL-DOE-${r.acctNum})`;
  const unmapped = (r: DoeStatusRow) =>
    `${r.name} (FL-DOE-${r.acctNum}) has DoE status code ${JSON.stringify(r.statusCode)}, which has no mapping; not compared`;

  for (const race of [...races].sort((a, b) => a.raceId.localeCompare(b.raceId, "en", { numeric: true }))) {
    const group = doeOfficeGroup(race.level);
    if (!group || !extract[group]) continue;
    const candidates = race.candidates.filter((c, i, all) => all.findIndex((x) => x.candidateId === c.candidateId) === i);
    const filers = filersOf(race.raceId);
    const live = filers.filter(isRunning);
    const entry: DoeRosterRace = {
      raceId: race.raceId, office: race.office, running: live.map(show),
      ours: candidates.filter(runningOurs).map((c) => c.legalName), missing: [], extra: [], confirm: [],
    };
    out.push(entry);
    for (const r of live) {
      const c = candidates.find((x) => x.candidateId === `FL-DOE-${r.acctNum}`);
      if (c && runningOurs(c)) continue;
      entry.missing.push(c ? `${showId(r)}, whom ours has as ${c.qualifyingStatus}, ${c.ballotStatus}` : showId(r));
    }
    for (const r of filers) if (!DOE_STATUS[r.statusCode]) entry.confirm.push(unmapped(r));
    for (const c of candidates.filter(runningOurs)) {
      const row = c.candidateId.startsWith("FL-DOE-") ? byAcct.get(c.candidateId.slice("FL-DOE-".length)) : undefined;
      const filedUnder = row ? doeRaceId(row.officeCode, row.juris) : null;
      const who = `${c.legalName} (${c.candidateId})`;
      if (!row) {
        entry.extra.push(`${who}, not in the DoE ${group} extract`);
        continue;
      }
      /* An unmapped code in this race already has its CONFIRM line. */
      if (!DOE_STATUS[row.statusCode]) {
        if (filedUnder !== race.raceId) entry.confirm.push(unmapped(row));
        continue;
      }
      if (filedUnder !== race.raceId) {
        entry.extra.push(`${who}, filed under ${filedUnder ?? `${row.officeCode} ${row.juris}`.trim()} in the DoE extract (${row.statusDesc || row.statusCode})`);
      } else if (row.writeIn && DOE_RUNNING.includes(row.statusCode)) {
        entry.extra.push(`${who}, a write-in in the DoE extract`);
      } else if (!isRunning(row)) {
        entry.extra.push(`${who}, ${row.statusDesc || row.statusCode} in the DoE extract`);
      }
    }
  }

  /* A statewide race the extract has a running filer for and we have no row for. */
  for (const raceId of Object.values(DOE_NO_DISTRICT)) {
    if (races.some((r) => r.raceId === raceId)) continue;
    const live = filersOf(raceId).filter(isRunning);
    if (live.length === 0) continue;
    out.push({ raceId, office: null, running: live.map(show), ours: [], missing: live.map(showId), extra: [], confirm: [] });
    report.push(`office: the DoE extract has ${raceId} with ${live.map(showId).join(", ")}, and there is no ${raceId} race row`);
  }

  for (const o of out) {
    if (o.office === null) continue;
    const where = `${o.office} (${o.raceId})`;
    for (const m of o.missing) report.push(`roster: MISSING ${where}: the DoE extract lists ${m}, and our race does not`);
    for (const x of o.extra) report.push(`roster: EXTRA ${where}: ${x}`);
    for (const k of o.confirm) report.push(`roster: CONFIRM ${where}: ${k}`);
  }
  return { races: out, report };
}

/* ---- running mates (report lines only) --------------------------------- */

/** The running mate a DoE canDetail page names, read as the roster worksheet
    reads it (parseRunningMate and normalizeDoeText in scripts/roster-reads-lib.ts
    on claude/roster-completeness): the text after "Running Mate:" up to the
    cell's end, entities decoded, non-breaking spaces as spaces, whitespace
    collapsed. null when the page has no such field; undefined when the field
    holds markup or an entity the decoder does not know (unreadable). */
export function runningMateOnPage(html: string): string | null | undefined {
  const m = /Running Mate:([\s\S]*?)<\/td>/i.exec(html);
  if (!m) return null;
  if (/<[a-z/!]/i.test(m[1])) return undefined;
  const decoded = decodeEntities(m[1]).replace(/\xa0/g, " ");
  if (/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.test(decoded)) return undefined;
  return decoded.replace(/\s+/g, " ").trim();
}

/* ---- candidate sites --------------------------------------------------- */

export type SiteOutcome = "live" | "challenge" | "moved" | "parked" | "dead" | "robots" | "unchecked";

export interface SiteResponse {
  status: number;
  /** After redirects. */
  finalUrl: string;
  body: string;
}

/** The host, lowercase, without a leading `www.`; null for a bad URL. */
export function siteHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/* Registrar and marketplace parking pages. Matched in the head of the body
   only, like looksLikeBotChallenge. */
const PARKED_MARKERS: readonly RegExp[] = [
  /this domain (name )?(is|may be) for sale/i,
  /\bbuy this domain\b/i,
  /this domain is registered,? but may still be available/i,
  /\bdomain (has been |is )?parked\b/i,
  /\bparked (free|domain|page)\b/i,
  /sedoparking\.com|parkingcrew\.net|bodis\.com|hugedomains\.com|afternic\.com|dan\.com\/(buy-domain|lander)/i,
  /<title>[^<]*\bfor sale\b[^<]*<\/title>/i,
];

/** True when `body` is a parked or for-sale domain page. */
export function looksParked(body: string): boolean {
  const head = body.slice(0, 50_000);
  return PARKED_MARKERS.some((re) => re.test(head));
}

/** robots.txt as `sites` reads it. A 4xx means the site published none (RFC
    9309). Anything else unreadable (no answer, a 5xx, a challenge or HTML
    page in its place) is read as no rules and noted, as
    scripts/candidate-site-ingest.ts does (founder decision 2026-09-25). */
export function robotsText(response: SiteResponse | null): { text: string; note: string | null } {
  if (!response) return { text: "", note: "robots.txt unreadable (no response)" };
  if (response.status >= 400 && response.status < 500) return { text: "", note: null };
  if (response.status < 200 || response.status >= 300) {
    return { text: "", note: `robots.txt unreadable (HTTP ${response.status})` };
  }
  if (looksLikeBotChallenge(response.body) || /^\s*</.test(response.body)) {
    return { text: "", note: "robots.txt unreadable (not a text file)" };
  }
  return { text: response.body, note: null };
}

/** One homepage fetch's outcome (spec §3.6). `response` null is a failed
    fetch (DNS, TLS, timeout). Order matters: a 403 or 503 interstitial is a
    challenge, not dead; a parking page often sits on another host, so parked
    is decided before moved. Only `live` stamps site_last_verified_at. */
export function classifySite(
  officialSite: string,
  response: SiteResponse | null,
): { outcome: SiteOutcome; detail: string } {
  if (!response) return { outcome: "dead", detail: "no response" };
  if (looksLikeBotChallenge(response.body)) {
    return { outcome: "challenge", detail: `bot challenge, HTTP ${response.status}` };
  }
  if (response.status < 200 || response.status >= 300) {
    return { outcome: "dead", detail: `HTTP ${response.status}` };
  }
  if (looksParked(response.body)) return { outcome: "parked", detail: `parked page at ${response.finalUrl}` };
  if (!isSameSite(officialSite, response.finalUrl)) {
    return { outcome: "moved", detail: `now lands on ${response.finalUrl}` };
  }
  return { outcome: "live", detail: `HTTP ${response.status}` };
}

/* ---- the agent's date observations ------------------------------------- */

export interface DateObservation {
  election: string;
  event_type: string;
  county_fips: string | null;
  /** YYYY-MM-DD, as the page states it. */
  official_date: string;
  source_url: string;
}

export interface UnreadablePage {
  url: string;
  reason: string;
}

export interface Observations {
  dates: DateObservation[];
  unreadable: UnreadablePage[];
}

const DATE_KEYS = ["election", "event_type", "county_fips", "official_date", "source_url"] as const;

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

/** observations.json is agent-written, so it is checked for shape before any
    database read, and the run is refused at the first bad field. */
export function parseObservations(raw: unknown): { ok: true; value: Observations } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("observations.json must be an object { dates, unreadable }");
  }
  const o = raw as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => k !== "dates" && k !== "unreadable");
  if (extra.length > 0) return fail(`observations.json has unknown key(s): ${extra.join(", ")}`);
  if (!Array.isArray(o.dates) || !Array.isArray(o.unreadable)) {
    return fail("observations.json needs both arrays, dates and unreadable (either may be empty)");
  }
  if (o.dates.length > MAX_DATE_OBSERVATIONS) {
    return fail(`${o.dates.length} date observations; at most ${MAX_DATE_OBSERVATIONS}`);
  }
  if (o.unreadable.length > MAX_UNREADABLE) {
    return fail(`${o.unreadable.length} unreadable pages; at most ${MAX_UNREADABLE}`);
  }
  const dates: DateObservation[] = [];
  for (const [i, d] of o.dates.entries()) {
    if (!d || typeof d !== "object" || Array.isArray(d)) return fail(`dates[${i}] is not an object`);
    const r = d as Record<string, unknown>;
    const unknown = Object.keys(r).filter((k) => !(DATE_KEYS as readonly string[]).includes(k));
    if (unknown.length > 0) return fail(`dates[${i}] has unknown key(s): ${unknown.join(", ")}`);
    if (typeof r.election !== "string" || r.election === "") return fail(`dates[${i}].election must be a string`);
    if (typeof r.event_type !== "string" || r.event_type === "") return fail(`dates[${i}].event_type must be a string`);
    if (!(r.county_fips === null || (typeof r.county_fips === "string" && /^\d{5}$/.test(r.county_fips)))) {
      return fail(`dates[${i}].county_fips must be a 5-digit FIPS or null (statewide)`);
    }
    if (!isIsoDate(r.official_date)) {
      return fail(`dates[${i}].official_date ${JSON.stringify(r.official_date)} is not a YYYY-MM-DD date`);
    }
    if (!isHttpUrl(r.source_url)) return fail(`dates[${i}].source_url must be an http(s) URL`);
    dates.push({
      election: r.election,
      event_type: r.event_type,
      county_fips: r.county_fips as string | null,
      official_date: r.official_date,
      source_url: r.source_url,
    });
  }
  const unreadable: UnreadablePage[] = [];
  for (const [i, u] of o.unreadable.entries()) {
    if (!u || typeof u !== "object" || Array.isArray(u)) return fail(`unreadable[${i}] is not an object`);
    const r = u as Record<string, unknown>;
    const unknown = Object.keys(r).filter((k) => k !== "url" && k !== "reason");
    if (unknown.length > 0) return fail(`unreadable[${i}] has unknown key(s): ${unknown.join(", ")}`);
    if (!isHttpUrl(r.url)) return fail(`unreadable[${i}].url must be an http(s) URL`);
    if (typeof r.reason !== "string" || r.reason.trim() === "" || r.reason.length > 300) {
      return fail(`unreadable[${i}].reason must be a short sentence (1 to 300 characters)`);
    }
    unreadable.push({ url: r.url, reason: r.reason.trim() });
  }
  return { ok: true, value: { dates, unreadable } };
}

/** An election_event row as `check` reads it. event_date is YYYY-MM-DD. */
export interface ElectionEventRow {
  election: string;
  event_type: string;
  county_fips: string | null;
  event_date: string;
  details_url: string;
}

export const eventKey = (e: { election: string; event_type: string; county_fips: string | null }): string =>
  `${e.election}|${e.event_type}|${e.county_fips ?? "statewide"}`;

const samePage = (a: string, b: string): boolean => {
  const ca = canonicalizeUrl(a);
  return ca !== null && ca === canonicalizeUrl(b);
};

/** Spec §3.6: a date may cite the row's own details_url, or a page on that
    county's Supervisor host (supervisorSite), or for a statewide row a page
    on dos.fl.gov. Hosts compare without `www.`. */
export function dateSourceAllowed(sourceUrl: string, event: ElectionEventRow): boolean {
  if (samePage(sourceUrl, event.details_url)) return true;
  const host = siteHost(sourceUrl);
  if (host === null) return false;
  if (event.county_fips === null) return host === STATEWIDE_DATE_HOST;
  const site = supervisorSite(event.county_fips);
  return site !== null && host === siteHost(site);
}

/* ---- dedupe keys (spec §3.6 "Dedupe") ---------------------------------- */

const keyValue = (v: unknown): string =>
  v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v);

/** `candidate|<pk>|qualifying_status|<db value>|<new>`. */
export function gatedDiffKey(p: { table: string; pk: string; field: string; old?: unknown; new: unknown }): string {
  return `${p.table}|${p.pk}|${p.field}|${keyValue(p.old)}|${keyValue(p.new)}`;
}

/** `election_event|<election>|<event_type>|<county or statewide>|<db value>|<official value>`. */
export function electionEventKey(p: {
  election: string;
  event_type: string;
  county_fips: string | null;
  db_value: unknown;
  official_value: unknown;
}): string {
  return `election_event|${p.election}|${p.event_type}|${p.county_fips ?? "statewide"}|${keyValue(p.db_value)}|${keyValue(p.official_value)}`;
}

/** The key of a stored review item, computed from its payload (no schema
    field is added), or null for a payload R2 never writes. The database
    value is part of the key, so an approved date_mismatch (which writes
    nothing) is not queued again while the row is unchanged, and a later,
    different change is a new key. */
export function reviewItemKey(kind: string, payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (kind === "gated_diff" && typeof p.table === "string" && typeof p.pk === "string" && typeof p.field === "string") {
    return gatedDiffKey({ table: p.table, pk: p.pk, field: p.field, old: p.old, new: p.new });
  }
  if (
    kind === "date_mismatch" &&
    p.target === "election_event" &&
    typeof p.election === "string" &&
    typeof p.event_type === "string" &&
    (p.county_fips === null || typeof p.county_fips === "string")
  ) {
    return electionEventKey({
      election: p.election,
      event_type: p.event_type,
      county_fips: p.county_fips as string | null,
      db_value: p.db_value,
      official_value: p.official_value,
    });
  }
  return null;
}

/* ---- the plan ----------------------------------------------------------- */

export type R2Diff =
  | { kind: "gated_diff"; payload: GatedDiffPayload }
  | { kind: "date_mismatch"; payload: DateMismatchElectionEventPayload };

export interface CheckInput {
  roster: readonly BallotRosterCandidate[];
  events: readonly ElectionEventRow[];
  observations: Observations;
  /** Per office group: the parsed rows, or null when the extract could not
      be read. A group not fetched is absent. */
  doe: Partial<Record<DoeOfficeGroup, DoeStatusRow[] | null>>;
  /** Per county FIPS: the parsed rows, or null when the list could not be read. */
  voterFocus: Readonly<Record<string, VoterFocusRow[] | null>>;
  /** Every county race row with its candidates, whatever its publication. */
  countyRaces: readonly CountyRace[];
  /** Every statewide and U.S. House race row with its candidates, likewise. */
  doeRaces: readonly DoeRace[];
  runningMates: {
    /** False until candidate.running_mate exists (roster-completeness 0049). */
    column: boolean;
    /** candidate_id → the stored running mate (null when none is stored). */
    stored: Readonly<Record<string, string | null>>;
    /** candidate_id → runningMateOnPage(canDetail page); undefined = unread. */
    pages: Readonly<Record<string, string | null | undefined>>;
  };
  now: Date;
}

export interface CheckSummary {
  statuses: { roster: number; read: number; changed: number; doe: number; voterFocus: number };
  dates: { events: number; observed: number; changed: number; unreadablePages: number };
  /** Covered offices with a live filer on the lists read, and how many of
      them have no race row of ours. */
  offices: { listed: number; missing: number };
  /** Candidates in the races we have, against VoterFocus: still running and
      not ours, ours and no longer running, and pairs to confirm. */
  roster: { missing: number; extra: number; confirm: number };
  /** The same for statewide and House races against the DoE extract: races
      compared, statewide races with no race row, and their candidates. */
  doeRoster: { races: number; noRace: number; missing: number; extra: number; confirm: number };
  /** Every VoterFocus label met on the lists read, and every DoE status code
      in the extracts read, with counts, so the first watched run lists them. */
  labelsSeen: Record<string, number>;
  doeCodesSeen: Record<string, number>;
}

export type CheckResult =
  | ({
      ok: true;
      diffs: R2Diff[];
      confirmedRaces: string[];
      report: string[];
      rosterOffices: RosterOffice[];
      doeRosterRaces: DoeRosterRace[];
    } & CheckSummary)
  | { ok: false; error: string };

const bump = (m: Record<string, number>, k: string) => {
  m[k] = (m[k] ?? 0) + 1;
};

/** Build R2's plan from what was read. Refuses the whole run (spec §3.6) on
    an observation of an unknown (election, event_type, county_fips), a
    source_url the row's rules do not allow, or two observations of one row.
    Everything else that cannot be compared is a report line, never a diff. */
export function buildCheck(input: CheckInput): CheckResult {
  const seenAt = input.now.toISOString();
  const report: string[] = [];
  const diffs: R2Diff[] = [];
  const labelsSeen: Record<string, number> = {};
  const doeCodesSeen: Record<string, number> = {};

  /* Dates first: their refusals stop the run before anything is compared. */
  const events = new Map(input.events.map((e) => [eventKey(e), e]));
  const observed = new Map<string, DateObservation>();
  for (const [i, d] of input.observations.dates.entries()) {
    const key = eventKey(d);
    const event = events.get(key);
    if (!event) {
      return { ok: false, error: `dates[${i}]: no election_event row ${key} (a new event is a migration, never an observation)` };
    }
    if (observed.has(key)) return { ok: false, error: `dates[${i}]: ${key} is observed twice` };
    if (!dateSourceAllowed(d.source_url, event)) {
      return {
        ok: false,
        error: `dates[${i}]: ${d.source_url} is neither the row's details_url nor on ${
          event.county_fips === null ? STATEWIDE_DATE_HOST : "that county's Supervisor host"
        }`,
      };
    }
    observed.set(key, d);
  }
  const unreadableUrls = new Set(input.observations.unreadable.map((u) => canonicalizeUrl(u.url)));
  for (const u of input.observations.unreadable) report.push(`date page unreadable: ${u.url} (${u.reason})`);
  let datesChanged = 0;
  for (const event of input.events) {
    const key = eventKey(event);
    const d = observed.get(key);
    if (!d) {
      if (!unreadableUrls.has(canonicalizeUrl(event.details_url))) report.push(`date not observed: ${key}`);
      continue;
    }
    if (d.official_date === event.event_date) continue;
    datesChanged++;
    diffs.push({
      kind: "date_mismatch",
      payload: {
        target: "election_event",
        election: event.election,
        event_type: event.event_type,
        county_fips: event.county_fips,
        db_value: event.event_date,
        official_value: d.official_date,
        source_url: d.source_url,
        seen_at: seenAt,
      },
    });
  }
  const sources = new Set([...observed.values()].map((d) => canonicalizeUrl(d.source_url)));
  for (const page of [...new Set(input.events.map((e) => e.details_url))]) {
    const c = canonicalizeUrl(page);
    if (!sources.has(c) && !unreadableUrls.has(c)) report.push(`date page not read: ${page}`);
  }

  /* Statuses. */
  for (const rows of Object.values(input.doe)) for (const r of rows ?? []) bump(doeCodesSeen, r.statusCode);
  for (const rows of Object.values(input.voterFocus)) for (const r of rows ?? []) bump(labelsSeen, r.label ?? "(none)");
  for (const [group, rows] of Object.entries(input.doe)) {
    if (rows === null) report.push(`status: the DoE ${group} extract could not be read`);
  }
  for (const [fips, rows] of Object.entries(input.voterFocus)) {
    const name = coveredCounty(fips)?.name ?? fips;
    if (rows === null) report.push(`status: ${name}'s VoterFocus list could not be read`);
    else if (rows.length === 0) report.push(`status: ${name}'s VoterFocus list parsed to no rows`);
  }

  const readOk = new Map<string, boolean>();
  let read = 0;
  let viaDoe = 0;
  let viaVf = 0;
  let changed = 0;
  for (const c of input.roster) {
    const who = `${c.legalName} (${c.candidateId}, ${c.raceId})`;
    let status: QualifyingStatus | null = null;
    let sourceUrl = "";
    if (c.candidateId.startsWith("FL-DOE-")) {
      const group = doeOfficeGroup(c.level);
      const rows = group ? input.doe[group] : undefined;
      if (!group || rows === undefined) {
        report.push(`status: ${who} was not checked: no DoE extract for level ${c.level}`);
      } else if (rows !== null) {
        const account = c.candidateId.slice("FL-DOE-".length);
        const row = rows.find((r) => r.acctNum === account);
        const filedUnder = row ? doeRaceId(row.officeCode, row.juris) : null;
        if (!row) report.push(`status: ${who} is not in the DoE ${group} extract`);
        else if (filedUnder !== c.raceId) {
          report.push(`status: ${who} is filed under ${filedUnder ?? `${row.officeCode} ${row.juris}`.trim()} in the DoE extract`);
        } else if (!DOE_STATUS[row.statusCode]) {
          report.push(`status: ${who} has DoE status code ${JSON.stringify(row.statusCode)}, which has no mapping`);
        } else {
          status = DOE_STATUS[row.statusCode];
          sourceUrl = canDetailUrl(account);
          viaDoe++;
        }
      }
    } else if (c.candidateId.startsWith("FL-VF-")) {
      const county = c.countyFips ? coveredCounty(c.countyFips) : undefined;
      const rows = county ? input.voterFocus[county.fips] : undefined;
      if (!county || rows === undefined) {
        report.push(`status: ${who} was not checked: no VoterFocus list for its county`);
      } else if (rows !== null && rows.length > 0) {
        const m = matchVoterFocus(c, rows);
        if (m.kind === "none") report.push(`status: ${who} is not on ${county.name}'s VoterFocus list`);
        else if (m.kind === "ambiguous") {
          report.push(`status: ${who} matches ${m.count} rows on ${county.name}'s VoterFocus list`);
        } else if (m.row.label === null || !VOTERFOCUS_STATUS[m.row.label]) {
          report.push(`status: ${who} is ${JSON.stringify(m.row.label ?? "(no label)")} on VoterFocus, which has no mapping; not compared`);
        } else {
          status = VOTERFOCUS_STATUS[m.row.label];
          sourceUrl = voterFocusListUrl(county.voterFocusSlug);
          viaVf++;
        }
      }
    } else {
      report.push(`status: ${who} has no status source (its id is neither FL-DOE- nor FL-VF-)`);
    }

    const agrees = status !== null && status === c.qualifyingStatus;
    readOk.set(c.raceId, (readOk.get(c.raceId) ?? true) && agrees);
    if (status === null) continue;
    read++;
    if (agrees) continue;
    changed++;
    diffs.push({
      kind: "gated_diff",
      payload: {
        table: "candidate",
        pk: c.candidateId,
        field: "qualifying_status",
        old: c.qualifyingStatus,
        new: status,
        source_url: sourceUrl,
        seen_at: seenAt,
      },
    });
  }
  /* Missing contests and rosters (compareCountyRoster, compareDoeRoster).
     Matching roster candidates cannot see a whole missing race, as 0032
     missed eight settled Miami-Dade seats
     (docs/general-election/empty-races-2026-10-12.md), nor a filer who is
     not ours. Report lines only: a new race or candidate is a migration,
     never a diff. */
  const rosterOffices: RosterOffice[] = [];
  for (const [fips, rows] of Object.entries(input.voterFocus)) {
    const county = coveredCounty(fips);
    if (!county || !rows || rows.length === 0) continue;
    const compared = compareCountyRoster(county, rows, input.countyRaces);
    rosterOffices.push(...compared.offices);
    report.push(...compared.report);
  }
  const statewide = compareDoeRoster(input.doe, input.doeRaces);
  report.push(...statewide.report);
  const doeOurs = statewide.races.filter((o) => o.office !== null);
  const ours = rosterOffices.filter((o) => o.raceId !== null);
  type Lines = Pick<RosterOffice, "missing" | "extra" | "confirm">;
  const total = (list: readonly Lines[], k: keyof Lines) => list.reduce((n, o) => n + o[k].length, 0);
  /* A race VoterFocus or the extract disagrees with, or one a person must
     confirm, is not confirmed, whatever its statuses say. */
  const disputed = new Set(
    [...ours, ...doeOurs].filter((o) => o.missing.length + o.extra.length + o.confirm.length > 0).map((o) => o.raceId),
  );
  const confirmedRaces = [...readOk]
    .filter(([raceId, ok]) => ok && !disputed.has(raceId))
    .map(([raceId]) => raceId)
    .sort();

  /* Running mates: report lines only (spec §3.6). */
  if (!input.runningMates.column) {
    report.push("running mates: not compared; the running-mate column does not exist yet (roster-completeness 0049)");
  } else {
    for (const c of input.roster.filter((r) => r.raceId === GOVERNOR_RACE_ID)) {
      const page = input.runningMates.pages[c.candidateId];
      const stored = input.runningMates.stored[c.candidateId] ?? null;
      if (page === undefined) report.push(`running mate: ${c.legalName}'s DoE page could not be read`);
      else if ((stored ?? "").replace(/\s+/g, " ").trim() !== (page ?? "")) {
        report.push(`running mate: ${c.legalName}: stored ${JSON.stringify(stored)}, DoE page ${JSON.stringify(page)}`);
      }
    }
  }

  return {
    ok: true,
    diffs,
    confirmedRaces,
    report,
    rosterOffices,
    doeRosterRaces: statewide.races,
    statuses: { roster: input.roster.length, read, changed, doe: viaDoe, voterFocus: viaVf },
    dates: {
      events: input.events.length,
      observed: observed.size,
      changed: datesChanged,
      unreadablePages: input.observations.unreadable.length,
    },
    offices: {
      listed: rosterOffices.filter((o) => o.office !== null && o.running.length > 0).length,
      missing: rosterOffices.filter((o) => o.raceId === null).length,
    },
    roster: { missing: total(ours, "missing"), extra: total(ours, "extra"), confirm: total(ours, "confirm") },
    doeRoster: {
      races: doeOurs.length,
      noRace: statewide.races.length - doeOurs.length,
      missing: total(doeOurs, "missing"),
      extra: total(doeOurs, "extra"),
      confirm: total(doeOurs, "confirm"),
    },
    labelsSeen,
    doeCodesSeen,
  };
}

/* ---- the queue ---------------------------------------------------------- */

export interface R2QueueRow {
  kind: "gated_diff" | "date_mismatch";
  source: typeof R2_SOURCE;
  status: "pending";
  payload: Record<string, unknown>;
}

/** Pending review rows for every diff whose key is not already stored in
    any status, nor earlier in this batch. Every payload parses with its
    schema first, and a gated_diff may only be candidate.qualifying_status:
    R2 never proposes race.key_dates, race.office or race.district (D3, D9),
    and any other diff refuses the whole batch. */
export function planR2Queue(
  diffs: readonly R2Diff[],
  existingKeys: ReadonlySet<string>,
): { ok: true; rows: R2QueueRow[]; skipped: string[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const rows: R2QueueRow[] = [];
  const skipped: string[] = [];
  const seen = new Set(existingKeys);
  for (const [i, d] of diffs.entries()) {
    if (d.kind === "gated_diff") {
      const parsed = GatedDiffPayloadSchema.safeParse(d.payload);
      if (!parsed.success) {
        errors.push(`diff ${i}: ${parsed.error.issues.map((x) => x.message).join("; ")}`);
        continue;
      }
      if (parsed.data.table !== "candidate" || parsed.data.field !== "qualifying_status") {
        errors.push(`diff ${i}: R2 proposes only candidate.qualifying_status, not ${parsed.data.table}.${parsed.data.field}`);
        continue;
      }
    } else {
      const parsed = DateMismatchPayloadSchema.safeParse(d.payload);
      if (!parsed.success || !("target" in parsed.data)) {
        errors.push(`diff ${i}: not an election_event date_mismatch`);
        continue;
      }
    }
    const key = reviewItemKey(d.kind, d.payload);
    if (key === null) {
      errors.push(`diff ${i}: no dedupe key`);
      continue;
    }
    if (seen.has(key)) {
      skipped.push(key);
      continue;
    }
    seen.add(key);
    rows.push({ kind: d.kind, source: R2_SOURCE, status: "pending", payload: d.payload as Record<string, unknown> });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, rows, skipped };
}
