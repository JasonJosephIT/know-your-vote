/* No voter-entered ZIP, census block, email address or unsubscribe token
   in a Supabase request URL.

   Supabase's API gateway logs every PostgREST request URL, query string
   included, and a PostgREST filter puts its value in the query string:
   .eq("zip5", zip) is ?zip5=eq.33130, .eq("email", e) is
   ?email=eq.ana%40example.com. Request bodies are not logged. The founder
   asked (2026-10-13) that where people live not sit readable in those
   logs, so:

     1. ZIPs. resolveZip and the crons' zipCounties read zip_district whole,
        through one cached, paged reader (zipDistrictRows in
        src/lib/resolve.ts), and filter in memory, as resolveBlock already
        did for census blocks. On the table as production holds it (0022
        and every later *_zip_district.sql, in embedded Postgres,
        @electric-sql/pglite, through ./zip-district-state.mjs, so
        verify-all runs this in its heavy lane), the in-memory pick gives
        every ZIP exactly the rows the old .eq("zip5") filter did, and the
        whole-table county map gives every ZIP the county the old
        .in("zip5") read did.
     2. NO FILTER ON THOSE COLUMNS ANYWHERE IN src/, except the fallback
        branches below, each after a PGRST202 check in the same function.
     3. ADDRESSES AND TOKENS go to SQL functions (migration 0058) whose
        arguments travel in the POST body: every .rpc() call is the plain
        two-argument POST form (a { get: true } or { head: true } option
        would move the arguments into the URL). Until 0058 is applied each
        falls back on PGRST202 to the query it replaced. The rehearsal
        lookup the two cron routes share (src/lib/notifications/
        rehearsal.ts) is driven here with a fake client; the welcome
        throttle and unsubscribe store are driven in
        verify-welcome-throttle.ts and verify-unsubscribe.ts, and the SQL
        itself in verify-migrations.mjs.
     4. THE ROUTES use the shared helpers, and the migration ledger lists
        0058 as not yet applied.

   What it cannot cover: the live gateway logs. After 0058 is applied, the
   Supabase API logs (read-only) should show POSTs to /rest/v1/rpc/
   subscription_* and no voting_info_subscription request with email= or
   unsubscribe_token= in it.

   Run: node scripts/verify-request-urls.ts */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rehearsalSubscription } from "../src/lib/notifications/rehearsal.ts";
import { NO_SUCH_FUNCTION } from "../src/lib/notifications/rpc-fallback.ts";
import {
  applyMigration,
  freshZipDistrictDb,
  zipCorrections,
} from "./zip-district-state.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const code = (rel: string) => stripComments(source(rel));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}
const j = (v: unknown) => JSON.stringify(v);

/* The body of a top-level function or const in a source file. */
function body(text: string, name: string): string {
  const start = text.search(new RegExp(`(?:function ${name}(?:<[^>]*>)?\\(|const ${name} =)`));
  if (start < 0) return "";
  const next = text.slice(start + 1).search(/\n(?:export )?(?:async )?(?:function |const |type )/);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
}

/* ---- 1. ZIPs ------------------------------------------------------------ */

console.log("1. ZIPs: zip_district read whole, filtered in memory");
const resolve = code("src/lib/resolve.ts");
const resolveZip = body(resolve, "resolveZip");
const reader = body(resolve, "zipDistrictRows");
const readWhole = body(resolve, "readWholeTable");
check(
  "resolveZip picks the ZIP's covered rows from zipDistrictRows(), and builds no query of its own",
  /const rows = \(await zipDistrictRows\(\)\)\.filter\(\s*\(r\) => r\.zip5 === zip && r\.in_coverage\s*\);/.test(resolveZip) &&
    !/\.from\(|createAnonServerClient/.test(resolveZip),
  resolveZip ? "" : "resolveZip not found"
);
check(
  "zipDistrictRows: unstable_cache, tag \"districts\", an hour, every column resolveZip reads, ordered by the primary key",
  /unstable_cache\(/.test(reader) &&
    /readWholeTable<ZipDistrict>\(\s*"zip_district",\s*"zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage",[\s\S]*\["zip5", "congressional_district"\]\s*\)/.test(reader) &&
    /\{ revalidate: 3600, tags: \["districts"\] \}/.test(reader),
  reader
);
check(
  "the primary key is (zip5, congressional_district), so paging on it can neither repeat nor skip a row",
  /CREATE TABLE zip_district \([\s\S]*PRIMARY KEY \(zip5, congressional_district\)\s*\n\);/.test(source("supabase/migrations/0001_app_tables.sql"))
);
check(
  "readWholeTable pages by .range() with every order column, and throws on an error or an empty table (a throw is not cached)",
  /for \(const column of order\) query = query\.order\(column\);/.test(readWhole) &&
    /\.range\(from, from \+ PAGE_ROWS - 1\)/.test(readWhole) &&
    /if \(error\) throw new Error\(/.test(readWhole) &&
    /if \(rows\.length === 0\) throw new Error\(/.test(readWhole) &&
    /const PAGE_ROWS = 1000;/.test(resolve)
);
check(
  "blockRanges reads block_district through the same reader, cached under the same tag",
  /readWholeTable<BlockRange>\(\s*"block_district",/.test(body(resolve, "blockRanges")) &&
    /tags: \["districts"\]/.test(body(resolve, "blockRanges"))
);
const cohort = code("src/lib/notifications/cohort.ts");
const zipCounties = body(cohort, "zipCounties");
check(
  "zipCounties (the crons) builds its map from zipDistrictRows(), takes no ZIPs and sends no query",
  /export async function zipCounties\(\): Promise<Map<string, string>>/.test(cohort) &&
    /for \(const row of await zipDistrictRows\(\)\) map\.set\(row\.zip5, row\.county_fips\);/.test(zipCounties) &&
    !/\.from\(|\.in\(/.test(zipCounties) &&
    /import \{ zipDistrictRows \} from "@\/lib\/resolve";/.test(cohort),
  zipCounties
);

/* The table as production holds it. */
const db = await freshZipDistrictDb();
await applyMigration(db, "0022_zip_seed_2026.sql");
for (const file of zipCorrections()) await applyMigration(db, file);
const COLUMNS = "zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage";
type ZipRow = {
  zip5: string;
  county_fips: string;
  county_name: string;
  congressional_district: string;
  metro: string | null;
  is_split: boolean;
  in_coverage: boolean;
};
/* What readWholeTable asks for. */
const whole = (await db.query<ZipRow>(`SELECT ${COLUMNS} FROM zip_district ORDER BY zip5, congressional_district;`)).rows;
const zips = [...new Set(whole.map((r) => r.zip5))];
/* ZIPs not in the table: a Florida ZIP outside the four counties, one in
   Georgia, and none. */
const absent = ["32301", "30301", "00000"];
const byKey = (a: ZipRow, b: ZipRow) => a.congressional_district.localeCompare(b.congressional_district);
const mismatches: string[] = [];
for (const zip of [...zips, ...absent]) {
  /* The old read: .eq("zip5", zip), then the in_coverage filter. */
  const old = (await db.query<ZipRow>(`SELECT ${COLUMNS} FROM zip_district WHERE zip5 = $1;`, [zip])).rows
    .filter((r) => r.in_coverage)
    .sort(byKey);
  const now = whole.filter((r) => r.zip5 === zip && r.in_coverage).sort(byKey);
  if (j(old) !== j(now)) mismatches.push(`${zip}: ${j(old)} vs ${j(now)}`);
}
check(
  `every ZIP in the table (${zips.length}) and ${absent.length} that are not: the in-memory pick is exactly the rows the old .eq("zip5") read gave`,
  zips.length > 200 && mismatches.length === 0,
  mismatches.slice(0, 3).join("\n      ")
);
check(
  `the whole table is ${whole.length} rows, one page, and every ZIP in it sits in exactly one county (zipCounties keys on the ZIP)`,
  whole.length > 0 &&
    whole.length < 1000 &&
    zips.every((z) => new Set(whole.filter((r) => r.zip5 === z).map((r) => r.county_fips)).size === 1)
);
const oldCounties = new Map<string, string>();
for (const row of (await db.query<{ zip5: string; county_fips: string }>(
  "SELECT zip5, county_fips FROM zip_district WHERE zip5 = ANY($1);",
  [[...zips, ...absent]]
)).rows) {
  oldCounties.set(row.zip5, row.county_fips);
}
const newCounties = new Map<string, string>();
for (const row of whole) newCounties.set(row.zip5, row.county_fips);
const countyMismatch = [...zips, ...absent].filter((z) => oldCounties.get(z) !== newCounties.get(z));
check(
  "the whole-table county map gives every ZIP the county the old .in(\"zip5\") read did, and no county for a ZIP outside the table",
  countyMismatch.length === 0 && absent.every((z) => !newCounties.has(z)),
  countyMismatch.join(", ")
);
await db.close();

/* ---- 2. no filter on those columns ------------------------------------- */

console.log("\n2. No filter on a ZIP, block, address or token column in src/");
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const rel = path.join(dir, name);
    if (statSync(path.join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(ts|tsx)$/.test(name) ? [rel] : [];
  });
}
const FILTER =
  /\.(eq|neq|in|like|ilike|gt|gte|lt|lte|is|filter|contains|containedBy|textSearch|not)\(\s*"(zip5|block_start|block_end|email|unsubscribe_token)"/g;
/* The fallbacks: each runs only when the 0058 function is missing. */
const FALLBACKS: Record<string, string[]> = {
  "src/lib/notifications/welcome-throttle.ts": ['eq("email"', 'eq("unsubscribe_token"'],
  "src/lib/notifications/unsubscribe.ts": ['eq("unsubscribe_token"', 'eq("email"', 'eq("email"'],
  "src/lib/notifications/rehearsal.ts": ['in("email"'],
};
const found: Record<string, string[]> = {};
const unguarded: string[] = [];
for (const file of sourceFiles("src")) {
  const text = code(file);
  for (const m of text.matchAll(FILTER)) {
    (found[file] ??= []).push(`${m[1]}("${m[2]}"`);
    /* Guarded: a functionMissing() check sits between the start of the
       enclosing function (every function here is async, with no async
       function inside it) and the filter. */
    const before = text.slice(0, m.index);
    const fnStart = before.lastIndexOf("async ");
    const guard = before.lastIndexOf("functionMissing(");
    if (guard < 0 || guard < fnStart) unguarded.push(`${file}: .${m[1]}("${m[2]}")`);
  }
}
const sorted = (o: Record<string, string[]>) => j(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
check(
  "the only such filters are the fallbacks for the 0058 functions, in welcome-throttle.ts, unsubscribe.ts and rehearsal.ts",
  sorted(found) === sorted(FALLBACKS),
  j(found)
);
check(
  "each runs only after a PGRST202 check in the same function",
  unguarded.length === 0,
  unguarded.join("; ")
);
check(
  "no .or() or .match() names a ZIP, address or token column",
  sourceFiles("src").every((f) => !/\.(or|match)\([^)]*\b(zip5|email|unsubscribe_token)\b/.test(code(f)))
);

/* ---- 3. addresses and tokens in the body ------------------------------- */

console.log("\n3. Addresses and tokens go in a request body");
const rpcCalls = sourceFiles("src").flatMap((f) => [...code(f).matchAll(/\.rpc\(/g)].map(() => f));
const plainCalls = sourceFiles("src").flatMap((f) =>
  [...code(f).matchAll(/\.rpc\(\s*"subscription_\w+",\s*\{[^}]*\}\s*\)/g)].map(() => f)
);
check(
  "every .rpc() in src/ is the two-argument POST form for a 0058 function (no { get } or { head } option to move its arguments into the URL)",
  rpcCalls.length === 6 && j(rpcCalls) === j(plainCalls),
  j(rpcCalls)
);
check("PGRST202 is PostgREST's \"no such function\"", NO_SUCH_FUNCTION === "PGRST202");

type Call = [string, ...unknown[]];
type Result = { data: unknown; error: unknown };
function recordingClient(rpc: Result, table: Result = { data: null, error: { message: "the table was read" } }) {
  const calls: Call[] = [];
  const thenable = (result: Result) => (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return thenable(table);
        return (...args: unknown[]) => {
          calls.push([String(prop), ...args]);
          return builder;
        };
      },
    }
  );
  const client = {
    from(name: string) {
      calls.push(["from", name]);
      return builder;
    },
    rpc(...args: unknown[]) {
      calls.push(["rpc", ...args]);
      return { then: thenable(rpc) };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}
const MISSING: Result = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
const SUB = { email: "ana@example.com", unsubscribe_token: "0".repeat(31) + "1", zip5: "33130" };
{
  const a = recordingClient({ data: [SUB], error: null });
  const got = await rehearsalSubscription(a.client, "Ana@Example.com");
  check(
    "rehearsalSubscription: one call to subscription_for_rehearsal, both spellings in the body, the row it returns",
    j(got) === j(SUB) && j(a.calls) === j([["rpc", "subscription_for_rehearsal", { p_emails: ["Ana@Example.com", "ana@example.com"] }]]),
    j(a.calls)
  );
  const lower = recordingClient({ data: [], error: null });
  const none = await rehearsalSubscription(lower.client, "ana@example.com");
  check(
    "an address already lower-case is sent once; no active row is null",
    none === null && j(lower.calls) === j([["rpc", "subscription_for_rehearsal", { p_emails: ["ana@example.com"] }]]),
    j(lower.calls)
  );
  const m = recordingClient(MISSING, { data: [SUB], error: null });
  const fallback = await rehearsalSubscription(m.client, "Ana@Example.com");
  check(
    "0058 not applied (PGRST202): then the old read, active rows for either spelling, first in token order, one row",
    j(fallback) === j(SUB) &&
      j(m.calls) ===
        j([
          ["rpc", "subscription_for_rehearsal", { p_emails: ["Ana@Example.com", "ana@example.com"] }],
          ["from", "voting_info_subscription"],
          ["select", "email, unsubscribe_token, zip5"],
          ["in", "email", ["Ana@Example.com", "ana@example.com"]],
          ["eq", "active", true],
          ["order", "unsubscribe_token"],
          ["limit", 1],
        ]),
    j(m.calls)
  );
  let threw = 0;
  const other = recordingClient({ data: null, error: { code: "57014", message: "timeout" } }, { data: [SUB], error: null });
  try {
    await rehearsalSubscription(other.client, SUB.email);
  } catch {
    threw++;
  }
  try {
    await rehearsalSubscription(recordingClient(MISSING, { data: null, error: { message: "timeout" } }).client, SUB.email);
  } catch {
    threw++;
  }
  check(
    "a database error throws, from the function or the fallback (the routes answer 502), and an error other than PGRST202 never falls back",
    threw === 2 && !other.calls.some(([op]) => op === "from"),
    `${threw} threw; ${j(other.calls)}`
  );
}
check(
  "rehearsal.ts has no server-only and no @/ import (plain Node loads it)",
  !/server-only|from "@\//.test(code("src/lib/notifications/rehearsal.ts"))
);

/* ---- 4. the routes and the ledger --------------------------------------- */

console.log("\n4. Routes and the migration ledger");
for (const rel of ["src/app/api/cron/send-reminders/route.ts", "src/app/api/cron/send-correction/route.ts"]) {
  const route = code(rel);
  check(
    `${rel}: the rehearsal looks the address up through rehearsalSubscription and the county through zipCounties(), with no query of its own`,
    /sub = await rehearsalSubscription\(service, to\);/.test(route) &&
      /\(await zipCounties\(\)\)\.get\(sub\.zip5\)/.test(route) &&
      !/\.in\("email"|\.from\("zip_district"\)/.test(route)
  );
}
const signup = code("src/app/api/voting-info/route.ts");
check(
  "the signup resolves the ZIP with resolveZip, stamps with markWelcomeSent, and filters on nothing it was sent",
  /await resolveZip\(zip\)/.test(signup) &&
    /await markWelcomeSent\(service, subscription\.unsubscribe_token\);/.test(signup) &&
    !/\.(eq|in)\(/.test(signup)
);
const ledger = source("supabase/migrations/README.md");
const row = ledger.split("\n").find((l) => /^\|\s*0058\s*\|/.test(l)) ?? "";
check(
  "the ledger lists 0058_subscription_lookups.sql as written, not applied, for the SQL editor, and moves the free number to 0059",
  /`0058_subscription_lookups\.sql`/.test(row) &&
    /\*\*written, not applied\.\*\*/.test(row) &&
    /SQL editor/.test(row) &&
    /^\|\s*0059\+\s*\|\s*free/m.test(ledger),
  row.slice(0, 200)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nRequest URL checks passed.");
