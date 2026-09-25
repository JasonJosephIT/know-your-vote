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

/* Splits a tuple's inner text into top-level values: quote-aware AND
   paren-depth-aware, so a scalar subquery in one column position (e.g.
   0038's `(SELECT source_id FROM source WHERE url_norm = '...')`, resolving
   a pre-existing live source row instead of a hard-coded id) is kept as one
   value, not split on the comma inside it or read as closing the tuple. */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === "'") {
        if (text[i + 1] === "'") {
          i++;
          continue;
        }
        inQuote = false;
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      continue;
    }
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (ch === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim());
}

/* A single value: 'quoted' (with '' escapes), NULL, a bare number, or -- new
   for 0038 -- a raw parenthesized expression (a scalar subquery) passed
   through verbatim so callers can pattern-match it themselves. */
function parseValue(raw: string): string {
  if (/^NULL$/i.test(raw)) return "NULL";
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  const m = raw.match(/^'((?:[^']|'')*)'$/);
  if (m) return m[1].replace(/''/g, "'");
  return raw;
}

/* Pulls every top-level tuple out of a VALUES body, paren-depth-aware (see
   splitTopLevel above for why: a value can itself contain parens). */
function splitTuples(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuote) {
      if (ch === "'") {
        if (body[i + 1] === "'") {
          i++;
          continue;
        }
        inQuote = false;
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) start = i + 1;
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(body.slice(start, i));
        start = -1;
      }
      continue;
    }
  }
  return out;
}

/* Pulls every tuple from the INSERT into `table`, each as an array of
   parsed values (see parseValue). */
function tuples(table: string): string[][] {
  const head = sql.match(
    new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)\\s*VALUES`, "i")
  );
  if (!head || head.index === undefined) return [];
  const body = sliceStatementBody(sql, head.index + head[0].length);
  return splitTuples(body).map((t) => splitTopLevel(t).map(parseValue));
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

const sourceRows = rows("source");
const sources = new Map(sourceRows.map((s) => [s.source_id, s]));
const sourcesByUrlNorm = new Map(sourceRows.map((s) => [s.url_norm, s]));
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

/* Resolves a measure_resource row's source, whether source_id is a literal
   id (0035's style) or a scalar subquery resolving one by url_norm (0038's
   style, I-2: reuses a pre-existing live source row instead of a hard-coded
   id that might collide with one). */
function resolveSource(sourceId: string) {
  const bySubquery = sourceId.match(
    /url_norm\s*=\s*'((?:[^']|'')*)'/i
  );
  if (bySubquery) {
    return sourcesByUrlNorm.get(bySubquery[1].replace(/''/g, "'"));
  }
  return sources.get(sourceId);
}

for (const r of resources) {
  const src = resolveSource(r.source_id);
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
