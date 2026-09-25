/* Advisory lint for the measure-resource seed (spec §7). Not a gate: it
   prints what a reviewer should look at before applying 0035.

   Reads the seed migration as text and parses its VALUES tuples, so it needs
   no database. Three findings:
     1. kind = 'official' on a source whose type is not 'primary_doc'
     2. a video/audio row with no duration
     3. a note that reads as a summary rather than attribution

   Run: node scripts/verify-measure-resources.ts [path-to-seed.sql] */

import { readFileSync } from "node:fs";

const path =
  process.argv[2] ?? "supabase/migrations/0035_measure_resources_2026.sql";
const sql = readFileSync(path, "utf8");

/* Finds the end of a VALUES body starting at `from`: the first top-level
   (outside any '...' literal) "ON CONFLICT" or statement-terminating ";".
   A plain first-';'-wins scan breaks the moment a quoted value legitimately
   contains a semicolon -- e.g. a verbatim ballot title like "INCREASED
   HOMESTEAD EXEMPTION; LOWER CAP ON INCREASES..." (0038) -- which would
   truncate the body mid-tuple and silently parse to zero rows. */
/* Quote-aware only -- it does not skip `--` line comments, so a `;` or
   `ON CONFLICT` inside one would still end the body early. None of the
   migrations this reads put a comment inside a VALUES list. */
function sliceStatementBody(text: string, from: number): string {
  let i = from;
  let inQuote = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === "'") {
        if (text[i + 1] === "'") {
          i += 2;
          continue;
        }
        inQuote = false;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      i++;
      continue;
    }
    if (ch === ";") break;
    if (text.slice(i, i + 11).toUpperCase() === "ON CONFLICT") break;
    i++;
  }
  return text.slice(from, i);
}

/* Pulls every tuple from the INSERT into `table`. Values are SQL literals:
   'quoted' (with '' escapes), NULL, or a bare number. */
function tuples(table: string): string[][] {
  const head = sql.match(
    new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)\\s*VALUES`, "i")
  );
  if (!head || head.index === undefined) return [];
  const body = sliceStatementBody(sql, head.index + head[0].length);
  const out: string[][] = [];
  const tupleRe = /\(((?:'(?:[^']|'')*'|[^()'])*)\)/g;
  let t: RegExpExecArray | null;
  while ((t = tupleRe.exec(body))) {
    const vals: string[] = [];
    const valRe = /'((?:[^']|'')*)'|NULL|(-?\d+(?:\.\d+)?)/gi;
    let v: RegExpExecArray | null;
    while ((v = valRe.exec(t[1]))) {
      vals.push(
        v[1] !== undefined ? v[1].replace(/''/g, "'") : (v[2] ?? "NULL")
      );
    }
    out.push(vals);
  }
  return out;
}

function columns(table: string): string[] {
  const m = sql.match(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)`, "i"));
  return m ? m[1].split(",").map((c) => c.trim()) : [];
}

function rows(table: string): Record<string, string>[] {
  const cols = columns(table);
  return tuples(table).map((vals) =>
    Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? "NULL"]))
  );
}

const sources = new Map(rows("source").map((s) => [s.source_id, s]));
const resources = rows("measure_resource");

let findings = 0;
function flag(msg: string) {
  findings++;
  console.log(`  !  ${msg}`);
}

if (resources.length === 0) {
  console.error(`No measure_resource INSERT found in ${path}`);
  process.exit(1);
}

for (const r of resources) {
  const src = sources.get(r.source_id);
  if (r.kind === "official" && src && src.type !== "primary_doc") {
    flag(
      `${r.resource_id}: kind official but source ${r.source_id} is type ${src.type}`
    );
  }
  if (
    (r.format === "video" || r.format === "audio") &&
    r.duration_seconds === "NULL"
  ) {
    flag(`${r.resource_id}: ${r.format} with no duration_seconds`);
  }
  if (r.note !== "NULL" && /\b(would|will|means|because)\b/i.test(r.note)) {
    flag(
      `${r.resource_id}: note reads as a summary, not attribution: "${r.note}"`
    );
  }
}

const perMeasure = new Map<
  string,
  { support: number; oppose: number; neutral: number }
>();
for (const r of resources) {
  const c = perMeasure.get(r.measure_id) ?? {
    support: 0,
    oppose: 0,
    neutral: 0,
  };
  c[r.stance as "support" | "oppose" | "neutral"]++;
  perMeasure.set(r.measure_id, c);
}
console.log("\nPer measure (support / oppose / neutral):");
for (const [id, c] of perMeasure) {
  const ok =
    c.support > 0 &&
    c.oppose > 0 &&
    Math.max(c.support, c.oppose) <= 2 * Math.min(c.support, c.oppose);
  console.log(
    `  ${ok ? "ok " : "-- "} ${id}: ${c.support} / ${c.oppose} / ${c.neutral}${ok ? "" : "  (cannot publish)"}`
  );
}

console.log(
  `\n${resources.length} resource row(s), ${findings} advisory finding(s).`
);
