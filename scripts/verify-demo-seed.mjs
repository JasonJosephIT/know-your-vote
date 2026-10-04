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

/* Every non-demo source the migrations wrote, counted before teardown runs,
   so the "leaves non-demo rows alone" check below compares against what was
   really there instead of a hard-coded number. It was pinned at 4 (0014's
   government sources) and went red when 0042 added four more. */
const nonDemoSourcesBefore = Number(
  (await db.query("SELECT count(*)::int AS n FROM source WHERE source_id NOT LIKE 'demo-%';"))
    .rows[0].n
);

await db.exec(await readFile(path.join(root, "scripts", "demo-teardown.sql"), "utf8"));

/* Scoped to `demo-%` on purpose. This counted every row in the three tables
   and demanded zero, which was only ever true because nothing but the demo
   seed wrote to them — so migration 0014's four government `source` rows (the
   real election_news attribution fix) turned it red without teardown having
   done anything wrong. A teardown check has to be about demo rows; the total
   is a different claim, and it was never the one worth making. */
await check("teardown removes every demo row", async () => {
  const r = await db.query(`
    SELECT (SELECT count(*) FROM race   WHERE race_id   LIKE 'demo-%')
         + (SELECT count(*) FROM claim  WHERE claim_id  LIKE 'demo-%')
         + (SELECT count(*) FROM source WHERE source_id LIKE 'demo-%') AS n;
  `);
  if (Number(r.rows[0].n) !== 0) throw new Error(`${r.rows[0].n} demo rows left`);
});

/* The half the old assertion was hiding. Scoping the check above to `demo-%`
   would, on its own, let a teardown that deleted the whole table pass. 0014
   and 0042 attach sources to the real election_news rows and 0014's CHECK
   requires them, so a teardown that took them with it would leave the live
   database violating a constraint it had just satisfied. The count must be
   non-zero, or the comparison proves nothing. */
await check("teardown leaves non-demo rows alone", async () => {
  if (nonDemoSourcesBefore === 0) {
    throw new Error("no non-demo sources before teardown — the check would be vacuous");
  }
  const r = await db.query(
    "SELECT count(*)::int AS n FROM source WHERE source_id NOT LIKE 'demo-%';"
  );
  if (r.rows[0].n !== nonDemoSourcesBefore) {
    throw new Error(`expected ${nonDemoSourcesBefore} non-demo sources, saw ${r.rows[0].n}`);
  }
});

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll demo-seed checks passed.");
