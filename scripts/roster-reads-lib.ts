/* Pure helpers for the roster-completeness reads
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3, §3.6).

   No network and no file access here: scripts/roster-reads.ts does the
   fetching and scripts/verify-roster-worksheet.ts tests every function below
   offline. This file lives in scripts/, not src/lib/, on purpose:
   scripts/verify-incumbent-chip.ts fails if anything in src/ other than
   incumbency.ts and the row types mentions the incumbency columns, and none of
   this is app code.

   normalizeDoeText, the spec's D6 rule, lives in src/lib/running-mate.ts
   (the display PR moved it there). It is re-exported here so the read tool,
   the worksheet checker and their tests keep one import, and there is still
   one copy. */

import { decodeEntities } from "../src/lib/candidate-site.ts";
import { normalizeDoeText } from "../src/lib/running-mate.ts";

export { normalizeDoeText };

/** The Division of Elections page for one candidate: <n> is the number in
    our FL-DOE-<n> id (spec §2.6). */
export const canDetailUrl = (account: string) =>
  `https://dos.elections.myflorida.com/candidates/canDetail.asp?account=${account}`;

/** The worksheet's time format, minutes in UTC: 2026-10-09T14:05Z. */
export const worksheetTime = (iso: string) => `${iso.slice(0, 16)}Z`;


export interface RunningMateRead {
  /** "2026 General Election", or null if the heading is missing. */
  election: string | null;
  /** The office line under the heading, e.g. "Governor". */
  office: string | null;
  /** The candidate's name as the page prints it. */
  candidate: string | null;
  /** The page's text after "Running Mate:" up to the cell's end, untouched. */
  raw: string;
  /** normalizeDoeText(raw). */
  stored: string;
}

/** Reads the Division of Elections canDetail page (raw HTML, or the DOM that
    headless Chromium serializes; both are handled). Null when the page has
    no "Running Mate:" field. Throws when the field holds markup, because the
    D6 rule is defined on text only. */
export function parseRunningMate(html: string): RunningMateRead | null {
  const m = /Running Mate:([\s\S]*?)<\/td>/i.exec(html);
  if (!m) return null;
  const raw = m[1];
  if (/<[a-z/!]/i.test(raw)) {
    throw new Error(`parseRunningMate: markup inside the Running Mate field: ${JSON.stringify(raw)}`);
  }
  const heading =
    /<b>\s*(\d{4} General Election)\s*<\/b>\s*<\/font>\s*<b>\s*<br\s*\/?>\s*([^<]+?)\s*<\/b>/i.exec(html);
  const candidate = /<font\b[^>]*color="?#CCOOOO"?[^>]*>\s*<b>([^<]+)<\/b>/i.exec(html);
  return {
    election: heading ? normalizeDoeText(heading[1]) : null,
    office: heading ? normalizeDoeText(heading[2]) : null,
    candidate: candidate ? normalizeDoeText(candidate[1]) : null,
    raw,
    stored: normalizeDoeText(raw),
  };
}

export interface HouseSeat {
  district: number;
  /** <official-name>, or null when the seat is vacant. */
  name: string | null;
  /** The Clerk's footnote for a vacant seat, else null. */
  vacancy: string | null;
}

/** Florida's seats in https://clerk.house.gov/xml/lists/MemberData.xml, in
    district order. */
export function parseHouseFlorida(xml: string): HouseSeat[] {
  const seats: HouseSeat[] = [];
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const block = m[1];
    const sd = /<statedistrict>FL(\d{2})<\/statedistrict>/.exec(block);
    if (!sd) continue;
    const name = /<official-name>([^<]+)<\/official-name>/.exec(block)?.[1] ?? null;
    const footnote = /<footnote>([^<]+)<\/footnote>/.exec(block)?.[1] ?? null;
    seats.push({
      district: Number(sd[1]),
      name: name ? decodeEntities(name).trim() : null,
      vacancy: name ? null : footnote ? decodeEntities(footnote).trim() : "vacant",
    });
  }
  return seats.sort((a, b) => a.district - b.district);
}

export interface Senator {
  name: string;
  lastName: string;
  website: string | null;
  senateClass: string | null;
}

/** Florida's senators in senate.gov's senators_cfm.xml. */
export function parseSenateFlorida(xml: string): Senator[] {
  const out: Senator[] = [];
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const block = m[1];
    if (!/<state>\s*FL\s*<\/state>/.test(block)) continue;
    const field = (tag: string) =>
      new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`).exec(block)?.[1] ?? null;
    const first = field("first_name") ?? "";
    const last = field("last_name") ?? "";
    out.push({
      name: `${decodeEntities(first)} ${decodeEntities(last)}`.trim(),
      lastName: decodeEntities(last),
      website: field("website"),
      senateClass: field("class"),
    });
  }
  return out;
}

export interface FecRow {
  candidate_id: string;
  name: string;
  incumbent_challenge: string | null;
  election_districts: string[];
}

/** One FEC /v1/candidates/ page. Refused unless pagination.count equals the
    rows returned (B4's rule): a truncated field can hide the one row that
    matters. */
export function parseFecCandidates(
  body: unknown,
): { ok: true; rows: FecRow[] } | { ok: false; reason: string } {
  const b = body as {
    pagination?: { count?: unknown };
    results?: Array<Record<string, unknown>>;
  };
  if (!b || !Array.isArray(b.results) || typeof b.pagination?.count !== "number") {
    return { ok: false, reason: "not an FEC candidates page (no results/pagination.count)" };
  }
  if (b.pagination.count !== b.results.length) {
    return {
      ok: false,
      reason: `pagination.count ${b.pagination.count} != ${b.results.length} rows returned`,
    };
  }
  return {
    ok: true,
    rows: b.results.map((r) => ({
      candidate_id: String(r.candidate_id ?? ""),
      name: String(r.name ?? ""),
      incumbent_challenge: r.incumbent_challenge == null ? null : String(r.incumbent_challenge),
      election_districts: Array.isArray(r.election_districts)
        ? r.election_districts.map(String)
        : [],
    })),
  };
}

/** What a reader sees: scripts, styles, comments and tags removed, entities
    decoded, whitespace collapsed. */
export function pageText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\xa0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case- and accent-insensitive word key: "Peña," -> "pena". */
export function foldWord(word: string): string {
  return word
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]/gu, "");
}

/** At most `maxWords` consecutive words of `text` that contain `needle`
    (matched word by word, case- and accent-insensitive), or null. The
    worksheet's evidence column is built from this: the page's own words, at
    most 15. */
export function snippet(text: string, needle: string, maxWords = 15): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  const target = needle.split(/\s+/).map(foldWord).filter(Boolean);
  if (target.length === 0 || target.length > maxWords) return null;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, k) => foldWord(words[i + k]) === t)) {
      const room = maxWords - target.length;
      const start = Math.max(0, i - Math.floor(room / 2));
      return words.slice(start, start + maxWords).join(" ");
    }
  }
  return null;
}

/** The surname used to look a candidate up on a page: the last word of the
    legal name that is not a generational suffix. `Phil "Felipe" Ehr` -> Ehr,
    `Victor M. Torres Jr.` -> Torres, `Oliver G. Gilbert III` -> Gilbert. */
export function surname(legalName: string): string {
  const words = legalName.replace(/"[^"]*"/g, " ").split(/\s+/).filter(Boolean);
  const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
  while (words.length > 1 && suffix.test(words[words.length - 1])) words.pop();
  return words[words.length - 1] ?? legalName;
}

/** Which of `legalNames` have their surname on the page. Used to compare two
    reads of a member list: the set must not change between them. */
export function namesOnPage(text: string, legalNames: readonly string[]): string[] {
  const words = new Set(text.split(/\s+/).map(foldWord));
  return legalNames.filter((n) => {
    const last = surname(n);
    return words.has(foldWord(last)) || last.split("-").every((w) => words.has(foldWord(w)));
  });
}
