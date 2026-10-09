/* R2's logistics checks: the decidable half (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.6).

   R2 checks what voters act on and proposes changes; it never changes a
   voter-facing value. Statewide and federal qualifying statuses come from the
   Division of Elections' candidate extract, county statuses from the four
   VoterFocus lists, both read by code. Official dates are read by the agent
   from each election_event row's own details_url and compared here. What
   differs becomes a pending review item: a `gated_diff` on
   candidate.qualifying_status, or a `date_mismatch` against election_event,
   whose approval records the finding and writes nothing (D3).

   Pure: no fetch, no clock, no database. scripts/logistics-check.ts is the
   I/O around these rules; scripts/verify-logistics-check.ts drives this file
   offline. No rule here reads party. Relative imports with the extension:
   plain-Node scripts import this. */

import { normalizeName } from "./candidate-leads.ts";
import { canonicalizeUrl, decodeEntities, isSameSite, looksLikeBotChallenge } from "./candidate-site.ts";
import { coveredCounty } from "./counties.ts";
import type { BallotRosterCandidate } from "./news-intake.ts";
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

/** One extract row, with ONLY the four columns R2 needs. */
export interface DoeStatusRow {
  acctNum: string;
  officeCode: string;
  juris: string;
  statusCode: string;
}

/** Parse the tab-separated extract, keeping AcctNum, OfficeCode, Juris1num
    and StatusCode and dropping every other column here, in memory: the file
    carries addresses, phones, emails and treasurers (intake.py:12-16), and
    none of that may reach a file the CLI writes. null when the text is not
    the extract (a missing column: an error or challenge page). */
export function parseDoeExtract(text: string): DoeStatusRow[] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const header = lines[0].split("\t").map((h) => h.trim());
  const iAcct = header.indexOf("AcctNum");
  const iOffice = header.indexOf("OfficeCode");
  const iJuris = header.indexOf("Juris1num");
  const iStatus = header.indexOf("StatusCode");
  if ([iAcct, iOffice, iJuris, iStatus].some((i) => i < 0)) return null;
  const rows: DoeStatusRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const acctNum = (cols[iAcct] ?? "").trim();
    if (!acctNum) continue;
    rows.push({
      acctNum,
      officeCode: (cols[iOffice] ?? "").trim(),
      juris: (cols[iJuris] ?? "").trim(),
      statusCode: (cols[iStatus] ?? "").trim(),
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
  /** Every VoterFocus label met on the lists read, and every DoE status code
      in the extracts read, with counts, so the first watched run lists them. */
  labelsSeen: Record<string, number>;
  doeCodesSeen: Record<string, number>;
}

export type CheckResult =
  | ({ ok: true; diffs: R2Diff[]; confirmedRaces: string[]; report: string[] } & CheckSummary)
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
  const confirmedRaces = [...readOk].filter(([, ok]) => ok).map(([raceId]) => raceId).sort();

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
    statuses: { roster: input.roster.length, read, changed, doe: viaDoe, voterFocus: viaVf },
    dates: {
      events: input.events.length,
      observed: observed.size,
      changed: datesChanged,
      unreadablePages: input.observations.unreadable.length,
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
