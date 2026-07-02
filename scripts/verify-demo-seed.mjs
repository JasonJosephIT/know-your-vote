/* Applies migrations + demo seed to embedded Postgres and asserts what the
   public (anon) must and must not see. Run: node scripts/verify-demo-seed.mjs */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite({ extensions: { pgcrypto } });
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`);

const dir = path.join(root, "supabase", "migrations");
for (const f of (await readdir(dir)).filter((x) => x.endsWith(".sql")).sort()) {
  await db.exec(await readFile(path.join(dir, f), "utf8"));
}
await db.exec(await readFile(path.join(root, "scripts", "demo-seed.sql"), "utf8"));

await db.exec("SET ROLE anon;");

await check("anon sees exactly 8 published demo races", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM race;");
  if (r.rows[0].n !== 8) throw new Error(`saw ${r.rows[0].n}`);
});

await check("FL-10 (in_review) is invisible to anon", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM race WHERE race_id = 'demo-fl-house-10';"
  );
  if (r.rows[0].n !== 0) throw new Error("in_review race leaked");
});

await check("every anon-visible claim has >= 1 source", async () => {
  const r = await db.query(`
    SELECT count(*)::int AS n FROM claim c
    WHERE NOT EXISTS (SELECT 1 FROM claim_source cs WHERE cs.claim_id = c.claim_id);
  `);
  if (r.rows[0].n !== 0) throw new Error(`${r.rows[0].n} unsourced claims visible`);
});

await check("only verified handles visible", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM candidate_social_account WHERE status <> 'verified';"
  );
  if (r.rows[0].n !== 0) throw new Error("unverified handle leaked");
});

await check("all visible profiles pass the balance gate", async () => {
  const r = await db.query(
    `SELECT count(*)::int AS n FROM profile WHERE (audit->>'balance_check_passed')::boolean IS DISTINCT FROM true;`
  );
  if (r.rows[0].n !== 0) throw new Error("failing profile visible");
});

await check("a no_stated_position_found position exists (silence is data)", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM position WHERE coverage = 'no_stated_position_found';"
  );
  if (r.rows[0].n < 1) throw new Error("expected at least one");
});

await db.exec("RESET ROLE;");

await check("teardown removes every demo row", async () => {
  await db.exec(await readFile(path.join(root, "scripts", "demo-teardown.sql"), "utf8"));
  const r = await db.query(
    "SELECT (SELECT count(*) FROM race) + (SELECT count(*) FROM claim) + (SELECT count(*) FROM source)::int AS n;"
  );
  if (Number(r.rows[0].n) !== 0) throw new Error(`${r.rows[0].n} rows left`);
});

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll demo-seed checks passed.");
