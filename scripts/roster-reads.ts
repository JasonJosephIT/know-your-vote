/* Read-only reads for the roster-completeness worksheet
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3, §3.6).

     node scripts/roster-reads.ts --round r1 [--only <key-prefix>] [--force]
     node scripts/roster-reads.ts --compare r1 r2 [--only <key-prefix>]
     node scripts/roster-reads.ts --find r1 "<name>" [--only <key-prefix>]

   --round   reads every page in scripts/roster-sources.ts plus the FEC
             cross-check, and writes .roster-reads/<round>/: the raw body of
             each page, its text (<key>.txt), index.json (when each key was
             read, and whether it worked) and facts.json (what the parsers in
             roster-reads-lib.ts found). A round resumes: a key already read in
             it is skipped unless --force.
   --compare checks two rounds agree, key by key, and that each key's reads
             are at least an hour apart (§3.3: two independent reads). It
             prints both read times in the worksheet's format. Exit 1 on any
             disagreement.
   --find    prints, for each page read in a round, at most 15 words around a
             name: the worksheet's evidence column.

   READ-ONLY. Nothing here writes to any database, and nothing is committed:
   .roster-reads/ is gitignored because the DoE pages carry each campaign's
   address, phone and treasurer. Only the worksheet, written by hand from
   these files, goes into the repo.

   The FEC reads use FEC_API_KEY from .env.local (loaded by env-local.ts,
   never printed, never written: the logged URL omits it). Without it the FEC
   keys are recorded as "FEC not read"; the FEC decides nothing (§3.3). On an
   HTTP 429 the round stops with exit 3; run the same command after an hour and
   it resumes where it stopped.

   Headless reads use Google Chrome (CHROME_PATH overrides the path) with a
   throwaway profile, its own user agent unaltered, and a hard 90 s limit. A
   page that answers with a challenge, a 401/403 page or almost no text is
   recorded as not read; it is never retried with a different identity. */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { loadEnvLocal } from "./env-local.ts";
import {
  INGEST_AGENT,
  MIN_PAGE_TEXT_CHARS,
  looksLikeBotChallenge,
  visibleTextLength,
} from "../src/lib/candidate-site.ts";
import {
  namesOnPage,
  pageText,
  parseFecCandidates,
  parseHouseFlorida,
  parseRunningMate,
  parseSenateFlorida,
  snippet,
  worksheetTime,
} from "./roster-reads-lib.ts";
import { HOUSE_DISTRICTS, SOURCES } from "./roster-sources.ts";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".roster-reads");
const UA = `${INGEST_AGENT}/1.0 (+https://github.com/JasonJosephIT/know-your-vote)`;
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const execFileP = promisify(execFile);

interface ReadSource {
  key: string;
  url: string;
  via: "fetch" | "chrome" | "fec";
  parse: "house" | "senate" | "doe" | "text" | "fec";
}

interface IndexEntry {
  key: string;
  url: string;
  via: string;
  readAt: string;
  ok: boolean;
  bytes: number;
  sha256: string;
  error?: string;
}

const FEC_BASE = "https://api.open.fec.gov/v1/candidates/";
const fecUrl = (extra: Record<string, string>) =>
  `${FEC_BASE}?${new URLSearchParams({ state: "FL", election_year: "2026", per_page: "100", ...extra })}`;

function allSources(): ReadSource[] {
  const fec: ReadSource[] = [
    ...HOUSE_DISTRICTS.map((d): ReadSource => {
      const dd = String(d).padStart(2, "0");
      return { key: `fec-h-${dd}`, url: fecUrl({ office: "H", district: dd }), via: "fec", parse: "fec" };
    }),
    { key: "fec-s", url: fecUrl({ office: "S" }), via: "fec", parse: "fec" },
  ];
  return [...SOURCES, ...fec];
}

const rosterNames: string[] = (
  JSON.parse(
    readFileSync(join(ROOT, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8"),
  ) as { legal_name: string }[]
).map((r) => r.legal_name);

const readJson = <T>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function plainGet(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, body: await res.text() };
}

async function chromeDom(url: string): Promise<string> {
  const profile = mkdtempSync(join(tmpdir(), "kyv-roster-chrome-"));
  try {
    const { stdout } = await execFileP(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profile}`,
        "--virtual-time-budget=15000",
        "--dump-dom",
        url,
      ],
      { timeout: 90_000, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 },
    );
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

class RateLimited extends Error {}

/** Belt and braces: the key never reaches a file or the terminal. */
const scrub = (text: string) => {
  const key = process.env.FEC_API_KEY;
  return key ? text.split(key).join("<FEC_API_KEY>") : text;
};

async function readOne(s: ReadSource): Promise<{ body: string; ext: string; facts: unknown; problem?: string }> {
  if (s.via === "fec") {
    const key = process.env.FEC_API_KEY;
    if (!key) return { body: "", ext: "json", facts: null, problem: "FEC_API_KEY not set: FEC not read" };
    const got = await plainGet(`${s.url}&api_key=${encodeURIComponent(key)}`);
    const status = got.status;
    const body = scrub(got.body);
    if (status === 429) throw new RateLimited("FEC answered 429 (rate limit)");
    if (status !== 200) return { body, ext: "json", facts: null, problem: `HTTP ${status}` };
    const parsed = parseFecCandidates(JSON.parse(body));
    return parsed.ok
      ? { body, ext: "json", facts: { rows: parsed.rows } }
      : { body, ext: "json", facts: null, problem: parsed.reason };
  }
  if (s.via === "fetch") {
    const { status, body } = await plainGet(s.url);
    if (status !== 200) return { body, ext: "html", facts: null, problem: `HTTP ${status}` };
    if (s.parse === "house") return { body, ext: "xml", facts: { seats: parseHouseFlorida(body) } };
    if (s.parse === "senate") return { body, ext: "xml", facts: { senators: parseSenateFlorida(body) } };
    const text = pageText(body);
    return { body, ext: "html", facts: { names: namesOnPage(text, rosterNames) } };
  }
  const body = await chromeDom(s.url);
  const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1]?.trim() ?? "";
  if (looksLikeBotChallenge(body) || /^40[13]\b/.test(title) || visibleTextLength(body) < MIN_PAGE_TEXT_CHARS) {
    return { body, ext: "html", facts: null, problem: `not read: challenge, refusal or empty page (title "${title}")` };
  }
  if (s.parse === "doe") {
    const rm = parseRunningMate(body);
    return rm
      ? { body, ext: "html", facts: rm }
      : { body, ext: "html", facts: null, problem: "no Running Mate field" };
  }
  const text = pageText(body);
  return { body, ext: "html", facts: { title, names: namesOnPage(text, rosterNames) } };
}

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt("only");
const selected = (keys: string[]) => keys.filter((k) => !only || k.startsWith(only));

async function round(name: string) {
  loadEnvLocal(import.meta.url);
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  const indexFile = join(dir, "index.json");
  const factsFile = join(dir, "facts.json");
  const index = readJson<Record<string, IndexEntry>>(indexFile, {});
  const facts = readJson<Record<string, unknown>>(factsFile, {});
  const sources = allSources().filter((s) => selected([s.key]).length === 1);
  for (const s of sources) {
    if (!args.includes("--force") && index[s.key]?.ok) {
      console.log(`  skip ${s.key} (read ${index[s.key].readAt})`);
      continue;
    }
    const readAt = new Date().toISOString();
    try {
      const r = await readOne(s);
      writeFileSync(join(dir, `${s.key}.${r.ext}`), r.body);
      /* Text only for member and office pages: a DoE page also carries the
         campaign's address and phone, and facts.json already holds its
         running-mate field. */
      if (s.parse === "text") writeFileSync(join(dir, `${s.key}.txt`), pageText(r.body));
      index[s.key] = {
        key: s.key,
        url: s.url,
        via: s.via,
        readAt,
        ok: !r.problem,
        bytes: Buffer.byteLength(r.body),
        sha256: createHash("sha256").update(r.body).digest("hex"),
        ...(r.problem ? { error: r.problem } : {}),
      };
      if (r.facts) facts[s.key] = r.facts;
      console.log(`${r.problem ? "MISS" : "  ok"} ${s.key} ${worksheetTime(readAt)}${r.problem ? ` - ${r.problem}` : ""}`);
    } catch (err) {
      index[s.key] = { key: s.key, url: s.url, via: s.via, readAt, ok: false, bytes: 0, sha256: "", error: scrub((err as Error).message.split("\n")[0]) };
      console.log(`MISS ${s.key} - ${index[s.key].error}`);
      if (err instanceof RateLimited) {
        writeFileSync(indexFile, JSON.stringify(index, null, 2));
        writeFileSync(factsFile, JSON.stringify(facts, null, 2));
        console.error(`stopped: ${err.message}. Re-run this command after an hour; it resumes here.`);
        process.exit(3);
      }
    }
    writeFileSync(indexFile, JSON.stringify(index, null, 2));
    writeFileSync(factsFile, JSON.stringify(facts, null, 2));
    await sleep(1500);
  }
  const missed = Object.values(index).filter((e) => !e.ok && selected([e.key]).length === 1);
  console.log(`\nround ${name}: ${sources.length - missed.length} read, ${missed.length} not read`);
}

/** What must agree between two reads of a key. Page text changes (news,
    banners), so for a page it is the set of roster names on it; for the
    structured sources it is the parsed fact itself. */
function comparable(key: string, f: unknown): string {
  if (f == null) return "null";
  if (key.startsWith("fec-")) {
    const rows = (f as { rows: { candidate_id: string; incumbent_challenge: string | null }[] }).rows;
    return JSON.stringify(rows.map((r) => `${r.candidate_id}:${r.incumbent_challenge}`).sort());
  }
  if (key.startsWith("doe-")) {
    const d = f as { candidate: string | null; office: string | null; stored: string };
    return JSON.stringify([d.candidate, d.office, d.stored]);
  }
  if (key === "house-clerk" || key === "senate-list") return JSON.stringify(f);
  return JSON.stringify(((f as { names?: string[] }).names ?? []).slice().sort());
}

function compare(a: string, b: string) {
  const ia = readJson<Record<string, IndexEntry>>(join(OUT, a, "index.json"), {});
  const ib = readJson<Record<string, IndexEntry>>(join(OUT, b, "index.json"), {});
  const fa = readJson<Record<string, unknown>>(join(OUT, a, "facts.json"), {});
  const fb = readJson<Record<string, unknown>>(join(OUT, b, "facts.json"), {});
  let problems = 0;
  for (const key of selected([...new Set([...Object.keys(ia), ...Object.keys(ib)])].sort())) {
    const ea = ia[key];
    const eb = ib[key];
    const times = `${ea ? worksheetTime(ea.readAt) : "-"}  ${eb ? worksheetTime(eb.readAt) : "-"}`;
    let why = "";
    if (!ea?.ok || !eb?.ok) why = `not read in ${!ea?.ok ? a : b}${(!ea?.ok ? ea : eb)?.error ? ` (${(!ea?.ok ? ea : eb)?.error})` : ""}`;
    else if (Math.abs(Date.parse(eb.readAt) - Date.parse(ea.readAt)) < 60 * 60 * 1000) why = "reads less than an hour apart";
    else if (comparable(key, fa[key]) !== comparable(key, fb[key])) why = `DISAGREE: ${comparable(key, fa[key])} vs ${comparable(key, fb[key])}`;
    if (why) problems++;
    console.log(`${why ? "FAIL" : "  ok"}  ${key.padEnd(18)} ${times}${why ? `  ${why}` : ""}`);
  }
  console.log(`\n${problems} problem(s)`);
  process.exit(problems ? 1 : 0);
}

function find(roundName: string, name: string) {
  const index = readJson<Record<string, IndexEntry>>(join(OUT, roundName, "index.json"), {});
  for (const key of selected(Object.keys(index).sort())) {
    const file = join(OUT, roundName, `${key}.txt`);
    if (!existsSync(file)) continue;
    const s = snippet(readFileSync(file, "utf8"), name);
    if (s) console.log(`${key.padEnd(18)} "${s}"`);
  }
}

const roundName = opt("round");
const cmpAt = args.indexOf("--compare");
const findAt = args.indexOf("--find");
if (roundName) await round(roundName);
else if (cmpAt >= 0 && args[cmpAt + 1] && args[cmpAt + 2]) compare(args[cmpAt + 1], args[cmpAt + 2]);
else if (findAt >= 0 && args[findAt + 1] && args[findAt + 2]) find(args[findAt + 1], args[findAt + 2]);
else {
  console.error(
    'usage: node scripts/roster-reads.ts --round <name> [--only <prefix>] [--force]\n' +
      '       node scripts/roster-reads.ts --compare <round-a> <round-b> [--only <prefix>]\n' +
      '       node scripts/roster-reads.ts --find <round> "<name>" [--only <prefix>]',
  );
  process.exit(2);
}
