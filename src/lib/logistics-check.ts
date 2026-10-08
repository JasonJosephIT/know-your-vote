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
import { decodeEntities, isSameSite, looksLikeBotChallenge } from "./candidate-site.ts";
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
