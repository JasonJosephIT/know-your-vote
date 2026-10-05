# Quiz Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the clipped quiz with (1) a Ballotpedia link card on `/candidates` and (2) a no-AI issue filter on race pages that shows each candidate's own sourced statements side by side, one row per chosen issue.

**Architecture:** Pure logic lives in `src/lib/issue-pick.ts` (URL parsing, chip hrefs, and row building), where a `node` verify script can test it. Everything else is server components, so no `"use client"` is needed. The filtered view is a new dynamic route, `/races/[raceId]/issues?pick=…`. The existing race page stays static (ISR) and only gains a row of chip links.

**Tech Stack:** Next.js 16 App Router (server components; `params` and `searchParams` are Promises), TypeScript, Tailwind, and Node ≥ 22 running `.ts` verify scripts directly (type stripping).

**Spec:** `docs/superpowers/specs/2026-09-25-quiz-replacement-design.md`

**Branch:** build on top of `claude/clip-quiz` (PR #94), or on `main` once #94 has merged. The spec commit `cef95b1` is on that branch.

## Global Constraints

- The filtered view never renders `stanceSummary`, `done` or `factCheck`. It shows each candidate's `say` claims, their sources, and the recorded `no_stated_position_found` wording, nothing else.
- No new client JavaScript. None of the new files may contain `"use client"`.
- `src/app/(public)/races/[raceId]/page.tsx` must not read `searchParams` and must not export `dynamic`, so it keeps prerendering (`revalidate = 3600`, `generateStaticParams`).
- The filter offers **spine issues only** (`issue.tier === "spine"`). A sub-issue id is `issue_id` with the `${race_id}--issue-` prefix removed.
- `pick` ids always come out in spine order, whatever order the URL gives them in. Unknown ids are dropped silently. If no valid pick is left, the page redirects to `/races/<raceId>`.
- The Ballotpedia card: heading **"Another view"**; body "Ballotpedia, a nonpartisan encyclopedia, has a sample-ballot lookup and candidates' own survey answers."; link text **"Look up your ballot on Ballotpedia"**; href `https://ballotpedia.org/Sample_Ballot_Lookup`; `target="_blank" rel="noreferrer"`. No `<img>`, `<iframe>` or `<script>`.
- Do not add `/issues` URLs to `src/app/sitemap.ts`. Add no analytics event.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/issue-pick.ts` (create) | Pure: `subIssueIdOf`, `spineOptions`, `parseIssuePick`, `pickHref`, `togglePickHref`, `issueRowsFor` and their types |
| `scripts/verify-issue-pick.ts` (create) | Unit checks for `issue-pick.ts`, plus source-scan guardrails |
| `src/components/features/ClaimList.tsx` (create) | `ClaimList` and `NoStatedPosition`, moved out of `IssueSection.tsx` so both views share them |
| `src/components/features/IssueSection.tsx` (modify) | Imports the two components above; its rendering is unchanged |
| `src/components/features/RaceHeader.tsx` (create) | The race heading, moved out of the race page so both routes share it |
| `src/components/features/IssueFilter.tsx` (create) | The chip links |
| `src/components/features/IssueRows.tsx` (create) | The per-issue grid |
| `src/app/(public)/races/[raceId]/page.tsx` (modify) | Uses the shared `RaceHeader` and adds `IssueFilter` above `RaceCompare` |
| `src/app/(public)/races/[raceId]/issues/page.tsx` (create) | The filtered view |
| `src/components/features/OutsideResources.tsx` (create) | The Ballotpedia card |
| `src/app/(public)/candidates/page.tsx` (modify) | Renders `OutsideResources` under the tab nav |

---

### Task 1: Pure pick logic, tested

**Files:**
- Create: `src/lib/issue-pick.ts`
- Create: `scripts/verify-issue-pick.ts`

**Interfaces:**
- Consumes: `RaceBrief`, `SourcedClaim` and `IssueBlock` from `src/lib/briefs.ts` (types only), and `Issue` from `src/types/schema.ts` (type only).
- Produces (later tasks rely on these exact names):
  - `interface SpineOption { id: string; title: string }`
  - `interface IssueCell { candidateId: string; name: string; coverage: IssueBlock["coverage"] | null; say: SourcedClaim[] }`
  - `interface IssueRow { subIssueId: string; title: string; cells: IssueCell[] }`
  - `subIssueIdOf(issue: Pick<Issue, "issue_id" | "race_id">): string`
  - `spineOptions(spineIssues: Issue[]): SpineOption[]`
  - `parseIssuePick(raw: string | string[] | undefined, available: string[]): string[]`
  - `pickHref(raceId: string, ids: string[]): string`
  - `togglePickHref(raceId: string, current: string[], id: string, available: string[]): string`
  - `issueRowsFor(brief: RaceBrief, selected: string[]): IssueRow[]`

- [ ] **Step 1: Write the failing verify script**

Create `scripts/verify-issue-pick.ts`:

```ts
/* Guardrails for the quiz replacement's issue filter (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md).

   1. parseIssuePick / togglePickHref: the URL is the only state, so its
      parsing must be total and canonical (spine order, no unknowns, no dupes).
   2. issueRowsFor: the filtered view carries each candidate's own `say`
      claims and nothing the site wrote. A sentinel planted in stanceSummary,
      done and factCheck must never reach its output.
   3. Source scans (added by later tasks): the view's components cannot
      render what the data layer already withholds, and the hub's outbound
      card loads nothing from the third party.

   Run: node scripts/verify-issue-pick.ts */

import {
  issueRowsFor,
  parseIssuePick,
  pickHref,
  spineOptions,
  subIssueIdOf,
  togglePickHref,
} from "../src/lib/issue-pick.ts";
import type { RaceBrief } from "../src/lib/briefs.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ---- 1. parseIssuePick / pickHref / togglePickHref ---------------------- */
const AVAILABLE = ["economy", "housing", "insurance"];

check("unknown id dropped", eq(parseIssuePick("housing,bogus", AVAILABLE), ["housing"]));
check("duplicates removed", eq(parseIssuePick("housing,housing", AVAILABLE), ["housing"]));
check(
  "output follows spine order, not URL order",
  eq(parseIssuePick("insurance,economy", AVAILABLE), ["economy", "insurance"])
);
check("undefined gives []", eq(parseIssuePick(undefined, AVAILABLE), []));
check("empty string gives []", eq(parseIssuePick("", AVAILABLE), []));
check("lone comma gives []", eq(parseIssuePick(",", AVAILABLE), []));
check(
  "array value is joined",
  eq(parseIssuePick(["insurance", "economy,housing"], AVAILABLE), AVAILABLE)
);
check("whitespace trimmed", eq(parseIssuePick(" housing , economy ", AVAILABLE), ["economy", "housing"]));
check("ids are case-sensitive", eq(parseIssuePick("Housing", AVAILABLE), []));

check("pickHref with ids", pickHref("FL-GOV-general", ["economy", "housing"]) === "/races/FL-GOV-general/issues?pick=economy,housing");
check("pickHref with none returns the race page", pickHref("FL-GOV-general", []) === "/races/FL-GOV-general");
check(
  "toggle adds, in spine order",
  togglePickHref("FL-GOV-general", ["insurance"], "economy", AVAILABLE) ===
    "/races/FL-GOV-general/issues?pick=economy,insurance"
);
check(
  "toggle removes",
  togglePickHref("FL-GOV-general", ["economy", "insurance"], "economy", AVAILABLE) ===
    "/races/FL-GOV-general/issues?pick=insurance"
);
check(
  "toggle removing the last returns the race page",
  togglePickHref("FL-GOV-general", ["economy"], "economy", AVAILABLE) === "/races/FL-GOV-general"
);

/* ---- 2. spineOptions / issueRowsFor ------------------------------------- */
const RACE = "FL-GOV-general";
const SENTINEL = "SENTINEL-SITE-AUTHORED";
const issue = (sub: string, title: string, tier: "spine" | "candidate" = "spine", order = 0) => ({
  issue_id: `${RACE}--issue-${sub}`,
  race_id: RACE,
  tier,
  candidate_id: null,
  title,
  description: null,
  source_id: null,
  display_order: order,
});
const claim = (id: string, text: string) => ({
  claim: { claim_id: id, text, verdict: null },
  sources: [{ source_id: `src-${id}`, url: `https://example.org/${id}`, publisher: "Example" }],
});
const block = (
  iss: ReturnType<typeof issue>,
  coverage: "stated" | "no_stated_position_found",
  sayText: string | null
) => ({
  issue: iss,
  coverage,
  stanceSummary: SENTINEL,
  say: sayText ? [claim(`${iss.issue_id}-say`, sayText)] : [],
  done: [claim(`${iss.issue_id}-done`, SENTINEL)],
  factCheck: [claim(`${iss.issue_id}-fc`, SENTINEL)],
  policyAreas: [],
});

const ECON = issue("economy", "Economy & Affordability", "spine", 1);
const HOUS = issue("housing", "Housing", "spine", 2);
const INS = issue("insurance", "Insurance & Property Costs", "spine", 3);
const EXTRA = issue("KYV9", "A candidate-added issue", "candidate", 4);

const fixture = {
  race: { race_id: RACE, office: "Governor" },
  spineIssues: [ECON, HOUS, INS],
  candidates: [
    {
      candidate: { candidate_id: "cand-a", legal_name: "Alex Able" },
      socials: [],
      audit: {},
      issues: [
        block(ECON, "stated", "A on economy"),
        block(HOUS, "no_stated_position_found", null),
        block(INS, "stated", "A on insurance"),
        block(EXTRA, "stated", "A extra"),
      ],
    },
    {
      candidate: { candidate_id: "cand-b", legal_name: "Blair Baker" },
      socials: [],
      audit: {},
      /* No block for INS: a data gap, which must not be rendered as a
         recorded "no stated position" claim. */
      issues: [block(ECON, "stated", "B on economy"), block(HOUS, "stated", "B on housing")],
    },
  ],
} as unknown as RaceBrief;

check("subIssueIdOf strips the race prefix", subIssueIdOf(HOUS) === "housing");
check(
  "spineOptions keeps spine only, in order",
  eq(spineOptions([ECON, HOUS, INS, EXTRA] as never), [
    { id: "economy", title: "Economy & Affordability" },
    { id: "housing", title: "Housing" },
    { id: "insurance", title: "Insurance & Property Costs" },
  ])
);

const rows = issueRowsFor(fixture, ["insurance", "housing"]);
check("one row per selected issue, spine order", eq(rows.map((r) => r.subIssueId), ["housing", "insurance"]));
check("row title is the issue's own title", rows[0]?.title === "Housing");
check("cells follow candidate order", eq(rows[0]?.cells.map((c) => c.candidateId), ["cand-a", "cand-b"]));
check("cell carries the candidate's name", rows[0]?.cells[0]?.name === "Alex Able");
check(
  "recorded no-stated-position carries through, with no claims",
  rows[0]?.cells[0]?.coverage === "no_stated_position_found" && rows[0]?.cells[0]?.say.length === 0
);
check("stated cell carries its say claims", rows[0]?.cells[1]?.say[0]?.claim.text === "B on housing");
check(
  "a missing block is null coverage, not a recorded silence",
  rows[1]?.cells[1]?.coverage === null && rows[1]?.cells[1]?.say.length === 0
);
check("candidate-tier issues cannot be selected", issueRowsFor(fixture, ["KYV9"]).length === 0);
check("no selection gives no rows", issueRowsFor(fixture, []).length === 0);
check(
  "nothing site-authored (stanceSummary, done, factCheck) reaches the rows",
  !JSON.stringify(issueRowsFor(fixture, ["economy", "housing", "insurance"])).includes(SENTINEL)
);

/* ---- 3. source scans (appended by later tasks) -------------------------- */

/* ---- summary ------------------------------------------------------------ */
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-issue-pick: all checks passed.");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node scripts/verify-issue-pick.ts`
Expected: it fails with `ERR_MODULE_NOT_FOUND` for `src/lib/issue-pick.ts`.

- [ ] **Step 3: Write `src/lib/issue-pick.ts`**

```ts
/* The race page's issue filter (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md).

   Pure, so scripts/verify-issue-pick.ts can drive it with no database and no
   React. The URL is the only state: `?pick=` ids are canonicalised here to
   spine order, and unknown ids are dropped, so two links with the same picks
   render the same page.

   issueRowsFor is where the no-authored-text rule is enforced: IssueCell has
   no field for stanceSummary, done or factCheck, so the view built on it
   cannot show what the site wrote about a candidate. Only what each
   candidate said, with its sources, crosses this boundary. */

import type { Issue } from "@/types/schema";
import type { IssueBlock, RaceBrief, SourcedClaim } from "@/lib/briefs";

export interface SpineOption {
  id: string;
  title: string;
}

export interface IssueCell {
  candidateId: string;
  name: string;
  /* null = the brief has no block for this candidate on this issue. That is
     a data gap, not the recorded "we searched and found nothing", so the
     view says nothing rather than making that claim. */
  coverage: IssueBlock["coverage"] | null;
  say: SourcedClaim[];
}

export interface IssueRow {
  subIssueId: string;
  title: string;
  cells: IssueCell[];
}

/* issue_id is `${race_id}--issue-${subIssueId}` (src/lib/brief-rows.ts). */
export function subIssueIdOf(issue: Pick<Issue, "issue_id" | "race_id">): string {
  const prefix = `${issue.race_id}--issue-`;
  return issue.issue_id.startsWith(prefix)
    ? issue.issue_id.slice(prefix.length)
    : issue.issue_id;
}

/* Spine issues only: every candidate in the race is measured on them, so a
   side-by-side row is meaningful. A candidate-tier extra would be empty for
   everyone else. */
export function spineOptions(spineIssues: Issue[]): SpineOption[] {
  return spineIssues
    .filter((i) => i.tier === "spine")
    .map((i) => ({ id: subIssueIdOf(i), title: i.title }));
}

export function parseIssuePick(
  raw: string | string[] | undefined,
  available: string[]
): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const wanted = new Set(
    joined
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return available.filter((id) => wanted.has(id));
}

export function pickHref(raceId: string, ids: string[]): string {
  const base = `/races/${encodeURIComponent(raceId)}`;
  if (ids.length === 0) return base;
  return `${base}/issues?pick=${ids.map(encodeURIComponent).join(",")}`;
}

export function togglePickHref(
  raceId: string,
  current: string[],
  id: string,
  available: string[]
): string {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return pickHref(
    raceId,
    available.filter((a) => next.has(a))
  );
}

export function issueRowsFor(brief: RaceBrief, selected: string[]): IssueRow[] {
  const want = new Set(selected);
  return brief.spineIssues
    .filter((issue) => issue.tier === "spine" && want.has(subIssueIdOf(issue)))
    .map((issue) => ({
      subIssueId: subIssueIdOf(issue),
      title: issue.title,
      cells: brief.candidates.map((c) => {
        const found = c.issues.find((b) => b.issue.issue_id === issue.issue_id);
        return {
          candidateId: c.candidate.candidate_id,
          name: c.candidate.legal_name,
          coverage: found ? found.coverage : null,
          say: found && found.coverage === "stated" ? found.say : [],
        };
      }),
    }));
}
```

- [ ] **Step 4: Run the verify script and confirm it passes**

Run: `node scripts/verify-issue-pick.ts`
Expected: every line reads `ok`, and the last line is `verify-issue-pick: all checks passed.`

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "^.next/\|typesafe-ai"` and then `npx eslint src/lib/issue-pick.ts scripts/verify-issue-pick.ts`
Expected: no output from either command. The two filtered-out errors are pre-existing: stale `.next` types and a missing local SDK.

- [ ] **Step 6: Commit**

```bash
git add src/lib/issue-pick.ts scripts/verify-issue-pick.ts
git commit -m "Add pure issue-pick logic for the race-page issue filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Share the claim rendering

**Files:**
- Create: `src/components/features/ClaimList.tsx`
- Modify: `src/components/features/IssueSection.tsx`

**Interfaces:**
- Consumes: `SourcedClaim` from `src/lib/briefs.ts`, `SourceLinks`, `VerdictBadge`.
- Produces: `ClaimList({ items, withVerdict }: { items: SourcedClaim[]; withVerdict?: boolean })` and `NoStatedPosition()` (no props), both exported from `@/components/features/ClaimList`.

This is a move with no behaviour change: the rendered HTML of `IssueSection` stays identical.

- [ ] **Step 1: Create `src/components/features/ClaimList.tsx`**

```tsx
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SourceLinks } from "@/components/features/SourceLinks";
import type { SourcedClaim } from "@/lib/briefs";

/* A candidate's claims with their sources. Shared by the full brief
   (IssueSection) and the race page's issue filter (IssueRows), so a claim
   reads the same wherever it appears. */
export function ClaimList({
  items,
  withVerdict,
}: {
  items: SourcedClaim[];
  withVerdict?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ claim, sources }) => (
        <li key={claim.claim_id} className="flex flex-col gap-1">
          <p className="text-body-sm">{claim.text}</p>
          <span className="flex flex-wrap items-center gap-2">
            {withVerdict && claim.verdict && <VerdictBadge verdict={claim.verdict} />}
            <SourceLinks sources={sources} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* The recorded coverage state `no_stated_position_found`. One wording for
   every view, so silence is described the same way everywhere. */
export function NoStatedPosition() {
  return (
    <p className="rounded-md bg-surface-muted px-3 py-2 text-body-sm text-on-surface-muted">
      No stated position found — we searched this candidate&apos;s own
      sources and found no position on this issue. Silence is recorded
      honestly, never filled in.
    </p>
  );
}
```

- [ ] **Step 2: Point `IssueSection.tsx` at the shared components**

In `src/components/features/IssueSection.tsx`:
- Replace the imports of `VerdictBadge` and `SourceLinks`, and delete the whole local `function ClaimList(...) { ... }` block, with:

```tsx
import { ClaimList, NoStatedPosition } from "@/components/features/ClaimList";
```

- Keep the `PolicyAreaChip` import, and change the type import to `import type { IssueBlock } from "@/lib/briefs";` because `SourcedClaim` is no longer used there.
- Replace the inline `no_stated_position_found` paragraph:

```tsx
      {block.coverage === "no_stated_position_found" && <NoStatedPosition />}
```

The `buckets` loop and its `<ClaimList items={items} withVerdict={key === "factCheck"} />` call stay as they are.

- [ ] **Step 3: Typecheck, lint, and confirm the wording didn't change**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "^.next/\|typesafe-ai"`, then `npx eslint src/components/features/ClaimList.tsx src/components/features/IssueSection.tsx`, then `grep -c "No stated position found" src/components/features/ClaimList.tsx src/components/features/IssueSection.tsx`
Expected: no output from tsc or eslint. The grep prints `ClaimList.tsx:1` and `IssueSection.tsx:0`.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/ClaimList.tsx src/components/features/IssueSection.tsx
git commit -m "Move ClaimList and the no-stated-position note into a shared module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The filter, the per-issue view, and the issues route

**Files:**
- Create: `src/components/features/RaceHeader.tsx`
- Create: `src/components/features/IssueFilter.tsx`
- Create: `src/components/features/IssueRows.tsx`
- Create: `src/app/(public)/races/[raceId]/issues/page.tsx`
- Modify: `src/app/(public)/races/[raceId]/page.tsx`
- Modify: `scripts/verify-issue-pick.ts` (append source scans)

**Interfaces:**
- Consumes: everything Task 1 produced (`spineOptions`, `parseIssuePick`, `pickHref`, `togglePickHref`, `issueRowsFor`, `SpineOption`, `IssueRow`), and Task 2's `ClaimList` and `NoStatedPosition`.
- Produces:
  - `RaceHeader({ race, children }: { race: Race; children?: React.ReactNode })`
  - `IssueFilter({ raceId, options, selected }: { raceId: string; options: SpineOption[]; selected: string[] })`
  - `IssueRows({ rows }: { rows: IssueRow[] })`

- [ ] **Step 1: Add the failing source scans to the verify script**

In `scripts/verify-issue-pick.ts`, add `import { readFileSync } from "node:fs";` under the existing imports. Then replace the line `/* ---- 3. source scans (appended by later tasks) -------------------------- */` with:

```ts
/* ---- 3. source scans ---------------------------------------------------- */
const read = (p: string) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
/* Comments may name the forbidden fields to explain the rule; code may not. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const issueRows = code("src/components/features/IssueRows.tsx");
check("IssueRows.tsx exists", issueRows.length > 0);
check(
  "IssueRows renders no site-authored field",
  !/stanceSummary|factCheck|\.done\b/.test(issueRows)
);
for (const f of [
  "src/components/features/IssueRows.tsx",
  "src/components/features/IssueFilter.tsx",
  "src/app/(public)/races/[raceId]/issues/page.tsx",
]) {
  check(`${f} adds no client JavaScript`, read(f).length > 0 && !read(f).includes('"use client"'));
}
const racePage = code("src/app/(public)/races/[raceId]/page.tsx");
check(
  "race page stays static: no searchParams, no dynamic export",
  racePage.length > 0 && !/searchParams|export const dynamic/.test(racePage)
);
check("race page renders the IssueFilter", /<IssueFilter\b/.test(racePage));
```

- [ ] **Step 2: Run it to confirm the new checks fail**

Run: `node scripts/verify-issue-pick.ts`
Expected: `FAIL  IssueRows.tsx exists`, the three `adds no client JavaScript` checks fail, `race page renders the IssueFilter` fails, and the script exits with code 1.

- [ ] **Step 3: Move the race heading into `src/components/features/RaceHeader.tsx`**

```tsx
import type { Race } from "@/types/schema";

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* Office, district and dates. Identical for a brief, a listing and the
   issue-filtered view, so a race keeps its heading in every state. */
export function RaceHeader({
  race,
  children,
}: {
  race: Race;
  children?: React.ReactNode;
}) {
  const general = formatDate(race.key_dates?.general_date);
  const registration = formatDate(race.key_dates?.registration_deadline);
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-h1">{race.office}</h1>
      <p className="text-body-sm text-on-surface-muted">
        {race.district ?? "Statewide"}
        {general ? ` · General election ${general}` : ""}
        {registration ? ` · Register by ${registration}` : ""}
      </p>
      {children}
    </header>
  );
}
```

In `src/app/(public)/races/[raceId]/page.tsx`, delete the local `formatDate` function and the local `RaceHeader` function together with its comment. Add `import { RaceHeader } from "@/components/features/RaceHeader";`. Remove the `import type { Race } from "@/types/schema";` line only if nothing else in the file still uses `Race` (check with `grep -n "Race\b" "src/app/(public)/races/[raceId]/page.tsx"`).

- [ ] **Step 4: Create `src/components/features/IssueFilter.tsx`**

```tsx
import Link from "next/link";
import { pickHref, togglePickHref, type SpineOption } from "@/lib/issue-pick";

/* Chips for the race's spine issues. Each one is a plain link that adds or
   removes that issue in the URL, so there is no client state, nothing is
   stored, and a filtered view can be shared. */
export function IssueFilter({
  raceId,
  options,
  selected,
}: {
  raceId: string;
  options: SpineOption[];
  selected: string[];
}) {
  if (options.length === 0) return null;
  const available = options.map((o) => o.id);
  return (
    <nav aria-label="Compare on issues" className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">
        Compare what each candidate says on:
      </p>
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <li key={o.id}>
              <Link
                href={togglePickHref(raceId, selected, o.id, available)}
                aria-current={on ? "true" : undefined}
                className={`inline-block rounded-full px-4 py-2 text-caption transition-colors ${
                  on
                    ? "bg-primary-muted text-primary-hover"
                    : "bg-surface-muted text-on-surface-muted hover:text-on-surface"
                }`}
              >
                {o.title}
              </Link>
            </li>
          );
        })}
        {selected.length > 0 && (
          <li>
            <Link
              href={pickHref(raceId, [])}
              className="inline-block px-2 py-2 text-caption text-primary underline underline-offset-2"
            >
              Show everything
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: Create `src/components/features/IssueRows.tsx`**

```tsx
import Link from "next/link";
import { ClaimList, NoStatedPosition } from "@/components/features/ClaimList";
import type { IssueRow } from "@/lib/issue-pick";

/* One section per chosen issue, with the candidates side by side in ballot
   order and the same column rule as RaceCompare (at most 3 across, stacking
   on mobile). Each cell holds only what the candidate said, with its
   sources. IssueRow carries nothing else, so nothing else can render here.
   The full record is one click away on the candidate's page. */
export function IssueRows({ rows }: { rows: IssueRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      {rows.map((row) => (
        <section
          key={row.subIssueId}
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <h2 className="text-h2">{row.title}</h2>
          <div
            className="grid grid-cols-1 items-start gap-5 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": Math.min(row.cells.length, 3) } as React.CSSProperties}
          >
            {row.cells.map((cell) => (
              <article
                key={cell.candidateId}
                className="flex flex-col gap-2 rounded-md border border-border p-4"
              >
                <h3 className="text-h3">
                  <Link
                    href={`/candidates/${cell.candidateId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {cell.name}
                  </Link>
                </h3>
                {cell.coverage === "no_stated_position_found" && <NoStatedPosition />}
                {cell.say.length > 0 && <ClaimList items={cell.say} />}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/app/(public)/races/[raceId]/issues/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRaceBrief } from "@/lib/briefs";
import { RaceHeader } from "@/components/features/RaceHeader";
import { IssueFilter } from "@/components/features/IssueFilter";
import { IssueRows } from "@/components/features/IssueRows";
import {
  issueRowsFor,
  parseIssuePick,
  pickHref,
  spineOptions,
} from "@/lib/issue-pick";

/* The race page narrowed to the issues a voter picked (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md). Its own
   route because reading searchParams makes a page dynamic, and the race
   page itself must stay prerendered. The data is the same cached
   getRaceBrief call, so this page does not go back to the database. */

type Props = {
  params: Promise<{ raceId: string }>;
  searchParams: Promise<{ pick?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { raceId } = await params;
  const { pick } = await searchParams;
  const brief = await getRaceBrief(raceId);
  if (!brief) return { title: "Race in review — Know Your Vote" };
  const options = spineOptions(brief.spineIssues);
  const selected = parseIssuePick(pick, options.map((o) => o.id));
  const titles = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.title)
    .join(", ");
  return {
    title: titles
      ? `${brief.race.office}: ${titles} — Know Your Vote`
      : `${brief.race.office} — Know Your Vote`,
  };
}

export default async function RaceIssuesPage({ params, searchParams }: Props) {
  const { raceId } = await params;
  const { pick } = await searchParams;
  const brief = await getRaceBrief(raceId);
  /* Not published, or the audit re-check refused it: the race page already
     explains the listed or in-review state. */
  if (!brief) redirect(pickHref(raceId, []));

  const options = spineOptions(brief.spineIssues);
  const selected = parseIssuePick(pick, options.map((o) => o.id));
  if (selected.length === 0) redirect(pickHref(raceId, []));

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <RaceHeader race={brief.race} />
      <IssueFilter raceId={raceId} options={options} selected={selected} />
      <IssueRows rows={issueRowsFor(brief, selected)} />
      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          Candidate order follows the ballot order rule, applied identically to
          every race.
        </span>
      </footer>
    </main>
  );
}
```

- [ ] **Step 7: Add the chips to the race page**

In `src/app/(public)/races/[raceId]/page.tsx`, add these imports:

```tsx
import { IssueFilter } from "@/components/features/IssueFilter";
import { spineOptions } from "@/lib/issue-pick";
```

In the published branch, change

```tsx
      <TrackView event="brief_viewed" />
      <RaceCompare brief={brief} />
```

to

```tsx
      <TrackView event="brief_viewed" />
      <IssueFilter
        raceId={raceId}
        options={spineOptions(brief.spineIssues)}
        selected={[]}
      />
      <RaceCompare brief={brief} />
```

Leave `RacePage`'s signature alone. It must still take only `params`.

- [ ] **Step 8: Run the verify script, then typecheck and lint**

Run: `node scripts/verify-issue-pick.ts`
Expected: every line reads `ok`, and the last line is `verify-issue-pick: all checks passed.`

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "^.next/\|typesafe-ai"` and then `npx eslint src/components/features/RaceHeader.tsx src/components/features/IssueFilter.tsx src/components/features/IssueRows.tsx "src/app/(public)/races"`
Expected: no output from either command.

Run: `node scripts/verify-listing.ts`
Expected: `verify-listing: all checks passed.` Moving `RaceHeader` must not change the listing copy.

- [ ] **Step 9: Browser check (the redirect paths; no race is published yet)**

Link the project's env into the worktree if it's missing (it is gitignored): `[ -f .env.local ] || ln -s "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .env.local`. Then start the dev server with the preview tool (`know-your-vote-dev` in `.claude/launch.json`).
- Open `/races/FL-GOV-general/issues?pick=economy`. It should redirect to `/races/FL-GOV-general`, because FL-GOV isn't published, and that page shows the listed-race roster with no chips.
- Open `/races/FL-GOV-general/issues`. It should also redirect to `/races/FL-GOV-general`.
- The console should show no errors from the new files.

- [ ] **Step 10: Commit**

```bash
git add src/components/features/RaceHeader.tsx src/components/features/IssueFilter.tsx src/components/features/IssueRows.tsx "src/app/(public)/races/[raceId]/issues/page.tsx" "src/app/(public)/races/[raceId]/page.tsx" scripts/verify-issue-pick.ts
git commit -m "Add the race-page issue filter and per-issue comparison view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ballotpedia card on the candidates hub

**Files:**
- Create: `src/components/features/OutsideResources.tsx`
- Modify: `src/app/(public)/candidates/page.tsx`
- Modify: `scripts/verify-issue-pick.ts` (append source scans)

**Interfaces:**
- Consumes: nothing.
- Produces: `OutsideResources()`, which takes no props.

- [ ] **Step 1: Add the failing scans**

In `scripts/verify-issue-pick.ts`, directly above the line `/* ---- summary ------------------------------------------------------------ */`, add:

```ts
const outside = read("src/components/features/OutsideResources.tsx");
check("OutsideResources.tsx exists", outside.length > 0);
check("outbound card loads nothing third-party", !/<img|<iframe|<script/i.test(outside));
check(
  "outbound card links to Ballotpedia's sample ballot lookup in a new tab, no referrer",
  outside.includes('href="https://ballotpedia.org/Sample_Ballot_Lookup"') &&
    outside.includes('target="_blank"') &&
    outside.includes('rel="noreferrer"')
);
check("outbound card adds no client JavaScript", outside.length > 0 && !outside.includes('"use client"'));
check(
  "candidates hub renders the outbound card",
  /<OutsideResources\s*\/>/.test(code("src/app/(public)/candidates/page.tsx"))
);
check(
  "sitemap lists no /issues URLs",
  !read("src/app/sitemap.ts").includes("/issues")
);
```

Run: `node scripts/verify-issue-pick.ts`
Expected: `FAIL  OutsideResources.tsx exists` and the other card checks fail, and the script exits with code 1.

- [ ] **Step 2: Create `src/components/features/OutsideResources.tsx`**

```tsx
/* One outbound pointer to a nonpartisan reference (founder call 2026-09-25,
   spec docs/superpowers/specs/2026-09-25-quiz-replacement-design.md). A
   plain link and nothing else: no logo, image or embed, so the page makes
   no request to the third party until someone clicks. That keeps the
   privacy page's promise. Vote411 is deliberately not linked: its operator
   takes sides on ballot measures. */
export function OutsideResources() {
  return (
    <aside
      aria-label="Another view"
      className="flex flex-col gap-1 rounded-md border border-border bg-surface-muted px-4 py-3"
    >
      <h2 className="text-label">Another view</h2>
      <p className="text-body-sm text-on-surface-muted">
        Ballotpedia, a nonpartisan encyclopedia, has a sample-ballot lookup and
        candidates&apos; own survey answers.
      </p>
      <a
        href="https://ballotpedia.org/Sample_Ballot_Lookup"
        target="_blank"
        rel="noreferrer"
        className="text-label text-primary underline underline-offset-2"
      >
        Look up your ballot on Ballotpedia
      </a>
    </aside>
  );
}
```

- [ ] **Step 3: Render it on the hub**

In `src/app/(public)/candidates/page.tsx`, add `import { OutsideResources } from "@/components/features/OutsideResources";`. Then, directly after the closing `</nav>` of the `aria-label="Candidate views"` tab nav and before `{view === "browse" && (`, insert:

```tsx
      <OutsideResources />
```

- [ ] **Step 4: Run the verify script, then typecheck and lint**

Run: `node scripts/verify-issue-pick.ts`
Expected: the last line is `verify-issue-pick: all checks passed.`

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "^.next/\|typesafe-ai"` and then `npx eslint src/components/features/OutsideResources.tsx "src/app/(public)/candidates/page.tsx"`
Expected: no output from either command.

- [ ] **Step 5: Browser check**

With the dev server from Task 3 Step 9 running:
- Open `/candidates`, `/candidates?view=races` and `/candidates?view=saved`. The "Another view" card should show under the tabs on all three.
- Run `performance.getEntriesByType('resource').filter(r => r.name.includes('ballotpedia')).length` in the page. It should return `0`.
- Read the link's `target` and `rel` attributes. They should be `_blank` and `noreferrer`.
- Take one screenshot of `/candidates` for the report.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/OutsideResources.tsx "src/app/(public)/candidates/page.tsx" scripts/verify-issue-pick.ts
git commit -m "Add a Ballotpedia link card to the candidates hub

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
