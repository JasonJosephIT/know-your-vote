# Freeze Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the guard PR (`claude/ballot-freeze-guard`, rollout step 5 of the ballot-content-completion spec): migration `0050_content_freeze.sql` (inert until 2026-10-18 04:00 UTC), its PGlite cases, the `kyv.freeze_correction` bypass in the five PGlite check scripts, the code tripwire `scripts/verify-freeze.ts` (passes with a note while no manifest exists), `docs/general-election/corrections/README.md`, and the unfinished-brief card line, without writing the manifest or the freeze copy and without applying anything.

**Architecture:** One `SECURITY DEFINER` trigger function reads a one-row `content_freeze` window and refuses writes to 16 ballot tables inside it unless the transaction sets `kyv.freeze_correction`; statement-level triggers on 11 tables, row-level triggers with named exceptions on 5. The code tripwire is a pure module (`scripts/freeze-manifest.ts`) plus a thin CLI (`scripts/verify-freeze.ts`) and its tests (`scripts/verify-freeze-rules.ts`), all auto-discovered by `verify-all.mjs`. The card line becomes a function of `(status, raceId)` so a race in `UNFINISHED_BRIEF_RACES` gets one sentence on every card.

**Tech Stack:** PostgreSQL / Supabase (plpgsql), PGlite 0.5.3 (`@electric-sql/pglite`) for local replay, Node 22.19 type stripping for `scripts/*.ts`, Next.js 16 App Router (React server components), TypeScript strict, ESLint (`eslint-config-next`).

**Spec:** `docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` on branch `claude/specs-gap-closure` (PR #133, not on this branch). Read it at `/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` (read-only) or with `git show origin/claude/specs-gap-closure:docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md`. Sections used: §3.3 (case 2), §3.6.1 to §3.6.6, §4 (BC6, BC9, BC10, BC15 to BC18), §5 step 5, §6.

## Global Constraints

Copied from the spec and the task brief. Every task's requirements include this section.

- **Window:** "From Sun 2026-10-18 00:00 EDT (04:00 UTC) to Wed 2026-11-04 00:00 EST (05:00 UTC)". The row is `starts_at = '2026-10-18 04:00+00'`, `ends_at = '2026-11-04 05:00+00'`. Start inclusive, end exclusive.
- **File name and number:** exactly `supabase/migrations/0050_content_freeze.sql` (ledger, `supabase/migrations/README.md` line 66). 0048 `agent_run_r5`, 0049 `roster_completeness`, 0051 `am1_publish`, 0052 `news_tags_kind`, 0053 `contact_update_kind`, 0054 `news_agent_rows_to_review`, 0055 `official_link_sources` belong to other PRs; do not touch them.
- **`content_freeze`:** "one row (`id = 1`), with `starts_at = '2026-10-18 04:00+00'`, `ends_at = '2026-11-04 05:00+00'` and a `note`, created and then inserted by the migration. RLS on, and all privileges revoked from `anon` and `authenticated`, as for every table since 0005."
- **`refuse_during_content_freeze()`:** "a trigger function, `SECURITY DEFINER`, owned by `postgres`, with `SET search_path TO ''` and every name schema-qualified (`public.content_freeze`) … It does nothing outside the window. Inside it, it raises `P0001` with "Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md", unless `current_setting('kyv.freeze_correction', true)` is non-empty. In that case it raises a NOTICE carrying the setting's value and lets the write through. `EXECUTE` is revoked from `PUBLIC`, `anon`, `authenticated`, `cap_tool_wrapper` and `cap_readonly` by name."
- **Statement-level `BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE` triggers** on `claim`, `claim_source`, `position`, `issue`, `profile`, `ballot_measure`, `measure_resource`, `candidate_contact`, `candidate_social_account`, `zip_district`, `block_district`.
- **Row-level triggers with exceptions** ("changes only X" = `to_jsonb(OLD) - X = to_jsonb(NEW) - X`; an `UPDATE` that changes nothing passes): `race_publication` and `measure_publication` pass an `UPDATE` whose new `status` is `listed`; `candidate` passes an `UPDATE` changing only `site_last_verified_at`; `race` passes an `UPDATE` changing only `info_last_verified_at` and `key_dates`; `source` passes every `INSERT`, and refuses `UPDATE`/`DELETE` only for a row referenced by `claim_source` or `measure_resource`. Each also gets a statement-level `TRUNCATE` trigger. `election_event` is deliberately not guarded.
- **The checks keep working in the window:** "Each of the five PGlite scripts runs `SET kyv.freeze_correction = 'pglite replay'` right after creating its database and before replaying migrations." The 0050 cases "turn the bypass off where they test refusal, inside a transaction with `SELECT set_config('kyv.freeze_correction', '', true)`."
- **`verify-freeze.ts`:** "With no manifest it prints `  ok  no freeze manifest yet (docs/general-election/freeze-2026-10-18.json); nothing to compare` and exits 0 … It does not claim SKIPPED." "Inside the window it fails when a frozen file's hash differs from the manifest. Outside the window it passes and prints which files differ." A correction entry adds `"correction": "docs/general-election/corrections/<file>.md"`; "The check also fails if a named correction file does not exist." `--write` mode writes the manifest.
- **Frozen files:** the 45 files listed in spec §3.6.3, in `FROZEN_FILES` (Task 3).
- **Card copy (BC15), verbatim:** `UNFINISHED_BRIEF_LINE` = "No brief for this race. We found a position we can quote on a candidate's own campaign website, but we did not finish this race's brief before October 18, when we stopped changing briefs for this election. That is about our process, not a judgment of the candidates." `UNFINISHED_BRIEF_RACES` ships **empty**. `listingCardLine(status, raceId)`. `NO_BRIEF_CARD_LINE` and `LISTED_IS_FINAL = true` are unchanged (BC6).
- **House rules:** equal treatment of candidates; every card in a race carries the same sentence, chosen by the race and never by the candidate (a label shown for some candidates but not others is a violation); ballot order stays in `src/lib/ballot-order.ts` (untouched); the site never writes a case for or against an amendment; nothing from an agent or the news sweep is voter-facing until a human approves it in `/admin`.
- **NOT in this PR:** the manifest `docs/general-election/freeze-2026-10-18.json` (never run `node scripts/verify-freeze.ts --write` in the real tree), the freeze copy (methodology sentences, `BRIEF_SNAPSHOT_DATE`, AM1 note/caption, measure fallback text), filling `UNFINISHED_BRIEF_RACES`, `carryForward`, the PGlite reference builder's `'pglite reference'` line, 0051.
- **Hard safety rules:** never apply a migration or write the live database (Supabase MCP: SELECT-only `execute_sql` for research is allowed; never `apply_migration`, never INSERT/UPDATE/DELETE/ALTER live); never run the app's write scripts against the live DB; never create/update/run/delete a scheduled task; never merge, never push to `main`, never force-push, never change GitHub settings; never print, read or copy `.env.local` or any key (scripts load it themselves; the worktree has a `.env.local` symlink: do not open it). Work only in `/Users/jsloth/Projects/kyv-build/guard` on `claude/ballot-freeze-guard`.
- **Node:** the default `node` crashes on this Mac. Always use `NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"` (quoted). Scripts run under Node type stripping; modules imported by scripts use relative imports with the `.ts` extension.
- **Next.js:** this is Next.js 16 ("This is NOT the Next.js you know", `AGENTS.md`). The only UI change here is one added prop on a server component; no Next API changes. If you touch anything else in `src/app`, read `node_modules/next/dist/docs/` first.
- **Commits:** one-line subject, blank line, body, then the final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Ground truth (read 2026-10-08 on this branch, head `08384c5`)

- Branch `claude/ballot-freeze-guard` is the ledger commit `08384c5` (PR #134, open) on top of `origin/main` `1580328`. The ledger row for 0050 is `supabase/migrations/README.md` line 66, state "not written. Apply Thu 10-15".
- `supabase/migrations/` ends at `0047_candidate_lead_kind.sql`. `0046_uthmeier_incumbent.sql` is not on this branch (PR #131 open; applied live). Nothing here depends on it.
- The five PGlite scripts create their database at: `scripts/verify-migrations.mjs:107`, `scripts/verify-ballot-seeds.mjs:38`, `scripts/verify-demo-seed.mjs:11`, `scripts/verify-brief-rows-sql.mjs:28`, `scripts/verify-election-seed.mjs:87`; each replays every `supabase/migrations/*.sql` in name order right after.
- `scripts/verify-migrations.mjs`: header invariant list ends at line 90 ("races 0033 seeds at draft stay invisible."); the last check block ends with `await db.exec("RESET ROLE;");` at line 1749, then `if (failures > 0) {` at line 1751. Helpers `check`, `expectDenied` (matches `permission denied|violates row-level security`) and `expectConstraintViolation(name, sql, pattern)` exist at lines 111-147. The fixture (lines 606-655) leaves `r-pub` published, `r-listed` listed, `c-pub`/`i-pub`/`s1` (cited by `claim_source`), `s-gov` (cited by `measure_resource`), `src-early-test` (cited by nothing but a `news_item`), and `m-skew` published at 3 support vs 2 oppose.
- `scripts/verify-all.mjs` discovers `scripts/verify-*.ts|mjs` by name (lines 335-351): new verify scripts need no edit there. Baseline on this branch: `verify-all: 68 passed (1 offline only), 1 failed, 2 skipped (needs env), 71 total`; the one FAIL is `verify-news-neutrality.ts` (known live-data failure), the skips are `verify-admin-ops.mjs` and `verify-refresh-schema.mjs`.
- Baseline check counts: `verify-migrations.mjs` prints 226 `  ok` lines; `verify-listing.ts` prints 40.
- `src/lib/listing-copy.ts` lines 189-203: `NO_BRIEF_CARD_LINE` and `listingCardLine(status)`. Its only callers: `src/components/features/RaceListing.tsx:112` (inside `ListedCandidateCard`) and, through `ListedCandidateCard`, `src/components/features/CandidateListing.tsx:48-53`. `RaceListing` is rendered once, `src/app/(public)/races/[raceId]/page.tsx:202`, and its props do not change. `RaceListing["race"].race_id` and `CandidateListing["raceId"]` (`src/lib/listing.ts` lines 37-46, 156-164) carry the race id. Race ids look like `FL-CFO-general`, `FL-ORA-CLERK-general`.
- All 45 frozen files in spec §3.6.3 exist on this branch. `docs/general-election/corrections/` does not exist.
- `scripts/` is excluded from `tsconfig.json`; `src/lib/unopposed.ts` (imported by `verify-listing.ts`) uses the `@/` alias, so a standalone check of `verify-listing.ts` needs a temporary tsconfig with `paths` (Task 5 Step 9).
- PGlite drops NOTICEs unless a query passes `onNotice` (`QueryOptions.onNotice`, `node_modules/@electric-sql/pglite/dist/pglite-*.d.ts`), so the bypass adds no output noise in the window.
- **Prototype:** every code block below was run on a scratch copy of this branch on 2026-10-08: `verify-migrations.mjs` 277 ok and "All migration + RLS checks passed."; the four other PGlite scripts pass; with the window opened by a scratch migration all five pass, and with their bypass line removed all five exit 1 with the freeze message; `verify-listing.ts` 54 ok; `verify-freeze-rules.ts` 24 ok; `verify-freeze.ts` prints its note and exits 0; strict standalone tsc and ESLint clean on every changed file.

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `supabase/migrations/0050_content_freeze.sql` | create | The window row, the guard function, its 21 triggers, the revokes |
| `supabase/migrations/README.md` | modify line 66 | Ledger: 0050 written, not applied |
| `scripts/verify-migrations.mjs` | modify | Bypass line (after line 107), header item 20, section 20 (0050 cases, before line 1751) |
| `scripts/verify-ballot-seeds.mjs`, `scripts/verify-demo-seed.mjs`, `scripts/verify-brief-rows-sql.mjs`, `scripts/verify-election-seed.mjs` | modify | Bypass line after `const db = new PGlite(...)` |
| `scripts/freeze-manifest.ts` | create | Pure rules: `FROZEN_FILES`, `FREEZE_WINDOW`, `MANIFEST_PATH`, `buildManifest`, `parseManifest`, `checkManifest`, `inWindow` |
| `scripts/verify-freeze.ts` | create | CI check and `--write`; `--root` and `--now` for tests |
| `scripts/verify-freeze-rules.ts` | create | Tests for the rules, the constants and the command |
| `docs/general-election/corrections/README.md` | create | §3.6.1 definitions and §3.6.5 steps; where the refusal message points |
| `src/lib/listing-copy.ts` | modify lines 192-203 | `UNFINISHED_BRIEF_LINE`, `UNFINISHED_BRIEF_RACES`, `listingCardLine(status, raceId, unfinished?)` |
| `src/components/features/RaceListing.tsx` | modify | `ListedCandidateCard` takes `raceId`; `RaceListing` passes `listing.race.race_id` |
| `src/components/features/CandidateListing.tsx` | modify | Passes `listing.raceId` |
| `scripts/verify-listing.ts` | modify | BC6 pin, BC15 cases, race-id wiring checks |

## Decisions this PR encodes

Each is the spec's "Recommended (pending founder confirmation)" option unless marked **(implementation)**. The PR body lists them (Task 6).

1. **BC9, the database guard:** build 0050 with the window 10-18 04:00 UTC to 11-04 05:00 UTC, `SECURITY DEFINER`, empty `search_path`, corrections through `kyv.freeze_correction`, and the bypass in the five PGlite scripts. Applying it is the founder's step (Thu 10-15). TO FLIP (process-only freeze): drop 0050, the five bypass lines and section 20 of `verify-migrations.mjs`; nothing else depends on them.
2. **BC10, the code tripwire:** `verify-freeze.ts` with the 45 files of §3.6.3; the manifest is not written here (freeze-copy PR). With no manifest it already passes, so TO FLIP is deleting the three `scripts/*freeze*` files.
3. **BC15, the unfinished-brief line:** `UNFINISHED_BRIEF_LINE` and an empty `UNFINISHED_BRIEF_RACES`. TO FLIP: leave the set empty; every listed race then keeps `NO_BRIEF_CARD_LINE`.
4. **BC6 kept:** `NO_BRIEF_CARD_LINE` byte-for-byte and `LISTED_IS_FINAL = true`, now pinned by a test.
5. **BC16, BC17, BC18 documented, no code:** the README carries the race hold (profiles' `balance_check_passed` to false under the setting), archive-capture-first for a dead measure link, and the `/admin` re-approve path. 0050 lets `race.key_dates` and `info_last_verified_at` through and refuses `office`, `district` and `qualifying_status` (tested for `office` and `qualifying_status`).
6. **(implementation)** An `UPDATE` that changes nothing passes on all five row-level tables (the spec states it inside "changes only X"; applied uniformly). This is what lets the BC18 re-approve close and lets news intake's no-op outlet upsert through on a cited source.
7. **(implementation)** The refusal keeps the spec's message verbatim and adds `DETAIL: <OP> on public.<table>`.
8. **(implementation)** Re-running 0050 keeps an existing `content_freeze` row (`ON CONFLICT (id) DO NOTHING`).
9. **(implementation)** `content_freeze` revokes from `anon` and `authenticated` only, as the spec says; `service_role` keeps Supabase's default grants. Cheap flip: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.content_freeze FROM service_role;`.
10. **(implementation)** Trigger names: `trg_content_freeze` (statement-level), `trg_content_freeze_row`, `trg_content_freeze_truncate`. Each `BEFORE` row trigger on `measure_publication` fires before `trg_measure_balance` (name order), so a frozen publish fails with the freeze message.
11. **(implementation)** `listingCardLine` takes an optional third argument (the set, default `UNFINISHED_BRIEF_RACES`) so tests can exercise a non-empty set; callers pass two. Precedence: `published` → in-review line; listed and in the set → unfinished line; otherwise the `LISTED_IS_FINAL` switch.
12. **(implementation)** `verify-freeze.ts --write` is refused inside the window (a correction edits its own entry by hand; the failing line prints the new hash). Inside the window a frozen-file list that disagrees with the manifest fails too (re-run `--write` before 10-18). A named correction file that is missing, or is not `docs/general-election/corrections/*.md`, fails at any time.
13. **(implementation)** The exact window is pinned in `verify-freeze-rules.ts` (0050's text against `FREEZE_WINDOW`), not in `verify-migrations.mjs`, so the in-window CI proof can move the window in a scratch migration and still pass.
14. **(implementation)** Ledger row 0050 becomes "written, not applied" in this PR (ledger rule 2).

---

### Task 1: Migration 0050 and its PGlite cases

**Files:**
- Create: `supabase/migrations/0050_content_freeze.sql`
- Modify: `scripts/verify-migrations.mjs` (after line 107; after line 90; between lines 1749 and 1751)
- Modify: `supabase/migrations/README.md:66`

**Interfaces:**
- Consumes: nothing from other tasks. Fixture ids in `verify-migrations.mjs` listed under Ground truth.
- Produces: table `public.content_freeze(id INT PK CHECK (id = 1), starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, note TEXT)`; function `public.refuse_during_content_freeze() RETURNS TRIGGER`; setting name `kyv.freeze_correction`; the refusal text `Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md` (Task 4 checks the README path inside it; Task 3 reads the two timestamps from the `INSERT INTO public.content_freeze` statement, so keep them on the lines shown).

- [ ] **Step 1: Add the bypass line to `verify-migrations.mjs`**

In `scripts/verify-migrations.mjs`, replace

```js
const db = new PGlite({ extensions: { pgcrypto } });
let failures = 0;
```

with

```js
const db = new PGlite({ extensions: { pgcrypto } });
/* 0050's content freeze refuses writes to ballot tables from 2026-10-18 04:00
   UTC to 2026-11-04 05:00 UTC unless this setting is non-empty. Set for the
   whole session, before the replay, so this check keeps passing inside the
   window; the 0050 section at the end turns it off per transaction to test
   the refusals (docs/general-election/corrections/README.md). */
await db.exec("SET kyv.freeze_correction = 'pglite replay';");
let failures = 0;
```

The `await db.exec("SET kyv.freeze_correction = 'pglite replay';");` line must stay exactly that string on its own line (Task 2 removes and restores it by exact match).

- [ ] **Step 2: Add header item 20**

In the header comment, after the line `        races 0033 seeds at draft stay invisible.` (line 90), insert:

```
    20. 0050_content_freeze: one content_freeze row; the guard is SECURITY
        DEFINER, owned by postgres, with an empty search_path, and nobody but
        the owner and service_role may EXECUTE it; its 21 triggers exist.
        Inside the window a frozen write is refused with the freeze message
        (for cap_tool_wrapper too, not a permission error) and goes through
        under kyv.freeze_correction with a NOTICE; a takedown to listed,
        the freshness stamps, key_dates, an UPDATE that changes nothing and
        a new or uncited source row go through without it. Outside the
        window everything goes through.
```

- [ ] **Step 3: Write the failing 0050 cases**

Insert this block after the final `await db.exec("RESET ROLE;");` (line 1749) and before `if (failures > 0) {`:

```js
/* ---------------------------------------------------------------- *
 * 20. 0050_content_freeze (ballot-content-completion §3.6.2, BC9).
 *
 * Everything above ran with kyv.freeze_correction = 'pglite replay' (set at
 * the top of this file). Each case below opens a transaction, turns that
 * bypass off for the transaction only (set_config(..., true)), runs one
 * statement and rolls back, so the fixtures stay as they were. The window
 * is moved around now(), into the future or into the past explicitly, so no
 * case depends on today's date.
 * ---------------------------------------------------------------- */

const FROZEN =
  /^Ballot content is frozen until Election Day \(content_freeze\)\. Corrections only: docs\/general-election\/corrections\/README\.md$/;
const CORRECTION = "docs/general-election/corrections/2026-10-20-pglite-probe.md";
const CLAIM_INSERT = `INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, verdict, verification)
  VALUES ('cl-freeze', 'c-pub', 'r-pub', 'i-pub', 'Voted for F on date G.', 'verifiable_fact', false, 'accurate', 'verified');`;
const PROFILE_HOLD = `UPDATE profile SET audit = audit || '{"balance_check_passed": false}' WHERE race_id='r-pub';`;
const STATEMENT_GUARDED = [
  "claim", "claim_source", "position", "issue", "profile", "ballot_measure",
  "measure_resource", "candidate_contact", "candidate_social_account",
  "zip_district", "block_district",
];
const ROW_GUARDED = ["race_publication", "measure_publication", "candidate", "race", "source"];

const FREEZE_WINDOWS = {
  open: "now() - interval '1 hour', now() + interval '1 hour'",
  future: "now() + interval '1 hour', now() + interval '2 hours'",
  past: "now() - interval '2 hours', now() - interval '1 hour'",
};
async function setFreezeWindow(which) {
  await db.exec(
    `UPDATE content_freeze SET (starts_at, ends_at) = (${FREEZE_WINDOWS[which]}) WHERE id = 1;`
  );
}

/* Runs `sql` in a transaction, as `role` when given, after `setup` (which
   still runs with the bypass on) and with kyv.freeze_correction set to
   `correction` (default: off), then rolls back. Resolves to the error, or
   null when the SQL went through. */
async function inFreezeTx(sql, { role = null, correction = "", setup = null, onNotice } = {}) {
  await db.exec("BEGIN;");
  try {
    if (role) await db.exec(`SET LOCAL ROLE ${role};`);
    if (setup) await db.exec(setup);
    await db.query("SELECT set_config('kyv.freeze_correction', $1, true);", [correction]);
    await db.exec(sql, onNotice ? { onNotice } : undefined);
    return null;
  } catch (err) {
    return err;
  } finally {
    await db.exec("ROLLBACK;");
  }
}
async function expectFrozen(name, sql, opts) {
  await check(name, async () => {
    const err = await inFreezeTx(sql, opts);
    if (!err) throw new Error("statement went through; the freeze should have refused it");
    if (err.code !== "P0001" || !FROZEN.test(err.message))
      throw new Error(`unexpected error: ${err.code} ${err.message}`);
  });
}
async function expectThrough(name, sql, opts) {
  await check(name, async () => {
    const err = await inFreezeTx(sql, opts);
    if (err) throw new Error(`refused: ${err.message}`);
  });
}

/* The objects, before any window is moved. The exact window is pinned by
   scripts/verify-freeze-rules.ts against the code tripwire's constants, so
   a scratch copy of 0050 with a moved window still passes here. */
await check("0050 content_freeze holds one row, id 1, an ordered window and a note", async () => {
  const r = await db.query(
    `SELECT count(*)::int AS n, bool_and(id = 1) AS id1,
            bool_and(ends_at > starts_at) AS ordered, bool_and(btrim(note) <> '') AS noted
       FROM content_freeze;`
  );
  const g = r.rows[0];
  if (g.n !== 1 || !g.id1 || !g.ordered || !g.noted) throw new Error(JSON.stringify(g));
});
await expectConstraintViolation(
  "0050 content_freeze takes no second row",
  "INSERT INTO content_freeze (id, starts_at, ends_at, note) VALUES (2, now(), now() + interval '1 day', 'x');",
  /content_freeze_id_check/
);
await check("0050 the guard is SECURITY DEFINER, owned by postgres, with an empty search_path", async () => {
  const r = await db.query(
    `SELECT prosecdef, proconfig, pg_get_userbyid(proowner) AS owner
       FROM pg_proc WHERE proname = 'refuse_during_content_freeze';`
  );
  if (r.rows.length !== 1) throw new Error(`expected one function, found ${r.rows.length}`);
  const g = r.rows[0];
  if (g.prosecdef !== true) throw new Error("not SECURITY DEFINER");
  if (JSON.stringify(g.proconfig) !== JSON.stringify(['search_path=""']))
    throw new Error(`proconfig=${JSON.stringify(g.proconfig)}`);
  if (g.owner !== "postgres") throw new Error(`owner=${g.owner}`);
});
await check("0050 triggers: statement-level on 11 tables, row-level and TRUNCATE on 5", async () => {
  const r = await db.query(
    `SELECT c.relname || ':' || t.tgname AS k
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE p.proname = 'refuse_during_content_freeze' AND NOT t.tgisinternal
      ORDER BY 1;`
  );
  const want = [
    ...STATEMENT_GUARDED.map((t) => `${t}:trg_content_freeze`),
    ...ROW_GUARDED.flatMap((t) => [`${t}:trg_content_freeze_row`, `${t}:trg_content_freeze_truncate`]),
  ].sort();
  const got = r.rows.map((x) => x.k);
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got [${got.join(", ")}]`);
});
await check("0050 PUBLIC, anon, authenticated, cap_tool_wrapper and cap_readonly cannot EXECUTE the guard (0020)", async () => {
  const r = await db.query(
    `SELECT has_function_privilege('anon', 'public.refuse_during_content_freeze()', 'EXECUTE') AS anon,
            has_function_privilege('authenticated', 'public.refuse_during_content_freeze()', 'EXECUTE') AS authn,
            has_function_privilege('cap_tool_wrapper', 'public.refuse_during_content_freeze()', 'EXECUTE') AS capw,
            has_function_privilege('cap_readonly', 'public.refuse_during_content_freeze()', 'EXECUTE') AS capr,
            (SELECT count(*)::int FROM pg_proc p, aclexplode(p.proacl) a
              WHERE p.proname = 'refuse_during_content_freeze' AND a.grantee = 0) AS public_grants;`
  );
  const g = r.rows[0];
  if (g.anon || g.authn || g.capw || g.capr || g.public_grants !== 0)
    throw new Error(`EXECUTE leaked: ${JSON.stringify(g)}`);
});
await check("0050 anon and authenticated hold no privilege on content_freeze", async () => {
  const r = await db.query(
    `SELECT bool_or(has_table_privilege(r, 'public.content_freeze', p)) AS any
       FROM unnest(ARRAY['anon','authenticated']) r,
            unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p;`
  );
  if (r.rows[0].any) throw new Error("anon or authenticated holds a privilege on content_freeze");
});
await db.exec("SET ROLE anon;");
await expectDenied("0050 anon cannot read content_freeze", "SELECT * FROM content_freeze;");
await db.exec("RESET ROLE;");

/* Inside the window. */
await setFreezeWindow("open");
await expectFrozen("0050 in the window, an INSERT into claim is refused", CLAIM_INSERT);
await expectThrough(
  "0050 ... and goes through as a correction (SET LOCAL kyv.freeze_correction)",
  `SET LOCAL kyv.freeze_correction = '${CORRECTION}'; ${CLAIM_INSERT}`
);
await check("0050 a correction write raises a NOTICE naming the correction file", async () => {
  const notices = [];
  const err = await inFreezeTx(CLAIM_INSERT, {
    correction: CORRECTION,
    onNotice: (n) => notices.push(n.message),
  });
  if (err) throw new Error(`refused: ${err.message}`);
  if (!notices.some((m) => m.includes(CORRECTION)))
    throw new Error(`notices: ${JSON.stringify(notices)}`);
});
await expectFrozen(
  "0050 as cap_tool_wrapper, an INSERT into claim is refused by the freeze, not by a permission error",
  CLAIM_INSERT,
  { role: "cap_tool_wrapper" }
);
await expectThrough(
  "0050 set_race_publication(..., 'listed', ...) goes through without the setting",
  "SELECT set_race_publication('r-pub','listed','op@example.com','freeze takedown probe');",
  { role: "service_role" }
);
await expectFrozen(
  "0050 set_race_publication(..., 'published', ...) is refused",
  "SELECT set_race_publication('r-listed','published','op@example.com','freeze publish probe');",
  { role: "service_role" }
);
await expectThrough(
  "0050 a measure taken to listed goes through without the setting",
  "UPDATE measure_publication SET status='listed' WHERE measure_id='m-skew';",
  { role: "service_role" }
);
await expectFrozen(
  "0050 a balanced measure's publish is refused",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  { role: "service_role", setup: "UPDATE measure_publication SET status='listed' WHERE measure_id='m-skew';" }
);
await expectFrozen("0050 a profile audit update is refused without the setting", PROFILE_HOLD);
await expectThrough("0050 ... and goes through with it (the BC16 hold)", PROFILE_HOLD, { correction: CORRECTION });
await expectThrough(
  "0050 a candidate UPDATE of only site_last_verified_at goes through",
  "UPDATE candidate SET site_last_verified_at = now() WHERE candidate_id='c-pub';"
);
await expectFrozen(
  "0050 ... one that also touches official_site is refused",
  "UPDATE candidate SET site_last_verified_at = now(), official_site = 'https://pub-candidate.example/' WHERE candidate_id='c-pub';"
);
await expectFrozen(
  "0050 a candidate qualifying_status change is refused (it is applied as a correction, BC18)",
  "UPDATE candidate SET qualifying_status = 'withdrawn' WHERE candidate_id='c-pub';"
);
await expectThrough(
  "0050 a race UPDATE of only key_dates and info_last_verified_at goes through",
  `UPDATE race SET key_dates = key_dates || '{"general": "2026-11-03"}', info_last_verified_at = now() WHERE race_id='r-pub';`
);
await expectFrozen(
  "0050 a race UPDATE of office is refused",
  "UPDATE race SET office = 'Governor (changed)' WHERE race_id='r-pub';"
);
await expectThrough(
  "0050 an UPDATE that sets a column to its current value goes through",
  "UPDATE race SET office = office WHERE race_id='r-pub';"
);
await expectFrozen(
  "0050 a new race row is refused",
  "INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES ('r-freeze','X','state','general','{}');"
);
await expectThrough(
  "0050 a source INSERT goes through (news intake's outlet rows)",
  `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
   VALUES ('s-freeze-new', 'https://example.news/freeze', 'example.news/freeze', 'Example News', 'factual_reporting', 'unrated');`
);
await expectThrough(
  "0050 an upsert that changes nothing goes through, even on a cited source",
  `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
   VALUES ('s1', 'https://example.gov/a', 'example.gov/a', 'Example Gov', 'primary_doc', 'N/A')
   ON CONFLICT (url_norm) DO UPDATE SET publisher = EXCLUDED.publisher;`
);
await expectFrozen(
  "0050 an UPDATE of a source cited by claim_source is refused",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 's1';"
);
await expectFrozen(
  "0050 an UPDATE of a source cited by measure_resource is refused",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 's-gov';"
);
await expectThrough(
  "0050 an UPDATE of a source nothing cites goes through",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 'src-early-test';"
);
await expectFrozen("0050 TRUNCATE zip_district is refused", "TRUNCATE zip_district;");
await expectFrozen("0050 TRUNCATE race_publication is refused", "TRUNCATE race_publication;");
for (const t of STATEMENT_GUARDED) {
  await expectFrozen(`0050 even a zero-row DELETE on ${t} is refused`, `DELETE FROM ${t} WHERE false;`);
}
await expectThrough(
  "0050 election_event is not guarded (a date correction is never slowed)",
  "UPDATE election_event SET verified_by = 'probe@example.com' WHERE county_fips = '12099';"
);

/* Outside the window. */
await setFreezeWindow("future");
await expectThrough(
  "0050 before the window, cap_tool_wrapper's INSERT into claim goes through (no permission error on content_freeze)",
  CLAIM_INSERT,
  { role: "cap_tool_wrapper" }
);
await setFreezeWindow("past");
for (const [what, sql] of [
  ["an INSERT into claim", CLAIM_INSERT],
  ["a profile audit update", PROFILE_HOLD],
  ["a race office change", "UPDATE race SET office = 'Governor (changed)' WHERE race_id='r-pub';"],
  ["a publish", "SELECT set_race_publication('r-listed','published','op@example.com','after the freeze');"],
  ["an UPDATE of a cited source", "UPDATE source SET publisher = 'Changed' WHERE source_id = 's1';"],
  ["TRUNCATE zip_district", "TRUNCATE zip_district;"],
]) {
  await expectThrough(`0050 after the window, ${what} goes through`, sql);
}

```

- [ ] **Step 4: Run it to see it fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" scripts/verify-migrations.mjs 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep -A1 '^FAIL' | head -6
```

Expected: `exit=1`. First failures:

```
FAIL  0050 content_freeze holds one row, id 1, an ordered window and a note
      relation "content_freeze" does not exist
FAIL  0050 content_freeze takes no second row
      unexpected error: relation "content_freeze" does not exist
FAIL  0050 the guard is SECURITY DEFINER, owned by postgres, with an empty search_path
      expected one function, found 0
```

then a crash at `setFreezeWindow("open")` with `relation "content_freeze" does not exist`.

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/0050_content_freeze.sql`:

```sql
-- 0050_content_freeze.sql
-- The content-freeze guard for the 2026 general election
-- (docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md
-- §3.6.2; founder decision BC9, recommended pending founder confirmation).
--
-- From 2026-10-18 04:00 UTC (Sun 00:00 EDT) to 2026-11-04 05:00 UTC (Wed
-- 00:00 EST), ballot content changes only by a correction. Outside that
-- window every trigger below returns at once and changes nothing. Applied
-- Thu 10-15, it is inert until the window opens and stops by itself when it
-- closes; no step is needed to end it.
--
-- WHAT IT REFUSES. Inside the window, a write to a frozen table raises
-- P0001 "Ballot content is frozen until Election Day (content_freeze).
-- Corrections only: docs/general-election/corrections/README.md", unless
-- current_setting('kyv.freeze_correction', true) is non-empty. Then it
-- raises a NOTICE carrying that value and lets the write through. A
-- correction is one transaction:
--   BEGIN; SET LOCAL kyv.freeze_correction = '<correction file>'; ...; COMMIT;
-- and a correction migration applied in the window starts with
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
--
-- Statement-level (every INSERT, UPDATE, DELETE or TRUNCATE, even one that
-- touches no row): claim, claim_source, position, issue, profile,
-- ballot_measure, measure_resource, candidate_contact,
-- candidate_social_account, zip_district, block_district.
--
-- Row-level, with exceptions. "Changes only X" means every column whose
-- value differs between OLD and NEW is in X, compared as
-- to_jsonb(OLD) - X = to_jsonb(NEW) - X. On every row-level table an UPDATE
-- that changes nothing passes.
--   race_publication, measure_publication: an UPDATE whose new status is
--     'listed' passes, so an emergency takedown never waits on the setting.
--     A publish needs the setting.
--   candidate: an UPDATE that changes only site_last_verified_at passes.
--   race: an UPDATE that changes only info_last_verified_at and key_dates
--     passes (R2's freshness stamp; key_dates is election logistics approved
--     by a human in /admin, BC18).
--   source: INSERT always passes (news intake upserts outlet rows,
--     src/lib/news-intake.ts). UPDATE and DELETE are refused only for a row
--     referenced by claim_source or measure_resource.
-- Each row-level table also gets a statement-level TRUNCATE trigger.
-- election_event is deliberately not guarded, so a reminder date correction
-- is never slowed by it.
--
-- WHY SECURITY DEFINER. As INVOKER, a writer with no SELECT on
-- content_freeze (cap_tool_wrapper, anon, authenticated) would get
-- "permission denied for table content_freeze" even outside the window. The
-- function is owned by postgres, pins search_path to '' and names every
-- table schema-qualified (0012). EXECUTE is revoked by name from PUBLIC,
-- anon, authenticated, cap_tool_wrapper and cap_readonly, because REVOKE
-- FROM PUBLIC alone leaves Supabase's default grants in place (0020).
-- Triggers do not consult EXECUTE, so the revoke stops no write.
--
-- WHAT IT IS NOT. A security boundary: any session that can write can also
-- set the setting or disable a trigger. It stops accidental writes (a stale
-- brief.sql re-run, an agent's upsert, a migration applied by mistake) and
-- makes every frozen write name its correction file. The control is still
-- the founder's yes on every correction.
--
-- The five PGlite check scripts set kyv.freeze_correction = 'pglite replay'
-- before they replay migrations, so CI keeps passing inside the window.
--
-- Idempotent: safe to re-run. A re-run keeps an existing content_freeze row
-- as it is (ON CONFLICT DO NOTHING).

-- (1) The window: one row, id = 1.
CREATE TABLE IF NOT EXISTS public.content_freeze (
  id        INT         PRIMARY KEY CHECK (id = 1),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL,
  note      TEXT        NOT NULL CHECK (btrim(note) <> ''),
  CONSTRAINT content_freeze_window_ordered CHECK (ends_at > starts_at)
);

ALTER TABLE public.content_freeze ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_freeze FROM anon, authenticated;

INSERT INTO public.content_freeze (id, starts_at, ends_at, note) VALUES (
  1,
  '2026-10-18 04:00+00',
  '2026-11-04 05:00+00',
  '2026 general election: ballot content changes only by a correction, '
  'from Sun 2026-10-18 00:00 EDT to Wed 2026-11-04 00:00 EST. '
  'See docs/general-election/corrections/README.md.'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.content_freeze IS
  'The content-freeze window (0050). Inside it, refuse_during_content_freeze() '
  'refuses writes to ballot content unless kyv.freeze_correction is set.';

-- (2) The guard.
CREATE OR REPLACE FUNCTION public.refuse_during_content_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_frozen     BOOLEAN;
  v_pass       BOOLEAN := false;
  v_old        JSONB;
  v_new        JSONB;
  v_correction TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.content_freeze
     WHERE pg_catalog.now() >= starts_at AND pg_catalog.now() < ends_at
  ) INTO v_frozen;

  IF v_frozen AND TG_LEVEL = 'ROW' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      v_old := pg_catalog.to_jsonb(OLD);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      v_new := pg_catalog.to_jsonb(NEW);
    END IF;

    IF TG_OP = 'UPDATE' AND v_old = v_new THEN
      v_pass := true;  -- changes nothing
    ELSIF TG_TABLE_NAME IN ('race_publication', 'measure_publication') THEN
      v_pass := TG_OP = 'UPDATE' AND (v_new ->> 'status') = 'listed';
    ELSIF TG_TABLE_NAME = 'candidate' THEN
      v_pass := TG_OP = 'UPDATE'
        AND (v_old - 'site_last_verified_at') = (v_new - 'site_last_verified_at');
    ELSIF TG_TABLE_NAME = 'race' THEN
      v_pass := TG_OP = 'UPDATE'
        AND (v_old - ARRAY['info_last_verified_at', 'key_dates'])
          = (v_new - ARRAY['info_last_verified_at', 'key_dates']);
    ELSIF TG_TABLE_NAME = 'source' THEN
      v_pass := TG_OP = 'INSERT'
        OR (
          NOT EXISTS (SELECT 1 FROM public.claim_source
                       WHERE source_id = (v_old ->> 'source_id'))
          AND NOT EXISTS (SELECT 1 FROM public.measure_resource
                           WHERE source_id = (v_old ->> 'source_id'))
        );
    END IF;
  END IF;

  IF v_frozen AND NOT v_pass THEN
    v_correction := COALESCE(pg_catalog.current_setting('kyv.freeze_correction', true), '');
    IF v_correction = '' THEN
      RAISE EXCEPTION 'Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md'
        USING ERRCODE = 'P0001',
              DETAIL = pg_catalog.format('%s on public.%s', TG_OP, TG_TABLE_NAME);
    END IF;
    RAISE NOTICE 'content_freeze: % on public.% allowed as a correction (kyv.freeze_correction = %)',
      TG_OP, TG_TABLE_NAME, v_correction;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.refuse_during_content_freeze() OWNER TO postgres;

COMMENT ON FUNCTION public.refuse_during_content_freeze() IS
  'Trigger function for the content freeze (0050). Inert outside content_freeze; '
  'inside it, refuses writes to ballot content unless kyv.freeze_correction is set.';

-- By name, not just FROM PUBLIC (0020).
REVOKE ALL ON FUNCTION public.refuse_during_content_freeze()
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;

-- (3) Statement-level triggers: every write to these tables.
DROP TRIGGER IF EXISTS trg_content_freeze ON public.claim;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.claim
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.claim_source;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.claim_source
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.position;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.position
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.issue;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.issue
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.profile;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.profile
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.ballot_measure;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.ballot_measure
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.measure_resource;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.measure_resource
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.candidate_contact;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.candidate_contact
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.candidate_social_account;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.candidate_social_account
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.zip_district;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.zip_district
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze ON public.block_district;
CREATE TRIGGER trg_content_freeze
  BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.block_district
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

-- (4) Row-level triggers with the exceptions above, plus TRUNCATE.
DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.race_publication;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.race_publication
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.race_publication;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.race_publication
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.measure_publication;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.measure_publication
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.measure_publication;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.measure_publication
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.candidate;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.candidate
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.candidate;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.candidate
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.race;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.race
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.race;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.race
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();

DROP TRIGGER IF EXISTS trg_content_freeze_row ON public.source;
CREATE TRIGGER trg_content_freeze_row
  BEFORE INSERT OR UPDATE OR DELETE ON public.source
  FOR EACH ROW EXECUTE FUNCTION public.refuse_during_content_freeze();
DROP TRIGGER IF EXISTS trg_content_freeze_truncate ON public.source;
CREATE TRIGGER trg_content_freeze_truncate
  BEFORE TRUNCATE ON public.source
  FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_during_content_freeze();
```

(A file-write hook may warn "Destructive SQL (TRUNCATE)". The word appears only as a trigger event; nothing is truncated.)

- [ ] **Step 6: Run it to see it pass**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" scripts/verify-migrations.mjs 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep -c '^  ok'
printf '%s\n' "$out" | grep -c '0050'
printf '%s\n' "$out" | tail -1
```

Expected: `exit=0`, `277` (226 before), `51` (the migration line plus 50 checks), `All migration + RLS checks passed.`

- [ ] **Step 7: Update the ledger row**

In `supabase/migrations/README.md`, replace line 66

```
| 0050      | **claimed** — `0050_content_freeze.sql`: the content-freeze guard, 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC (`docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` §3.6.2, BC9) | not written. Apply Thu 10-15 |
```

with

```
| **0050**  | `0050_content_freeze.sql` — the content-freeze guard: one `content_freeze` row (2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC), `refuse_during_content_freeze()` (SECURITY DEFINER, empty search_path, EXECUTE revoked by name) and its 21 triggers on 16 ballot tables; inert outside the window (`docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` §3.6.2, BC9) | **written, not applied** (PR `claude/ballot-freeze-guard`). Apply Thu 10-15 with the founder's yes through the MCP `apply_migration`; read back `SELECT starts_at, ends_at FROM content_freeze`, the triggers in `pg_trigger`, and `prosecdef = true`, `proconfig = {search_path=""}` (spec §5 step 6) |
```

- [ ] **Step 8: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git add supabase/migrations/0050_content_freeze.sql scripts/verify-migrations.mjs supabase/migrations/README.md
git commit -F - <<'EOF'
Migration 0050: the content-freeze guard, inert until 2026-10-18 04:00 UTC

content_freeze holds the window (2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC).
refuse_during_content_freeze() is SECURITY DEFINER with an empty search_path;
inside the window it refuses writes to 16 ballot tables unless
kyv.freeze_correction is set, with the spec's exceptions (takedown to listed,
freshness stamps, key_dates, no-op updates, new or uncited sources).
verify-migrations sets the bypass before the replay and tests every refusal
with it turned off per transaction. Not applied: the founder applies it
Thu 10-15 (spec BC9, recommended pending founder confirmation).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 9: Mutation check (then restore)**

Prove the `SECURITY DEFINER` test bites:

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
sed -i '' 's/^SECURITY DEFINER$/SECURITY INVOKER/' supabase/migrations/0050_content_freeze.sql
"$NODE" scripts/verify-migrations.mjs 2>&1 | grep -A1 '^FAIL'
git checkout -- supabase/migrations/0050_content_freeze.sql
git status --short
```

Expected FAIL lines: `cap_tool_wrapper can INSERT a source row` and `cap_tool_wrapper can UPDATE candidate freshness`, each `permission denied for table content_freeze` (an INVOKER guard breaks the role even outside the window); `0050 the guard is SECURITY DEFINER …` / `not SECURITY DEFINER`; `0050 as cap_tool_wrapper … not by a permission error` / `unexpected error: 42501 permission denied for table content_freeze`; `0050 before the window, cap_tool_wrapper's INSERT …` / `refused: permission denied for table content_freeze`. After `git checkout`, `git status --short` prints nothing.

---

### Task 2: The bypass in the other four PGlite scripts, and proof that CI works in the window

**Files:**
- Modify: `scripts/verify-ballot-seeds.mjs:38`, `scripts/verify-demo-seed.mjs:11`, `scripts/verify-brief-rows-sql.mjs:28`, `scripts/verify-election-seed.mjs:87`
- Scratch only (never committed): `supabase/migrations/0050z_scratch_window_open.sql`

**Interfaces:**
- Consumes: Task 1's `content_freeze` and guard; the exact bypass line `await db.exec("SET kyv.freeze_correction = 'pglite replay';");`.
- Produces: all five PGlite scripts carry that exact line right after `const db = new PGlite({ extensions: { pgcrypto } });`.

- [ ] **Step 1: Write the scratch migration that opens the window**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
cat > supabase/migrations/0050z_scratch_window_open.sql <<'EOF'
-- SCRATCH, NEVER COMMITTED: open the freeze window now and make one frozen
-- write after 0050, as 0051 or any later migration would inside the window.
UPDATE content_freeze SET starts_at = now() - interval '1 day', ends_at = now() + interval '30 days' WHERE id = 1;
UPDATE claim SET text = text WHERE false;
EOF
```

- [ ] **Step 2: Run the four scripts to see them fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
for s in verify-ballot-seeds.mjs verify-demo-seed.mjs verify-brief-rows-sql.mjs verify-election-seed.mjs; do
  out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/$s 2>&1)"; code=$?
  echo "$s exit=$code :: $(printf '%s' "$out" | grep -m1 -o 'Ballot content is frozen[^.]*')"
done
```

Expected: each prints `exit=1 :: Ballot content is frozen until Election Day (content_freeze)`.

- [ ] **Step 3: Add the bypass line to the four scripts**

In each of `scripts/verify-ballot-seeds.mjs`, `scripts/verify-demo-seed.mjs`, `scripts/verify-brief-rows-sql.mjs` and `scripts/verify-election-seed.mjs`, replace the single line

```js
const db = new PGlite({ extensions: { pgcrypto } });
```

with

```js
const db = new PGlite({ extensions: { pgcrypto } });
/* 0050's content freeze refuses writes to ballot tables from 2026-10-18 to
   2026-11-04 unless this is set; set before the replay so this check keeps
   passing inside that window (docs/general-election/corrections/README.md). */
await db.exec("SET kyv.freeze_correction = 'pglite replay';");
```

(`verify-election-seed.mjs` has the line once, at 87; the other three once each.)

- [ ] **Step 4: Run all five with the window open: they pass**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
for s in verify-migrations.mjs verify-ballot-seeds.mjs verify-demo-seed.mjs verify-brief-rows-sql.mjs verify-election-seed.mjs; do
  "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/$s > /dev/null 2>&1; echo "$s exit=$?"
done
```

Expected: five lines, each `exit=0`.

- [ ] **Step 5: Remove each bypass line in turn: each fails**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
for s in verify-migrations.mjs verify-ballot-seeds.mjs verify-demo-seed.mjs verify-brief-rows-sql.mjs verify-election-seed.mjs; do
  cp "scripts/$s" "scripts/$s.keep"
  grep -v "^await db.exec(\"SET kyv.freeze_correction = 'pglite replay';\");$" "scripts/$s.keep" > "scripts/$s"
  out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/$s 2>&1)"; code=$?
  echo "$s exit=$code :: $(printf '%s' "$out" | grep -m1 -o 'Ballot content is frozen[^.]*')"
  mv "scripts/$s.keep" "scripts/$s"
done
grep -c "^await db.exec(\"SET kyv.freeze_correction = 'pglite replay';\");$" scripts/verify-migrations.mjs scripts/verify-ballot-seeds.mjs scripts/verify-demo-seed.mjs scripts/verify-brief-rows-sql.mjs scripts/verify-election-seed.mjs
```

Expected: five `exit=1 :: Ballot content is frozen until Election Day (content_freeze)` lines, then each file reports `:1` (the line is back).

- [ ] **Step 6: Delete the scratch migration and run the five again**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
rm supabase/migrations/0050z_scratch_window_open.sql
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
for s in verify-migrations.mjs verify-ballot-seeds.mjs verify-demo-seed.mjs verify-brief-rows-sql.mjs verify-election-seed.mjs; do
  "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/$s > /dev/null 2>&1; echo "$s exit=$?"
done
git status --short
```

Expected: five `exit=0`; `git status --short` shows exactly the four modified scripts (`M scripts/verify-ballot-seeds.mjs`, `M scripts/verify-brief-rows-sql.mjs`, `M scripts/verify-demo-seed.mjs`, `M scripts/verify-election-seed.mjs`) and no `0050z` file.

- [ ] **Step 7: Lint and commit**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" node_modules/eslint/bin/eslint.js scripts/verify-migrations.mjs scripts/verify-ballot-seeds.mjs scripts/verify-demo-seed.mjs scripts/verify-brief-rows-sql.mjs scripts/verify-election-seed.mjs
git add scripts/verify-ballot-seeds.mjs scripts/verify-demo-seed.mjs scripts/verify-brief-rows-sql.mjs scripts/verify-election-seed.mjs
git commit -F - <<'EOF'
PGlite checks: set kyv.freeze_correction before the replay

verify-ballot-seeds, verify-demo-seed, verify-brief-rows-sql and
verify-election-seed now set the freeze bypass right after creating their
database, as verify-migrations does. With a scratch migration opening the
window and making one frozen write, all five pass with the line and fail
with the freeze message without it, so CI keeps working from 10-18 to 11-04.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: ESLint prints nothing.

---

### Task 3: The code tripwire (`verify-freeze.ts`)

**Files:**
- Create: `scripts/freeze-manifest.ts`, `scripts/verify-freeze.ts`, `scripts/verify-freeze-rules.ts`

**Interfaces:**
- Consumes: Task 1's 0050 text (`verify-freeze-rules.ts` reads the two timestamps from `INSERT INTO public.content_freeze`).
- Produces (from `scripts/freeze-manifest.ts`):
  - `MANIFEST_PATH = "docs/general-election/freeze-2026-10-18.json"`, `CORRECTIONS_DIR = "docs/general-election/corrections/"`
  - `FREEZE_WINDOW = { starts_at: "2026-10-18T04:00:00.000Z", ends_at: "2026-11-04T05:00:00.000Z" } as const`
  - `FROZEN_FILES: readonly string[]` (45 paths)
  - `interface FreezeWindow { starts_at: string; ends_at: string }`, `interface ManifestEntry { path: string; sha256: string; correction?: string }`, `interface FreezeManifest { about: string; window: FreezeWindow; files: ManifestEntry[] }`, `interface CheckResult { ok: boolean; lines: string[] }`
  - `inWindow(window: FreezeWindow, now: Date): boolean`
  - `buildManifest(hashOf: (path: string) => string, files?: readonly string[]): FreezeManifest`
  - `parseManifest(text: string): FreezeManifest` (throws with a reason)
  - `checkManifest(manifest: FreezeManifest, opts: { now: Date; hashOf: (path: string) => string | null; exists: (path: string) => boolean; frozenFiles?: readonly string[] }): CheckResult`
  - CLI: `node scripts/verify-freeze.ts [--write] [--root <dir>] [--now <iso>]`

- [ ] **Step 1: Write the failing tests**

Create `scripts/verify-freeze-rules.ts`:

```ts
/* Tests for the content freeze's code tripwire (scripts/freeze-manifest.ts
   and scripts/verify-freeze.ts; ballot-content-completion §3.6.3 and §6).

   1. The rules, on fixtures: matching hashes pass; inside the window a
      changed or missing file, or a frozen list that no longer matches the
      manifest, fails; outside it they print and pass; an entry whose hash
      was updated and that names an existing correction file passes; a named
      correction file that is missing, or is not under
      docs/general-election/corrections/, fails at any time; the window
      includes its start and excludes its end; a malformed manifest is
      refused with a reason.
   2. The constants: the window is 0050's content_freeze window to the
      minute, and every frozen file exists, once.
   3. The command, in a scratch tree: with no manifest it prints its note and
      exits 0; --write then check passes; a changed file fails inside the
      window and passes after it; --write is refused inside the window and
      leaves the manifest alone.

   Run: node scripts/verify-freeze-rules.ts */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  CORRECTIONS_DIR,
  FREEZE_WINDOW,
  FROZEN_FILES,
  MANIFEST_PATH,
  buildManifest,
  checkManifest,
  inWindow,
  parseManifest,
  type FreezeManifest,
} from "./freeze-manifest.ts";

const ROOT = resolve(import.meta.dirname, "..");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ---- 1. the rules ------------------------------------------------------ */

const BEFORE = new Date("2026-10-17T22:00:00Z");
const INSIDE = new Date("2026-10-25T12:00:00Z");
const AFTER = new Date("2026-11-04T05:00:00Z");
const FILES = ["src/lib/a.ts", "src/lib/b.ts"];
const CORRECTION = `${CORRECTIONS_DIR}2026-10-25-fix-a.md`;

function fixture(hashes: Record<string, string | null>, existing: string[] = []) {
  return {
    hashOf: (p: string) => (p in hashes ? hashes[p] : null),
    exists: (p: string) => existing.includes(p),
    frozenFiles: FILES,
  };
}
const base: FreezeManifest = buildManifest((p) => `hash-${p}`, FILES);
const withEntry = (path: string, patch: object): FreezeManifest => ({
  ...base,
  files: base.files.map((f) => (f.path === path ? { ...f, ...patch } : f)),
});
const fails = (lines: string[]) => lines.filter((l) => l.startsWith("FAIL"));

{
  const r = checkManifest(base, { now: INSIDE, ...fixture({ "src/lib/a.ts": "hash-src/lib/a.ts", "src/lib/b.ts": "hash-src/lib/b.ts" }) });
  check("matching hashes pass inside the window", r.ok && fails(r.lines).length === 0, r.lines.join(" | "));
}
const changedA = { "src/lib/a.ts": "hash-CHANGED", "src/lib/b.ts": "hash-src/lib/b.ts" };
{
  const r = checkManifest(base, { now: INSIDE, ...fixture(changedA) });
  check(
    "a changed file without a manifest update fails inside the window, by name",
    !r.ok && fails(r.lines).some((l) => l.includes("src/lib/a.ts") && l.includes("hash-CHANGED")),
    r.lines.join(" | ")
  );
}
for (const [label, now] of [["before", BEFORE], ["after", AFTER]] as const) {
  const r = checkManifest(base, { now, ...fixture(changedA) });
  check(
    `a changed file passes ${label} the window and is printed`,
    r.ok && fails(r.lines).length === 0 && r.lines.some((l) => l.startsWith("  note  ") && l.includes("src/lib/a.ts")),
    r.lines.join(" | ")
  );
}
{
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: CORRECTION }), {
    now: INSIDE,
    ...fixture(changedA, [CORRECTION]),
  });
  check("an updated entry naming an existing correction file passes inside the window", r.ok, r.lines.join(" | "));
}
for (const [label, now] of [["inside", INSIDE], ["after", AFTER]] as const) {
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: CORRECTION }), {
    now,
    ...fixture(changedA, []),
  });
  check(
    `a named correction file that does not exist fails ${label} the window`,
    !r.ok && fails(r.lines).some((l) => l.includes(CORRECTION)),
    r.lines.join(" | ")
  );
}
{
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: "notes/fix.md" }), {
    now: INSIDE,
    ...fixture(changedA, ["notes/fix.md"]),
  });
  check("a correction outside docs/general-election/corrections/ fails", !r.ok, r.lines.join(" | "));
}
{
  const r = checkManifest(base, {
    now: INSIDE,
    ...fixture({ "src/lib/a.ts": null, "src/lib/b.ts": "hash-src/lib/b.ts" }),
  });
  check("a deleted frozen file fails inside the window", !r.ok && fails(r.lines).some((l) => l.includes("src/lib/a.ts is missing")), r.lines.join(" | "));
}
{
  const hashes = { "src/lib/a.ts": "hash-src/lib/a.ts", "src/lib/b.ts": "hash-src/lib/b.ts" };
  const inside = checkManifest(base, { now: INSIDE, ...fixture(hashes), frozenFiles: [...FILES, "src/lib/c.ts"] });
  const after = checkManifest(base, { now: AFTER, ...fixture(hashes), frozenFiles: [...FILES, "src/lib/c.ts"] });
  check(
    "a frozen file missing from the manifest fails inside the window and is printed outside it",
    !inside.ok && inside.lines.some((l) => l.includes("src/lib/c.ts is frozen but not in the manifest")) &&
      after.ok && after.lines.some((l) => l.startsWith("  note  ") && l.includes("src/lib/c.ts")),
    [...inside.lines, ...after.lines].join(" | ")
  );
}
check(
  "the window includes its start and excludes its end",
  inWindow(FREEZE_WINDOW, new Date(FREEZE_WINDOW.starts_at)) &&
    !inWindow(FREEZE_WINDOW, new Date(FREEZE_WINDOW.ends_at)) &&
    !inWindow(FREEZE_WINDOW, new Date(Date.parse(FREEZE_WINDOW.starts_at) - 1))
);
const refuses = (text: string) => {
  try {
    parseManifest(text);
    return false;
  } catch {
    return true;
  }
};
check(
  "a malformed manifest is refused",
  refuses("[]") &&
    refuses(JSON.stringify({ window: { starts_at: "2026-11-04T05:00:00Z", ends_at: "2026-10-18T04:00:00Z" }, files: [] })) &&
    refuses(JSON.stringify({ window: FREEZE_WINDOW, files: [{ path: "a" }] })) &&
    refuses(JSON.stringify({ window: FREEZE_WINDOW, files: [{ path: "a", sha256: "x", correction: 1 }] })) &&
    !refuses(JSON.stringify(base))
);

/* ---- 2. the constants -------------------------------------------------- */

const migration = readFileSync(join(ROOT, "supabase/migrations/0050_content_freeze.sql"), "utf8");
const seeded = migration.match(
  /INSERT INTO public\.content_freeze[\s\S]*?'(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\+00',\s*'(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\+00'/
);
check(
  "FREEZE_WINDOW is 0050's content_freeze window, to the minute",
  seeded !== null &&
    Date.parse(`${seeded[1]}T${seeded[2]}:00Z`) === Date.parse(FREEZE_WINDOW.starts_at) &&
    Date.parse(`${seeded[3]}T${seeded[4]}:00Z`) === Date.parse(FREEZE_WINDOW.ends_at),
  seeded ? seeded.slice(1).join(" ") : "no INSERT INTO public.content_freeze found"
);
check(
  "the window is Sun 2026-10-18 04:00 UTC to Wed 2026-11-04 05:00 UTC",
  FREEZE_WINDOW.starts_at === "2026-10-18T04:00:00.000Z" &&
    FREEZE_WINDOW.ends_at === "2026-11-04T05:00:00.000Z"
);
const missing = FROZEN_FILES.filter((f) => !existsSync(join(ROOT, f)));
check("every frozen file exists", missing.length === 0, missing.join(", "));
check("no frozen file is listed twice", new Set(FROZEN_FILES).size === FROZEN_FILES.length);
check("45 frozen files (§3.6.3)", FROZEN_FILES.length === 45, String(FROZEN_FILES.length));

/* ---- 3. the command ---------------------------------------------------- */

const SCRIPT = join(ROOT, "scripts/verify-freeze.ts");
function run(...args: string[]) {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT, ...args],
    { encoding: "utf8" }
  );
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const scratch = mkdtempSync(join(tmpdir(), "kyv-verify-freeze-"));
try {
  const none = run("--root", scratch);
  check(
    "no manifest: prints its note and exits 0",
    none.code === 0 &&
      none.out.trim() ===
        `ok  no freeze manifest yet (${MANIFEST_PATH}); nothing to compare`,
    JSON.stringify(none)
  );

  for (const f of FROZEN_FILES) {
    mkdirSync(dirname(join(scratch, f)), { recursive: true });
    writeFileSync(join(scratch, f), `// ${f}\n`);
  }
  const wrote = run("--root", scratch, "--write", "--now", BEFORE.toISOString());
  check("--write before the window writes the manifest", wrote.code === 0 && existsSync(join(scratch, MANIFEST_PATH)), JSON.stringify(wrote));

  const same = run("--root", scratch, "--now", INSIDE.toISOString());
  check("an unchanged tree passes inside the window", same.code === 0, JSON.stringify(same));

  const target = FROZEN_FILES[0];
  writeFileSync(join(scratch, target), "// changed\n");
  const changedInside = run("--root", scratch, "--now", INSIDE.toISOString());
  check(
    "a changed frozen file fails inside the window, by name",
    changedInside.code === 1 && changedInside.out.includes(`FAIL  ${target} differs`),
    JSON.stringify(changedInside)
  );
  const changedAfter = run("--root", scratch, "--now", AFTER.toISOString());
  check("the same change passes after the window", changedAfter.code === 0 && changedAfter.out.includes(target), JSON.stringify(changedAfter));

  const before = readFileSync(join(scratch, MANIFEST_PATH), "utf8");
  const refused = run("--root", scratch, "--write", "--now", INSIDE.toISOString());
  check(
    "--write is refused inside the window and leaves the manifest alone",
    refused.code === 1 && readFileSync(join(scratch, MANIFEST_PATH), "utf8") === before,
    JSON.stringify(refused)
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-freeze-rules: all checks passed.");
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep -m1 'Cannot find module'
```

Expected: `exit=1` and a `Cannot find module '…/scripts/freeze-manifest.ts'` (`ERR_MODULE_NOT_FOUND`) line.

- [ ] **Step 3: Write the rules module**

Create `scripts/freeze-manifest.ts`:

```ts
/* The code tripwire for the content freeze
   (docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md
   §3.6.3; founder decision BC10, recommended pending founder confirmation).

   The frozen files are what renders ballot content: the race, race-issues,
   candidate, measure and methodology pages and what they import that shapes
   a brief, a roster, a party or incumbency label, a contact block or a
   measure. From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC a change to one
   of them is a correction, and it has to show in the diff with its
   correction note beside it.

   The manifest, docs/general-election/freeze-2026-10-18.json, holds the
   window and each frozen file's sha256. It is written last in the
   freeze-copy PR by `node scripts/verify-freeze.ts --write`, after every
   other frozen-file change has merged. A correction pull request changes
   the file, sets that entry's sha256 to the new hash and adds
   "correction": "docs/general-election/corrections/<file>.md" to it.

   This module is pure (no fs, no clock): scripts/verify-freeze.ts hands it
   the hashes and the time, and scripts/verify-freeze-rules.ts drives it
   with fixtures. It is a tripwire, not a lock: anyone can edit the
   manifest. It blocks a merge only once main requires the CI checks
   (docs/ci.md §1, founder checklist D6). */

export const MANIFEST_PATH = "docs/general-election/freeze-2026-10-18.json";
export const CORRECTIONS_DIR = "docs/general-election/corrections/";

/* The same two instants as 0050's content_freeze row (Sun 2026-10-18 00:00
   EDT, Wed 2026-11-04 00:00 EST). verify-freeze-rules.ts checks that the
   migration and this constant agree. */
export const FREEZE_WINDOW = {
  starts_at: "2026-10-18T04:00:00.000Z",
  ends_at: "2026-11-04T05:00:00.000Z",
} as const;

/* §3.6.3, in its order. Add a file here in the same PR that adds it to the
   render path (roster-completeness's code PR does this for its files). */
export const FROZEN_FILES: readonly string[] = [
  "src/app/(public)/races/[raceId]/page.tsx",
  "src/app/(public)/races/[raceId]/issues/page.tsx",
  "src/app/(public)/candidates/[candidateId]/page.tsx",
  "src/app/(public)/measures/[measureId]/page.tsx",
  "src/app/(public)/methodology/page.tsx",
  "src/components/features/RaceCompare.tsx",
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/IssueSection.tsx",
  "src/components/features/IssueRows.tsx",
  "src/components/features/IssueFilter.tsx",
  "src/components/features/ClaimList.tsx",
  "src/components/features/SourceLinks.tsx",
  "src/components/features/RaceHeader.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/CandidateListing.tsx",
  "src/components/features/CandidateContact.tsx",
  "src/components/features/CandidateBrowser.tsx",
  "src/components/features/CountyRaces.tsx",
  "src/components/features/YourRaces.tsx",
  "src/components/features/SharedBallot.tsx",
  "src/components/features/SavedCandidates.tsx",
  "src/components/features/JudicialRetentionNote.tsx",
  "src/components/features/MeasureResourceLadder.tsx",
  "src/components/features/MeasureResourceRow.tsx",
  "src/components/features/MeasureVoteMeaning.tsx",
  "src/components/features/MeasureThreshold.tsx",
  "src/components/ui/PartyChip.tsx",
  "src/components/ui/PolicyAreaChip.tsx",
  "src/components/ui/VerdictBadge.tsx",
  "src/lib/listing-copy.ts",
  "src/lib/measure-held-copy.ts",
  "src/lib/listing.ts",
  "src/lib/briefs.ts",
  "src/lib/races.ts",
  "src/lib/race-rows.ts",
  "src/lib/resolve.ts",
  "src/lib/measures.ts",
  "src/lib/measure-ladder.ts",
  "src/lib/ballot-order.ts",
  "src/lib/judicial-retention.ts",
  "src/lib/incumbency.ts",
  "src/lib/party-label.ts",
  "src/lib/contact.ts",
  "src/lib/issue-pick.ts",
  "src/lib/office-title.ts",
];

export interface FreezeWindow {
  starts_at: string;
  ends_at: string;
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  correction?: string;
}

export interface FreezeManifest {
  about: string;
  window: FreezeWindow;
  files: ManifestEntry[];
}

export interface CheckResult {
  ok: boolean;
  lines: string[];
}

const ABOUT =
  "Content-freeze manifest (ballot-content-completion §3.6.3). From window.starts_at to window.ends_at, " +
  "scripts/verify-freeze.ts fails when a frozen file's sha256 differs from its entry here. A correction PR " +
  "changes the file, sets the entry's sha256 to the new hash and adds " +
  '"correction": "docs/general-election/corrections/<file>.md" (a file that must exist).';

export function inWindow(window: FreezeWindow, now: Date): boolean {
  const t = now.getTime();
  return t >= Date.parse(window.starts_at) && t < Date.parse(window.ends_at);
}

export function buildManifest(
  hashOf: (path: string) => string,
  files: readonly string[] = FROZEN_FILES
): FreezeManifest {
  return {
    about: ABOUT,
    window: { starts_at: FREEZE_WINDOW.starts_at, ends_at: FREEZE_WINDOW.ends_at },
    files: files.map((path) => ({ path, sha256: hashOf(path) })),
  };
}

/* JSON from disk, checked for the shape checkManifest relies on. Throws
   with a reason a person can act on. */
export function parseManifest(text: string): FreezeManifest {
  const raw: unknown = JSON.parse(text);
  const fail = (why: string): never => {
    throw new Error(`${MANIFEST_PATH} ${why}`);
  };
  if (typeof raw !== "object" || raw === null) return fail("is not a JSON object");
  const m = raw as Record<string, unknown>;
  const w = m.window as Record<string, unknown> | undefined;
  if (
    typeof w !== "object" || w === null ||
    typeof w.starts_at !== "string" || typeof w.ends_at !== "string" ||
    Number.isNaN(Date.parse(w.starts_at)) || Number.isNaN(Date.parse(w.ends_at)) ||
    Date.parse(w.ends_at) <= Date.parse(w.starts_at)
  ) {
    return fail("has no valid window (starts_at < ends_at, both ISO dates)");
  }
  if (!Array.isArray(m.files)) return fail("has no files array");
  const files: ManifestEntry[] = m.files.map((e: unknown, i: number) => {
    const entry = e as Record<string, unknown>;
    if (typeof entry?.path !== "string" || typeof entry?.sha256 !== "string") {
      return fail(`files[${i}] needs a string path and sha256`);
    }
    if (entry.correction !== undefined && typeof entry.correction !== "string") {
      return fail(`files[${i}].correction must be a string`);
    }
    return entry.correction === undefined
      ? { path: entry.path, sha256: entry.sha256 }
      : { path: entry.path, sha256: entry.sha256, correction: entry.correction };
  });
  return {
    about: typeof m.about === "string" ? m.about : "",
    window: { starts_at: w.starts_at, ends_at: w.ends_at },
    files,
  };
}

/* The check. Inside the manifest's window a hash difference, a missing
   file or a frozen-file list that no longer matches the manifest fails;
   outside it they are printed and pass. A named correction file that does
   not exist fails at any time. Lines start "  ok  ", "  note  " or
   "FAIL  ", as every verify script's do. */
export function checkManifest(
  manifest: FreezeManifest,
  opts: {
    now: Date;
    hashOf: (path: string) => string | null;
    exists: (path: string) => boolean;
    frozenFiles?: readonly string[];
  }
): CheckResult {
  const frozen = opts.frozenFiles ?? FROZEN_FILES;
  const inside = inWindow(manifest.window, opts.now);
  const differences: string[] = [];
  const failures: string[] = [];
  const listed = new Set(manifest.files.map((f) => f.path));

  for (const entry of manifest.files) {
    const actual = opts.hashOf(entry.path);
    if (actual === null) {
      differences.push(`${entry.path} is missing`);
    } else if (actual !== entry.sha256) {
      differences.push(
        `${entry.path} differs from the manifest (manifest ${entry.sha256}, file ${actual})`
      );
    }
    if (entry.correction !== undefined) {
      const named = entry.correction;
      if (!named.startsWith(CORRECTIONS_DIR) || !named.endsWith(".md")) {
        failures.push(`${entry.path} names "${named}", which is not a ${CORRECTIONS_DIR}*.md file`);
      } else if (!opts.exists(named)) {
        failures.push(`${entry.path} names correction ${named}, which does not exist`);
      }
    }
  }
  for (const path of frozen) {
    if (!listed.has(path)) differences.push(`${path} is frozen but not in the manifest`);
  }
  for (const path of listed) {
    if (!frozen.includes(path)) differences.push(`${path} is in the manifest but no longer frozen`);
  }

  const lines: string[] = [];
  const where = inside
    ? `inside the freeze window (${manifest.window.starts_at} to ${manifest.window.ends_at})`
    : `outside the freeze window (${manifest.window.starts_at} to ${manifest.window.ends_at})`;
  if (inside) {
    for (const d of differences) {
      lines.push(
        `FAIL  ${d}. In the freeze a frozen file changes only as a correction: set its sha256 to the file's hash and add "correction": "${CORRECTIONS_DIR}<file>.md".`
      );
    }
  } else {
    for (const d of differences) lines.push(`  note  ${d} (${where}: not a failure)`);
  }
  for (const f of failures) lines.push(`FAIL  ${f}`);
  const ok = failures.length === 0 && (!inside || differences.length === 0);
  if (ok) {
    lines.push(
      `  ok  ${manifest.files.length} frozen files checked ${where}` +
        (differences.length ? `; ${differences.length} differ` : "; all match the manifest")
    );
  }
  return { ok, lines };
}
```

- [ ] **Step 4: Run it: the rules pass, the command checks fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep -E '^(  ok|FAIL)'
```

Expected: `exit=1`; the 17 rule and constant checks print `  ok`; then `FAIL  no manifest: prints its note and exits 0` (the command does not exist yet), followed by further command FAILs and a crash reading a manifest that was never written.

- [ ] **Step 5: Write the command**

Create `scripts/verify-freeze.ts`:

```ts
/* The content freeze's code tripwire, run by verify-all.mjs in CI
   (ballot-content-completion §3.6.3, founder decision BC10; the rules live
   in scripts/freeze-manifest.ts).

   - No manifest yet (until the freeze-copy PR writes it): prints
       "  ok  no freeze manifest yet (docs/general-election/freeze-2026-10-18.json); nothing to compare"
     and exits 0. It never claims SKIPPED, which verify-all.mjs keeps for a
     missing environment variable.
   - With the manifest, inside its window: fails when a frozen file's sha256
     differs from its entry, a frozen file is missing, or the frozen-file
     list and the manifest disagree. Outside the window it prints those and
     passes.
   - At any time: fails when an entry names a correction file that does not
     exist.

   Usage:
     node scripts/verify-freeze.ts                 check
     node scripts/verify-freeze.ts --write         write the manifest (refused
                                                   inside the window)
     --root <dir>  check or write another tree (tests)
     --now <iso>   use this time instead of the clock (tests)

   Run: node scripts/verify-freeze.ts */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  FREEZE_WINDOW,
  FROZEN_FILES,
  MANIFEST_PATH,
  buildManifest,
  checkManifest,
  inWindow,
  parseManifest,
  type FreezeManifest,
} from "./freeze-manifest.ts";

const argv = process.argv.slice(2);
function option(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

const root = path.resolve(option("--root") ?? path.join(import.meta.dirname, ".."));
const nowOption = option("--now");
const now = nowOption === undefined ? new Date() : new Date(nowOption);
if (Number.isNaN(now.getTime())) {
  console.error(`FAIL  --now ${nowOption} is not a date`);
  process.exit(1);
}

const abs = (p: string) => path.join(root, p);
const hashOf = (p: string): string | null =>
  existsSync(abs(p))
    ? createHash("sha256").update(readFileSync(abs(p))).digest("hex")
    : null;

if (argv.includes("--write")) {
  if (inWindow(FREEZE_WINDOW, now)) {
    console.error(
      `FAIL  --write refused inside the freeze window (${FREEZE_WINDOW.starts_at} to ${FREEZE_WINDOW.ends_at}). ` +
        `A correction edits its own entry in ${MANIFEST_PATH} (docs/general-election/corrections/README.md).`
    );
    process.exit(1);
  }
  const missing = FROZEN_FILES.filter((f) => hashOf(f) === null);
  if (missing.length > 0) {
    console.error(`FAIL  frozen files not found: ${missing.join(", ")}`);
    process.exit(1);
  }
  const manifest = buildManifest((p) => hashOf(p) ?? "");
  mkdirSync(path.dirname(abs(MANIFEST_PATH)), { recursive: true });
  writeFileSync(abs(MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`  ok  wrote ${MANIFEST_PATH} (${manifest.files.length} frozen files)`);
  process.exit(0);
}

if (!existsSync(abs(MANIFEST_PATH))) {
  console.log(`  ok  no freeze manifest yet (${MANIFEST_PATH}); nothing to compare`);
  process.exit(0);
}

let manifest: FreezeManifest;
try {
  manifest = parseManifest(readFileSync(abs(MANIFEST_PATH), "utf8"));
} catch (err) {
  console.error(`FAIL  ${(err as Error).message}`);
  process.exit(1);
}

const result = checkManifest(manifest, {
  now,
  hashOf,
  exists: (p) => existsSync(abs(p)),
});
for (const line of result.lines) {
  if (line.startsWith("FAIL")) console.error(line);
  else console.log(line);
}
process.exit(result.ok ? 0 : 1);
```

- [ ] **Step 6: Run both: they pass, and no manifest was written**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts | tail -1
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts | grep -c '^  ok'
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze.ts; echo "exit=$?"
test ! -e docs/general-election/freeze-2026-10-18.json && echo "no manifest in the tree"
```

Expected: `verify-freeze-rules: all checks passed.`, `23`, then `  ok  no freeze manifest yet (docs/general-election/freeze-2026-10-18.json); nothing to compare`, `exit=0`, `no manifest in the tree`. Never run `--write` without `--root <scratch dir>`.

- [ ] **Step 7: Strict standalone type-check and lint**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/freeze-manifest.ts scripts/verify-freeze.ts scripts/verify-freeze-rules.ts; echo "tsc exit=$?"
"$NODE" node_modules/eslint/bin/eslint.js scripts/freeze-manifest.ts scripts/verify-freeze.ts scripts/verify-freeze-rules.ts; echo "eslint exit=$?"
```

Expected: `tsc exit=0`, `eslint exit=0`, no other output.

- [ ] **Step 8: Check for render-path files added since this branch was cut**

Spec §3.6.3: "Any file that roster-completeness's code PR adds to that render path, added to the list in the same PR." If that PR merged before this one, its new files belong here.

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git fetch origin main
git diff --name-status HEAD origin/main -- src/app/'(public)' src/components/features src/components/ui src/lib
```

Expected today: no `A` (added) lines. For each `A` line that is imported by a frozen file and shapes a brief, roster, party or incumbency label, contact block or measure (check with `grep -rn "<new file's module name>" <frozen files>`), append its path to `FROZEN_FILES`, change the `45 frozen files` check in `verify-freeze-rules.ts` to the new count, re-run Step 6, and say so in the commit body. Do not merge or rebase main into this branch.

- [ ] **Step 9: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git add scripts/freeze-manifest.ts scripts/verify-freeze.ts scripts/verify-freeze-rules.ts
git commit -F - <<'EOF'
verify-freeze: the content freeze's code tripwire, passing until a manifest exists

FROZEN_FILES holds the 45 render-path files of spec §3.6.3. With no
docs/general-election/freeze-2026-10-18.json, verify-freeze prints its note
and exits 0. With one, inside the window it fails on a changed, missing or
unlisted frozen file; outside it prints them and passes; a named correction
file that does not exist fails at any time. --write is refused inside the
window. verify-freeze-rules tests the rules, pins the window to 0050's, and
drives the command in a scratch tree. The manifest is written by the
freeze-copy PR, not here (spec BC10, recommended pending founder confirmation).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: The corrections README

**Files:**
- Create: `docs/general-election/corrections/README.md`
- Modify: `scripts/verify-freeze-rules.ts` (header item 2; one check after the window check)

**Interfaces:**
- Consumes: 0050's refusal message (Task 1), `CORRECTIONS_DIR` (Task 3).
- Produces: the file every refusal points to; the correction-file convention `docs/general-election/corrections/2026-MM-DD-<slug>.md` that manifest entries name.

- [ ] **Step 1: Write the failing check**

In `scripts/verify-freeze-rules.ts`, replace

```ts
   2. The constants: the window is 0050's content_freeze window to the
      minute, and every frozen file exists, once.
```

with

```ts
   2. The constants: the window is 0050's content_freeze window to the
      minute, 0050's refusal message points to the corrections README and
      that file exists, and every frozen file exists, once.
```

and replace

```ts
check(
  "the window is Sun 2026-10-18 04:00 UTC to Wed 2026-11-04 05:00 UTC",
```

with

```ts
const pointedTo = migration.match(/Corrections only: (\S+\.md)'/)?.[1];
check(
  "0050's refusal message points to a corrections README that exists",
  pointedTo === `${CORRECTIONS_DIR}README.md` && existsSync(join(ROOT, pointedTo)),
  String(pointedTo)
);
check(
  "the window is Sun 2026-10-18 04:00 UTC to Wed 2026-11-04 05:00 UTC",
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep README
```

Expected: `exit=1` and `FAIL  0050's refusal message points to a corrections README that exists — docs/general-election/corrections/README.md`.

- [ ] **Step 3: Write the README**

Create `docs/general-election/corrections/README.md`:

````markdown
# Corrections during the content freeze

From **Sun 2026-10-18 00:00 EDT (04:00 UTC)** to **Wed 2026-11-04 00:00 EST
(05:00 UTC)**, ballot content changes only by a correction. This file is
where the database guard's refusal message points. The design is
`docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` §3.6
(founder decisions BC9 to BC19, each recommended pending founder
confirmation).

Two things enforce the freeze, and neither is a lock:

- **The database guard**, migration `0050_content_freeze.sql`. Inside the
  window a write to a frozen table fails with
  `Ballot content is frozen until Election Day (content_freeze). Corrections only: docs/general-election/corrections/README.md`
  unless the transaction names its correction file (below). It starts and
  stops by the clock in the `content_freeze` row.
- **The code tripwire**, `scripts/verify-freeze.ts` in CI. Inside the window
  it fails when a frozen file (`FROZEN_FILES` in `scripts/freeze-manifest.ts`)
  differs from its sha256 in `docs/general-election/freeze-2026-10-18.json`,
  or when an entry names a correction file that does not exist. It blocks a
  merge only once `main` requires the CI checks (`docs/ci.md` §1).

Any session that can write can also set the correction setting or disable a
trigger, and anyone can edit the manifest. The control is the founder's yes
on every correction, recorded in the correction file.

## What is frozen

- race briefs: `claim`, `claim_source`, `position`, `issue`, `profile`;
- publication state: `race_publication`, `measure_publication`;
- the roster and its links: `candidate`, `race`, `candidate_contact`,
  `candidate_social_account`;
- measure pages: `ballot_measure`, `measure_resource`;
- which races a voter is shown: `zip_district`, `block_district`;
- `source` rows that a claim or a measure resource points to;
- the code files in `FROZEN_FILES` (`scripts/freeze-manifest.ts`): the race,
  race-issues, candidate, measure and methodology pages and what they import
  that shapes a brief, a roster, a party or incumbency label, a contact block
  or a measure.

These writes go through the guard without a correction (0050's exceptions):

- a race or measure taken to `listed` (an emergency takedown never waits);
- `candidate.site_last_verified_at`, `race.info_last_verified_at` and
  `race.key_dates` (freshness stamps, and election logistics approved by a
  human in `/admin`, BC18);
- a new `source` row, and an update or delete of a `source` row that no
  `claim_source` or `measure_resource` row cites;
- an `UPDATE` that changes nothing.

## Not frozen

Each has its own gate:

- **The news plane** (`news_item`). News reaches voters only through
  approval in `/admin`. R1 and R3 are paused through Nov 3 (BC12).
- **Reminders and election dates**: `election_event` is not guarded, so a
  wrong reminder date is fixed the way `reminders-e2e-runbook.md` "Sending a
  correction" says (pause reminders, fix and verify the row, dry run,
  rehearse, send). That email path needs `CORRECTION_SECRET`, which the
  freeze does not.
- `review_item`, `admin_action` and the operator console.

## What is a correction

- a quote that does not match its source byte for byte;
- a passage attributed to the wrong candidate or race;
- a roster fact that changed: a withdrawal, a death, a court-ordered ballot
  change;
- a link that now points somewhere hacked or unrelated, as Colucci's did;
- a measure resource that no longer loads or no longer says what its row
  records;
- a page that crashes, or states something false about our process or the
  ballot.

**What is not:** new or changed content on a candidate's site; a campaign
asking to add or remove positions; a newly found statement on an amendment; a
copy, layout or feature improvement. Each such request is still recorded
(step 1) and answered "after November 3".

## How a correction gets in

### 1. Record it

Create `docs/general-election/corrections/2026-MM-DD-<slug>.md`:

```markdown
# <one line: what is wrong, where>

- Reported by / how: <name or "agent source check">, <email, issue, check file>, <date>
- The claim: <what the page says, with its URL>
- The evidence: <the live source, fetched YYYY-MM-DD: URL, and what it says now>
- A correction under README "What is a correction"? <yes: which kind / no: why not>
- Founder: <yes or no, quoted, with the date>
- Applied: <date, by whom, what ran>
- Checked live: <date, URL, a quote from the page after the cache expired>
```

A request that is not a correction is recorded the same way and answered
"after November 3".

### 2. Hold it, if the error is live and harmful

In the founder's SQL editor, one transaction each.

**A race (BC16).** The race stays `published` and renders the roster with
"Brief in review" until step 4:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
UPDATE profile
   SET audit = audit || '{"balance_check_passed": false}'
 WHERE race_id = '<race_id>';
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
VALUES ('founder', 'note', 'race_publication', '<race_id>',
        jsonb_build_object('reason', 'Correction hold: docs/general-election/corrections/<file>.md'));
COMMIT;
```

**A measure.** The page shows its neutral block and the fallback text:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
UPDATE measure_publication SET status = 'listed' WHERE measure_id = '<measure_id>';
INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
VALUES ('founder', 'list', 'measure_publication', '<measure_id>',
        jsonb_build_object('prior_status', 'published', 'new_status', 'listed',
                           'reason', 'Correction hold: docs/general-election/corrections/<file>.md'));
COMMIT;
```

### 3. The fix

In the founder's SQL editor, as one transaction:

```sql
BEGIN;
SET LOCAL kyv.freeze_correction = 'docs/general-election/corrections/<file>.md';
-- the fix
COMMIT;
```

- **A brief fix** then runs `docs/general-election/brief-runs/refresh-plan-2026-10.md`
  Step 4 checks 2 to 4 for that race: fingerprints against a reference
  rebuilt with the fix (the reference builder runs
  `SET kyv.freeze_correction = 'pglite reference'` first), the audit at
  `word_count_pct = 150`, and the read as `anon`.
- **A measure resource that no longer loads (BC17).** Replace the row, in one
  transaction, with the Internet Archive capture of the same URL taken on or
  before the date the row was verified, after opening that capture and
  seeing the recorded title. Kind, stance, title and note stay; a new
  `source` row carries the capture's URL. The count does not change, so the
  deferred balance trigger passes. Only when no such capture exists, or the
  page now says something else, delete the row. If that delete breaks the 2x
  gate (either Amendment 3 support row), the same transaction first takes the
  measure to `listed` as in step 2, and it stays listed through Nov 3.
- **A roster field from `/admin` (BC18).** Approving a `gated_diff` for
  `race.office`, `race.district` or `candidate.qualifying_status` fails with
  the freeze message as its `apply_error`, and the item stays pending. Apply
  the value here, then approve the item again: it writes the same value,
  which changes nothing, so the guard lets it through and the item closes.
- **A code fix** goes through a pull request that changes the file, sets
  that file's `sha256` in `docs/general-election/freeze-2026-10-18.json` to
  the new hash (the failing `verify-freeze.ts` line prints it), and adds
  `"correction": "docs/general-election/corrections/<file>.md"` to that
  entry. `node scripts/verify-freeze.ts --write` is refused inside the window.
- **A correction migration** applied in the window starts with
  `SELECT set_config('kyv.freeze_correction', 'docs/general-election/corrections/<file>.md', true);`,
  which lasts for that migration's transaction.

### 4. Re-publish, if it was held

- **A race:** re-run the audit write-back (refresh plan Step 4 check 3), which
  sets `balance_check_passed = true`, under the setting.
- **A measure:** under the setting, set it back to `published` with an
  `admin_action` `publish` row.

Cite the correction file in each reason. Request the page twice after the
3600 s cache expires, and record a quote in the correction file.

## The guard probe (Sun 2026-10-18)

In the SQL editor, once:

```sql
BEGIN;
INSERT INTO issue (issue_id, race_id, tier, title, display_order)
VALUES ('probe-freeze', 'FL-GOV-general', 'spine', 'Probe', 99);
ROLLBACK;
```

The expected result is the freeze error and nothing written. Then:

```sql
SELECT now() >= starts_at AND now() < ends_at FROM content_freeze;  -- true
SELECT prosecdef, proconfig FROM pg_proc
 WHERE proname = 'refuse_during_content_freeze';                    -- true, {search_path=""}
```

## Source checks

On Sat 10-17 after the freeze-copy deploy, and on Mon 10-26, a session sends
one `GET` to every distinct URL a published claim's `claim_source` or a
published measure's `measure_resource` cites, and writes the results to
`source-check-2026-10-17.md` and `source-check-2026-10-26.md` in this folder:
status code, final host, and for measure resources whether the recorded
title still appears. An unreachable page, a redirect to another host, or a
missing measure title starts step 1. A candidate page whose text changed is
not a correction.
````

- [ ] **Step 4: Run it to see it pass, then type-check and lint**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts | grep -c '^  ok'
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-freeze-rules.ts | tail -1
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/freeze-manifest.ts scripts/verify-freeze.ts scripts/verify-freeze-rules.ts; echo "tsc exit=$?"
"$NODE" node_modules/eslint/bin/eslint.js scripts/verify-freeze-rules.ts; echo "eslint exit=$?"
```

Expected: `24`, `verify-freeze-rules: all checks passed.`, `tsc exit=0`, `eslint exit=0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git add docs/general-election/corrections/README.md scripts/verify-freeze-rules.ts
git commit -F - <<'EOF'
Corrections README: what the freeze covers and how a correction gets in

The file 0050's refusal message points to. It holds spec §3.6.1's
definitions (what is frozen, what is not, what is and is not a correction)
and §3.6.5's steps: record, hold (BC16 for a race, listed for a measure),
fix under SET LOCAL kyv.freeze_correction (BC17 archive capture first, BC18
re-approve), re-publish; plus the Sun 10-18 guard probe and the source
checks. verify-freeze-rules now fails if the message points anywhere else
or the file is missing.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: The unfinished-brief card line

**Files:**
- Modify: `scripts/verify-listing.ts` (header lines 18-20, imports lines 24-37, 3b lines 151-159 and 171, new 3c before line 187)
- Modify: `src/lib/listing-copy.ts:192-203`
- Modify: `src/components/features/RaceListing.tsx:18-23, 36-46, 112, 139-143`
- Modify: `src/components/features/CandidateListing.tsx:48-53`

**Interfaces:**
- Consumes: nothing from Tasks 1-4.
- Produces (from `src/lib/listing-copy.ts`):
  - `export const UNFINISHED_BRIEF_LINE: string` (verbatim BC15 text)
  - `export const UNFINISHED_BRIEF_RACES: ReadonlySet<string>` (empty; race ids like `"FL-CFO-general"`)
  - `export function listingCardLine(status: "listed" | "published", raceId: string, unfinished: ReadonlySet<string> = UNFINISHED_BRIEF_RACES): string`
  - `ListedCandidateCard` gains a required prop `raceId: string`.

- [ ] **Step 1: Write the failing tests**

In `scripts/verify-listing.ts`:

(a) Replace the header item 5 block

```ts
   5. The listing path feeds the predicates with no write-in (the belt
      without the brace, see src/lib/listing.ts): a carried UNO / primary
      code alone decides it, and a `qualified` survivor never does.
```

with

```ts
   5. The listing path feeds the predicates with no write-in (the belt
      without the brace, see src/lib/listing.ts): a carried UNO / primary
      code alone decides it, and a `qualified` survivor never does.
   6. The card line is chosen by the race, never by the candidate: a listed
      race in UNFINISHED_BRIEF_RACES gets UNFINISHED_BRIEF_LINE on every
      card, every other listed race keeps NO_BRIEF_CARD_LINE (unchanged,
      founder decision BC6), and the unfinished line names no candidate
      and promises nothing (ballot-content-completion §3.3, BC15).
```

(b) Replace the import block (lines 24-37)

```ts
import {
  BRIEF_IN_REVIEW_LINE,
  COUNTY_NOTE,
  LISTED_IS_FINAL,
  LISTED_RACE_LABEL,
  LISTING_INTRO_NOT_PRINTED,
  LISTING_INTRO_PRINTED,
  NO_BRIEF_CARD_LINE,
  WRITE_IN_NOTE,
  listingCardLine,
  listingCopy,
  raceStatusLine,
  statusBranch,
} from "../src/lib/listing-copy.ts";
```

with

```ts
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  BRIEF_IN_REVIEW_LINE,
  COUNTY_NOTE,
  LISTED_IS_FINAL,
  LISTED_RACE_LABEL,
  LISTING_INTRO_NOT_PRINTED,
  LISTING_INTRO_PRINTED,
  NO_BRIEF_CARD_LINE,
  UNFINISHED_BRIEF_LINE,
  UNFINISHED_BRIEF_RACES,
  WRITE_IN_NOTE,
  listingCardLine,
  listingCopy,
  raceStatusLine,
  statusBranch,
} from "../src/lib/listing-copy.ts";
```

(c) Replace the two 3b checks (lines 151-159)

```ts
check(
  "card line: a published race's roster always says in review",
  listingCardLine("published") === BRIEF_IN_REVIEW_LINE
);
check(
  "card line: a listed race follows LISTED_IS_FINAL",
  listingCardLine("listed") ===
    (LISTED_IS_FINAL ? NO_BRIEF_CARD_LINE : BRIEF_IN_REVIEW_LINE)
);
```

with

```ts
/* An empty set as the third argument keeps these about the switch alone,
   whatever the freeze-copy PR puts in UNFINISHED_BRIEF_RACES. */
const NONE_UNFINISHED: ReadonlySet<string> = new Set<string>();
check(
  "card line: a published race's roster always says in review",
  listingCardLine("published", "FL-TEST-general", NONE_UNFINISHED) ===
    BRIEF_IN_REVIEW_LINE
);
check(
  "card line: a listed race follows LISTED_IS_FINAL",
  listingCardLine("listed", "FL-TEST-general", NONE_UNFINISHED) ===
    (LISTED_IS_FINAL ? NO_BRIEF_CARD_LINE : BRIEF_IN_REVIEW_LINE)
);
```

(d) In the "switch on: no listed-race copy promises a review" check, replace

```ts
      listingCardLine("listed"),
```

with

```ts
      listingCardLine("listed", "FL-TEST-general", NONE_UNFINISHED),
```

(e) Replace the line `/* 4. Captions only where the contest is printed. */` with:

```ts
/* 3c. BC15: the unfinished-brief line. */
check(
  "no-brief line unchanged (founder decision BC6)",
  NO_BRIEF_CARD_LINE ===
    "No brief for this race. We write a brief only when a candidate's own campaign website states a position we can quote on an issue we cover, and we have not found one here. That is about our sources, not a judgment of the candidates."
);
check(
  "unfinished line: says \"No brief for this race.\" first, as the caption \"Names on the ballot · no brief\" does",
  UNFINISHED_BRIEF_LINE.startsWith("No brief for this race.")
);
check(
  "unfinished line: says what happened and when, and ends on the same disclaimer",
  UNFINISHED_BRIEF_LINE.includes("before October 18") &&
    UNFINISHED_BRIEF_LINE.endsWith("not a judgment of the candidates.")
);
check(
  "unfinished line: names no candidate (every capitalized word is ordinary)",
  (UNFINISHED_BRIEF_LINE.match(/\b[A-Z][A-Za-z]*\b/g) ?? []).every((w) =>
    ["No", "We", "October", "That"].includes(w)
  ),
  JSON.stringify(UNFINISHED_BRIEF_LINE.match(/\b[A-Z][A-Za-z]*\b/g))
);
check(
  "unfinished line: never says published or in review, promises nothing",
  !/\bpublished\b|in review|\bonce\b|\bsoon\b|\byet\b/i.test(
    UNFINISHED_BRIEF_LINE
  )
);
check(
  "UNFINISHED_BRIEF_RACES holds only general-race ids",
  [...UNFINISHED_BRIEF_RACES].every((id) => /^FL-[A-Z0-9-]+-general$/.test(id)),
  JSON.stringify([...UNFINISHED_BRIEF_RACES])
);

/* Two listed races and one published race, two cards each. The line is a
   function of the race alone, so every card in a race must carry the same
   sentence: the unfinished line in the race in the set, the no-brief line
   (or, with the switch off, the in-review line) in the other listed race,
   and the in-review line on the published race even though it is in the
   set too. */
const UNFINISHED_FIXTURE: ReadonlySet<string> = new Set([
  "FL-AAA-general",
  "FL-CCC-general",
]);
const ROSTER: Array<{
  raceId: string;
  status: "listed" | "published";
  cards: string[];
  want: string;
}> = [
  {
    raceId: "FL-AAA-general",
    status: "listed",
    cards: ["cand-a1", "cand-a2"],
    want: UNFINISHED_BRIEF_LINE,
  },
  {
    raceId: "FL-BBB-general",
    status: "listed",
    cards: ["cand-b1", "cand-b2"],
    want: LISTED_IS_FINAL ? NO_BRIEF_CARD_LINE : BRIEF_IN_REVIEW_LINE,
  },
  {
    raceId: "FL-CCC-general",
    status: "published",
    cards: ["cand-c1", "cand-c2"],
    want: BRIEF_IN_REVIEW_LINE,
  },
];
for (const race of ROSTER) {
  const lines = race.cards.map(() =>
    listingCardLine(race.status, race.raceId, UNFINISHED_FIXTURE)
  );
  check(
    `card line: every card in ${race.raceId} (${race.status}) carries the same, right sentence`,
    lines.every((l) => l === race.want),
    JSON.stringify(lines)
  );
}
check(
  "card line: by default, a listed race outside UNFINISHED_BRIEF_RACES keeps the switch's line",
  listingCardLine("listed", "FL-NOT-IN-THE-SET-general") ===
    (LISTED_IS_FINAL ? NO_BRIEF_CARD_LINE : BRIEF_IN_REVIEW_LINE)
);
check(
  "card line: by default, every race in UNFINISHED_BRIEF_RACES gets the unfinished line",
  [...UNFINISHED_BRIEF_RACES].every(
    (id) => listingCardLine("listed", id) === UNFINISHED_BRIEF_LINE
  )
);

/* Both rosters hand the card the race's id, never anything about the
   candidate, so the line cannot differ between two cards in one race. */
const ROOT = resolve(import.meta.dirname, "..");
const raceListingSrc = readFileSync(
  join(ROOT, "src/components/features/RaceListing.tsx"),
  "utf8"
);
const candidateListingSrc = readFileSync(
  join(ROOT, "src/components/features/CandidateListing.tsx"),
  "utf8"
);
check(
  "RaceListing.tsx: the card line is listingCardLine(status, raceId)",
  /\{listingCardLine\(status, raceId\)\}/.test(raceListingSrc)
);
check(
  "RaceListing.tsx: the roster passes the race's id to every card",
  /raceId=\{listing\.race\.race_id\}/.test(raceListingSrc)
);
check(
  "CandidateListing.tsx: the candidate page passes the race's id",
  /raceId=\{listing\.raceId\}/.test(candidateListingSrc)
);

/* 4. Captions only where the contest is printed. */
```

- [ ] **Step 2: Run it to see it fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
out="$("$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-listing.ts 2>&1)"; echo "exit=$?"
printf '%s\n' "$out" | grep -m1 SyntaxError
```

Expected: `exit=1` and `SyntaxError: The requested module '../src/lib/listing-copy.ts' does not provide an export named 'UNFINISHED_BRIEF_LINE'`.

- [ ] **Step 3: Change `listing-copy.ts`**

In `src/lib/listing-copy.ts`, replace lines 192-203

```ts
/* The line every candidate card on a roster carries, identical for everyone
   in the race. `status` is RaceListing["status"]: a published race is on
   the roster only while its brief is unreadable, so it keeps the "in
   review" line whatever LISTED_IS_FINAL says. RaceListing.tsx and
   CandidateListing.tsx pass listing.status here, src/lib/races.ts takes
   LISTED_RACE_LABEL below, and scripts/verify-listing.ts pins the switch
   (listed-races-2026-10-04.md §2). */
export function listingCardLine(status: "listed" | "published"): string {
  return LISTED_IS_FINAL && status === "listed"
    ? NO_BRIEF_CARD_LINE
    : BRIEF_IN_REVIEW_LINE;
}
```

with

```ts
/* The card line for a listed race whose brief was found but not finished
   before the freeze (ballot-content-completion §3.3 case 2, founder
   decision BC15, recommended pending founder confirmation): a candidate's
   own site gave us a position we can quote, but the race's brief did not
   pass its audit or finish its apply by Sat 2026-10-17 18:00. There,
   NO_BRIEF_CARD_LINE's "we have not found one here" would be false. Like
   that line it names no candidate, is the same on every card in the race,
   and promises no brief later: nothing changes until the freeze ends. */
export const UNFINISHED_BRIEF_LINE =
  "No brief for this race. We found a position we can quote on a candidate's own campaign website, but we did not finish this race's brief before October 18, when we stopped changing briefs for this election. That is about our process, not a judgment of the candidates.";

/* The race_ids (for example "FL-CFO-general") whose cards carry
   UNFINISHED_BRIEF_LINE. Empty until the freeze-copy PR fills it from
   docs/general-election/brief-runs/refresh-2026-10.md; in the expected case
   it stays empty. A frozen file from 2026-10-18 (§3.6.3). */
export const UNFINISHED_BRIEF_RACES: ReadonlySet<string> = new Set<string>([]);

/* The line every candidate card on a roster carries, identical for everyone
   in the race. `status` is RaceListing["status"]: a published race is on
   the roster only while its brief is unreadable (a Path B1 rebuild, or a
   correction hold, BC16), so it keeps the "in review" line whatever
   LISTED_IS_FINAL says. A listed race in UNFINISHED_BRIEF_RACES gets
   UNFINISHED_BRIEF_LINE; every other listed race follows LISTED_IS_FINAL.
   RaceListing.tsx and CandidateListing.tsx pass listing.status and the
   race's id here, src/lib/races.ts takes LISTED_RACE_LABEL below, and
   scripts/verify-listing.ts pins every branch (listed-races-2026-10-04.md
   §2). `unfinished` is there for that script; callers leave it out. */
export function listingCardLine(
  status: "listed" | "published",
  raceId: string,
  unfinished: ReadonlySet<string> = UNFINISHED_BRIEF_RACES
): string {
  if (status === "published") return BRIEF_IN_REVIEW_LINE;
  if (unfinished.has(raceId)) return UNFINISHED_BRIEF_LINE;
  return LISTED_IS_FINAL ? NO_BRIEF_CARD_LINE : BRIEF_IN_REVIEW_LINE;
}
```

- [ ] **Step 4: Run it: copy checks pass, wiring checks fail**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-listing.ts 2>&1 | grep '^FAIL'
```

Expected exactly three FAILs:

```
FAIL  RaceListing.tsx: the card line is listingCardLine(status, raceId)
FAIL  RaceListing.tsx: the roster passes the race's id to every card
FAIL  CandidateListing.tsx: the candidate page passes the race's id
```

- [ ] **Step 5: Pass the race id through both rosters**

In `src/components/features/RaceListing.tsx`:

(a) Replace (lines 18-23)

```tsx
   The structure is identical for every candidate, including the one muted
   line under the name (listingCardLine: "No brief for this race" or "Brief
   in review", by the race's status and founder decision 4) — which is the
   same sentence on every card so it can never read as a remark about one
   person. It exists so an empty card is not mistaken for "this candidate
   has no positions".
```

with

```tsx
   The structure is identical for every candidate, including the one muted
   line under the name (listingCardLine: "No brief for this race" or "Brief
   in review", by the race's status and founder decision 4, or the
   unfinished-brief line for a race in UNFINISHED_BRIEF_RACES, BC15) —
   which is the same sentence on every card, chosen by the race and never
   by the candidate, so it can never read as a remark about one person. It
   exists so an empty card is not mistaken for "this candidate has no
   positions".
```

(b) Replace the `ListedCandidateCard` signature (lines 36-46)

```tsx
export function ListedCandidateCard({
  data,
  status,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
}) {
```

with

```tsx
export function ListedCandidateCard({
  data,
  status,
  raceId,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  raceId: string;
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
}) {
```

(c) Replace `        {listingCardLine(status)}` (line 112) with `        {listingCardLine(status, raceId)}`.

(d) Replace (lines 139-143)

```tsx
        <ListedCandidateCard
          key={c.candidate.candidate_id}
          data={c}
          status={listing.status}
        />
```

with

```tsx
        <ListedCandidateCard
          key={c.candidate.candidate_id}
          data={c}
          status={listing.status}
          raceId={listing.race.race_id}
        />
```

In `src/components/features/CandidateListing.tsx`, replace (lines 48-53)

```tsx
      <ListedCandidateCard
        data={{ candidate: listing.candidate, socials: listing.socials }}
        status={listing.status}
        headingLevel="h1"
        linkToDetail={false}
      />
```

with

```tsx
      <ListedCandidateCard
        data={{ candidate: listing.candidate, socials: listing.socials }}
        status={listing.status}
        raceId={listing.raceId}
        headingLevel="h1"
        linkToDetail={false}
      />
```

- [ ] **Step 6: Run it to see it pass, and the incumbent-chip check still pass**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-listing.ts | grep -c '^  ok'
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-listing.ts | tail -1
"$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-incumbent-chip.ts | tail -1
```

Expected: `54` (40 before), `verify-listing: all checks passed.`, `All incumbent-chip checks passed.`

- [ ] **Step 7: Project type-check and lint**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit=$?"
"$NODE" node_modules/eslint/bin/eslint.js src/lib/listing-copy.ts src/components/features/RaceListing.tsx src/components/features/CandidateListing.tsx scripts/verify-listing.ts; echo "eslint exit=$?"
```

Expected: `tsc exit=0`, `eslint exit=0`.

- [ ] **Step 8: Strict standalone type-check of `verify-listing.ts`**

`verify-listing.ts` imports `src/lib/unopposed.ts`, which uses the `@/` alias, so give tsc a throwaway config with that alias (outside the repo; deleted after):

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
W="$(pwd)"; T="$(mktemp -d)"
cat > "$T/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "strict": true, "noEmit": true, "skipLibCheck": true,
    "target": "es2022", "module": "esnext", "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "types": ["node"], "typeRoots": ["$W/node_modules/@types"],
    "baseUrl": "$W", "paths": { "@/*": ["./src/*"] }
  },
  "files": [
    "$W/scripts/freeze-manifest.ts",
    "$W/scripts/verify-freeze.ts",
    "$W/scripts/verify-freeze-rules.ts",
    "$W/scripts/verify-listing.ts"
  ]
}
EOF
"$NODE" node_modules/typescript/bin/tsc -p "$T/tsconfig.json"; echo "tsc exit=$?"
rm -rf "$T"
```

Expected: `tsc exit=0`.

- [ ] **Step 9: Build**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
PATH="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin:$PATH" "$NODE" node_modules/next/dist/bin/next build 2>&1 | tail -15
git status --short
```

Expected: the build finishes with its route table and no type or lint error. `git status --short` lists only the four files of this task (the build output under `.next/` is gitignored). If `next build` rewrites `next-env.d.ts` or `AGENTS.md`, restore them with `git checkout -- next-env.d.ts AGENTS.md` and do not commit them.

- [ ] **Step 10: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git add src/lib/listing-copy.ts src/components/features/RaceListing.tsx src/components/features/CandidateListing.tsx scripts/verify-listing.ts
git commit -F - <<'EOF'
Listing cards: the unfinished-brief line, chosen by the race

UNFINISHED_BRIEF_LINE is for a listed race whose brief was found but not
finished before October 18, where "we have not found one here" would be
false (spec §3.3 case 2, BC15, recommended pending founder confirmation).
UNFINISHED_BRIEF_RACES ships empty; the freeze-copy PR fills it.
listingCardLine now takes (status, raceId), and RaceListing and
CandidateListing pass the race's id, so every card in a race carries the
same sentence. NO_BRIEF_CARD_LINE and LISTED_IS_FINAL are unchanged (BC6),
now pinned byte for byte by verify-listing.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Full verification and the pull request

**Files:** none changed.

**Interfaces:**
- Consumes: everything above.
- Produces: branch `claude/ballot-freeze-guard` pushed and a PR against `main`.

- [ ] **Step 1: Run every check**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" scripts/verify-all.mjs 2>&1 | grep -E '^  (FAIL|SKIPPED) |^verify-all:'
"$NODE" scripts/verify-migrations.mjs 2>&1 | tail -1
"$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit=$?"
"$NODE" node_modules/eslint/bin/eslint.js src/lib/listing-copy.ts src/components/features/RaceListing.tsx src/components/features/CandidateListing.tsx scripts/verify-listing.ts scripts/freeze-manifest.ts scripts/verify-freeze.ts scripts/verify-freeze-rules.ts scripts/verify-migrations.mjs scripts/verify-ballot-seeds.mjs scripts/verify-demo-seed.mjs scripts/verify-brief-rows-sql.mjs scripts/verify-election-seed.mjs; echo "eslint exit=$?"
```

Expected:

```
verify-all: 73 runs, 4 at a time
  SKIPPED  verify-admin-ops.mjs (…): needs SUPABASE_SERVICE_ROLE_KEY (withheld: write probes are opt-in)
  FAIL     verify-news-neutrality.ts (…): exit 1
  SKIPPED  verify-refresh-schema.mjs (…): needs SUPABASE_SERVICE_ROLE_KEY (withheld: write probes are opt-in) (…)
…
verify-all: 70 passed (1 offline only), 1 failed, 2 skipped (needs env), 73 total
```

that is, two more runs and two more passes than the baseline (`verify-freeze.ts`, `verify-freeze-rules.ts`), the same single FAIL (`verify-news-neutrality.ts`, live data) and the same two skips. Any other FAIL is a regression to fix before going on. Then `All migration + RLS checks passed.`, `tsc exit=0`, `eslint exit=0`.

- [ ] **Step 2: Confirm the scope**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git diff --stat 08384c5..HEAD
test ! -e docs/general-election/freeze-2026-10-18.json && echo "no manifest"
ls supabase/migrations | grep -c '^0050'
git status --short
```

Expected: exactly these 16 paths changed: `docs/general-election/corrections/README.md`, `docs/superpowers/plans/2026-10-08-freeze-guard.md`, `scripts/freeze-manifest.ts`, `scripts/verify-ballot-seeds.mjs`, `scripts/verify-brief-rows-sql.mjs`, `scripts/verify-demo-seed.mjs`, `scripts/verify-election-seed.mjs`, `scripts/verify-freeze-rules.ts`, `scripts/verify-freeze.ts`, `scripts/verify-listing.ts`, `scripts/verify-migrations.mjs`, `src/components/features/CandidateListing.tsx`, `src/components/features/RaceListing.tsx`, `src/lib/listing-copy.ts`, `supabase/migrations/0050_content_freeze.sql`, `supabase/migrations/README.md`; `no manifest`; `1` (no `0050z` scratch file); a clean status.

- [ ] **Step 3: Push this branch (never main) and open the PR**

```bash
cd /Users/jsloth/Projects/kyv-build/guard
git push -u origin claude/ballot-freeze-guard
gh pr create --base main --head claude/ballot-freeze-guard \
  --title "Freeze guard: 0050 content_freeze (inert until 10-18), verify-freeze, unfinished-brief line" \
  --body-file - <<'EOF'
Rollout step 5 of `docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md` (PR #133). Stacked on the ledger PR #134: until #134 merges, this diff also shows its one commit (`08384c5`).

## What it adds

- `supabase/migrations/0050_content_freeze.sql`: `content_freeze` (2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC) and `refuse_during_content_freeze()` (SECURITY DEFINER, empty search_path, EXECUTE revoked by name), statement-level triggers on 11 ballot tables and row-level triggers with the spec's exceptions on 5. **Not applied.** It is inert until the window opens.
- The `SET kyv.freeze_correction = 'pglite replay'` line in the five PGlite scripts, and 50 new 0050 cases in `verify-migrations.mjs` (refusals tested with the bypass off inside a transaction).
- `scripts/verify-freeze.ts` (with `scripts/freeze-manifest.ts` and `scripts/verify-freeze-rules.ts`): passes with its note while no manifest exists; `--write` is for the freeze-copy PR. **No manifest is written here.**
- `docs/general-election/corrections/README.md`: what is frozen, what a correction is, and the steps.
- `UNFINISHED_BRIEF_LINE`, an empty `UNFINISHED_BRIEF_RACES`, and `listingCardLine(status, raceId)` through `RaceListing.tsx` and `CandidateListing.tsx`.

## Decisions this PR encodes (each recommended, pending founder confirmation)

1. BC9: build the database guard as specified. TO FLIP: drop 0050, the five bypass lines and section 20 of `verify-migrations.mjs`.
2. BC10: the code tripwire over the 45 files of §3.6.3; manifest left to the freeze-copy PR. TO FLIP: delete the three `scripts/*freeze*` files.
3. BC15: the unfinished-brief line, set shipped empty. TO FLIP: keep the set empty.
4. BC6 kept: `NO_BRIEF_CARD_LINE` and `LISTED_IS_FINAL = true` unchanged, now pinned by a test.
5. BC16, BC17, BC18: documented in the README; the guard passes `race.key_dates` and `info_last_verified_at` and refuses `office`, `district`, `qualifying_status`.
6. Implementation choices: a no-op UPDATE passes on all five row-level tables; the refusal adds `DETAIL: <OP> on public.<table>`; re-running 0050 keeps an existing window row; `service_role` keeps its default grants on `content_freeze` (flip: one REVOKE); `verify-freeze --write` is refused inside the window; a stale frozen-file list fails inside the window; a missing named correction file fails at any time; the exact window is pinned in `verify-freeze-rules.ts`; ledger row 0050 is "written, not applied".

## Founder steps (not done here)

- Merge after #134. Apply 0050 Thu 10-15 through the MCP `apply_migration` with your yes; read back `SELECT starts_at, ends_at FROM content_freeze`, the triggers in `pg_trigger`, and `prosecdef = true`, `proconfig = {search_path=""}` (spec §5 step 6).
- Sun 10-18: the guard probe in the README.

## Test plan

- [x] `verify-migrations.mjs`: 277 ok (226 before), including the 0050 cases
- [x] With a scratch migration opening the window and making one frozen write, all five PGlite scripts pass with the bypass line and fail with the freeze message without it (scratch file not committed)
- [x] `verify-freeze-rules.ts` 24 ok; `verify-freeze.ts` prints its note and exits 0
- [x] `verify-listing.ts` 54 ok (40 before); `verify-incumbent-chip.ts` passes
- [x] `verify-all`: 70 passed, 1 failed (`verify-news-neutrality`, known live data), 2 skipped (env)
- [x] `tsc --noEmit`, strict standalone tsc on the new scripts, ESLint, `next build`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Never run a bare `git push` here: the branch's upstream is still `origin/claude/migration-ledger-2026-10-09` until `-u` resets it. Do not merge.

---

## Self-review against the spec (done while writing)

- §5 step 5 items, each with a task: 0050 (Task 1); its `verify-migrations.mjs` cases with refusal tested inside a transaction with the bypass off (Task 1); the bypass line in all five scripts (Tasks 1 and 2); `verify-freeze.ts` exiting 0 with its note while no manifest exists, and `--write` (Task 3); `docs/general-election/corrections/README.md` (Task 4); `UNFINISHED_BRIEF_LINE`, empty `UNFINISHED_BRIEF_RACES`, `listingCardLine(status, raceId)`, `RaceListing.tsx`, `CandidateListing.tsx`, `verify-listing.ts` cases (Task 5).
- §6 0050 cases: claim refused and allowed with `SET LOCAL`; `cap_tool_wrapper` passes outside, freeze message (not "permission denied for table content_freeze") inside; `set_race_publication` listed passes, published refused; profile audit refused/allowed; candidate stamp passes, `official_site` refused; race `key_dates` passes, `office` refused, same-value update passes; source insert passes, cited update refused, uncited passes; `TRUNCATE zip_district` refused; window in the past lets everything through; `anon` cannot read the table or execute the function; default-privileges model; `SECURITY DEFINER` with empty `search_path`. All in Task 1 Step 3.
- §6 "bypass in CI" proof: Task 2 Steps 1-6. §6 `verify-freeze.ts` cases: Task 3 (rules and command). §6 copy cases: Task 5.
- Out of scope and absent: manifest, freeze copy, AM1 copy, measure fallback, filling the set, `carryForward`, the reference builder, 0051, any live apply.
