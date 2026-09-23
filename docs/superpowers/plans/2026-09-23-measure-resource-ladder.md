# Measure Resource Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the amendment page's "we write the case for and against" block with a two-sided list of outside resources, ordered by kind of source from most credible to least, both sides given equal room.

**Architecture:** One new app-owned table `measure_resource` (migration 0034) replaces `measure_argument`; the credibility tier is a pure function of the row's `kind` in one TypeScript module (`src/lib/measure-ladder.ts`) that both the read layer and the verify script use. The measure page renders a shared neutral block first, then YES/NO columns grouped by tier. The publication gate keeps its shape (trigger on the publication row and on every resource write) with a relaxed rule: both sides present, larger ≤ 2× smaller.

**Tech Stack:** Next.js 16 (App Router, `unstable_cache`), Supabase Postgres + RLS, PGlite for the migration verifier, Node 22 native type stripping for the `.ts` verify scripts, Tailwind tokens already in the repo.

**Spec:** `docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md`. Read §1 (the ladder) and §9 (founder calls) before starting.

## Global Constraints

- Read `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md). Params and `cookies()` are async in this version.
- Never colour-code a side, a lean, or a party. Opinion is set apart by container, never by colour (README neutrality rule).
- Lean is **not** printed on a resource row (spec §5, founder call F3). It is disclosed on the outlet page via `outletPathFor`.
- No third-party requests on the page: no video embeds, no thumbnails (spec §6).
- Migrations are idempotent: `DROP ... IF EXISTS`, `CREATE TABLE IF NOT EXISTS`, policies dropped by name and recreated.
- Every function touching measure tables pins `SET search_path = ''` and schema-qualifies references (0012).
- Nothing in this plan publishes a measure. All three amendments stay `listed` after every task.
- Commit message trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Toolchain in this worktree: run `npm install` once before the first `npx tsc --noEmit`. `node scripts/verify-migrations.mjs` needs arm64 node (PGlite aborts under Rosetta).

---

## File map

| File | Responsibility | Action |
| --- | --- | --- |
| `src/lib/measure-ladder.ts` | Pure: tier table, tier labels, `rankResources`, `sidesBalanced`. No imports. | create |
| `src/lib/measure-balance.ts` | superseded by measure-ladder | delete |
| `src/types/app.ts` | `MeasureResource` and its enums; drop `MeasureArgument`/`MeasureSide` | modify |
| `scripts/verify-measure-balance.ts` | Drives measure-ladder + measure-status | rewrite |
| `supabase/migrations/0034_measure_resources.sql` | Table, CHECKs, RLS, gate functions, drop of `measure_argument` | create |
| `scripts/verify-migrations.mjs` §16 | PGlite fixtures for 0034 | modify |
| `scripts/verify-ballot-seeds.mjs`, `scripts/demo-teardown.sql` | rename one reference each | modify |
| `src/lib/measures.ts` | Read layer: `MeasureBrief` with `neutral/support/oppose` | modify |
| `src/components/features/MeasureResourceRow.tsx` | One resource row (title link, publisher, author, format, duration, date, note) | create |
| `src/components/features/MeasureResourceLadder.tsx` | Neutral block + two tier-grouped columns | create |
| `src/components/features/MeasureCompare.tsx` | superseded | delete |
| `src/app/(public)/measures/[measureId]/page.tsx` | Render ladder; new copy | modify |
| `src/components/features/BallotQuestions.tsx` | listed-card copy | modify |
| `src/app/(public)/methodology/page.tsx` | New section | modify |
| `README.md`, `supabase/migrations/README.md` | `measure_argument` → `measure_resource`; 0034 row | modify |
| `scripts/verify-measure-resources.ts` | Advisory lint of seed rows | create |
| `supabase/migrations/0035_measure_resources_2026.sql` | Seed skeleton: DoE booklet as tier-1 for each amendment | create |

---

### Task 1: The ladder module and its verify script

**Files:**
- Create: `src/lib/measure-ladder.ts`
- Delete: `src/lib/measure-balance.ts`
- Modify: `src/types/app.ts:139-165`
- Rewrite: `scripts/verify-measure-balance.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MeasureStance = "support" | "oppose" | "neutral";
  export type MeasureKind = "official" | "analysis" | "reporting" | "argument" | "commentary";
  export type MeasureFormat = "document" | "article" | "video" | "audio";
  export interface MeasureResource { resource_id; measure_id; source_id; stance; kind; format; title; author: string|null; published_at: string|null; duration_seconds: number|null; note: string|null; display_order: number }
  export const RESOURCE_TIER: Record<MeasureKind, 1|2|3|4|5>;
  export const TIER_LABEL: Record<MeasureKind, string>;
  export const COLUMN_CAP = 8;
  export function compareResources(a: Rankable, b: Rankable): number;
  export function rankResources<T extends Rankable>(rows: readonly T[]): T[];
  export function sidesBalanced(support: number, oppose: number): boolean;
  ```

- [ ] **Step 1: Replace the measure types in `src/types/app.ts`**

Replace lines 139–165 (from `/* Ballot measures (0010)...` through the closing `}` of `MeasureArgument`) with:

```ts
/* Ballot measures (0010, 0034). App-owned, unlike the pipeline's race tables. */
export type MeasureStance = "support" | "oppose" | "neutral";

/* The credibility ladder, top to bottom. The tier is RESOURCE_TIER[kind] in
   src/lib/measure-ladder.ts and nowhere else. */
export type MeasureKind =
  | "official"
  | "analysis"
  | "reporting"
  | "argument"
  | "commentary";

/* Format is NOT credibility: a think tank's video is `analysis` + `video`. */
export type MeasureFormat = "document" | "article" | "video" | "audio";

export interface BallotMeasure {
  measure_id: string;
  election: string;
  number: string;
  official_title: string;
  ballot_summary: string;
  full_text_url: string;
  placed_by: "legislature" | "citizen_initiative" | "commission" | "local";
  /* Florida requires 60% for a constitutional amendment. Stored per measure
     because local measures differ. */
  threshold_pct: number;
  jurisdiction: string;
  display_order: number;
}

/* One outside resource about a measure (0034). Publisher, URL, type and
   lean come from the joined `source` row, never duplicated here. */
export interface MeasureResource {
  resource_id: string;
  measure_id: string;
  source_id: string;
  stance: MeasureStance;
  kind: MeasureKind;
  format: MeasureFormat;
  title: string;
  author: string | null;
  /* ISO date (YYYY-MM-DD) or null when the resource is undated. */
  published_at: string | null;
  duration_seconds: number | null;
  /* ≤140 chars of attribution, never summary (spec F4). */
  note: string | null;
  display_order: number;
}
```

- [ ] **Step 2: Write the failing verify script**

Overwrite `scripts/verify-measure-balance.ts`:

```ts
/* Verifies the two pure rules behind the measure page (spec
   docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md):

   1. sidesBalanced — the publication re-check in src/lib/measures.ts. The
      database enforces the same rule at write time (0034); this is the
      belt-and-braces re-read that stops a one-sided render if a row ever
      reaches 'published' by a path the trigger did not cover.
   2. rankResources — the credibility ladder. Tier is a function of `kind`
      and nothing else: a commentary video dated today never outranks an
      official document from 2024.

   Both live in src/lib/measure-ladder.ts, which imports nothing, so this runs
   under Node's native type stripping with no build. measureVisibleStatus
   (src/lib/measure-status.ts) is checked at the bottom as before.

   Run: node scripts/verify-measure-balance.ts */

import {
  RESOURCE_TIER,
  rankResources,
  sidesBalanced,
} from "../src/lib/measure-ladder.ts";
import { measureVisibleStatus } from "../src/lib/measure-status.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- sidesBalanced: both present, larger <= 2x smaller ---------------- */
check("1 vs 1 is balanced", sidesBalanced(1, 1));
check("2 vs 4 is balanced", sidesBalanced(2, 4));
check("4 vs 2 is balanced", sidesBalanced(4, 2));
check("8 vs 4 is balanced", sidesBalanced(8, 4));
check("3 vs 6 is balanced (boundary)", sidesBalanced(3, 6));
check("3 vs 7 is NOT balanced (just past)", !sidesBalanced(3, 7));
check("7 vs 3 is NOT balanced (just past)", !sidesBalanced(7, 3));
check("1 vs 3 is NOT balanced", !sidesBalanced(1, 3));
check("5 vs 2 is NOT balanced", !sidesBalanced(5, 2));

/* A missing side is the failure this exists to prevent: an amendment has no
   campaign obliged to supply one. */
check("1 vs 0 is NOT balanced", !sidesBalanced(1, 0));
check("0 vs 1 is NOT balanced", !sidesBalanced(0, 1));
check("0 vs 0 is NOT balanced", !sidesBalanced(0, 0));
check("5 vs 0 is NOT balanced", !sidesBalanced(5, 0));

/* ---- the ladder --------------------------------------------------------- */
check("official is tier 1", RESOURCE_TIER.official === 1);
check("analysis is tier 2", RESOURCE_TIER.analysis === 2);
check("reporting is tier 3", RESOURCE_TIER.reporting === 3);
check("argument is tier 4", RESOURCE_TIER.argument === 4);
check("commentary is tier 5", RESOURCE_TIER.commentary === 5);

type Row = {
  id: string;
  kind: keyof typeof RESOURCE_TIER;
  published_at: string | null;
  display_order: number;
};
const r = (
  id: string,
  kind: Row["kind"],
  published_at: string | null,
  display_order = 0
): Row => ({ id, kind, published_at, display_order });

const ids = (rows: Row[]) => rankResources(rows).map((x) => x.id).join(",");

check(
  "tier before date: a 2024 official outranks a commentary dated today",
  ids([r("c", "commentary", "2026-09-23"), r("o", "official", "2024-01-01")]) ===
    "o,c"
);
check(
  "within a tier, newest first",
  ids([r("a", "argument", "2026-01-01"), r("b", "argument", "2026-06-01")]) ===
    "b,a"
);
check(
  "within a tier, undated rows come last",
  ids([r("u", "analysis", null), r("d", "analysis", "2025-03-01")]) === "d,u"
);
check(
  "display_order breaks ties only",
  ids([
    r("y", "argument", "2026-02-02", 2),
    r("x", "argument", "2026-02-02", 1),
  ]) === "x,y"
);
check(
  "display_order cannot lift a row above its tier",
  ids([r("c", "commentary", "2026-09-01", 0), r("a", "analysis", null, 99)]) ===
    "a,c"
);
check(
  "full ladder order holds",
  ids([
    r("5", "commentary", "2026-09-01"),
    r("3", "reporting", "2026-09-01"),
    r("1", "official", "2026-09-01"),
    r("4", "argument", "2026-09-01"),
    r("2", "analysis", "2026-09-01"),
  ]) === "1,2,3,4,5"
);
check("rankResources does not mutate its input", (() => {
  const input = [r("b", "argument", "2026-01-01"), r("a", "official", null)];
  const before = input.map((x) => x.id).join(",");
  rankResources(input);
  return input.map((x) => x.id).join(",") === before;
})());

/* ---- measureVisibleStatus (0033), unchanged ---------------------------- */
check("object embed, listed", measureVisibleStatus({ status: "listed" }) === "listed");
check("object embed, published", measureVisibleStatus({ status: "published" }) === "published");
check("array embed, listed", measureVisibleStatus([{ status: "listed" }]) === "listed");
check("array embed, published", measureVisibleStatus([{ status: "published" }]) === "published");
check("null embed is hidden", measureVisibleStatus(null) === null);
check("undefined embed is hidden", measureVisibleStatus(undefined) === null);
check("empty array embed is hidden", measureVisibleStatus([]) === null);
check("draft is hidden", measureVisibleStatus({ status: "draft" }) === null);
check("in_review is hidden", measureVisibleStatus({ status: "in_review" }) === null);
check("an unknown future status is hidden", measureVisibleStatus({ status: "archived" }) === null);
check("case matters", measureVisibleStatus({ status: "Published" }) === null);
check("a missing status field is hidden", measureVisibleStatus({}) === null);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nMeasure ladder, symmetry and visibility checks passed.");
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node scripts/verify-measure-balance.ts`
Expected: `Error: Cannot find module '.../src/lib/measure-ladder.ts'`

- [ ] **Step 4: Create `src/lib/measure-ladder.ts`**

```ts
/* The measure page's two pure rules, in one dependency-free module so
   scripts/verify-measure-balance.ts can run them under Node's native type
   stripping (importing from measures.ts would drag in next/cache).

   Spec: docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md

   1. THE LADDER. A resource's credibility tier is a function of what KIND of
      thing it is — never a per-item judgment, never its format, never the
      outlet's lean. This table is the only place the ladder is written down;
      the database CHECK (0034) fixes the five values, and this fixes their
      order.
   2. THE SYMMETRY RULE. Mirrors measure_sides_balanced() in 0034. The two
      must agree: the database refuses to publish a measure that fails it,
      and the read layer refuses to render one. */

import type { MeasureKind } from "@/types/app";

export const RESOURCE_TIER: Record<MeasureKind, 1 | 2 | 3 | 4 | 5> = {
  official: 1, // government primary documents about this measure
  analysis: 2, // research with a method: studies, institutes, fiscal analyses
  reporting: 3, // a newsroom's explainer or coverage
  argument: 4, // a named person or group making the case
  commentary: 5, // unaffiliated takes: a YouTuber, a podcaster, a blog
};

/* The small headings inside a YES/NO column. `official` and `reporting`
   never appear in a column (they are neutral by CHECK), but the record is
   total so a future column cannot render an unlabelled group. */
export const TIER_LABEL: Record<MeasureKind, string> = {
  official: "Official documents",
  analysis: "Research",
  reporting: "Reporting",
  argument: "Positions",
  commentary: "Commentary",
};

/* Rows visible per column before the native <details> disclosure (spec §4,
   founder call F6). Equal room is the point: the same number for both sides. */
export const COLUMN_CAP = 8;

export interface Rankable {
  kind: MeasureKind;
  published_at: string | null;
  display_order: number;
}

/* Tier ascending, then newest first, undated last, then display_order.
   display_order is the editor's tie-break inside a tier — it cannot lift a
   row above its tier. */
export function compareResources(a: Rankable, b: Rankable): number {
  const tier = RESOURCE_TIER[a.kind] - RESOURCE_TIER[b.kind];
  if (tier !== 0) return tier;
  if (a.published_at !== b.published_at) {
    if (a.published_at === null) return 1;
    if (b.published_at === null) return -1;
    return a.published_at < b.published_at ? 1 : -1;
  }
  return a.display_order - b.display_order;
}

/* Returns a new array in ladder order. */
export function rankResources<T extends Rankable>(rows: readonly T[]): T[] {
  return [...rows].sort(compareResources);
}

/* Both sides present, and the larger no more than twice the smaller. Neutral
   resources are not a side and are not counted (spec §4, founder call F2). */
export function sidesBalanced(supportCount: number, opposeCount: number): boolean {
  if (supportCount <= 0 || opposeCount <= 0) return false;
  return Math.max(supportCount, opposeCount) <= 2 * Math.min(supportCount, opposeCount);
}
```

- [ ] **Step 5: Delete the superseded module**

Run: `git rm -q src/lib/measure-balance.ts`

- [ ] **Step 6: Run the verify script to verify it passes**

Run: `node scripts/verify-measure-balance.ts`
Expected: every line `ok`, ending `Measure ladder, symmetry and visibility checks passed.`

`measures.ts` still imports `sidesBalanced` from `./measure-balance` and `MeasureArgument` from types; that breaks `tsc` until Task 4. Do not run `tsc` yet.

- [ ] **Step 7: Commit**

```bash
git add src/lib/measure-ladder.ts src/types/app.ts scripts/verify-measure-balance.ts
git commit -m "feat(measures): the resource ladder — tier by kind, 2x symmetry rule

Pure module + verify script. measures.ts is updated in a later commit.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Migration 0034 — `measure_resource` replaces `measure_argument`

**Files:**
- Create: `supabase/migrations/0034_measure_resources.sql`
- Modify: `scripts/verify-migrations.mjs:1347-1504` (section 16)
- Modify: `scripts/verify-ballot-seeds.mjs:366`
- Modify: `scripts/demo-teardown.sql:34-37`

**Interfaces:**
- Produces: table `measure_resource` (columns per spec §2), function `public.measure_sides_balanced(m_id TEXT)` over it, triggers `trg_measure_balance` (kept) and `trg_measure_resource_balance` (new), policy `anon_read_measure_resource`.

- [ ] **Step 1: Write the failing verifier fixtures first**

In `scripts/verify-migrations.mjs`, replace the whole of section 16 — from the comment block starting `/* ---- ... 16. 0010/0011 ballot measures` through the `expectConstraintViolation("side must be support or oppose", ...)` call that ends just before `/* 17. block_district` — with:

```js
/* ---------------------------------------------------------------- *
 * 16. 0010/0011/0034 ballot measures.
 *
 * Same posture as races: anon sees a measure only through a published
 * measure_publication row, and can write nothing. Plus the symmetry rule,
 * which is the part specific to measures — an amendment has no campaign
 * obliged to balance it, so the database refuses to publish a lopsided one
 * rather than trusting a reviewer to notice. Since 0034 the unit is an
 * outside RESOURCE (a link), not an argument we wrote, and the rule is
 * "both sides present, larger <= 2x smaller".
 * ---------------------------------------------------------------- */

await check("0034 dropped measure_argument", async () => {
  const res = await db.query("SELECT to_regclass('public.measure_argument') AS t;");
  if (res.rows[0].t !== null) throw new Error("measure_argument still exists");
});

await db.exec(`
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
    ('s-gov', 'https://example.gov/m',   'example.gov/m',   'Example Gov',   'primary_doc',       'N/A'),
    ('s-n1',  'https://example.news/1',  'example.news/1',  'Example News',  'factual_reporting', 'unrated'),
    ('s-o1',  'https://example.org/1',   'example.org/1',   'Example Org',   'opinion',           'unrated'),
    ('s-o2',  'https://example.org/2',   'example.org/2',   'Example Org',   'opinion',           'unrated'),
    ('s-o3',  'https://example.org/3',   'example.org/3',   'Example Org',   'opinion',           'unrated'),
    ('s-o4',  'https://example.org/4',   'example.org/4',   'Example Org',   'opinion',           'unrated'),
    ('s-o5',  'https://example.org/5',   'example.org/5',   'Example Org',   'opinion',           'unrated'),
    ('s-o6',  'https://example.org/6',   'example.org/6',   'Example Org',   'opinion',           'unrated'),
    ('s-yt',  'https://video.example/1', 'video.example/1', 'Some Channel',  'opinion',           'unrated');

  INSERT INTO ballot_measure
    (measure_id, election, number, official_title, ballot_summary, full_text_url,
     placed_by, threshold_pct, jurisdiction, display_order) VALUES
    ('m-pub',   'general_2026', '1', 'Published Measure', 'Summary.', 'https://example.gov/1', 'legislature', 60, 'FL', 1),
    ('m-draft', 'general_2026', '2', 'Draft Measure',     'Summary.', 'https://example.gov/2', 'legislature', 60, 'FL', 2),
    ('m-skew',  'general_2026', '3', 'Lopsided Measure',  'Summary.', 'https://example.gov/3', 'legislature', 60, 'FL', 3);

  INSERT INTO measure_resource
    (resource_id, measure_id, source_id, stance, kind, format, title, published_at) VALUES
    ('r1', 'm-pub',   's-gov', 'neutral', 'official',  'document', 'Staff analysis', '2026-01-01'),
    ('r2', 'm-pub',   's-o1',  'support', 'argument',  'article',  'For.',           '2026-02-01'),
    ('r3', 'm-pub',   's-o2',  'oppose',  'argument',  'article',  'Against.',       '2026-02-01'),
    ('r4', 'm-draft', 's-o3',  'support', 'argument',  'article',  'For.',           NULL),
    ('r5', 'm-draft', 's-o4',  'oppose',  'argument',  'article',  'Against.',       NULL),
    -- m-skew: three for, none against.
    ('r6', 'm-skew',  's-o5',  'support', 'argument',  'article',  'For A.',         NULL),
    ('r7', 'm-skew',  's-o6',  'support', 'argument',  'article',  'For B.',         NULL),
    ('r8', 'm-skew',  's-yt',  'support', 'commentary','video',    'For C.',         NULL);

  INSERT INTO measure_publication (measure_id, status) VALUES
    ('m-pub', 'published'),
    ('m-draft', 'draft');
`);

/* 0033: a listed measure is its ballot text alone. Inserted as service_role
   with ZERO resources -- the balance trigger checks only status =
   'published', so this must be accepted. A resource added afterwards stays
   editable (the resource-side trigger guards published measures only) and
   must stay invisible to anon. */
await check("a listed measure with zero resources is accepted", async () => {
  await db.exec("SET ROLE service_role;");
  try {
    await db.exec(`
      INSERT INTO ballot_measure
        (measure_id, election, number, official_title, ballot_summary, full_text_url,
         placed_by, threshold_pct, jurisdiction, display_order) VALUES
        ('m-listed', 'general_2026', '4', 'Listed Measure', 'Summary.', 'https://example.gov/4', 'legislature', 60, 'FL', 4);
      INSERT INTO measure_publication (measure_id, status) VALUES ('m-listed', 'listed');
      INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
        VALUES ('r-l1', 'm-listed', 's-o1', 'support', 'argument', 'article', 'For, unpublished.');`);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

await check("anon sees published and listed measures, never draft", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT measure_id FROM ballot_measure ORDER BY measure_id;");
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.measure_id).join(",");
  if (ids !== "m-listed,m-pub") throw new Error(`expected m-listed,m-pub, got [${ids}]`);
});

await check("anon sees listed and published measure_publication rows with their status", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT measure_id, status FROM measure_publication ORDER BY measure_id;");
  await db.exec("RESET ROLE;");
  const got = res.rows.map((r) => `${r.measure_id}:${r.status}`).join(",");
  if (got !== "m-listed:listed,m-pub:published") throw new Error(`saw [${got}]`);
});

/* r-l1 belongs to the listed m-listed: listing exposes the ballot text, never
   the resources (anon_read_measure_resource reads 'published' only). */
await check("anon sees resources only for published measures (not listed, not draft)", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT resource_id FROM measure_resource ORDER BY resource_id;");
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.resource_id).join(",");
  if (ids !== "r1,r2,r3") throw new Error(`expected r1,r2,r3 only, got [${ids}]`);
});

await db.exec("SET ROLE anon;");
await expectDenied(
  "anon cannot INSERT a ballot_measure",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-x','general_2026','9','X','S','https://e.gov/x','legislature',60);`
);
await expectDenied(
  "anon cannot INSERT a measure_resource",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-x','m-pub','s-o1','support','argument','article','X');`
);
await expectDenied(
  "anon cannot publish a measure",
  "UPDATE measure_publication SET status='published';"
);
await db.exec("RESET ROLE;");

/* The symmetry rule, as service_role: the trigger must hold for the role
   that actually writes. */
await db.exec("SET ROLE service_role;");
await expectConstraintViolation(
  "a measure with no opposing resource cannot be published",
  "INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','published');",
  /both sides must be present and the larger at most twice the smaller/
);
await db.exec("INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','draft');");
await expectConstraintViolation(
  "a skewed measure cannot be published by UPDATE either",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  /both sides must be present and the larger at most twice the smaller/
);
/* m-skew is unpublished, so this insert is free (the resource-side trigger
   guards published measures only). It makes m-skew 3 vs 1. */
await db.exec(
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r9','m-skew','s-gov','oppose','analysis','document','Against A.');`
);
await expectConstraintViolation(
  "3 vs 1 is still lopsided under the 2x rule",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  /both sides must be present and the larger at most twice the smaller/
);
await check("3 vs 2 publishes (within 2x)", async () => {
  await db.exec(
    `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
     VALUES ('r10','m-skew','s-n1','oppose','argument','article','Against B.');`
  );
  await db.exec("UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';");
  const res = await db.query("SELECT status FROM measure_publication WHERE measure_id='m-skew';");
  if (res.rows[0].status !== "published") throw new Error("expected m-skew to publish at 3 vs 2");
});

/* The hole the publication-side trigger alone leaves: a measure published
   while balanced, then skewed by removing the other side. */
await expectConstraintViolation(
  "a published measure cannot be skewed by deleting a resource",
  "DELETE FROM measure_resource WHERE resource_id='r3';",
  /is published: both sides must be present/
);
await expectConstraintViolation(
  "a published measure cannot be skewed by flipping a resource's stance",
  "UPDATE measure_resource SET stance='support' WHERE resource_id='r3';",
  /is published: both sides must be present/
);
await check("neutral resources do not count toward either side", async () => {
  /* m-pub is 1 vs 1 with one neutral; adding two more neutrals must not
     trip the 2x rule, and removing one must not either. */
  await db.exec(
    `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
     VALUES ('r11','m-pub','s-n1','neutral','reporting','article','Explainer'),
            ('r12','m-pub','s-o3','neutral','analysis','document','Study');
     DELETE FROM measure_resource WHERE resource_id='r12';`
  );
});
await check("an unpublished measure's resources can still be edited freely", async () => {
  await db.exec("DELETE FROM measure_resource WHERE resource_id='r5';");
});

/* The cross-column CHECKs. */
await expectConstraintViolation(
  "an official document cannot take a side",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad1','m-draft','s-gov','support','official','document','X');`,
  /measure_resource_neutral_kinds/
);
await expectConstraintViolation(
  "reporting cannot take a side",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad2','m-draft','s-n1','oppose','reporting','article','X');`,
  /measure_resource_neutral_kinds/
);
await expectConstraintViolation(
  "an argument cannot be neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad3','m-draft','s-o1','neutral','argument','article','X');`,
  /measure_resource_sided_kinds/
);
await expectConstraintViolation(
  "commentary cannot be neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad4','m-draft','s-yt','neutral','commentary','video','X');`,
  /measure_resource_sided_kinds/
);
await expectConstraintViolation(
  "duration belongs to video and audio only",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title, duration_seconds)
   VALUES ('r-bad5','m-draft','s-o1','support','argument','article','X', 600);`,
  /measure_resource_duration_format/
);
await expectConstraintViolation(
  "a note is attribution, at most 140 characters",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title, note)
   VALUES ('r-bad6','m-draft','s-o1','support','argument','article','X', repeat('x', 141));`,
  /measure_resource_note_length/
);
await expectConstraintViolation(
  "one URL is one resource per measure",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-dup','m-pub','s-o1','support','argument','article','Again');`,
  /measure_resource_measure_id_source_id_key/
);
await expectConstraintViolation(
  "threshold_pct must be a real percentage",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-bad','general_2026','9','X','S','https://e.gov/x','legislature',0);`,
  /threshold_pct/
);
await expectConstraintViolation(
  "stance must be support, oppose or neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad7','m-pub','s-o1','maybe','argument','article','X');`,
  /stance/
);
```

Then update the two one-line references:

`scripts/verify-ballot-seeds.mjs` line 366: `+ (SELECT count(*) FROM measure_argument))::int n` → `+ (SELECT count(*) FROM measure_resource))::int n`, and the check name on line 362 `(profile/issue/position/claim/argument)` → `(profile/issue/position/claim/resource)`.

`scripts/demo-teardown.sql` lines 34–37: replace `measure_argument` with `measure_resource` in both the comment and the `DELETE`.

- [ ] **Step 2: Run the verifier to confirm it fails on the new fixtures**

Run: `node scripts/verify-migrations.mjs`
Expected: `FAIL  0034 dropped measure_argument` (the table still exists because 0034 does not).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0034_measure_resources.sql`:

```sql
-- 0034_measure_resources.sql
-- A ballot question points at what OTHER people say about it, ordered by the
-- kind of source. This replaces the case-for/case-against that we would have
-- written ourselves.
--
-- Spec: docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md
-- (founder direction 2026-09-23). Read §1 for the ladder and §9 for the
-- calls this file proceeds on.
--
-- WHAT CHANGES: measure_argument (0010) held sentences we composed, one
-- source each, both sides within one. Zero rows ever existed live (read
-- 2026-09-23, docs/general-election/listed-tier-2026-09-23.md §1). It is
-- DROPPED here, with its two triggers, and measure_resource takes its place:
-- one row per outside resource — an official document, a study, a news
-- explainer, an editorial, a video — with the credibility tier a function of
-- `kind` and nothing else. src/lib/measure-ladder.ts fixes the ORDER of the
-- five kinds; this file fixes the five VALUES.
--
-- THE SAFETY ARGUMENT transfers from 0033 word for word: the anon policy on
-- measure_resource reads mp.status = 'published' and never 'listed'. A listed
-- measure shows its ballot text and not one resource, whatever rows sit
-- beneath it.
--
-- THE SYMMETRY RULE is relaxed from "within one" to "both sides present and
-- the larger at most twice the smaller" (spec §4, founder call F2). 0010's
-- rule was written for sentences we could balance by writing one more; a
-- list of outside material can only be balanced by finding, and keeping a
-- well-covered side's sixth link off the page over a 6-vs-4 count is not a
-- rule a voter would recognise. Neutral rows are not a side and do not count.
-- The rule holds in both places 0010 put it: on the publication row, and on
-- every resource write to a published measure (deferred, so a multi-row edit
-- is judged on its result).
--
-- source (0000) is NOT changed. Its four `type` values are coarser than
-- `kind`; the ladder lives on this app-owned row. scripts/verify-measure-
-- resources.ts flags the one contradiction that matters (kind = 'official'
-- on a source whose type is not 'primary_doc').
--
-- Idempotent: safe to re-run.

-- (1) Retire the written-argument model. CASCADE takes its policy, index and
--     the resource-side trigger (which lives on the dropped table).
DROP TABLE IF EXISTS measure_argument CASCADE;

-- (2) The resource.
CREATE TABLE IF NOT EXISTS measure_resource (
  resource_id      TEXT PRIMARY KEY,
  measure_id       TEXT NOT NULL REFERENCES ballot_measure(measure_id) ON DELETE CASCADE,
  -- No source, no render — the NOT NULL 0010 put on measure_argument.
  -- publisher, url, type and lean_tag come from here, never duplicated.
  source_id        TEXT NOT NULL REFERENCES source(source_id),
  stance           TEXT NOT NULL,
  kind             TEXT NOT NULL,
  format           TEXT NOT NULL,
  title            TEXT NOT NULL,          -- the resource's own title, verbatim
  author           TEXT,                   -- byline, speaker, or channel name
  published_at     DATE,                   -- NULL when the resource is undated
  duration_seconds INT,                    -- video/audio only
  -- ≤140 chars of ATTRIBUTION, never summary: "Sponsor of the joint
  -- resolution", "Legislature's own staff analysis" (spec F4).
  note             TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT measure_resource_measure_id_source_id_key UNIQUE (measure_id, source_id)
);

-- Named CHECKs, dropped and re-added so a re-run cannot leave a stale one
-- beside a new one (0023/0028/0033 lesson).
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_stance_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_stance_check
  CHECK (stance IN ('support','oppose','neutral'));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_kind_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_kind_check
  CHECK (kind IN ('official','analysis','reporting','argument','commentary'));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_format_check;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_format_check
  CHECK (format IN ('document','article','video','audio'));

-- Official documents and news are neutral by definition. A newsroom piece
-- that takes a side is an editorial, and is filed as `argument`.
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_neutral_kinds;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_neutral_kinds
  CHECK (kind NOT IN ('official','reporting') OR stance = 'neutral');

-- A position or a take is somebody's case; it cannot sit in the shared block.
ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_sided_kinds;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_sided_kinds
  CHECK (kind NOT IN ('argument','commentary') OR stance <> 'neutral');

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_duration_format;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_duration_format
  CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND format IN ('video','audio')));

ALTER TABLE measure_resource DROP CONSTRAINT IF EXISTS measure_resource_note_length;
ALTER TABLE measure_resource ADD CONSTRAINT measure_resource_note_length
  CHECK (note IS NULL OR char_length(note) <= 140);

CREATE INDEX IF NOT EXISTS idx_measure_resource_scope
  ON measure_resource (measure_id, stance, display_order);

COMMENT ON TABLE measure_resource IS
  'Outside material about a ballot measure, one row per link. The credibility '
  'tier is a function of `kind` (src/lib/measure-ladder.ts) and never a '
  'per-row judgment; `format` is not credibility; `source.lean_tag` is not a '
  'sort key. Anon reads rows only through a published measure (0034).';
COMMENT ON COLUMN measure_resource.note IS
  'Attribution only, <=140 chars ("Sponsor of the joint resolution"). Never a '
  'summary of what the resource argues — that would be our writing.';

-- (3) RLS, a copy of 0011's argument policy with the table renamed.
ALTER TABLE measure_resource ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON measure_resource FROM anon, authenticated;
GRANT ALL    ON measure_resource TO service_role;
GRANT SELECT ON measure_resource TO anon;

DROP POLICY IF EXISTS anon_read_measure_resource ON measure_resource;
CREATE POLICY anon_read_measure_resource ON measure_resource
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = measure_resource.measure_id AND mp.status = 'published'
  ));

-- (4) The gate. Same three function names as 0010/0012 (CREATE OR REPLACE
--     keeps 0012's pinned search_path posture; it is restated anyway), now
--     counting resources under the 2x rule.
CREATE OR REPLACE FUNCTION public.measure_sides_balanced(m_id TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT s > 0 AND o > 0 AND GREATEST(s, o) <= 2 * LEAST(s, o)
  FROM (
    SELECT COUNT(*) FILTER (WHERE stance = 'support') AS s,
           COUNT(*) FILTER (WHERE stance = 'oppose')  AS o
    FROM public.measure_resource WHERE measure_id = m_id
  ) c;
$$;

CREATE OR REPLACE FUNCTION public.enforce_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND NOT public.measure_sides_balanced(NEW.measure_id) THEN
    RAISE EXCEPTION
      'measure % cannot be published: both sides must be present and the larger at most twice the smaller',
      NEW.measure_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_published_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target TEXT := COALESCE(NEW.measure_id, OLD.measure_id);
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.measure_publication
    WHERE measure_id = target AND status = 'published'
  ) AND NOT public.measure_sides_balanced(target) THEN
    RAISE EXCEPTION
      'measure % is published: both sides must be present and the larger at most twice the smaller',
      target;
  END IF;
  RETURN NULL;
END;
$$;

-- trg_measure_balance on measure_publication survives from 0010 and now
-- calls the redefined function. Recreated anyway so a fresh database and the
-- live one end in the same state.
DROP TRIGGER IF EXISTS trg_measure_balance ON measure_publication;
CREATE TRIGGER trg_measure_balance
  BEFORE INSERT OR UPDATE ON measure_publication
  FOR EACH ROW EXECUTE FUNCTION public.enforce_measure_balance();

-- The resource-side guard, deferred to statement end (0010's reasoning).
DROP TRIGGER IF EXISTS trg_measure_resource_balance ON measure_resource;
CREATE CONSTRAINT TRIGGER trg_measure_resource_balance
  AFTER INSERT OR UPDATE OR DELETE ON measure_resource
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_published_measure_balance();

COMMENT ON COLUMN measure_publication.status IS
  'draft/in_review = invisible to anon; listed = ballot_measure row only (ballot '
  'text) -- NO measure_resource; published = the two-sided resource list too, '
  'enforced by trg_measure_balance (0010, 0033, 0034).';
```

- [ ] **Step 4: Run the verifier**

Run: `node scripts/verify-migrations.mjs`
Expected: every section 16 check `ok`; the run ends with its usual summary and exit 0. If `expectConstraintViolation` for the UNIQUE fails on the message pattern, check the actual constraint name PGlite reports and use that name in both the migration and the pattern (they must match).

- [ ] **Step 5: Record 0034 in the migrations README**

In `supabase/migrations/README.md`, replace the row `| 0034+     | free | — |` with:

```
| **0034**  | `0034_measure_resources.sql` — drops `measure_argument` (0 rows ever); creates `measure_resource` (one row per outside link: stance/kind/format, ≤140-char attribution note), its `published`-only anon policy, and redefines `measure_sides_balanced` as "both sides present, larger ≤ 2× smaller" over resources | **not applied**. Precondition: PR merged and deployed first, so the page reads the new shape before the old table goes. Apply, then read back as anon: 3 measures, 0 `measure_resource` rows. |
| 0035+     | free                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0034_measure_resources.sql supabase/migrations/README.md scripts/verify-migrations.mjs scripts/verify-ballot-seeds.mjs scripts/demo-teardown.sql
git commit -m "feat(measures): 0034 measure_resource replaces measure_argument

One row per outside link, tier by kind, published-only RLS, 2x symmetry
rule on the publication row and on every resource write. Verifier §16
rewritten for the new table.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Read layer

**Files:**
- Modify: `src/lib/measures.ts`
- Delete: `src/components/features/MeasureCompare.tsx`

**Interfaces:**
- Consumes: `compareResources`, `sidesBalanced`, `MeasureResource` from Task 1.
- Produces:
  ```ts
  export interface MeasureResourceWithSource { resource: MeasureResource; source: Source }
  export interface MeasureBrief { measure: BallotMeasure; neutral: MeasureResourceWithSource[]; support: ...; oppose: ... }
  export function getMeasureListing(measureId): Promise<MeasureListing | null>  // unchanged shape
  ```

- [ ] **Step 1: Rewrite the brief part of `src/lib/measures.ts`**

Replace everything from the `import { sidesBalanced } from "@/lib/measure-balance";` line through the end of `getMeasureBrief` with:

```ts
/* The ladder and the symmetry rule, in their own module so the verify script
   can run them without next/cache. */
import { compareResources, sidesBalanced } from "@/lib/measure-ladder";
import {
  measureVisibleStatus,
  type MeasureVisibleStatus,
} from "@/lib/measure-status";
import type { Source } from "@/types/schema";
import type {
  BallotMeasure,
  MeasureResource,
  MeasureStance,
} from "@/types/app";

/* Read layer for ballot measures, mirroring briefs.ts. Two tiers since 0033
   (docs/general-election/listed-tier-2026-09-23.md): a `listed` measure
   exposes the measure row itself — the verbatim ballot text — and a
   `published` one adds the two-sided resource list (0034). Resources stay
   gated on `published` in RLS, so the rules below still describe every
   resource this module can ever return:

   1. RLS already hides every row tied to an unpublished measure, so the gate
      is at the database, not here.
   2. This module re-checks the symmetry rule anyway — belt and braces over
      the publication trigger, exactly as briefs.ts re-checks
      balance_check_passed over the publication gate.
   3. Resources carry a NOT NULL source_id, so "no source -> dropped" is a
      schema guarantee. The join is still inner: a dangling source reference
      drops the resource rather than rendering one with nothing behind it.
   4. Order is the ladder (measure-ladder.ts), applied here so every caller
      gets rows already in credible-first order and none re-sorts. */

export { sidesBalanced };
export type { MeasureVisibleStatus };

export interface MeasureResourceWithSource {
  resource: MeasureResource;
  source: Source;
}

export interface MeasureBrief {
  measure: BallotMeasure;
  /* Shared context: official documents, research, reporting. Tier-ordered. */
  neutral: MeasureResourceWithSource[];
  /* The case for a YES. Tier-ordered. */
  support: MeasureResourceWithSource[];
  /* The case for a NO. Tier-ordered. */
  oppose: MeasureResourceWithSource[];
}

type ResourceRow = MeasureResource & { source: Source | null };

function toSourced(
  rows: ResourceRow[],
  stance: MeasureStance
): MeasureResourceWithSource[] {
  return rows
    .filter((row) => row.stance === stance && row.source !== null)
    .map((row) => {
      const { source, ...resource } = row;
      return { resource: resource as MeasureResource, source: source as Source };
    })
    .sort((a, b) => compareResources(a.resource, b.resource));
}

async function fetchMeasureBrief(
  measureId: string
): Promise<MeasureBrief | null> {
  const supabase = await createAnonServerClient();

  const { data: measure } = await supabase
    .from("ballot_measure")
    .select("*")
    .eq("measure_id", measureId)
    .eq("election", ACTIVE_ELECTION)
    .maybeSingle<BallotMeasure>();
  if (!measure) return null;

  const { data: rows } = await supabase
    .from("measure_resource")
    .select("*, source!inner(*)")
    .eq("measure_id", measureId);

  const all = (rows ?? []) as ResourceRow[];
  const support = toSourced(all, "support");
  const oppose = toSourced(all, "oppose");
  const neutral = toSourced(all, "neutral");

  if (!sidesBalanced(support.length, oppose.length)) return null;

  return { measure, neutral, support, oppose };
}

export function getMeasureBrief(measureId: string) {
  return unstable_cache(
    () => fetchMeasureBrief(measureId),
    ["measure-brief", measureId],
    { revalidate: 3600, tags: ["measures", `measure:${measureId}`] }
  )();
}
```

Keep the remaining `MeasureListing` / `getMeasureListing` / `getActiveMeasures` code unchanged, except the comment in `fetchMeasureListing` that says "no arguments are readable at all — RLS gates measure_argument on `published`" becomes "no resources are readable at all — RLS gates measure_resource on `published`".

- [ ] **Step 2: Delete `MeasureCompare.tsx`**

Run: `git rm -q src/components/features/MeasureCompare.tsx`

- [ ] **Step 3: Typecheck**

Run: `npm install --no-audit --no-fund` (once), then `npx tsc --noEmit`
Expected: exactly one error, in `src/app/(public)/measures/[measureId]/page.tsx` — `Cannot find module '@/components/features/MeasureCompare'`. Anything else is a defect in this task; fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/measures.ts
git commit -m "feat(measures): read layer returns tier-ordered neutral/support/oppose resources

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: The row and the ladder components

**Files:**
- Create: `src/components/features/MeasureResourceRow.tsx`
- Create: `src/components/features/MeasureResourceLadder.tsx`

**Interfaces:**
- Consumes: `MeasureResourceWithSource`, `MeasureBrief` (Task 3); `TIER_LABEL`, `COLUMN_CAP`, `RESOURCE_TIER` (Task 1); `newsCardLabels` from `@/lib/news-labels`; `outletPathFor` from `@/lib/news-outlets`; `safeHttpUrl` from `@/lib/format`.
- Produces: `<MeasureResourceRow item />`, `<MeasureResourceLadder brief />`.

- [ ] **Step 1: The row**

Create `src/components/features/MeasureResourceRow.tsx`:

```tsx
import type { MeasureResourceWithSource } from "@/lib/measures";
import { newsCardLabels } from "@/lib/news-labels";
import { outletPathFor } from "@/lib/news-outlets";
import { safeHttpUrl } from "@/lib/format";
import type { MeasureFormat } from "@/types/app";

/* One outside resource about a ballot question (spec §5).

   Title, then one muted line of facts: publisher · author · format ·
   duration · date, then the attribution note if there is one. Facts, no
   icons: "Video · 14 min" is a statement, a play glyph is an invitation.

   NO LEAN HERE, same as NewsStoryCard and for the same reason (news-labels.ts,
   founder 2026-09-19): the publisher links to its outlet page when the outlet
   is in the news corpus, and the lean is disclosed there in full.

   OPINION IS MARKED by container, never colour: every `argument` and
   `commentary` row is somebody's case, so the row says so before the title.
   `newsCardLabels` supplies the word from source.type; rows whose kind is
   sided are marked even when the source row is typed factual_reporting (an
   editorial board's source row, say) — the kind is the stronger fact.

   NO THUMBNAIL, NO EMBED (spec §6): a link and nothing that phones home. */

const FORMAT_LABEL: Record<MeasureFormat, string | null> = {
  document: "Document",
  article: null, // the default; unmarked like reporting on a news card
  video: "Video",
  audio: "Audio",
};

function minutes(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function MeasureResourceRow({ item }: { item: MeasureResourceWithSource }) {
  const { resource, source } = item;
  const href = safeHttpUrl(source.url);
  const { publisher, flag, isOpinion } = newsCardLabels(source);
  const sided = resource.kind === "argument" || resource.kind === "commentary";
  const marked = isOpinion || sided;
  const shownFlag = sided ? "Opinion" : flag;
  let outletHref: string | null = null;
  try {
    outletHref = outletPathFor(new URL(source.url).hostname.replace(/^www\./, ""));
  } catch {
    outletHref = null;
  }

  const facts = [
    resource.author,
    FORMAT_LABEL[resource.format],
    minutes(resource.duration_seconds),
    monthYear(resource.published_at),
  ].filter((f): f is string => Boolean(f));

  return (
    <li
      className={[
        "flex flex-col gap-1 rounded-md border p-3",
        marked ? "border-border-strong bg-surface-muted" : "border-border bg-surface",
      ].join(" ")}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-body-sm text-on-surface underline underline-offset-2"
        >
          {resource.title}
        </a>
      ) : (
        <span className="text-body-sm text-on-surface">{resource.title}</span>
      )}
      <p className="flex flex-wrap items-center gap-x-2 font-mono text-mono text-on-surface-muted">
        {shownFlag && <span className={marked ? "text-on-surface" : undefined}>{shownFlag}</span>}
        {publisher &&
          (outletHref ? (
            <a href={outletHref} className="underline underline-offset-2">
              {publisher}
            </a>
          ) : (
            <span>{publisher}</span>
          ))}
        {facts.map((f) => (
          <span key={f}>· {f}</span>
        ))}
      </p>
      {resource.note && (
        <p className="text-caption text-on-surface-muted">{resource.note}</p>
      )}
    </li>
  );
}
```

`outletPathFor` produces a path for any domain; the outlet page 404s for a domain not in the corpus (`outletBySlug` is fail-closed). That is acceptable for a first pass but sends some readers to a 404. Before committing, check `src/lib/news-outlets.ts` for an exported list or lookup by domain (`OUTLETS`, `outletByDomain`, or similar). If one exists, use it to set `outletHref` only when the domain is listed; if none exists, add this to `news-outlets.ts`:

```ts
/** The outlet page path for a domain in the corpus, or null. Fail-closed:
    a publisher we do not list gets no link rather than a 404. */
export function outletPathIfListed(domain: string, outlets: readonly Outlet[]): string | null {
  return outlets.some((o) => o.domain === domain) ? outletPathFor(domain) : null;
}
```

and call it with the corpus export from `@/lib/news-sources` (the module `news-outlets.ts` already reads outlets from). Match the field name the `Outlet` type actually uses for its domain.

- [ ] **Step 2: The ladder**

Create `src/components/features/MeasureResourceLadder.tsx`:

```tsx
import { MeasureResourceRow } from "@/components/features/MeasureResourceRow";
import type { MeasureBrief, MeasureResourceWithSource } from "@/lib/measures";
import { COLUMN_CAP, RESOURCE_TIER, TIER_LABEL } from "@/lib/measure-ladder";
import type { MeasureKind } from "@/types/app";

/* The measure page's body below the ballot text (spec §5):

   1. "Understand it first" — the neutral resources, shared by both sides,
      most credible material on the page. Omitted entirely when empty.
   2. Two equal columns, YES then NO, fixed order, equal-treatment stack on
      mobile. Neither is styled as preferred — the rule that keeps party
      chips uncoloured. Inside a column, rows sit under small tier headings
      so the ladder is visible, not implied. A tier with no rows shows no
      heading.

   Rows arrive already tier-ordered from measures.ts; this groups, it does
   not sort. The cap is the same on both sides (equal room), and the
   overflow is a native <details> so the page needs no client JavaScript. */

const COLUMN_KINDS: readonly MeasureKind[] = ["analysis", "argument", "commentary"];

function groupByKind(items: MeasureResourceWithSource[]) {
  const groups = new Map<MeasureKind, MeasureResourceWithSource[]>();
  for (const item of items) {
    const list = groups.get(item.resource.kind) ?? [];
    list.push(item);
    groups.set(item.resource.kind, list);
  }
  return groups;
}

function TieredList({ items, kinds }: { items: MeasureResourceWithSource[]; kinds: readonly MeasureKind[] }) {
  const groups = groupByKind(items);
  return (
    <div className="flex flex-col gap-3">
      {kinds
        .filter((k) => (groups.get(k) ?? []).length > 0)
        .sort((a, b) => RESOURCE_TIER[a] - RESOURCE_TIER[b])
        .map((k) => (
          <div key={k} className="flex flex-col gap-2">
            <h3 className="text-caption uppercase tracking-wide text-on-surface-muted">
              {TIER_LABEL[k]}
            </h3>
            <ul className="flex flex-col gap-2">
              {(groups.get(k) ?? []).map((item) => (
                <MeasureResourceRow key={item.resource.resource_id} item={item} />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function Column({ heading, items }: { heading: string; items: MeasureResourceWithSource[] }) {
  const shown = items.slice(0, COLUMN_CAP);
  const rest = items.slice(COLUMN_CAP);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-on-surface">
      <h2 className="text-h3">{heading}</h2>
      <TieredList items={shown} kinds={COLUMN_KINDS} />
      {rest.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-label text-primary underline underline-offset-2">
            Show all {items.length}
          </summary>
          <div className="mt-3">
            <TieredList items={rest} kinds={COLUMN_KINDS} />
          </div>
        </details>
      )}
    </section>
  );
}

export function MeasureResourceLadder({ brief }: { brief: MeasureBrief }) {
  return (
    <div className="flex flex-col gap-5">
      {brief.neutral.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h3">Understand it first</h2>
          <TieredList items={brief.neutral} kinds={["official", "analysis", "reporting"]} />
        </section>
      )}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
        <Column heading="The case for a YES" items={brief.support} />
        <Column heading="The case for a NO" items={brief.oppose} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: still exactly the one `MeasureCompare` error in the page (fixed in Task 5). Any error in the two new files is fixed here.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/MeasureResourceRow.tsx src/components/features/MeasureResourceLadder.tsx src/lib/news-outlets.ts
git commit -m "feat(measures): resource row and tier-grouped two-column ladder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(Omit `src/lib/news-outlets.ts` from `git add` if Step 1 did not touch it.)

---

### Task 5: The page and the listed-card copy

**Files:**
- Modify: `src/app/(public)/measures/[measureId]/page.tsx`
- Modify: `src/components/features/BallotQuestions.tsx:50`

- [ ] **Step 1: Swap the compare block for the ladder**

In the page: change the import `import { MeasureCompare } from "@/components/features/MeasureCompare";` to `import { MeasureResourceLadder } from "@/components/features/MeasureResourceLadder";`.

Replace the in-review copy in the `!listing` branch:

```tsx
        <p className="text-body text-on-surface-muted">
          We publish a ballot question only when what people say for it and
          against it are both collected and comparably sourced. This one
          hasn&apos;t cleared that yet. Check back soon.
        </p>
```

Replace the comment above `const { measure, brief } = listing;` with:

```tsx
  /* `brief` is null for a listed measure, and for a published one that
     fails the symmetry re-check — the read layer refuses to render that one
     lopsided. Both get the ballot text and nothing else: the verbatim summary
     is the Division of Elections' own wording, so it needs no audit, while
     the resource list waits for both sides. */
```

Replace the `{brief ? <MeasureCompare .../> : <Card>...</Card>}` block with:

```tsx
      {brief ? (
        <MeasureResourceLadder brief={brief} />
      ) : (
        /* In place of the ladder, never beside an empty one: two blank
           YES/NO columns would read as "nobody has an argument", which is
           a claim we have not checked. */
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3">What people say for and against it</h2>
          <p className="text-body-sm text-on-surface-muted">
            Resources on both sides are being collected. We publish them only
            when both sides are represented &mdash; until then, this is the
            official ballot text and nothing else.
          </p>
        </Card>
      )}
```

Replace the footer sentence:

```tsx
        <span>
          {brief
            ? "We collect what each side says and order it by the kind of source. We write none of it. You decide."
            : "We quote the ballot as it is printed. You decide."}
        </span>
```

- [ ] **Step 2: The listed-card suffix**

In `src/components/features/BallotQuestions.tsx`, change `{m.status !== "published" ? " · arguments in review" : ""}` to `{m.status !== "published" ? " · resources being collected" : ""}` and, in the component's header comment, "a listed card says its arguments are in review" → "a listed card says its resources are being collected".

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 4: Build-render the three measure pages**

Run: `npm run build 2>&1 | grep -E "measures/|error" `
Expected: `/measures/FL-AM1-general`, `FL-AM2-general`, `FL-AM3-general` listed as prerendered (if `NEXT_PUBLIC_SUPABASE_URL` is set) or the build succeeds with the pages dynamic (if not). No error lines.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/measures/[measureId]/page.tsx" src/components/features/BallotQuestions.tsx
git commit -m "feat(measures): the amendment page renders the resource ladder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Methodology section and README references

**Files:**
- Modify: `src/app/(public)/methodology/page.tsx` — insert after the "How we label the news" `</section>` (line ~330), before "We describe. You decide."
- Modify: `README.md:232`

- [ ] **Step 1: Add the section**

```tsx
      <section className="flex flex-col gap-2">
        <h2 className="text-h2">How we order what people say about a ballot question</h2>
        <p className="text-body">
          We write no case for or against an amendment. Each ballot question
          page collects what other people have published about it and puts
          each link in one of five groups, by what kind of source it is:
        </p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-body">
          <li>
            <strong>Official documents</strong> &mdash; the ballot text, the
            resolution that put it there, a staff or revenue analysis.
          </li>
          <li>
            <strong>Research</strong> &mdash; studies and analyses with a method
            behind them, from universities, institutes and policy groups.
          </li>
          <li>
            <strong>Reporting</strong> &mdash; a newsroom explaining or covering
            it.
          </li>
          <li>
            <strong>Positions</strong> &mdash; a named person or organisation
            making the case: editorials, the sponsor, an advocacy group.
          </li>
          <li>
            <strong>Commentary</strong> &mdash; takes from people speaking for
            themselves: a video channel, a podcast, a blog.
          </li>
        </ol>
        <p className="text-body">
          The group decides where a link sits on the page, most established
          first. Nothing else does &mdash; not the outlet&apos;s lean, not
          whether it is a video or an article, and never our opinion of it. A
          video can sit in any group depending on who made it. Official
          documents and reporting are shown to everyone first; positions and
          commentary are shown under the side they argue for, in two columns
          of equal size. A ballot question is published only when both sides
          are represented; until then the page shows the ballot text alone.
        </p>
      </section>
```

- [ ] **Step 2: README**

In `README.md` line 232, change `` `claim_source`, `measure_argument`) `` to `` `claim_source`, `measure_resource`) ``.

- [ ] **Step 3: Lint, commit**

Run: `npm run lint`
Expected: clean.

```bash
git add "src/app/(public)/methodology/page.tsx" README.md
git commit -m "docs(measures): methodology explains the five-group resource ladder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Advisory lint for seed rows

**Files:**
- Create: `scripts/verify-measure-resources.ts`

**Interfaces:**
- Consumes: the `INSERT INTO measure_resource` and `INSERT INTO source` statements in `supabase/migrations/0035_measure_resources_2026.sql` (Task 8). Parses them with a regex; does not need a database.

- [ ] **Step 1: Write a failing run**

Create `scripts/verify-measure-resources.ts`:

```ts
/* Advisory lint for the measure-resource seed (spec §7). Not a gate: it
   prints what a reviewer should look at before applying 0035.

   Reads the seed migration as text and parses its VALUES tuples, so it needs
   no database. Three findings:
     1. kind = 'official' on a source whose type is not 'primary_doc'
     2. a video/audio row with no duration
     3. a note that reads as a summary rather than attribution

   Run: node scripts/verify-measure-resources.ts [path-to-seed.sql] */

import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "supabase/migrations/0035_measure_resources_2026.sql";
const sql = readFileSync(path, "utf8");

/* Pulls every tuple from the INSERT into `table`. Values are SQL literals:
   'quoted' (with '' escapes), NULL, or a bare number. */
function tuples(table: string): string[][] {
  const m = sql.match(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)\\s*VALUES([\\s\\S]*?);`, "i"));
  if (!m) return [];
  const body = m[2];
  const out: string[][] = [];
  const tupleRe = /\(((?:'(?:[^']|'')*'|[^()'])*)\)/g;
  let t: RegExpExecArray | null;
  while ((t = tupleRe.exec(body))) {
    const vals: string[] = [];
    const valRe = /'((?:[^']|'')*)'|NULL|(-?\d+(?:\.\d+)?)/gi;
    let v: RegExpExecArray | null;
    while ((v = valRe.exec(t[1]))) vals.push(v[1] !== undefined ? v[1].replace(/''/g, "'") : (v[2] ?? "NULL"));
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
  return tuples(table).map((vals) => Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? "NULL"])));
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
    flag(`${r.resource_id}: kind official but source ${r.source_id} is type ${src.type}`);
  }
  if ((r.format === "video" || r.format === "audio") && r.duration_seconds === "NULL") {
    flag(`${r.resource_id}: ${r.format} with no duration_seconds`);
  }
  if (r.note !== "NULL" && /\b(would|will|means|because)\b/i.test(r.note)) {
    flag(`${r.resource_id}: note reads as a summary, not attribution: "${r.note}"`);
  }
}

const perMeasure = new Map<string, { support: number; oppose: number; neutral: number }>();
for (const r of resources) {
  const c = perMeasure.get(r.measure_id) ?? { support: 0, oppose: 0, neutral: 0 };
  c[r.stance as "support" | "oppose" | "neutral"]++;
  perMeasure.set(r.measure_id, c);
}
console.log("\nPer measure (support / oppose / neutral):");
for (const [id, c] of perMeasure) {
  const ok = c.support > 0 && c.oppose > 0 && Math.max(c.support, c.oppose) <= 2 * Math.min(c.support, c.oppose);
  console.log(`  ${ok ? "ok " : "-- "} ${id}: ${c.support} / ${c.oppose} / ${c.neutral}${ok ? "" : "  (cannot publish)"}`);
}

console.log(`\n${resources.length} resource row(s), ${findings} advisory finding(s).`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/verify-measure-resources.ts`
Expected: `No measure_resource INSERT found` (0035 does not exist yet) and exit 1.

- [ ] **Step 3: Commit (the seed in Task 8 makes it pass)**

```bash
git add scripts/verify-measure-resources.ts
git commit -m "chore(measures): advisory lint for the resource seed

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Seed skeleton — the one tier-1 row per amendment we can vouch for

**Files:**
- Create: `supabase/migrations/0035_measure_resources_2026.sql`

This seeds only what is already verified in the repo: the Division of Elections booklet, which `0030` cites by URL, as an `official` / `neutral` / `document` row for each amendment. Every other URL is editorial work (spec §9 F7, §10) and is added by the founder in later inserts to this same file. Nothing here can publish a measure (no sided rows), so all three stay `listed`.

- [ ] **Step 1: Write the seed**

```sql
-- 0035_measure_resources_2026.sql
-- Outside resources for Amendments 1-3 (0034). Spec §9 F7 / §10.
--
-- THIS FILE IS A SKELETON. It seeds the one resource the repo can already
-- vouch for: the Division of Elections' booklet, which 0030 cites as
-- full_text_url and which is the official text every voter can check. Every
-- further row — the joint resolutions, staff analyses, studies, explainers,
-- editorials, video — is the founder's editorial call and is added here by
-- extending the two INSERTs below. Run scripts/verify-measure-resources.ts
-- on this file before applying it.
--
-- Nothing here can publish a measure: there are no support or oppose rows,
-- so measure_sides_balanced() is false for all three and each stays
-- `listed` (ballot text only). Publishing is a separate, later act.
--
-- Idempotent: ON CONFLICT DO UPDATE on the resource, DO NOTHING on the
-- source (url_norm is the natural key, 0014's rule).

INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_fldos_amend_booklet_2026',
   'https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
   'files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
   'Florida Division of Elections', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM1-general:booklet', 'FL-AM1-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0),
  ('FL-AM2-general:booklet', 'FL-AM2-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0),
  ('FL-AM3-general:booklet', 'FL-AM3-general', 'src_fldos_amend_booklet_2026', 'neutral', 'official', 'document',
   'Proposed Constitutional Amendments for the General Election (November 3, 2026)', NULL, '2026-08-21', NULL,
   'The state''s official booklet: ballot title, summary and full text', 0)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;
```

`ON CONFLICT (url_norm) DO NOTHING` on `source` means that if a row for this URL already exists under a different `source_id`, the three resource rows will fail their FK. Before applying live, run the check in Step 3.

- [ ] **Step 2: Run both verifiers**

Run: `node scripts/verify-measure-resources.ts`
Expected: `3 resource row(s), 0 advisory finding(s)` and each measure line `-- FL-AMn-general: 0 / 0 / 1  (cannot publish)`.

Run: `node scripts/verify-migrations.mjs`
Expected: passes (0035 applies cleanly on top of 0034 in PGlite; the three `ballot_measure` rows from 0030 exist there).

- [ ] **Step 3: Record the live-apply precondition**

Add to `supabase/migrations/README.md` under the 0034 row:

```
| **0035**  | `0035_measure_resources_2026.sql` — seed skeleton: the DoE booklet as an `official`/`neutral` resource for each amendment; every sided row is a founder addition | **not applied**. Before applying: `SELECT source_id FROM source WHERE url_norm LIKE 'files.floridados.gov/media/711355/%'` — if a row exists under another id, change the three `source_id` values to it. After: 3 `measure_resource` rows visible to service_role, **0 to anon** (all three measures still `listed`). |
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0035_measure_resources_2026.sql supabase/migrations/README.md
git commit -m "data(measures): seed the DoE booklet as the tier-1 resource for Amendments 1-3

Skeleton only; sided rows are the founder's editorial call (spec F7).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Final verification and handoff note

- [ ] **Step 1: Run everything**

```bash
node scripts/verify-measure-balance.ts && node scripts/verify-migrations.mjs && node scripts/verify-measure-resources.ts && npx tsc --noEmit && npm run lint
```

Expected: all pass.

- [ ] **Step 2: Confirm nothing references the retired names**

Run: `grep -rn "measure_argument\|MeasureArgument\|MeasureCompare\|measure-balance\|MeasureSide\b" src scripts supabase/migrations/003*.sql README.md`
Expected: matches only inside `0010`/`0011`/`0012`/`0033` (historical) and `0034` (the DROP). Anything in `src/`, `scripts/`, or `README.md` is a miss; fix it.

- [ ] **Step 3: Write the handoff**

Append to `docs/general-election/listed-tier-2026-09-23.md` a short section:

```markdown
## 7. Follow-up — the resource ladder (2026-09-23, unapplied)

`measure_argument` is retired by `0034_measure_resources.sql` in favour of
`measure_resource`: outside links ordered by kind of source (spec
`docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md`).
The safety argument in §3 transfers unchanged: `anon_read_measure_resource`
reads `'published'` only. Apply order: merge and deploy the PR, then `0034`,
then `0035` (after the `url_norm` check in `supabase/migrations/README.md`).
All three measures stay `listed` until the founder adds sided rows and
flips each to `published`; the 2× rule refuses a lopsided flip.
```

- [ ] **Step 4: Commit and open the PR**

```bash
git add docs/general-election/listed-tier-2026-09-23.md
git commit -m "docs(measures): record the resource-ladder apply order in the listed-tier decision record

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin claude/ballot-questions-resources-19285d
gh pr create --base main --title "Ballot questions: a two-sided resource ladder replaces our own arguments" --body "$(cat <<'EOF'
Founder direction 2026-09-23: the site stops writing a case for and against each amendment and instead points voters at what other people have published, ordered by kind of source (official → research → reporting → positions → commentary), both sides in equal columns.

- `0034` drops `measure_argument` (0 rows ever) and creates `measure_resource`; published-only RLS; symmetry rule becomes "both sides present, larger ≤ 2× smaller".
- `src/lib/measure-ladder.ts` is the one place the ladder is written; `verify-measure-balance.ts` pins it.
- Measure page: "Understand it first" (neutral), then YES/NO columns grouped by tier. Links out only, no embeds, no lean on the row.
- `0035` seeds only the DoE booklet per amendment. Nothing publishes; all three stay `listed`.

Spec: `docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md` — §9 lists seven founder calls this proceeds on.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage.** §1 ladder → Task 1 (`RESOURCE_TIER`) and Task 2 (CHECKs). §2 data model → Task 2. §3 read layer → Task 3. §4 gate + cap → Task 2 (trigger), Task 1 (`sidesBalanced`, `COLUMN_CAP`), Task 4 (`<details>`). §5 page → Tasks 4, 5. §6 no embed → Task 4 (link only). §7 verification → Tasks 1, 2, 7, 9. §8 methodology → Task 6. §9 F1–F6 are encoded as written; F7 is Task 8's skeleton. §10 is guidance for the founder, not a task.

**Type consistency.** `MeasureResourceWithSource` is defined in Task 3 and consumed by Task 4 under that name. `rankResources` takes `Rankable` (`kind`, `published_at`, `display_order`), which `MeasureResource` satisfies. `sidesBalanced(support, oppose)` argument order matches across Tasks 1, 2 (SQL), 3. The SQL error text in Task 2's migration matches the regexes in the verifier fixtures.

**Placeholders.** Task 4 Step 1 has one conditional ("check `news-outlets.ts` for a domain lookup; if none, add `outletPathIfListed`") because the corpus export name was not read during planning; the code for both branches is given.
