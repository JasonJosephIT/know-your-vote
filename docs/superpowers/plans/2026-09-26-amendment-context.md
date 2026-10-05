# Amendment Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Amendment 2 with its verified resources (`0040`), and make Amendment 1's held page show its verified neutral material and a note specific to AM1 (`0041` plus page changes).

**Architecture:**
- Data lives in two idempotent seed migrations, modelled on `0038`, plus one RLS policy change.
- The held-page explanation is a static, pure module, so a `node` verify script can check it.
- The page reuses the existing "Understand it first" block.

**Tech Stack:** Supabase Postgres (migrations checked by the embedded-PGlite `scripts/verify-migrations.mjs`), Next.js 16 server components, TypeScript, and Node ≥ 22 for the `.ts` verify scripts.

**Spec:** `docs/superpowers/specs/2026-09-26-amendment-context-design.md`

## Global Constraints

- Migration numbers: **`0040` and `0041` only** (reserved in `supabase/migrations/README.md`). Do not create or rename any other migration. Do not apply anything to a live database.
- A resource row is seeded only if `docs/general-election/measure-resources-verified-2026-09-24.md` marks it as actually opened. That includes the "Blocked pages re-opened in a real browser (2026-09-26…)" table. Snippet-only, 403, 402 and paywalled rows are excluded and listed in the migration header.
- `official` and `reporting` ⇒ `neutral`. `argument` and `commentary` ⇒ `support` or `oppose`. `analysis` may take any stance.
- **One row per organisation per side** (spec §1): when one organisation has several pages, keep the single fullest page, the one that states reasons.
- Titles are verbatim from the page. `note` is attribution only: ≤140 chars, and none of the words would, will, means or because. No lean and no organisation category.
- Gate: at least one support and one oppose row, and the larger side is at most 2× the smaller. If AM2 cannot pass honestly, stop and report BLOCKED. Don't pad.
- The held-page copy describes our process and the public record only, never an amendment's merits.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/0040_measure_resources_am2.sql` (create) | AM2 sources and resources, plus the publish-with-audit block |
| `supabase/migrations/0041_measure_neutral_listed.sql` (create) | The widened anon policy and AM1's neutral sources and resources |
| `supabase/migrations/README.md` (modify) | Turn the 0040 and 0041 "reserved" rows into real rows (not applied, preconditions, read-back) |
| `scripts/verify-ballot-seeds.mjs`, `scripts/verify-migrations.mjs` (modify) | Expect AM3 **and** AM2 published; check neutral versus sided visibility on a listed measure |
| `src/lib/measure-held-copy.ts` (create) | `HELD_NOTES` and `heldNote(id)` |
| `scripts/verify-measure-held.ts` (create) | Checks for the held notes and the page guardrail scans |
| `src/lib/measures.ts` (modify) | `MeasureListing.neutral` |
| `src/components/features/MeasureResourceLadder.tsx` (modify) | Export `MeasureNeutralBlock` |
| `src/app/(public)/measures/[measureId]/page.tsx` (modify) | For a held measure, show the neutral block and the note card |

---

### Task 1: `0040`, Amendment 2 resources and publish

**Files:**
- Create: `supabase/migrations/0040_measure_resources_am2.sql`
- Modify: `supabase/migrations/README.md` (the 0040 row), `scripts/verify-ballot-seeds.mjs`, `scripts/verify-migrations.mjs`
- Read: `supabase/migrations/0038_measure_resources_am3.sql` (the template to copy: header style, the url_norm-subquery `source_id`, and the three-CTE publish block with `admin_action`); the verified doc's **Amendment 2** section, its **"Widened search, 2026-09-26"** section (including the embedded `am2-widened` table and the browser-opened table), and the official-vote-explanations table.

**Interfaces:**
- Produces: `FL-AM2-general` at `published` after the migrations run, with N support and M oppose resources. Later tasks and the verify scripts need these exact counts, which the header comment states.

- [ ] **Step 1: Build the row list in the header comment first.** For every AM2 candidate in the doc, write one line: include or exclude, and the reason. Apply the Global Constraints. Specific calls already made:
  - **Eskamani (C1):**
    - URL: `https://www.flhouse.gov/Sections/Documents/loaddoc.aspx?PublicationType=Session&DocumentType=Journals&Session=2025&FileName=Bound_House%20Journal%20No.31,%20April%2025,%202025%20(Friday).pdf`
    - `url_norm` per `src/lib/brief-rows.ts` `urlNorm()`
    - publisher `Florida House of Representatives`, `source.type` `primary_doc`, `lean_tag` `N/A`
    - `kind` `argument`, `stance` `oppose`, `format` `document`
    - title `Explanation of Vote for Sequence Number 256`
    - author `Rep. Anna V. Eskamani`, `published_at` `2025-04-25`
    - note `Signed vote explanation, House Journal, April 25, 2025`
  - **Florida Farm Bureau:** one row only. Use the fullest page with reasons (`/yeson2/` per the widened search) and exclude the other.
  - **sisusari Substack:** excluded (stance reads undecided).
  - **LWV Vote411 PDF:** include as `argument` / `oppose` only if the doc confirms it states LWV's own position. If the doc describes it as a synopsis that lists opponents, exclude it and name it.
  - **Tampa Bay Times column** "Vote yes on Amendment 2 for Florida's farmers, food security and landscape" (Danny Alvarez and Pat Durden, 2026-09-23): opened in the browser; `argument` / `support`.
  - **WKRG copy of the WFLA farm story:** opened; `reporting` / `neutral`. Use the wkrg URL. The WFLA original is blocked, so exclude it.
  - **Bradenton Times AM2 explainer and Bloomberg Tax brief:** opened in the browser; `reporting` / `neutral`.
  - Then count support versus oppose and check the gate. If it fails, stop and report BLOCKED with the counts.
- [ ] **Step 2: Write the verify expectations first (failing).**
  - `scripts/verify-ballot-seeds.mjs`: the published count becomes 2 (FL-AM3-general and FL-AM2-general), and "no measure other than AM3 is published" becomes "other than AM3 and AM2".
  - Add a 0040 audit-row check that mirrors the existing 0038 checks: one `publish` row for `FL-AM2-general`, and re-applying 0040 still gives one row.
  - Add the production path: AM2 `listed` before 0040, then one `listed→published` audit row.
  - Add anon read-back counts for AM2 equal to your header's total (plus the 0035 booklet row).
  - `scripts/verify-migrations.mjs`: extend the positive anon check to expect AM2's count as well as AM3's.
  - Run `node scripts/verify-ballot-seeds.mjs` and expect FAILs, because 0040 doesn't exist yet.
- [ ] **Step 3: Write `0040_measure_resources_am2.sql`** by copying `0038`'s three sections, with AM2's rows and `FL-AM2-general` in the publish block. The audit reason reads `Amendment 2 resources seeded from row-by-row verification, 2026-09-26 (0040)`.
- [ ] **Step 4: README.** Replace the reserved 0040 row with a real one in the same style as 0038's row. Status **not applied**. Precondition: 0034, 0035 and 0038 applied. Read-back: AM2 `published`, with anon counts per stance, and one `admin_action` row `listed→published`.
- [ ] **Step 5: Run the checks.** Run `node scripts/verify-measure-resources.ts supabase/migrations/0040_measure_resources_am2.sql` and expect the AM2 counts with 0 advisory findings. Then run `node scripts/verify-measure-balance.ts`, `node scripts/verify-migrations.mjs` and `node scripts/verify-ballot-seeds.mjs`, and expect all to pass.
- [ ] **Step 6: Commit.** Message: `Seed Amendment 2 resources and publish it (0040)`.

---

### Task 2: `0041`, neutral rows readable while listed, plus AM1's neutral rows

**Files:**
- Create: `supabase/migrations/0041_measure_neutral_listed.sql`
- Modify: `supabase/migrations/README.md` (the 0041 row), `scripts/verify-migrations.mjs`, `scripts/verify-ballot-seeds.mjs`
- Read: `0034_measure_resources.sql` §3 (the current policy); the verified doc's **Amendment 1** section, its widened-search section, and the browser-opened table.

**Interfaces:**
- Consumes: nothing from Task 1 except the file ordering (0041 runs after 0040).
- Produces: anon can read `measure_resource` rows with `stance='neutral'` for `listed` measures. `FL-AM1-general` stays `listed` and gets K neutral rows (K is stated in the header).

- [ ] **Step 1: Write failing checks in `verify-migrations.mjs`** on the existing measure fixture (a listed fixture measure, or create one in the fixture block):
  - anon reads its `neutral` rows;
  - anon reads **0** of its `support` and `oppose` rows;
  - a published fixture measure still shows all its rows to anon;
  - a `draft` or `in_review` measure's neutral rows stay unreadable.

  Run it and expect the neutral-visibility check to FAIL.
- [ ] **Step 2: Write the policy change:**

```sql
DROP POLICY IF EXISTS anon_read_measure_resource ON measure_resource;
CREATE POLICY anon_read_measure_resource ON measure_resource
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = measure_resource.measure_id
      AND (mp.status = 'published'
           OR (mp.status = 'listed' AND measure_resource.stance = 'neutral'))
  ));
```

  Explain in the header comment why sided rows stay gated: the 2× rule protects the sides, and neutral material takes no side, so showing it early cannot make a page one-sided.
- [ ] **Step 3: Seed AM1's opened neutral rows** in `0038`'s source and resource style. Include:
  - `official`: the DoS record (seqnum 108), the flsenate bill page and the flhouse bill page for HJR 5019;
  - `analysis` / `neutral`: the James Madison Institute guide;
  - `reporting`: WUSF, CBS Miami, the Ocala Gazette, WFLA (opened in the browser) and the Bradenton Times AM1 explainer.

  Exclude anything not opened, and every sided row (AM1 stays listed; its sided rows are for a future migration). Titles are verbatim; take them from the doc or re-open the page to copy the headline. Do **not** touch `measure_publication`.
- [ ] **Step 4: Update `verify-ballot-seeds.mjs`.** AM1 is still `listed` and still has 0 support and 0 oppose rows, and anon now reads exactly K+1 AM1 rows (K plus the 0035 booklet). Add a README row for 0041 in the same style: not applied; precondition 0040 applied; read-back AM1 listed, K+1 neutral rows visible to anon, 0 sided.
- [ ] **Step 5: Run the checks.** Run `node scripts/verify-measure-resources.ts supabase/migrations/0041_measure_neutral_listed.sql` (0 findings), then `node scripts/verify-migrations.mjs` and `node scripts/verify-ballot-seeds.mjs`. All must pass.
- [ ] **Step 6: Commit.** Message: `Show neutral measure resources while listed; seed Amendment 1's neutral rows (0041)`.

---

### Task 3: Held-page note and neutral block

**Files:**
- Create: `src/lib/measure-held-copy.ts`, `scripts/verify-measure-held.ts`
- Modify: `src/lib/measures.ts`, `src/components/features/MeasureResourceLadder.tsx`, `src/app/(public)/measures/[measureId]/page.tsx`

**Interfaces:**
- Produces:
  - `heldNote(measureId: string): HeldNote | null`, where `interface HeldNote { paragraphs: string[]; updated: string }`
  - `MeasureListing.neutral: MeasureResourceWithSource[]`
  - `MeasureNeutralBlock({ items }: { items: MeasureResourceWithSource[] })`

- [ ] **Step 1: Write `scripts/verify-measure-held.ts` (failing):**

```ts
/* Guardrails for the held-measure page (spec
   docs/superpowers/specs/2026-09-26-amendment-context-design.md §3).
   Run: node scripts/verify-measure-held.ts */
import { readFileSync } from "node:fs";
import { HELD_NOTES, heldNote } from "../src/lib/measure-held-copy.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

const ids = Object.keys(HELD_NOTES);
check("AM1 has a held note", heldNote("FL-AM1-general") !== null);
check("unknown measure has none", heldNote("FL-AM9-general") === null);
for (const id of ids) {
  const n = HELD_NOTES[id];
  check(`${id}: updated is YYYY-MM-DD`, /^\d{4}-\d{2}-\d{2}$/.test(n.updated));
  check(`${id}: has paragraphs`, n.paragraphs.length > 0 && n.paragraphs.every((p) => p.trim().length > 0));
  const text = n.paragraphs.join(" ").toLowerCase();
  /* Process only: the note may not argue the amendment's merits. */
  check(
    `${id}: no merits language`,
    !/\b(good|bad|should vote|vote yes|vote no|harmful|beneficial|wasteful|reckless|smart)\b/.test(text),
    text
  );
}

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const page = read("src/app/(public)/measures/[measureId]/page.tsx");
check("page renders the neutral block for a held measure", /<MeasureNeutralBlock\b/.test(page));
check("page renders the held note", /heldNote\(/.test(page));
check("page never renders sided columns outside the published brief", !/brief\s*\?\s*\(?\s*<Column|support\.map|oppose\.map/.test(page));

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nverify-measure-held: all checks passed.");
```

  Run `node scripts/verify-measure-held.ts` and expect it to fail with ERR_MODULE_NOT_FOUND.
- [ ] **Step 2: Create `src/lib/measure-held-copy.ts`:**

```ts
/* What a held (listed) ballot measure's page says in place of the YES/NO
   columns (spec docs/superpowers/specs/2026-09-26-amendment-context-design.md
   §3). Every sentence is about our process or the public record, never the
   measure's merits. `updated` changes only when the note changes, so the
   page never claims a check it did not make. Measures without an entry keep
   the page's generic card. */

export interface HeldNote {
  paragraphs: string[];
  updated: string; // YYYY-MM-DD
}

export const HELD_NOTES: Record<string, HeldNote> = {
  "FL-AM1-general": {
    paragraphs: [
      "Supporters and opponents of Amendment 1 have been quoted in news coverage, listed above, but we haven't yet found either side making its case in its own words, such as a statement, testimony or a page it published itself. We add a side only from its own words.",
      "The Legislature's journals record how every member voted on this amendment, but no member filed a written explanation of their vote.",
    ],
    updated: "2026-09-26",
  },
};

export function heldNote(measureId: string): HeldNote | null {
  return HELD_NOTES[measureId] ?? null;
}
```

  Run `node scripts/verify-measure-held.ts`. The two note checks pass; the three page scans fail.
- [ ] **Step 3: `src/lib/measures.ts`.**
  - Add `neutral: MeasureResourceWithSource[];` to `MeasureListing`.
  - In `fetchMeasureListing`, for `listed`, read the rows (RLS now returns only the neutral ones):

```ts
  let neutral: MeasureResourceWithSource[] = [];
  let brief: MeasureBrief | null = null;
  if (status === "published") {
    brief = await fetchMeasureBrief(measureId);
    neutral = brief?.neutral ?? [];
  } else {
    const { data: rows } = await supabase
      .from("measure_resource")
      .select("*, source!inner(*)")
      .eq("measure_id", measureId)
      .eq("stance", "neutral");
    neutral = toSourced((rows ?? []) as ResourceRow[], "neutral");
  }
  return { measure, status, brief, neutral };
```

  - Update the comment above `MeasureListing`. It currently says a listed measure's resources are unreadable, which is no longer true: neutral rows are readable while listed, and sided rows only once published.
- [ ] **Step 4: `MeasureResourceLadder.tsx`.** Export the neutral block, and have the ladder use it so there is one implementation:

```tsx
export function MeasureNeutralBlock({ items }: { items: MeasureResourceWithSource[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3">Understand it first</h2>
      <TieredList items={items} kinds={NEUTRAL_KINDS} />
    </section>
  );
}
```

  Replace the ladder's inline `{brief.neutral.length > 0 && (…)}` block with `<MeasureNeutralBlock items={brief.neutral} />`. Keep the existing wrapper element and class names, so the published page renders the same markup it does today. Read the file first and match its exact existing markup.
- [ ] **Step 5: Measure page.** In the `brief ? … : …` branch, replace the held `<Card>` with:

```tsx
        <>
          <MeasureNeutralBlock items={listing.neutral} />
          <Card className="flex flex-col gap-2">
            <h2 className="text-h3">What people say for and against it</h2>
            {note ? (
              <>
                {note.paragraphs.map((p) => (
                  <p key={p} className="text-body-sm text-on-surface-muted">{p}</p>
                ))}
                <p className="text-caption text-on-surface-muted">
                  We look for new statements every week. This note was last
                  updated {formatNoteDate(note.updated)}.
                </p>
              </>
            ) : (
              <p className="text-body-sm text-on-surface-muted">
                Resources on both sides are being collected. We publish them only
                when both sides are represented &mdash; until then, this is the
                official ballot text and nothing else.
              </p>
            )}
          </Card>
        </>
```

  - Before the return, add `const note = heldNote(measure.measure_id);`.
  - Add a local helper:

```tsx
function formatNoteDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
```

  - Import `heldNote` from `@/lib/measure-held-copy` and `MeasureNeutralBlock` from the ladder module.
  - Change the footer text for a held measure that has neutral rows to `"We collect what others publish and order it by the kind of source. We write none of it. You decide."`. Keep the existing ballot-only line when there are none.
- [ ] **Step 6: Run the checks.** Run `node scripts/verify-measure-held.ts` (all pass), `node scripts/verify-measure-balance.ts`, `npx tsc --noEmit -p . 2>&1 | grep -v "^.next/\|typesafe-ai"` (no output) and `npx eslint src/lib/measure-held-copy.ts src/lib/measures.ts src/components/features/MeasureResourceLadder.tsx "src/app/(public)/measures" scripts/verify-measure-held.ts` (no output).
- [ ] **Step 7: Browser check.** Use the preview tool (`know-your-vote-dev`); link `.env.local` if needed. Against the live database, where 0041 is not applied yet: `/measures/FL-AM1-general` shows the AM1 note and date and no YES/NO columns. The neutral block is absent until 0041 is applied, which is correct. `/measures/FL-AM3-general` is unchanged. Check the console for no errors, and take one screenshot of AM1.
- [ ] **Step 8: Commit.** Message: `Explain held ballot measures and show their neutral material`.
