/* The candidate-leads rules: what a mention an agent extracted from a story
   becomes (spec docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §4).

   R5, a scheduled Claude agent, reads stories that matched no roster
   candidate and lists the people they present as candidates. Everything after
   that reading is decided here, in pure code, so it can be proven offline
   (scripts/verify-candidate-leads.ts): which mentions count, how one person's
   mentions merge, and what has already been queued.

   Leads are for the operator only. No rule reads party, and leads are never
   ranked. Relative imports with the extension: plain-Node scripts import this. */

import { countyFipsFor, countyName } from "./fl-counties.ts";
import { CandidateLeadPayloadSchema, type CandidateLeadPayload } from "../types/admin.ts";

/** The four counties the guide covers. A race there is not a lead. */
export const COVERED_FIPS: ReadonlySet<string> = new Set(["12011", "12057", "12086", "12095"]);

/** One person the agent read as a candidate in one or more stories. */
export interface Mention {
  name: string;
  office: string;
  jurisdiction: string;
  /** County name as written ("Palm Beach"), "statewide", or "". */
  county: string;
  /** At most 15 words from the title or summary. */
  evidence: string;
  /** Story numbers (`i`) from `candidate-leads.ts prep`. */
  stories: number[];
  /** True only when the text places the race in a Florida election in 2026. */
  florida_2026: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The agent's mentions are untrusted input. The first problem, as a message
    naming the mention's index and the field, or null when every mention is
    well formed. The caller refuses the whole batch on a problem rather than let
    buildLeads coerce it (a string "false" is truthy). A name and an office must
    say something: the console card shows both, and the payload schema requires
    both. */
export function mentionProblem(raw: readonly unknown[]): string | null {
  const text = ["name", "office", "jurisdiction", "county", "evidence"] as const;
  for (const [i, m] of raw.entries()) {
    if (!isRecord(m)) return `mention ${i} is not an object`;
    for (const f of text) if (typeof m[f] !== "string") return `mention ${i}: ${f} must be a string`;
    for (const f of ["name", "office"] as const) {
      if ((m[f] as string).trim() === "") return `mention ${i}: ${f} must not be blank`;
    }
    if (!Array.isArray(m.stories) || !m.stories.every((n) => Number.isInteger(n))) {
      return `mention ${i}: stories must be an array of integers`;
    }
    if (typeof m.florida_2026 !== "boolean") return `mention ${i}: florida_2026 must be true or false (a boolean)`;
  }
  return null;
}

export interface StoryRef {
  url: string;
  title: string;
  outlet: string;
  published_at: string;
}

export type LeadKind = "other_county" | "running_mate";

export interface Lead {
  name: string;
  office: string;
  jurisdiction: string;
  kind: LeadKind;
  county_fips: string | null;
  evidence: string;
  stories: StoryRef[];
  dedupe_key: string;
}

export type DropReason =
  | "no_name"
  | "not_florida_2026"
  | "covered_county"
  | "unknown_county"
  | "on_roster"
  | "no_story"
  | "already_queued";

const MAX_STORIES = 20;
/** The most leads one `queue` batch may carry. Twice a week the research pass
    finds about 8; a batch far past that is a runaway or an injected list. */
export const MAX_BATCH = 50;
/** CandidateLeadPayloadSchema limits (src/types/admin.ts) for a story's title and outlet. */
const MAX_TITLE = 240;
const MAX_OUTLET = 120;

/** `text` cut to `max` UTF-16 units, never ending on half of a surrogate pair. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

/** A story as the payload will carry it: title and outlet inside the schema's
    limits, so one long headline cannot refuse a whole batch. */
function storyRef(ref: StoryRef): StoryRef {
  return { ...ref, title: clip(ref.title, MAX_TITLE), outlet: clip(ref.outlet, MAX_OUTLET) };
}

/** One comparable form of a person's name: no accents, no quoted nickname or
    parenthetical, no suffix (Jr., Sr., II to IV), no single-letter initial,
    lower case. "Oliver G. Gilbert III" and "Oliver Gilbert" are one person. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/["\u201C\u201D][^"\u201C\u201D]*["\u201C\u201D]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(jr|sr|ii|iii|iv)\.?$/.test(w) && !/^[a-z]\.?$/.test(w))
    .join(" ")
    .replace(/[^a-z0-9' -]/g, "")
    .trim();
}

/** How English and Spanish text names the lieutenant governor slot: the office
    ("Lieutenant Governor", "Lt. Gov.", "vicegobernador") or the role ("running
    mate", "compañera de fórmula"). No g or y flag: `test` keeps no state. */
export const RUNNING_MATE_PATTERN =
  /lieutenant[\s-]+gov|\blt\.?\s?gov|running mate|vicegobernador|compa[nñ]er[oa] de f[oó]rmula/i;

/** True when the text names a running mate. Composed accents (ñ) and decomposed
    ones (n + U+0303) read the same. */
export function mentionsRunningMate(text: string): boolean {
  return RUNNING_MATE_PATTERN.test(text.normalize("NFC"));
}

/** Whether prep hands a story to R5. A story that matched no roster candidate
    is kept. One that matched is dropped unless it mentions a running mate: such
    a story names the governor candidate, who is on the roster, so a plain
    "unmatched" filter would hide every running-mate story. */
export function keepForReading(matchedRoster: boolean, title: string, summary: string | null): boolean {
  return !matchedRoster || mentionsRunningMate(`${title} ${summary ?? ""}`);
}

/** Florida's governor and lieutenant governor run as one ticket. */
export function isRunningMateOffice(office: string): boolean {
  return mentionsRunningMate(office);
}

export function classifyMention(
  m: Mention,
): { kind: LeadKind; county_fips: string | null } | { drop: DropReason } {
  if (!m.florida_2026) return { drop: "not_florida_2026" };
  if (isRunningMateOffice(m.office)) return { kind: "running_mate", county_fips: null };
  const fips = countyFipsFor(m.county);
  if (!fips) return { drop: "unknown_county" };
  if (COVERED_FIPS.has(fips)) return { drop: "covered_county" };
  return { kind: "other_county", county_fips: fips };
}

export function leadDedupeKey(name: string, kind: LeadKind, countyFips: string | null): string {
  return `${normalizeName(name)}|${kind}|${countyFips ?? "statewide"}`;
}

/** The names `check` compares mentions against: R5's roster (the
    published-race candidates, loadRoster) plus every running mate already
    stored on a Governor ballot row (0049; roster-completeness spec §3.6). A
    running mate we already list is then dropped as on_roster instead of
    queued; a different name (a replacement ticket) still becomes a lead.
    Blank values are skipped. */
export function namesToCheck(
  rosterNames: readonly string[],
  storedRunningMates: readonly (string | null | undefined)[],
): string[] {
  return [
    ...rosterNames,
    ...storedRunningMates.filter((n): n is string => typeof n === "string" && n.trim() !== ""),
  ];
}

/** Mentions in, leads out. A name first (a blank one has no dedupe key), then
    classification, then the roster, then the stories, then what is already
    queued or decided; one person's mentions merge on the dedupe key.
    Deterministic: leads are sorted by key, by code unit and not by locale. */
export function buildLeads(
  mentions: readonly Mention[],
  stories: ReadonlyMap<number, StoryRef>,
  rosterNames: readonly string[],
  existingKeys: ReadonlySet<string>,
): { leads: Lead[]; dropped: { name: string; reason: DropReason }[] } {
  const roster = new Set(rosterNames.map(normalizeName));
  const byKey = new Map<string, Lead>();
  const dropped: { name: string; reason: DropReason }[] = [];

  for (const m of mentions) {
    if (!normalizeName(m.name)) {
      dropped.push({ name: m.name, reason: "no_name" });
      continue;
    }
    const c = classifyMention(m);
    if ("drop" in c) {
      dropped.push({ name: m.name, reason: c.drop });
      continue;
    }
    if (roster.has(normalizeName(m.name))) {
      dropped.push({ name: m.name, reason: "on_roster" });
      continue;
    }
    const refs: StoryRef[] = [];
    for (const i of m.stories) {
      const found = stories.get(i);
      if (found && !refs.some((r) => r.url === found.url)) refs.push(storyRef(found));
    }
    if (refs.length === 0) {
      dropped.push({ name: m.name, reason: "no_story" });
      continue;
    }
    const key = leadDedupeKey(m.name, c.kind, c.county_fips);
    if (existingKeys.has(key)) {
      dropped.push({ name: m.name, reason: "already_queued" });
      continue;
    }
    const lead = byKey.get(key);
    if (!lead) {
      byKey.set(key, {
        name: m.name.trim(),
        office: m.office.trim(),
        jurisdiction: m.jurisdiction.trim(),
        kind: c.kind,
        county_fips: c.county_fips,
        evidence: m.evidence.trim(),
        stories: refs.slice(0, MAX_STORIES),
        dedupe_key: key,
      });
      continue;
    }
    for (const ref of refs) {
      if (lead.stories.length >= MAX_STORIES) break;
      if (!lead.stories.some((s) => s.url === ref.url)) lead.stories.push(ref);
    }
  }

  const leads = [...byKey.values()].sort((a, b) => (a.dedupe_key < b.dedupe_key ? -1 : a.dedupe_key > b.dedupe_key ? 1 : 0));
  return { leads, dropped };
}

export interface QueueRow {
  kind: "candidate_lead";
  source: "agent:R5";
  status: "pending";
  payload: CandidateLeadPayload;
}

/** The rows `candidate-leads.ts queue` would insert. Every item must parse
    with the console's own schema, carry the dedupe key its own name, kind and
    county produce, and name a real Florida county outside the covered four when
    it has one (the schema takes any 12xxx code); one bad item, or a batch over
    MAX_BATCH, refuses the whole batch, so a run never leaves a partial queue.
    Keys queued or decided since `check` ran, and repeats inside the batch, are
    skipped. */
export function planQueue(
  items: unknown,
  existingKeys: ReadonlySet<string>,
): { ok: true; rows: QueueRow[]; skipped: string[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(items)) return { ok: false, errors: ["the batch is not an array of leads"] };
  if (items.length > MAX_BATCH) {
    return { ok: false, errors: [`batch of ${items.length} leads is over the ${MAX_BATCH}-lead cap`] };
  }
  const errors: string[] = [];
  const payloads: CandidateLeadPayload[] = [];
  items.forEach((item, n) => {
    const parsed = CandidateLeadPayloadSchema.safeParse(item);
    if (!parsed.success) {
      errors.push(`lead ${n + 1}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      return;
    }
    const p = parsed.data;
    const want = leadDedupeKey(p.name, p.kind, p.county_fips);
    if (p.dedupe_key !== want) {
      errors.push(`lead ${n + 1}: dedupe_key "${p.dedupe_key}" should be "${want}"`);
      return;
    }
    if (p.county_fips !== null && countyName(p.county_fips) === null) {
      errors.push(`lead ${n + 1}: county_fips "${p.county_fips}" is not a Florida county`);
      return;
    }
    if (p.county_fips !== null && COVERED_FIPS.has(p.county_fips)) {
      errors.push(`lead ${n + 1}: county_fips "${p.county_fips}" is a covered county; covered counties are never leads`);
      return;
    }
    payloads.push(p);
  });
  if (errors.length > 0) return { ok: false, errors };

  const seen = new Set(existingKeys);
  const rows: QueueRow[] = [];
  const skipped: string[] = [];
  for (const p of payloads) {
    if (seen.has(p.dedupe_key)) {
      skipped.push(p.dedupe_key);
      continue;
    }
    seen.add(p.dedupe_key);
    rows.push({ kind: "candidate_lead", source: "agent:R5", status: "pending", payload: p });
  }
  return { ok: true, rows, skipped };
}
