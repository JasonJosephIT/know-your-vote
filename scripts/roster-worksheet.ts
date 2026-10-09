/* The roster-completeness worksheet, and the SQL written from it
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.1, §3.4).

     node scripts/roster-worksheet.ts --skeleton            print an empty worksheet
     node scripts/roster-worksheet.ts --fill-times r1 r2    fill read_1/read_2 from two rounds
     node scripts/roster-worksheet.ts --check               list every problem; exit 1 if any
     node scripts/roster-worksheet.ts --write-migration [--d1 membership|seat]
                                                            rewrite the generated blocks of
                                                            supabase/migrations/0049_roster_completeness.sql

   The worksheet (docs/general-election/roster-completeness-2026-10.md) is
   written by hand from the reads in .roster-reads/ (scripts/roster-reads.ts).
   Its machine tables follow a `<!-- table:<name> -->` marker. The migration's
   data is GENERATED from it, between `-- BEGIN generated: <name>` and
   `-- END generated: <name>` lines, so the SQL can never drift from what the
   founder reviews; scripts/verify-roster-worksheet.ts fails if it does.

   --d1 picks which worksheet column becomes candidate.is_incumbent:
   membership (Recommended, D1): serves today in the office or on the body
   the race elects to; seat (D1's TO FLIP): holds this race's own seat. Both
   columns are always filled, so a flip is this flag, not a new read. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canDetailUrl, normalizeDoeText, worksheetTime } from "./roster-reads-lib.ts";

export const ROOT = resolve(import.meta.dirname, "..");
export const WORKSHEET_PATH = "docs/general-election/roster-completeness-2026-10.md";
export const MIGRATION_PATH = "supabase/migrations/0049_roster_completeness.sql";
export const ROSTER_FIXTURE = "scripts/fixtures/roster/ballot-roster-2026-10-08.json";
/** Ballot candidates with an official_site before this migration (0036, 0038, 0039). */
export const SITED_BEFORE = 97;
export const DASH = "—";

export interface RosterRow {
  candidate_id: string;
  legal_name: string;
  race_id: string;
  level: "federal" | "state" | "county";
  race_status: "published" | "listed";
  has_site: boolean;
}

export type D1Rule = "membership" | "seat";
export type Row = Record<string, string>;

export function loadRoster(root = ROOT): RosterRow[] {
  return JSON.parse(readFileSync(join(root, ROSTER_FIXTURE), "utf8")) as RosterRow[];
}

/* ---- labels (§3.5) ----------------------------------------------------
   The display PR (PR 2) owns the label table voters see, in
   src/lib/incumbency.ts. This copy only fills and checks the worksheet's
   label column; PR 2's verify-incumbent-chip.ts maps the same 53 race ids. */

export const OFFICE_LABEL = "Holds this office now";
const COUNTY_NAME: Record<string, string> = {
  BRO: "Broward",
  DAD: "Miami-Dade",
  HIL: "Hillsborough",
  ORA: "Orange",
};

export function labelFor(raceId: string): string | null {
  if (/^FL-\d+-general$/.test(raceId)) return "Member of the U.S. House now";
  if (raceId === "FL-SEN-general") return "Member of the U.S. Senate now";
  if (/^FL-(GOV|ATG|CFO|AGR)-general$/.test(raceId)) return OFFICE_LABEL;
  if (raceId === "FL-ORA-MAYOR-general" || raceId === "FL-ORA-CLERK-general") return OFFICE_LABEL;
  const m = /^FL-(BRO|DAD|HIL|ORA)-(CC|SB)[A-Z0-9]*-general$/.exec(raceId);
  if (m) return `Member of the ${COUNTY_NAME[m[1]]} County ${m[2] === "CC" ? "Commission" : "School Board"} now`;
  return null;
}

/* ---- sources ------------------------------------------------------------
   A source of record or a second page is an official host: the office's or
   body's own site, the House Clerk, house.gov / senate.gov. Ballotpedia,
   the FEC, news and campaign sites never decide a row (§3.3). A county
   Supervisor of Elections host counts only for a page listing CURRENT
   officeholders; its 2026 candidate list never states incumbency
   (0031:41-43). Add a host here only with a line in the worksheet's Method
   section saying whose site it is. */

export const OFFICIAL_HOSTS = [
  "house.gov",
  "senate.gov",
  "flgov.com",
  "myfloridalegal.com",
  "myfloridacfo.com",
  "fdacs.gov",
  "broward.org",
  "miamidade.gov",
  "hcfl.gov",
  "orangecountyfl.net",
  "browardschools.com",
  "dadeschools.net",
  "hillsboroughschools.org",
  "ocps.net",
  "myorangeclerk.com",
  "browardvotes.gov",
  "votehillsborough.gov",
  "voteorangefl.gov",
] as const;

export function officialHost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return u.protocol === "https:" && OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
const FEC_ID = /^[HS]\d[A-Z]{2}\d{5}$/;
const ORIGIN = /^https:\/\/[a-z0-9.-]+\/$/;

const hourApart = (a: string, b: string) =>
  TIME.test(a) && TIME.test(b) && Date.parse(b) - Date.parse(a) >= 60 * 60 * 1000;
export function evidenceOk(cell: string): boolean {
  const m = /^"(.+)"$/.exec(cell);
  if (!m) return false;
  const words = m[1].trim().split(/\s+/).filter(Boolean).length;
  return words >= 1 && words <= 15;
}

/* ---- tables -------------------------------------------------------------- */

export const COLUMNS = {
  candidates: ["candidate_id", "legal_name", "race_id", "label", "incumbent", "holds_this_seat", "source_url", "read_1", "read_2", "second_page", "evidence"],
  races: ["race_id", "incumbent_id", "is_open_seat", "own_seat_holder_today", "note"],
  fec: ["candidate_id", "race_id", "fec_candidate_id", "incumbent_challenge", "election_districts", "read_1", "read_2"],
  tickets: ["candidate_id", "governor", "can_detail_url", "raw_json", "stored", "read_1", "read_2", "reread_2026-10-17", "reread_2026-10-26", "reread_2026-11-02"],
  sites: ["candidate_id", "race_id", "race_status", "result", "read_1", "read_2", "action", "evidence"],
} as const;
export type TableName = keyof typeof COLUMNS;

const splitRow = (line: string) =>
  line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const tableRow = (cells: string[]) => `| ${cells.join(" | ")} |`;

/** The rows of the table after `<!-- table:<name> -->`. Throws on a missing
    marker, a wrong header or a row with the wrong number of cells. */
export function parseTable(md: string, name: TableName): Row[] {
  const marker = `<!-- table:${name} -->`;
  const at = md.indexOf(marker);
  if (at < 0) throw new Error(`worksheet: no ${marker}`);
  const lines = md.slice(at + marker.length).split("\n").map((l) => l.trim());
  let i = 0;
  while (i < lines.length && !lines[i].startsWith("|")) i++;
  const rows: string[][] = [];
  for (; i < lines.length && lines[i].startsWith("|"); i++) rows.push(splitRow(lines[i]));
  const [header, , ...body] = rows;
  const want = COLUMNS[name] as readonly string[];
  if (!header || header.join("|") !== want.join("|")) {
    throw new Error(`worksheet: table ${name} header must be | ${want.join(" | ")} |`);
  }
  return body.map((cells, k) => {
    if (cells.length !== want.length) {
      throw new Error(`worksheet: table ${name} row ${k + 1} has ${cells.length} cells, expected ${want.length}`);
    }
    return Object.fromEntries(want.map((h, j) => [h, cells[j]]));
  });
}

export interface Worksheet {
  candidates: Row[];
  races: Row[];
  fec: Row[];
  tickets: Row[];
  sites: Row[];
}

export function parseWorksheet(md: string): Worksheet {
  return {
    candidates: parseTable(md, "candidates"),
    races: parseTable(md, "races"),
    fec: parseTable(md, "fec"),
    tickets: parseTable(md, "tickets"),
    sites: parseTable(md, "sites"),
  };
}

const rawOf = (cell: string) => cell.replace(/^`/, "").replace(/`$/, "");

/** incumbent_id per race under a rule (§3.1): the one candidate with the
    fact; NULL when none; when two or more, the one holding this race's own
    seat, else NULL. */
export function expectedIncumbents(ws: Worksheet, roster: RosterRow[], rule: D1Rule) {
  const byId = new Map(ws.candidates.map((c) => [c.candidate_id, c]));
  const out = new Map<string, { incumbent: string | null; count: number }>();
  for (const raceId of [...new Set(roster.map((r) => r.race_id))]) {
    const inRace = roster.filter((r) => r.race_id === raceId).map((r) => byId.get(r.candidate_id));
    const fact = inRace.filter((c) => c && (rule === "seat" ? c.holds_this_seat : c.incumbent) === "Yes");
    const seat = inRace.filter((c) => c && c.holds_this_seat === "Yes");
    const incumbent =
      fact.length === 1 ? fact[0]!.candidate_id : fact.length > 1 && seat.length === 1 ? seat[0]!.candidate_id : null;
    out.set(raceId, { incumbent, count: fact.length });
  }
  return out;
}

function sameSet(problems: string[], what: string, got: string[], want: string[]) {
  const g = new Set(got);
  const w = new Set(want);
  for (const id of want) if (!g.has(id)) problems.push(`${what}: missing ${id}`);
  for (const id of got) if (!w.has(id)) problems.push(`${what}: unexpected ${id}`);
  if (g.size !== got.length) problems.push(`${what}: an id appears twice`);
}

/** Every rule the worksheet must meet before SQL is written from it. */
export function checkWorksheet(md: string, roster: RosterRow[]): string[] {
  const problems: string[] = [];
  let ws: Worksheet;
  try {
    ws = parseWorksheet(md);
  } catch (err) {
    return [(err as Error).message];
  }
  const rosterById = new Map(roster.map((r) => [r.candidate_id, r]));

  /* candidates */
  sameSet(problems, "candidates", ws.candidates.map((c) => c.candidate_id), roster.map((r) => r.candidate_id));
  for (const c of ws.candidates) {
    const r = rosterById.get(c.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`candidates ${c.candidate_id}: ${msg}`);
    if (c.legal_name !== r.legal_name) p(`legal_name "${c.legal_name}" is not "${r.legal_name}"`);
    if (c.race_id !== r.race_id) p(`race_id ${c.race_id} is not ${r.race_id}`);
    if (c.label !== labelFor(r.race_id)) p(`label must be "${labelFor(r.race_id)}"`);
    if (!["Yes", "No"].includes(c.incumbent)) p("incumbent must be Yes or No");
    if (!["Yes", "No"].includes(c.holds_this_seat)) p("holds_this_seat must be Yes or No");
    if (c.holds_this_seat === "Yes" && c.incumbent !== "Yes") p("holds this seat but is not an incumbent");
    if (labelFor(r.race_id) === OFFICE_LABEL && c.holds_this_seat !== c.incumbent) {
      p("a one-holder office: holds_this_seat must equal incumbent");
    }
    if (!officialHost(c.source_url)) p(`source_url ${c.source_url || "(empty)"} is not an official https page`);
    if (!hourApart(c.read_1, c.read_2)) p("read_1/read_2 must be YYYY-MM-DDTHH:MMZ, at least an hour apart");
    if (c.incumbent === "Yes") {
      if (!officialHost(c.second_page) || c.second_page === c.source_url) {
        p("a Yes needs a second, different official page");
      }
    } else if (c.second_page !== DASH) p(`second_page must be ${DASH} for a No`);
    if (!evidenceOk(c.evidence)) p("evidence must be the page's own words in quotes, 1 to 15 words");
  }

  /* races */
  const raceIds = [...new Set(roster.map((r) => r.race_id))];
  sameSet(problems, "races", ws.races.map((r) => r.race_id), raceIds);
  const expected = expectedIncumbents(ws, roster, "membership");
  for (const raceId of raceIds) {
    const holders = ws.candidates.filter((c) => rosterById.get(c.candidate_id)?.race_id === raceId && c.holds_this_seat === "Yes");
    if (holders.length > 1) problems.push(`races ${raceId}: ${holders.length} candidates hold this seat`);
  }
  for (const row of ws.races) {
    const e = expected.get(row.race_id);
    if (!e) continue;
    const p = (msg: string) => problems.push(`races ${row.race_id}: ${msg}`);
    const want = e.incumbent ?? "NULL";
    if (row.incumbent_id !== want) p(`incumbent_id must be ${want} (from the candidates table)`);
    if (row.is_open_seat !== (row.incumbent_id === "NULL" ? "true" : "false")) p("is_open_seat must be true exactly when incumbent_id is NULL");
    if (!row.own_seat_holder_today) p("own_seat_holder_today is empty");
  }
  const spec: [string, string][] = [
    ["FL-GOV-general", "NULL"],
    ["FL-ATG-general", "FL-DOE-89041"],
    ["FL-HIL-SB4-general", "FL-VF-HIL-2672"],
  ];
  for (const [raceId, want] of spec) {
    const row = ws.races.find((r) => r.race_id === raceId);
    if (row && row.incumbent_id !== want) {
      problems.push(`races ${raceId}: the spec's assertion (§3.4) expects ${want}; put the disagreement to the founder`);
    }
  }

  /* fec */
  const federal = roster.filter((r) => r.level === "federal");
  sameSet(problems, "fec", ws.fec.map((f) => f.candidate_id), federal.map((r) => r.candidate_id));
  for (const f of ws.fec) {
    const r = rosterById.get(f.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`fec ${f.candidate_id}: ${msg}`);
    if (f.race_id !== r.race_id) p(`race_id must be ${r.race_id}`);
    const matched = FEC_ID.test(f.fec_candidate_id);
    if (!matched && !["no match", "not read"].includes(f.fec_candidate_id)) p("fec_candidate_id must be an FEC id, 'no match' or 'not read'");
    if (matched && !["I", "C", "O"].includes(f.incumbent_challenge)) p("incumbent_challenge must be I, C or O");
    if (!matched && f.incumbent_challenge !== DASH) p(`incumbent_challenge must be ${DASH} without a match`);
    if (f.fec_candidate_id === "not read") {
      if (f.read_1 !== DASH || f.read_2 !== DASH) p(`read_1/read_2 must be ${DASH} when not read`);
    } else if (!hourApart(f.read_1, f.read_2)) p("read_1/read_2 must be at least an hour apart");
  }

  /* tickets */
  const gov = roster.filter((r) => r.race_id === "FL-GOV-general");
  sameSet(problems, "tickets", ws.tickets.map((t) => t.candidate_id), gov.map((r) => r.candidate_id));
  for (const t of ws.tickets) {
    const p = (msg: string) => problems.push(`tickets ${t.candidate_id}: ${msg}`);
    if (t.can_detail_url !== canDetailUrl(t.candidate_id.replace(/^FL-DOE-/, ""))) p("can_detail_url is not this candidate's canDetail page");
    if (!t.governor) p("governor (the name as the DoE page prints it) is empty");
    let raw: unknown;
    try {
      raw = JSON.parse(rawOf(t.raw_json));
    } catch {
      p("raw_json must be a JSON string");
    }
    if (typeof raw === "string") {
      let stored = "";
      try {
        stored = normalizeDoeText(raw);
      } catch (err) {
        p((err as Error).message);
      }
      if (!t.stored || t.stored !== stored) p(`stored must be normalizeDoeText(raw) = "${stored}"`);
    }
    if (!hourApart(t.read_1, t.read_2)) p("read_1/read_2 must be at least an hour apart");
    for (const col of ["reread_2026-10-17", "reread_2026-10-26", "reread_2026-11-02"]) {
      if (t[col] !== DASH && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z (same|CHANGED)$/.test(t[col])) {
        p(`${col} must be ${DASH} or "<time> same" / "<time> CHANGED"`);
      }
    }
  }

  /* sites */
  const unsited = roster.filter((r) => !r.has_site);
  sameSet(problems, "sites", ws.sites.map((s) => s.candidate_id), unsited.map((r) => r.candidate_id));
  for (const s of ws.sites) {
    const r = rosterById.get(s.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`sites ${s.candidate_id}: ${msg}`);
    if (s.race_id !== r.race_id || s.race_status !== r.race_status) p(`race must be ${r.race_id} (${r.race_status})`);
    const found = ORIGIN.test(s.result);
    /* "withheld": a genuine site that is not stored, as Colucci's compromised
       one was (founder decision 2026-09-25). */
    if (!found && !["none found", "withheld"].includes(s.result)) {
      p("result must be 'none found', 'withheld' or a site origin like https://example.com/");
    }
    if (!["write now", "hold until after Nov 3", "none"].includes(s.action)) p("action must be 'write now', 'hold until after Nov 3' or 'none'");
    if (!found && s.action !== "none") p("action must be 'none' when nothing was found");
    if (found && r.race_status === "published" && s.action !== "hold until after Nov 3") p("a find in a published race is held until after Nov 3 (D11)");
    if (found && r.race_status === "listed" && s.action !== "write now") p("a find in a listed race is written now (D11)");
    if (!hourApart(s.read_1, s.read_2)) p("read_1/read_2 must be at least an hour apart");
    if (!evidenceOk(s.evidence)) p("evidence must be in quotes, 1 to 15 words");
  }
  return problems;
}

/* ---- read times ----------------------------------------------------------- */

/** Fills read_1/read_2 from the two rounds' read times, keyed by URL for the
    candidates (source_url), tickets (can_detail_url) and sites (result, when
    it is a URL), and by `fec:<race_id>` for the FEC rows. A row whose page was
    not read in both rounds, and an FEC row marked "not read", keeps what it
    has. Pure: the CLI builds `times` from .roster-reads/<round>/index.json. */
export function fillTimes(md: string, times: ReadonlyMap<string, readonly [string, string]>): string {
  let table: TableName | null = null;
  let rowIndex = 0;
  return md
    .split("\n")
    .map((line) => {
      const marker = /^<!-- table:(\w+) -->$/.exec(line.trim());
      if (marker) {
        table = marker[1] in COLUMNS ? (marker[1] as TableName) : null;
        rowIndex = 0;
        return line;
      }
      if (!table || !line.trim().startsWith("|")) {
        if (table && line.trim() !== "") table = null;
        return line;
      }
      rowIndex++;
      if (rowIndex <= 2) return line;
      const cols = COLUMNS[table] as readonly string[];
      const cells = splitRow(line.trim());
      if (cells.length !== cols.length) return line;
      const row = Object.fromEntries(cols.map((c, j) => [c, cells[j]]));
      const key =
        table === "candidates" ? row.source_url
        : table === "tickets" ? row.can_detail_url
        : table === "sites" ? row.result
        : table === "fec" && row.fec_candidate_id !== "not read" ? `fec:${row.race_id}`
        : null;
      const t = key ? times.get(key) : undefined;
      if (!t) return line;
      cells[cols.indexOf("read_1")] = t[0];
      cells[cols.indexOf("read_2")] = t[1];
      return tableRow(cells);
    })
    .join("\n");
}

export interface IndexEntry {
  key: string;
  url: string;
  readAt: string;
  ok: boolean;
}

/** URL (and fec:<race_id>) -> [round a time, round b time], for every key
    read in both rounds. */
export function timesFromRounds(a: Record<string, IndexEntry>, b: Record<string, IndexEntry>) {
  const times = new Map<string, readonly [string, string]>();
  for (const key of Object.keys(a)) {
    const ea = a[key];
    const eb = b[key];
    if (!ea?.ok || !eb?.ok) continue;
    const pair = [worksheetTime(ea.readAt), worksheetTime(eb.readAt)] as const;
    const fec = /^fec-(?:h-(\d{2})|s)$/.exec(key);
    if (fec) times.set(`fec:FL-${fec[1] ? String(Number(fec[1])) : "SEN"}-general`, pair);
    else times.set(ea.url, pair);
  }
  return times;
}

/* ---- the SQL -------------------------------------------------------------- */

export type BlockName = "candidates" | "race_overrides" | "tickets" | "sites" | "totals";
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const dateOf = (t: string) => `${t.slice(0, 10)}T00:00:00Z`;
const INDENT = "    ";

export function generatedBlocks(md: string, roster: RosterRow[], rule: D1Rule): Record<BlockName, string[]> {
  const ws = parseWorksheet(md);
  const cand = new Map(ws.candidates.map((c) => [c.candidate_id, c]));
  const fec = new Map(ws.fec.map((f) => [f.candidate_id, f]));
  const candidates = roster.map((r, i) => {
    const c = cand.get(r.candidate_id)!;
    const isInc = (rule === "seat" ? c.holds_this_seat : c.incumbent) === "Yes";
    const f = fec.get(r.candidate_id)?.fec_candidate_id ?? "";
    const fecSql = FEC_ID.test(f) ? q(f) : "NULL";
    const comma = i < roster.length - 1 ? "," : "";
    return `${INDENT}(${q(r.candidate_id)}, ${q(r.legal_name)}, ${isInc}, ${q(c.source_url)}, ${q(dateOf(c.read_1))}, ${fecSql})${comma}`;
  });
  const race_overrides: string[] = [];
  for (const [raceId, e] of expectedIncumbents(ws, roster, rule)) {
    if (e.count >= 2) race_overrides.push(`${INDENT},(${q(raceId)}, ${e.incumbent ? q(e.incumbent) : "NULL"})`);
  }
  const gov = roster.filter((r) => r.race_id === "FL-GOV-general");
  const tickets = gov.map((r, i) => {
    const t = ws.tickets.find((x) => x.candidate_id === r.candidate_id)!;
    const comma = i < gov.length - 1 ? "," : "";
    return `${INDENT}(${q(r.candidate_id)}, ${q(r.legal_name)}, ${q(t.stored)}, ${q(t.can_detail_url)}, ${q(dateOf(t.read_1))})${comma}`;
  });
  const writes = ws.sites.filter((s) => s.action === "write now");
  const sites = writes.map((s) => {
    const r = roster.find((x) => x.candidate_id === s.candidate_id)!;
    return `${INDENT},(${q(s.candidate_id)}, ${q(r.legal_name)}, ${q(s.result)}, ${q(dateOf(s.read_1))})`;
  });
  const n = roster.filter((r) => (rule === "seat" ? cand.get(r.candidate_id)?.holds_this_seat : cand.get(r.candidate_id)?.incumbent) === "Yes").length;
  const totals = [
    `  -- D1 rule: ${rule}${rule === "membership" ? " (Recommended)" : " (TO FLIP)"}. Regenerate: node scripts/roster-worksheet.ts --write-migration --d1 ${rule}`,
    `  n_incumbents_expected CONSTANT int := ${n};`,
    `  n_sited_expected      CONSTANT int := ${SITED_BEFORE + writes.length};`,
  ];
  return { candidates, race_overrides, tickets, sites, totals };
}

/** Replaces each generated block's lines, leaving its marker lines. */
export function applyBlocks(sql: string, blocks: Record<BlockName, string[]>): string {
  let out = sql;
  for (const name of Object.keys(blocks) as BlockName[]) {
    const re = new RegExp(
      `(^[ \\t]*-- BEGIN generated: ${name}\\n)[\\s\\S]*?(^[ \\t]*-- END generated: ${name}$)`,
      "m",
    );
    if (!re.test(out)) throw new Error(`migration: no generated block "${name}"`);
    out = out.replace(re, (_m, begin: string, end: string) => begin + blocks[name].map((l) => `${l}\n`).join("") + end);
  }
  return out;
}

export function ruleOf(sql: string): D1Rule {
  return /-- D1 rule: seat\b/.test(sql) ? "seat" : "membership";
}

/* ---- the skeleton ---------------------------------------------------------- */

const tableHead = (name: TableName) =>
  [`<!-- table:${name} -->`, `| ${COLUMNS[name].join(" | ")} |`, `|${COLUMNS[name].map(() => "---").join("|")}|`];

export function skeleton(roster: RosterRow[]): string {
  const races = [...new Set(roster.map((r) => r.race_id))];
  return [
    "## Candidates",
    "",
    ...tableHead("candidates"),
    ...roster.map((r) => tableRow([r.candidate_id, r.legal_name, r.race_id, labelFor(r.race_id) ?? "", "", "", "", "", "", "", ""])),
    "",
    "## Races",
    "",
    ...tableHead("races"),
    ...races.map((id) => tableRow([id, "", "", "", ""])),
    "",
    "## FEC cross-check",
    "",
    ...tableHead("fec"),
    ...roster.filter((r) => r.level === "federal").map((r) => tableRow([r.candidate_id, r.race_id, "", "", "", "", ""])),
    "",
    "## Running mates",
    "",
    ...tableHead("tickets"),
    ...roster
      .filter((r) => r.race_id === "FL-GOV-general")
      .map((r) => tableRow([r.candidate_id, "", canDetailUrl(r.candidate_id.replace(/^FL-DOE-/, "")), "", "", "", "", DASH, DASH, DASH])),
    "",
    "## No-site re-checks",
    "",
    ...tableHead("sites"),
    ...roster.filter((r) => !r.has_site).map((r) => tableRow([r.candidate_id, r.race_id, r.race_status, "", "", "", "", ""])),
    "",
  ].join("\n");
}

/* ---- CLI -------------------------------------------------------------------- */

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const args = process.argv.slice(2);
  const roster = loadRoster();
  if (args.includes("--skeleton")) {
    process.stdout.write(skeleton(roster));
  } else if (args.includes("--fill-times")) {
    const at = args.indexOf("--fill-times");
    const index = (round: string) => {
      const file = join(ROOT, ".roster-reads", round, "index.json");
      if (!existsSync(file)) throw new Error(`no ${file}: run scripts/roster-reads.ts --round ${round} first`);
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, IndexEntry>;
    };
    const times = timesFromRounds(index(args[at + 1]), index(args[at + 2]));
    const file = join(ROOT, WORKSHEET_PATH);
    const before = readFileSync(file, "utf8");
    const after = fillTimes(before, times);
    writeFileSync(file, after);
    const changed = after.split("\n").filter((l, i) => l !== before.split("\n")[i]).length;
    console.log(`filled read times on ${changed} row(s) of ${WORKSHEET_PATH} from ${times.size} page(s) read in both rounds`);
  } else if (args.includes("--check") || args.includes("--write-migration")) {
    const md = readFileSync(join(ROOT, WORKSHEET_PATH), "utf8");
    const problems = checkWorksheet(md, roster);
    for (const p of problems) console.log(`FAIL  ${p}`);
    console.log(`${problems.length} problem(s) in ${WORKSHEET_PATH}`);
    if (problems.length) process.exit(1);
    if (args.includes("--write-migration")) {
      const ruleArg = args[args.indexOf("--d1") + 1];
      const rule: D1Rule = args.includes("--d1") && ruleArg === "seat" ? "seat" : "membership";
      const file = join(ROOT, MIGRATION_PATH);
      writeFileSync(file, applyBlocks(readFileSync(file, "utf8"), generatedBlocks(md, roster, rule)));
      console.log(`wrote the generated blocks of ${MIGRATION_PATH} (D1 rule: ${rule})`);
    }
  } else {
    console.error("usage: node scripts/roster-worksheet.ts --skeleton | --fill-times <a> <b> | --check | --write-migration [--d1 membership|seat]");
    process.exit(2);
  }
}
