# News Issue Tagging (Unit 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag each stored news article with zero or more issues from a frozen, PR-reviewed taxonomy, using TypeSafe's Jev model, and record enough provenance that any run is reproducible.

**Architecture:** A frozen taxonomy module (`news-issues.ts`) shared with the quiz. A pure decision core (`news-characterize.ts`) that builds the request state and validates/thresholds a response — no network, no clock, no DB. One thin vendor adapter behind an interface. A runner that reads stored `news_item` rows, calls the engine once per article, and writes `issues` plus provenance. Nothing renders to a voter until the founder answers G4.

**Tech Stack:** TypeScript, Node 22 type-stripping (`node scripts/foo.ts`), `@typesafe-ai/sdk` (Jev), Supabase/Postgres.

**Spec:** `docs/superpowers/specs/2026-09-18-news-characterization-design.md`

## Global Constraints

- **Scripts run under Node 22 type-stripping:** `node scripts/<name>.ts`. Imports of local modules carry an explicit `.ts` extension (`../src/lib/news-issues.ts`). `scripts/` is excluded from `tsc`.
- **"Pure" in this repo means no network, no clock, no DB.** `src/lib/*.ts` decision modules are pure and driven offline by `scripts/verify-*.ts`. Only `scripts/news-characterize.ts` and `src/lib/news-characterize-engines.ts` may touch a vendor SDK or the network.
- **Guardrail scripts follow the existing shape** (`scripts/verify-news-match.ts`): a `check(name, cond, detail)` helper, a `failures` counter, `process.exit(1)` on any failure, and a final one-line OK message naming the property proved.
- **The model never writes `news_item.candidate_id` or `news_item.relation`.** `src/lib/news-match.ts` owns those. (Spec §9; founder 2026-09-18 "A now, drop C".)
- **Never fetch or store an article body.** Input is headline + dek + URL path only.
- **Never compute or publish a variance from model output.** CN-R10's denominator stays `namedCountsByCandidate()`.
- **The request carries no identity we supply:** no roster, no candidate name, no race, no party, no outlet, no lean, and no URL host.
- **Migration numbers are claimed in `supabase/migrations/README.md` first**, in the same PR as the file. Next free is **0027**.
- **`AGENTS.md`: this is not the Next.js you know.** No route is added by this plan; if one is ever added, read `node_modules/next/dist/docs/` first.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/news-issues.ts` | **Create.** The frozen taxonomy: `NewsIssue`, `ISSUES`, `ISSUE_IDS`, `TAXONOMY_VERSION`. Pure data. |
| `scripts/verify-news-issues.ts` | **Create.** Guardrail: unique ids, no banned terms in labels/aliases, no drift from the quiz's ids. |
| `src/lib/news-characterize.ts` | **Create.** Pure core: `slugPath`, `buildState`, `buildQuestions`, `applyThreshold`, `provenance`. |
| `scripts/verify-news-characterize.ts` | **Create.** Guardrail + mutation checks for the core. |
| `src/lib/news-characterize-engines.ts` | **Create.** The Jev adapter behind a `CharacterizeEngine` interface. The only file importing a vendor SDK. |
| `supabase/migrations/0027_news_issues.sql` | **Create.** `issues`, `characterized_by`, `characterized_at`, GIN index. |
| `supabase/migrations/README.md` | **Modify.** Claim the 0027 ledger row. |
| `.env.example` | **Modify.** Add `TYPESAFE_API_KEY`. |
| `scripts/news-characterize.ts` | **Create.** The runner. `--dry-run` prints without writing. |
| `docs/general-election/news-characterization-eval-2026-09-18.md` | **Create (Task 6).** The evaluation report that decides the threshold and feeds G4. |

**Deliberate deviation from spec §4.1, recorded here:** the spec says `quiz-questions.ts` should *import* the taxonomy. This plan instead has the guardrail **assert** that the two id sets match, and leaves `quiz-questions.ts` untouched. Rationale: the anti-drift goal is fully met by the assertion, and refactoring a live voter-facing surface to derive its titles indirectly buys nothing and risks the quiz. Flag this to the founder in the Task 1 PR; if they want the import, it is a follow-up, not a blocker.

---

### Task 1: The frozen taxonomy

> ## ⛔ BLOCKED — do not start
>
> **Gate G3 is open.** Three issue lists exist, not two, and the founder is
> reviewing which one news tags come from:
> `docs/general-election/news-issue-taxonomy-options-2026-09-18.md`.
>
> The `ISSUES` array in Step 3 below is written from the **quiz's 8** (Option 2).
> If the founder picks Option 1 (CAP's 15 with a roll-up map), replace that array
> with the CAP ids and labels **verbatim from `CAP_Issue_List_FL_2026_v1.md`**,
> add a `rollsUpTo` field carrying the quiz id, and update the guardrail's drift
> check to assert the roll-up covers every quiz id instead of asserting equality.
> Do not draft issue labels: copy them.
>
> **Tasks 2–6 are unaffected and taxonomy-agnostic** — they iterate whatever
> `ISSUES` contains. Task 2 can start now.

**Files:**
- Create: `src/lib/news-issues.ts`
- Create: `scripts/verify-news-issues.ts`
- Read (do not modify): `src/lib/quiz-questions.ts`, `src/lib/neutrality.ts`

**Interfaces:**
- Consumes: `BANNED_TERMS`, `findBannedTermMatch` from `src/lib/neutrality.ts`; `QUIZ_QUESTIONS` from `src/lib/quiz-questions.ts` (guardrail only).
- Produces: `interface NewsIssue { id: string; label: string; aliases: readonly string[] }`, `const ISSUES: readonly NewsIssue[]`, `const ISSUE_IDS: readonly string[]`, `const TAXONOMY_VERSION: string`.

> **Founder review gate:** the `aliases` arrays below are editorial content drafted by an agent. They are the part of this file a human must actually read in the PR. The `id` and `label` values are not drafted — they are copied verbatim from the live quiz.

- [ ] **Step 1: Write the failing guardrail**

Create `scripts/verify-news-issues.ts`:

```ts
/* Guardrail for the news issue taxonomy —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.1.

   Three properties, each of which would produce a plausible-looking but wrong
   product if it broke:

     1. Ids are unique and stable. A duplicate id silently merges two issues.
     2. No label or alias carries a banned (valence / horse-race / motive) term.
        The taxonomy is voter-facing; a leading word here leaks into every card.
     3. The taxonomy ids and the quiz ids do not drift. One vocabulary, two
        consumers — a voter who answers a question about `housing` must see the
        same `housing` on their news.

   Pure and offline. Run: node scripts/verify-news-issues.ts */

import { ISSUES, ISSUE_IDS, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";
/* The core's guardrail already proves the core; this one proves the DATA. */
import { QUIZ_QUESTIONS } from "../src/lib/quiz-questions.ts";
import { findBannedTermMatch } from "../src/lib/neutrality.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

check("the taxonomy is not empty", ISSUES.length > 0);
check("TAXONOMY_VERSION is set", TAXONOMY_VERSION.trim().length > 0);

const ids = ISSUES.map((i) => i.id);
check("ids are unique", new Set(ids).size === ids.length, ids.join(","));
check("ISSUE_IDS mirrors ISSUES", ISSUE_IDS.join(",") === ids.join(","));

for (const issue of ISSUES) {
  check(`${issue.id}: id is non-empty`, issue.id.trim().length > 0);
  check(`${issue.id}: label is non-empty`, issue.label.trim().length > 0);
  const hit = findBannedTermMatch(`${issue.label} ${issue.aliases.join(" ")}`);
  check(`${issue.id}: no banned term`, hit === null, hit ? `"${hit.term}"` : "");
  check(
    `${issue.id}: aliases are non-empty strings`,
    issue.aliases.every((a) => typeof a === "string" && a.trim().length > 0),
  );
}

/* The drift check. `free-response` is a free-text prompt, not an issue, and is
   the one quiz entry with no taxonomy counterpart. */
const quizIds = QUIZ_QUESTIONS.filter((q) => q.id !== "free-response").map((q) => q.id);
const missing = quizIds.filter((q) => !ids.includes(q));
const extra = ids.filter((i) => !quizIds.includes(i));
check("every quiz issue has a taxonomy entry", missing.length === 0, missing.join(","));
check("every taxonomy entry has a quiz issue", extra.length === 0, extra.join(","));

/* Labels must agree too, not just ids — a voter reading "Housing" in the quiz
   and "Homes" on a card is the same drift wearing a different hat. */
for (const q of QUIZ_QUESTIONS) {
  if (q.id === "free-response") continue;
  const issue = ISSUES.find((i) => i.id === q.id);
  if (!issue) continue;
  check(`${q.id}: label matches the quiz title`, issue.label === q.issueTitle,
    `"${issue.label}" vs "${q.issueTitle}"`);
}

if (failures > 0) {
  console.error(`\nverify-news-issues: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-issues: OK — one vocabulary, neutral wording, no drift from the quiz");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node scripts/verify-news-issues.ts
```

Expected: FAIL — `Cannot find module '../src/lib/news-issues.ts'`.

- [ ] **Step 3: Write the taxonomy**

Create `src/lib/news-issues.ts`:

```ts
/* The news issue taxonomy —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.1.

   ONE vocabulary, two consumers. These ids are the quiz's ids
   (src/lib/quiz-questions.ts, TASK-032): a voter answers a question about
   `housing`, and the news tagged `housing` is the same `housing`. A second
   list would put two different issue vocabularies in front of one person.
   scripts/verify-news-issues.ts fails if the two ever drift.

   The list is editorial, so it lives in the repo the way the outlet corpus
   does: reviewable, diffable, blameable, changed by PR with a stated reason.
   The model PICKS FROM this list — it never invents an entry, and there is no
   field in the response it could invent one into.

   Ballot amendments are NOT issues. `ballot_measure` (migration 0010) already
   holds them with a measure_id and an official title. Modelling Amendment 3 as
   a pseudo-issue would duplicate that table and churn this list every election.

   Pure and dependency-free; scripts/verify-news-issues.ts drives it. */

/* NewsIssue is defined by the core (src/lib/news-characterize.ts), not here:
   the core owns the contract, and this module is the data that conforms to it.
   That is what lets the core be built and verified while this list is still
   under review. */
export type { NewsIssue } from "./news-characterize.ts";
import type { NewsIssue } from "./news-characterize.ts";

/** Bumped in the SAME PR as any change to ISSUES below, and recorded on every
    characterized row — so a tag written under one version is distinguishable
    from one written under the next, and a re-tag is detectable. */
export const TAXONOMY_VERSION = "1";

export const ISSUES: readonly NewsIssue[] = [
  { id: "economy", label: "Economy & Affordability",
    aliases: ["cost of living", "jobs", "wages", "taxes", "inflation", "utility bills"] },
  { id: "education", label: "Education",
    aliases: ["public schools", "teachers", "classroom funding", "school board", "universities"] },
  { id: "healthcare", label: "Healthcare",
    aliases: ["hospitals", "clinics", "Medicaid", "coverage", "prescription costs"] },
  { id: "housing", label: "Housing",
    aliases: ["rent", "homebuying", "development", "zoning", "homelessness"] },
  { id: "environment", label: "Environment & Water",
    aliases: ["water quality", "Everglades", "restoration", "conservation", "red tide", "coastal flooding"] },
  { id: "immigration", label: "Immigration",
    aliases: ["migrants", "border enforcement", "visas", "detention", "asylum"] },
  { id: "insurance", label: "Insurance & Property Costs",
    aliases: ["property insurance", "homeowners insurance", "premiums", "hurricane coverage", "Citizens Property Insurance"] },
  { id: "safety", label: "Public Safety & Crime",
    aliases: ["police", "sheriff", "courts", "sentencing", "firearms"] },
];

/** Ordered exactly as ISSUES. The question set and the provenance hash both
    depend on this order, so it is part of the taxonomy, not a detail. */
export const ISSUE_IDS: readonly string[] = ISSUES.map((i) => i.id);
```

- [ ] **Step 4: Run it to verify it passes**

```bash
node scripts/verify-news-issues.ts
```

Expected: `verify-news-issues: OK — one vocabulary, neutral wording, no drift from the quiz`

- [ ] **Step 5: Prove the drift check actually bites**

Temporarily change `{ id: "housing", label: "Housing",` to `{ id: "homes", label: "Housing",` and re-run.

Expected: FAIL on `every quiz issue has a taxonomy entry — housing` and `every taxonomy entry has a quiz issue — homes`. **Revert the edit.**

- [ ] **Step 6: Commit**

```bash
git add src/lib/news-issues.ts scripts/verify-news-issues.ts
git commit -m "feat(news): frozen issue taxonomy shared with the quiz (C11)

Eight ids and labels copied verbatim from QUIZ_QUESTIONS; the guardrail
fails if the two ever drift, so there is one vocabulary and not two.
Aliases are the editorial part and need a human read in review.

Ballot amendments deliberately excluded: ballot_measure (0010) holds them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The pure characterizer core

**Files:**
- Create: `src/lib/news-characterize.ts`
- Create: `scripts/verify-news-characterize.ts`

**Interfaces:**
- Consumes: **nothing** but `node:crypto`. Deliberately — see the note below.
- Produces:
  - `interface NewsIssue { id: string; label: string; aliases: readonly string[] }`
  - `interface CharacterizableArticle { title: string; summary?: string | null; url: string }`
  - `type ArticleState = { headline: string; dek: string | null; slug: string | null }` — a **type alias, not an interface**: TS gives aliases an implicit index signature but not interfaces, so only this form is assignable to the SDK's `EntryType`. As an interface the adapter needs a cast, and that cast is the one place a stray field could enter the request unchecked.
  - `type NoulQuestion = { type: "noul"; instructions: string; criteria: { true: string; false: string } }`
  - `function slugPath(url: string): string | null`
  - `function buildState(article: CharacterizableArticle): ArticleState`
  - `function buildQuestions(issues: readonly NewsIssue[]): Record<string, NoulQuestion>`
  - `function applyThreshold(answers: Record<string, unknown>, threshold: number, issueIds: readonly string[]): string[]`
  - `function provenance(modelId: string, questions: Record<string, NoulQuestion>, taxonomyVersion: string): string`
  - `const DEFAULT_THRESHOLD: number`

> **Deviation from the original draft, applied during implementation.** The core
> was first written to `import { ISSUE_IDS } from "./news-issues.ts"`. That was
> wrong twice over: it made Task 2 depend on G3-blocked Task 1, and "taxonomy-
> agnostic" was not actually true — the dependency was just hidden. **The
> taxonomy is now a parameter**, `NewsIssue` is defined here (the core owns the
> contract its consumers conform to), and the guardrail drives everything with a
> *fixture* taxonomy that is deliberately not the real list. Task 2 therefore
> completes while G3 is still open, and nothing in it changes when G3 is
> answered. Tasks 1, 5 and 6 pass the taxonomy in; their call sites below
> reflect that.

- [x] **Step 1: Write the failing guardrail**

Create `scripts/verify-news-characterize.ts`:

```ts
/* Guardrail for the pure characterizer core —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.3–§4.7.

   The properties here are neutrality properties, not correctness niceties:

     §4.3 — the state we build carries NO identity we supplied. Most of all it
            carries no outlet host: a model that can see "floridapolitics.com"
            can tag by outlet, and the whole point of this unit is that the
            request has no identity in it except what the headline itself says.
     §4.4 — the response shape is a closed set of numbers keyed by taxonomy id.
            An unknown id, a non-number, or an out-of-range value is dropped,
            never coerced. There is no field a lean could arrive in.
     §4.6 — NULL (not characterized) and [] (characterized, nothing over
            threshold) are different facts. applyThreshold returns [] and the
            caller is responsible for never confusing that with "skipped".
     §4.7 — buildQuestions is deterministic. Provenance is a hash of it, so a
            non-deterministic builder would make every run incomparable.

   Pure and offline. Run: node scripts/verify-news-characterize.ts */

import {
  DEFAULT_THRESHOLD,
  applyThreshold,
  buildQuestions,
  buildState,
  provenance,
  slugPath,
} from "../src/lib/news-characterize.ts";
import { ISSUE_IDS } from "../src/lib/news-issues.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- slugPath: the host must never survive ---------------------------- */
check("slugPath drops the host",
  slugPath("https://www.floridapolitics.com/archives/12345/insurance-rates") ===
    "/archives/12345/insurance-rates");
check("slugPath drops the query and hash",
  slugPath("https://example.com/a/b?utm_source=x#frag") === "/a/b");
check("slugPath returns null for a bare origin", slugPath("https://example.com/") === null);
check("slugPath returns null for junk", slugPath("not a url") === null);

/* ---- buildState: no identity we supplied ------------------------------ */
const state = buildState({
  title: "Broward property insurance rates rise again",
  summary: "County homeowners face a fourth straight increase.",
  url: "https://www.sun-sentinel.com/2026/09/18/broward-insurance/",
});
check("state has exactly three keys",
  JSON.stringify(Object.keys(state).sort()) === '["dek","headline","slug"]',
  Object.keys(state).join(","));
const serialized = JSON.stringify(state);
check("the outlet host is absent from the state",
  !serialized.includes("sun-sentinel") && !serialized.includes("sun-sentinel.com"),
  serialized);
check("the headline survives", state.headline.includes("Broward"));
check("the dek survives", (state.dek ?? "").includes("fourth straight"));

/* A sitemap row: title and URL, no dek. This is the input floor (§4.2) and it
   must produce a valid state rather than an error. */
const sitemapState = buildState({
  title: "Orange County schools budget vote set",
  summary: null,
  url: "https://www.orlandosentinel.com/2026/09/18/schools-budget/",
});
check("a missing dek yields null, not an empty string", sitemapState.dek === null);
check("a sitemap row still gets a slug", sitemapState.slug === "/2026/09/18/schools-budget");

/* ---- buildQuestions: deterministic, closed, one per issue ------------- */
const q1 = buildQuestions();
const q2 = buildQuestions();
check("buildQuestions is deterministic", JSON.stringify(q1) === JSON.stringify(q2));
check("one question per issue", Object.keys(q1).length === ISSUE_IDS.length);
check("question names are the issue ids",
  JSON.stringify(Object.keys(q1)) === JSON.stringify([...ISSUE_IDS]));
check("every question is a noul",
  Object.values(q1).every((q) => q.type === "noul"));
check("every question has both criteria",
  Object.values(q1).every((q) => q.criteria.true.length > 0 && q.criteria.false.length > 0));

/* ---- applyThreshold: closed set, fail-closed -------------------------- */
const over = applyThreshold({ housing: { type: "noul", noul: 0.91 }, economy: { type: "noul", noul: 0.12 } }, 0.7);
check("a value over threshold tags", JSON.stringify(over) === '["housing"]', JSON.stringify(over));

const none = applyThreshold({ housing: { type: "noul", noul: 0.2 } }, 0.7);
check("nothing over threshold yields an empty array, not null",
  Array.isArray(none) && none.length === 0);

const unknown = applyThreshold({ trade_policy: { type: "noul", noul: 0.99 } }, 0.7);
check("an id outside the taxonomy is dropped", unknown.length === 0, JSON.stringify(unknown));

const junk = applyThreshold(
  { housing: { type: "noul", noul: "0.9" }, economy: { type: "noul", noul: 1.4 }, safety: null },
  0.7,
);
check("a non-number, an out-of-range value and a null are all dropped",
  junk.length === 0, JSON.stringify(junk));

const leanish = applyThreshold(
  { housing: { type: "noul", noul: 0.9 }, lean: { type: "noul", noul: 0.99 } },
  0.7,
);
check("a `lean` key cannot become a tag", JSON.stringify(leanish) === '["housing"]');

check("tags come back in taxonomy order, not response order",
  JSON.stringify(applyThreshold(
    { safety: { type: "noul", noul: 0.9 }, economy: { type: "noul", noul: 0.9 } }, 0.7,
  )) === '["economy","safety"]');

check("DEFAULT_THRESHOLD is in range", DEFAULT_THRESHOLD > 0 && DEFAULT_THRESHOLD < 1);

/* ---- provenance: reproducible and comparable -------------------------- */
const p1 = provenance("jev-1.13.0", q1);
const p2 = provenance("jev-1.13.0", q2);
check("provenance is stable for the same inputs", p1 === p2, `${p1} vs ${p2}`);
check("provenance names the model", p1.includes("jev-1.13.0"));
check("provenance names the taxonomy version", p1.includes("tax-1"));
const mutated = { ...q1, housing: { ...q1.housing, instructions: q1.housing.instructions + " " } };
check("provenance changes when a question changes", provenance("jev-1.13.0", mutated) !== p1);
check("provenance changes when the model changes", provenance("jev-9.9.9", q1) !== p1);

if (failures > 0) {
  console.error(`\nverify-news-characterize: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-characterize: OK — no identity in the state, closed response set, reproducible provenance");
```

- [x] **Step 2: Run it to verify it fails**

```bash
node scripts/verify-news-characterize.ts
```

Expected: FAIL — `Cannot find module '../src/lib/news-characterize.ts'`.

- [x] **Step 3: Write the core**

Create `src/lib/news-characterize.ts`:

```ts
/* The characterizer's decision core —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.

   Everything here is PURE: no network, no clock, no DB, no vendor SDK. That
   split is the same one the sweep makes (src/lib/news-sweep.ts pure,
   scripts/news-sweep.ts fetches) and for the same reason — a function that
   reaches the network cannot be verified offline, and every rule below is a
   neutrality rule that has to be provable.

   THE RULE THAT CARRIES EVERYTHING: the state this file builds contains no
   identity that we supplied. No roster, no candidate name, no race, no party,
   no outlet, no lean — and no URL host, which is why slugPath exists. Whatever
   identity reaches the model is what the publisher put in the headline itself.

   The honest limit, stated here so nobody claims more than this file delivers:
   candidate names DO appear inside headlines, and we cannot strip them without
   mangling the text. So symmetry is not proven by construction; what is proven
   is that we added nothing. The rest is measured (spec §6).

   scripts/verify-news-characterize.ts drives this file. */

import { createHash } from "node:crypto";
import { ISSUES, ISSUE_IDS, TAXONOMY_VERSION, type NewsIssue } from "./news-issues.ts";

/** Starting point only. The real value comes from the threshold sweep against
    the hand-labelled gold set (spec §6 item 4) — do not treat this as tuned. */
export const DEFAULT_THRESHOLD = 0.7;

export interface CharacterizableArticle {
  title: string;
  /** Dek/summary. Null on sitemap-retrieved rows — that is the input floor. */
  summary?: string | null;
  url: string;
}

export interface ArticleState {
  headline: string;
  dek: string | null;
  /** URL path only. Never the host — see the header. */
  slug: string | null;
}

/** A TypeSafe NoulQuestion, structurally. Declared here rather than imported so
    the core stays free of the vendor SDK; the adapter passes these straight
    through, and the shape is checked against the SDK's types in the adapter. */
export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

/** The path of a URL, with host, query and fragment removed. Returns null when
    there is no meaningful path, or when the input is not a URL at all —
    never throws, because one malformed stored URL must not stop a sweep. */
export function slugPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return path.length > 0 ? path : null;
}

/** The complete input the model sees. Three fields, and no fourth. */
export function buildState(article: CharacterizableArticle): ArticleState {
  const dek = (article.summary ?? "").trim();
  return {
    headline: article.title.trim(),
    dek: dek.length > 0 ? dek : null,
    slug: slugPath(article.url),
  };
}

/* One Noul per issue. The wording is deliberately flat and identical across
   issues — only the issue's own label and aliases vary — so no issue gets a
   more persuasive question than another. Asking "does this relate to" rather
   than "is this about" is intentional: an article can touch an issue without
   being about it, and the threshold is what decides, not the verb. */
export function buildQuestions(
  issues: readonly NewsIssue[] = ISSUES,
): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {};
  for (const issue of issues) {
    const examples = issue.aliases.join(", ");
    questions[issue.id] = {
      type: "noul",
      instructions:
        `Does this news article relate to the policy issue "${issue.label}"? ` +
        `That issue covers topics such as: ${examples}. ` +
        `Judge only the subject matter of the headline and dek. ` +
        `Do not judge the article's tone, slant, fairness, or which side it favours.`,
      criteria: {
        true: `The article substantially concerns ${issue.label}.`,
        false: `The article does not substantially concern ${issue.label}.`,
      },
    };
  }
  return questions;
}

/* Turn a response into tags. Fail-closed at every step: anything that is not a
   known taxonomy id mapped to a finite number in [0,1] is DROPPED, never
   coerced and never guessed. This is the whole of §4.4's "there is no field a
   lean could arrive in" — an unexpected key simply has nowhere to go.

   Returns [] when nothing clears the threshold. The caller must write [] and
   not NULL: [] means "we looked and found nothing", NULL means "never looked",
   and the column distinguishes them (§4.6). */
export function applyThreshold(
  answers: Record<string, unknown>,
  threshold: number,
): string[] {
  const tags: string[] = [];
  /* Iterate the TAXONOMY, not the response — so response order cannot change
     the output, and an extra key in the response is unreachable by design. */
  for (const id of ISSUE_IDS) {
    const answer = answers[id];
    if (answer === null || typeof answer !== "object") continue;
    const value = (answer as { noul?: unknown }).noul;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < 0 || value > 1) continue;
    if (value >= threshold) tags.push(id);
  }
  return tags;
}

/** One string for news_item.characterized_by, carrying everything needed to
    reproduce a run: which model, which taxonomy version, and a hash of the
    exact questions asked. Two rows with the same value are comparable; two
    with different values are not, and the difference says why. */
export function provenance(
  modelId: string,
  questions: Record<string, NoulQuestion>,
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(questions))
    .digest("hex")
    .slice(0, 8);
  return `jev:${modelId}/tax-${TAXONOMY_VERSION}/q-${digest}`;
}
```

- [x] **Step 4: Run it to verify it passes**

```bash
node scripts/verify-news-characterize.ts
```

Expected: `verify-news-characterize: OK — no identity in the state, closed response set, reproducible provenance`

- [x] **Step 5: Run the mutation checks**

Make each change, run the guardrail, confirm it FAILS, then revert:

| Mutation | In `src/lib/news-characterize.ts` | Must fail |
|---|---|---|
| Drop the threshold | `if (value >= threshold)` → `if (true)` | "nothing over threshold yields an empty array" |
| Accept unknown ids | iterate `Object.keys(answers)` instead of `ISSUE_IDS` | "an id outside the taxonomy is dropped", "a `lean` key cannot become a tag" |
| Leak the host | `slug: article.url` in `buildState` | "the outlet host is absent from the state" |
| Coerce strings | drop the `typeof value !== "number"` guard and use `Number(value)` | "a non-number … dropped" |
| Non-deterministic questions | append `Date.now()` to `instructions` | "buildQuestions is deterministic" |

Run after each: `node scripts/verify-news-characterize.ts` — expected FAIL, then `git checkout src/lib/news-characterize.ts`.

- [x] **Step 6: Commit**

```bash
git add src/lib/news-characterize.ts scripts/verify-news-characterize.ts
git commit -m "feat(news): pure characterizer core — state, questions, threshold (C12)

The state carries no identity we supplied: no roster, no candidate, no
outlet, and no URL host (slugPath strips it). applyThreshold iterates the
taxonomy rather than the response, so an unexpected key — a lean, a
summary — has nowhere to land.

[] and NULL are different facts and stay different.
Mutation-checked: drop the threshold, accept unknown ids, leak the host,
coerce strings, or make the questions non-deterministic, and this fails.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Migration 0027 and the ledger row

**Files:**
- Create: `supabase/migrations/0027_news_issues.sql`
- Modify: `supabase/migrations/README.md` (the numbering ledger table)

**Interfaces:**
- Produces: `news_item.issues TEXT[]`, `news_item.characterized_by TEXT`, `news_item.characterized_at TIMESTAMPTZ`, `idx_news_item_issues` (GIN).

- [x] **Step 1: Claim the number in the ledger first**

`supabase/migrations/README.md` rule 2: claim the number, then write the file. Add this row immediately **above** the `| 0027+ | free |` row, and change that row to `| 0028+ | free | — |`:

```markdown
| 0027      | `0027_news_issues.sql` — `news_item.issues TEXT[]`, `characterized_by`, `characterized_at`, `idx_news_item_issues` (GIN) (`docs/superpowers/specs/2026-09-18-news-characterization-design.md` §4.6, Unit 1) | **written, not applied** — additive and nullable; no backfill. `issues IS NULL` means "not characterized", `issues = '{}'` means "characterized, nothing over threshold". These are different facts and queries must not conflate them. |
```

- [x] **Step 2: Write the migration**

Create `supabase/migrations/0027_news_issues.sql`:

```sql
-- 0027_news_issues.sql
-- Issue tags for news_item, plus the provenance to reproduce them.
-- docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.6
--
-- Additive and nullable. Nothing is backfilled: every existing row keeps
-- issues IS NULL, which is the correct statement about it — those rows were
-- never characterized.
--
-- THE DISTINCTION THIS SCHEMA CARRIES:
--   issues IS NULL   -- never characterized
--   issues = '{}'    -- characterized; no issue cleared the threshold
-- These are different facts. A query that treats them alike will report
-- "no issues found" for articles nobody ever looked at.
--
-- No CHECK constrains the array contents to the taxonomy: the taxonomy lives
-- in src/lib/news-issues.ts and changes by PR, and a CHECK here would need a
-- migration every time an issue is added. src/lib/news-characterize.ts is the
-- enforcement point — it iterates the taxonomy, so an unknown id cannot be
-- produced in the first place.

ALTER TABLE news_item ADD COLUMN IF NOT EXISTS issues TEXT[];
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS characterized_by TEXT;
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS characterized_at TIMESTAMPTZ;

-- The product query is "rows matching any of the issues this voter picked",
-- i.e. issues && ARRAY[...]. GIN is the index for that, and it is why this is
-- an array column rather than a join table.
CREATE INDEX IF NOT EXISTS idx_news_item_issues ON news_item USING GIN (issues);

COMMENT ON COLUMN news_item.issues IS
  'Issue ids from src/lib/news-issues.ts. NULL = not characterized; {} = characterized, nothing over threshold.';
COMMENT ON COLUMN news_item.characterized_by IS
  'engine:model/tax-VERSION/q-HASH — everything needed to reproduce and compare a run.';
```

- [x] **Step 3: Verify the migration parses**

```bash
node scripts/verify-migrations.mjs
```

Expected: PASS. (This runs the migrations against embedded PGlite — see the memory note "verify-migrations is embedded PGlite".) If the script takes a filter argument, run it unfiltered; the whole chain must still apply in order.

- [x] **Step 4: Commit**

```bash
git add supabase/migrations/0027_news_issues.sql supabase/migrations/README.md
git commit -m "feat(news): migration 0027 — news_item.issues + provenance (Unit 1)

Ledger row claimed in the same commit as the file, per README rule 2.
Additive, nullable, no backfill. NULL (never characterized) and {}
(characterized, nothing over threshold) are deliberately different.

text[] + GIN rather than a join table: the product query is
issues && ARRAY[...], which a GIN index already serves.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The Jev engine adapter

**Files:**
- Create: `src/lib/news-characterize-engines.ts`
- Modify: `.env.example`
- Modify: `package.json` (adds `@typesafe-ai/sdk`)

**Interfaces:**
- Consumes: `type NoulQuestion`, `type ArticleState` from `src/lib/news-characterize.ts`.
- Produces:
  - `interface CharacterizeEngine { readonly modelId: string; characterize(state: ArticleState, questions: Record<string, NoulQuestion>): Promise<Record<string, unknown>> }`
  - `function jevEngine(modelId?: string): CharacterizeEngine`
  - `const JEV_MODEL_ID: string`

> **Why there is an interface for one implementation:** spec §2.2 — the Anthropic arm is built only if the evaluation asks for it. The seam exists so that is a ~40-line addition rather than a refactor. Do not add a second engine in this task.

- [x] **Step 1: Install the SDK and add the key to the example env**

```bash
npm install @typesafe-ai/sdk
```

Add to `.env.example`, keeping the file's existing alphabetical grouping (it belongs between `SUPABASE_SERVICE_ROLE_KEY` and `TWILIO_ACCOUNT_SID`):

```bash
# TypeSafe System One (Jev) — issue tagging for swept news articles.
# Server-side only; never expose to the client.
TYPESAFE_API_KEY=
```

Then set the real value in `.env.local` (not committed).

- [x] **Step 2: Write the adapter**

Create `src/lib/news-characterize-engines.ts`:

```ts
/* The engine adapters —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.4.

   This is the ONLY file in the characterizer that imports a vendor SDK or
   reaches the network. Everything decidable is in news-characterize.ts and is
   verified offline; this file just carries a request there and back.

   One implementation today: TypeSafe's Jev. The interface exists because spec
   §2.2 decided to build the Anthropic arm only if the evaluation asks for it —
   so a second engine is an addition here, not a refactor everywhere.

   Why Jev for this job (§4.4): a Noul returns a NUMBER. There is no free-text
   field in the response, so a lean, a sentiment or a summary cannot be emitted
   even if the question wording is wrong. That is a structural guarantee of the
   kind this project prefers to a well-worded instruction. */

import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { ArticleState, NoulQuestion } from "./news-characterize.ts";

/** Pinned, not `jev-latest`. A run's provenance records the model, so the
    model must not change under us between two runs we intend to compare.
    Bump deliberately, and re-run the evaluation when you do. */
export const JEV_MODEL_ID = "jev-1.13.0";

export interface CharacterizeEngine {
  readonly modelId: string;
  /** Returns the raw answers map. Validation and thresholding are NOT done
      here — they belong to news-characterize.ts, which is testable offline. */
  characterize(
    state: ArticleState,
    questions: Record<string, NoulQuestion>,
  ): Promise<Record<string, unknown>>;
}

export function jevEngine(modelId: string = JEV_MODEL_ID): CharacterizeEngine {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      "TYPESAFE_API_KEY is not set — refusing to run. A missing key must fail " +
        "loudly, because a silent skip looks exactly like 'no issues found'.",
    );
  }
  const client = new TypeSafeClient();

  return {
    modelId,
    async characterize(state, questions) {
      /* All issues in ONE request: the docs' multi-label recipe is "define one
         Noul per label", and independent questions over the same state run in
         parallel server-side. One request per article, not one per issue. */
      const { answers } = await client.systemOne({
        model: modelId,
        state,
        questions,
      });
      return answers as Record<string, unknown>;
    },
  };
}
```

> **SDK shape, verified against `@typesafe-ai/sdk@0.6.0`'s own `dist/index.d.mts`** — not the docs summary, which cost the draft above a set of casts it did not need:
> - `systemOne<const Q extends Questions>(request: SystemOneRequest<Q>, options?)`, where `SystemOneRequest = { state: EntryType; questions: Q; model?: string }`. `model` **is** accepted.
> - `EntryType = string | { [key: string]: JsonValue } | JsonValue[] | null`.
> - `NoulQuestion = { type: "noul"; instructions?: EntryType; criteria?: { true?; false? } }` — the core's stricter literal is structurally assignable, so **no cast is needed anywhere**.
> - `noul()`, `choice()` and `score()` helpers are exported, but the core builds plain literals so it stays free of the vendor SDK. Do not change `news-characterize.ts` to suit the SDK.
> - The client reads `TYPESAFE_API_KEY` from the environment itself; the explicit check exists to fail once at startup rather than once per article.
> - The one thing that genuinely had to change: `ArticleState` became a type alias — see Task 2's interface block.

- [x] **Step 3: Verify it typechecks and the pure guardrails still pass**

```bash
npx tsc --noEmit
```

Expected: no errors from `src/lib/news-characterize-engines.ts`. (`scripts/` is excluded from `tsc`; `src/` is not.)

```bash
node scripts/verify-news-characterize.ts && node scripts/verify-news-issues.ts
```

Expected: both OK — the adapter must not have changed any pure behaviour.

- [x] **Step 4: Confirm the key check fails loudly**

```bash
node --input-type=module -e "
process.env.TYPESAFE_API_KEY='';
const m = await import('./src/lib/news-characterize-engines.ts');
try { m.jevEngine(); console.log('FAIL: did not throw'); }
catch (e) { console.log('OK:', e.message.slice(0, 60)); }
"
```

Expected: `OK: TYPESAFE_API_KEY is not set — refusing to run. A missing key...`

- [x] **Step 5: Commit**

```bash
git add src/lib/news-characterize-engines.ts .env.example package.json package-lock.json
git commit -m "feat(news): TypeSafe/Jev engine adapter behind a seam (C13)

The only file in the characterizer that touches a vendor SDK or the
network. One Noul per issue, one request per article — the documented
multi-label recipe.

Model id is pinned (jev-1.13.0), not jev-latest: provenance records the
model, so it must not change under two runs we intend to compare.

A missing TYPESAFE_API_KEY throws rather than skipping — a silent skip
looks exactly like 'no issues found'.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The runner

**Files:**
- Create: `scripts/news-characterize.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4, plus `@supabase/supabase-js` and `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` following the pattern already in `scripts/verify-news-neutrality.ts`.
- Produces: nothing importable. A script.

- [ ] **Step 1: Write the runner**

Create `scripts/news-characterize.ts`:

```ts
/* Runs the issue characterizer —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.

   This is the ONE part of Unit 1 that touches the network and the database,
   which is why it is a script and not a library: everything decidable is in
   src/lib/news-characterize.ts and verified offline by
   scripts/verify-news-characterize.ts. Run that first; if it fails, this
   script's output is not worth reading.

   It characterizes STORED ROWS, not the raw sweep pool (§4.2). The Sentinel
   sitemaps alone return ~120 URLs per paper per day including obituaries and
   wire sports; characterizing those would be waste, and it would measure the
   tag distribution over a different population than the coverage numbers use.

   It never writes candidate_id or relation. news-match.ts owns those.

   Modes:

     node scripts/news-characterize.ts --dry-run [--limit 20] [--threshold 0.7]
       Characterize and PRINT. Writes nothing. This is how a change is
       reviewed before it touches a row.

     node scripts/news-characterize.ts [--limit N] [--threshold 0.7]
       Characterize and write issues/characterized_by/characterized_at for
       rows where issues IS NULL.

   Fail-closed: no candidate rows means no output and a non-zero exit, never a
   silent empty success. */

import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_THRESHOLD,
  applyThreshold,
  buildQuestions,
  buildState,
  provenance,
} from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
/* The taxonomy is injected, never imported by the core (Task 2's note). */
import { ISSUES, ISSUE_IDS, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flag = (name: string, fallback: number): number => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const value = Number(args[i + 1]);
  if (!Number.isFinite(value)) {
    console.error(`${name} needs a number`);
    process.exit(2);
  }
  return value;
};
const limit = flag("--limit", 50);
const threshold = flag("--threshold", DEFAULT_THRESHOLD);

if (threshold <= 0 || threshold >= 1) {
  console.error("--threshold must be strictly between 0 and 1");
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(2);
}
const db = createClient(url, key);

/* Only rows we have never characterized. issues IS NULL is the "never looked"
   state; a row with '{}' has been looked at and had nothing over threshold,
   and re-running must not silently re-bill it. */
const { data: rows, error } = await db
  .from("news_item")
  .select("id, title, summary, url")
  .is("issues", null)
  .not("url", "is", null)
  .order("published_at", { ascending: false })
  .limit(limit);

if (error) {
  console.error(`query failed: ${error.message}`);
  process.exit(1);
}
if (!rows || rows.length === 0) {
  console.error("no uncharacterized rows with a url — nothing to do");
  process.exit(1);
}

const engine = jevEngine();
const questions = buildQuestions(ISSUES);
const by = provenance(engine.modelId, questions, TAXONOMY_VERSION);
console.error(
  `characterizing ${rows.length} row(s) at threshold ${threshold} as ${by}${dryRun ? " (DRY RUN)" : ""}`,
);

let tagged = 0;
let empty = 0;
let failed = 0;

for (const row of rows) {
  const state = buildState({ title: row.title, summary: row.summary, url: row.url });
  let answers: Record<string, unknown>;
  try {
    answers = await engine.characterize(state, questions);
  } catch (e) {
    /* One article's failure is not the run's failure, but it is never a
       silent zero either: the row keeps issues IS NULL and is retried next
       run, and the count is reported at the end. */
    failed++;
    console.error(`  ERROR ${row.id}: ${(e as Error).message}`);
    continue;
  }

  const issues = applyThreshold(answers, threshold, ISSUE_IDS);
  if (issues.length > 0) tagged++;
  else empty++;

  if (dryRun) {
    /* Emit every field the gold set and the eval script need (Task 6), so a
       gold set is built by hand-labelling this output directly rather than
       re-querying: id, the text the model actually saw, and the tags. */
    console.log(JSON.stringify({
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: row.url,
      issues,
      sitemapOnly: state.dek === null,
    }));
    continue;
  }

  const { error: writeError } = await db
    .from("news_item")
    .update({ issues, characterized_by: by, characterized_at: new Date().toISOString() })
    .eq("id", row.id);
  if (writeError) {
    failed++;
    console.error(`  ERROR writing ${row.id}: ${writeError.message}`);
  }
}

console.error(
  `done: ${tagged} tagged, ${empty} characterized with no issue over threshold, ${failed} failed`,
);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run the pure guardrails first**

```bash
node scripts/verify-news-characterize.ts && node scripts/verify-news-issues.ts
```

Expected: both OK. The runner is not worth running otherwise.

- [ ] **Step 3: Dry-run against the live database**

```bash
node scripts/news-characterize.ts --dry-run --limit 5
```

Expected: five JSON lines of `{id, title, summary, url, issues, sitemapOnly}` on stdout, and on stderr a `characterizing 5 row(s) at threshold 0.7 as jev:jev-1.13.0/tax-1/q-XXXXXXXX (DRY RUN)` header plus a `done:` line. **Read the five results by hand before going further** — if the tags look wrong, that is a taxonomy or question-wording problem and it belongs in Task 1 or 2, not here.

- [ ] **Step 4: Confirm nothing was written**

```bash
node --input-type=module -e "
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await db.from('news_item').select('id', { count: 'exact', head: true }).not('issues','is',null);
console.log('rows with issues set:', count);
"
```

Expected: `rows with issues set: 0`. A dry run that writes is the one bug this mode exists to prevent.

- [ ] **Step 5: Commit**

```bash
git add scripts/news-characterize.ts
git commit -m "feat(news): characterizer runner with --dry-run (C13c)

Characterizes stored rows, not the raw sweep pool: the Sentinel sitemaps
are ~120 URLs per paper per day of mostly obituaries and wire sports, and
tagging those would measure a different population than the coverage
numbers use.

Only rows where issues IS NULL, so a re-run never re-bills a row that was
already looked at and found empty. Per-article failures are counted and
reported, never silently zeroed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Gold set and evaluation

**Files:**
- Create: `docs/general-election/news-characterization-eval-2026-09-18.md`
- Create: `scripts/news-characterize-eval.ts`

**Interfaces:**
- Consumes: `ISSUE_IDS` from `src/lib/news-issues.ts`; `applyThreshold`, `buildQuestions`, `buildState` from `src/lib/news-characterize.ts`; `jevEngine` from `src/lib/news-characterize-engines.ts`.
- Produces: the report. Nothing importable.

> **This task decides the threshold and feeds gate G4. Nothing renders to a voter before it reports.** It also decides whether the Anthropic arm is ever built (spec §6 item 6).

- [ ] **Step 1: Build the gold set**

```bash
node scripts/news-characterize.ts --dry-run --limit 100 > /tmp/pool.jsonl
```

`/tmp/pool.jsonl` already has the exact shape the gold set needs — the runner's
dry-run emits `{id, title, summary, url, issues, sitemapOnly}`, and `sitemapOnly`
is computed for you from whether the dek was null.

Copy it to `docs/general-election/news-characterization-goldset-2026-09-18.jsonl`
and **replace the `issues` array on every line with the correct set of issue ids**,
leaving the other five fields untouched. The model's own suggestion is in there as
a starting point; overwriting it with your judgement is the entire exercise, and
accepting it unchanged would make the evaluation circular.

One object per line, e.g.:

```json
{"id": "8f3c...", "title": "Broward property insurance rates rise again", "summary": "County homeowners face a fourth straight increase.", "url": "https://www.sun-sentinel.com/2026/09/18/broward-insurance/", "issues": ["insurance", "housing"], "sitemapOnly": false}
```

This is **founder time, not agent time** — it is the only thing in this design that
can say whether a tag is right. Rows with `"sitemapOnly": true` have no dek; they
are spec §4.2's input floor and are reported separately.

- [ ] **Step 2: Write the evaluation script**

Create `scripts/news-characterize-eval.ts`:

```ts
/* Evaluation against the hand-labelled gold set —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §6.

   The measure is a hand-labelled gold set, NOT agreement between two models:
   two models agreeing does not make either right.

   Reports per-issue precision and recall across a threshold sweep, and
   reports sitemap-only rows (no dek) separately, because averaging over them
   hides the input floor.

   Run: node scripts/news-characterize-eval.ts <goldset.jsonl> */

import { readFileSync } from "node:fs";
import { applyThreshold, buildQuestions, buildState } from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
import { ISSUES, ISSUE_IDS } from "../src/lib/news-issues.ts";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/news-characterize-eval.ts <goldset.jsonl>");
  process.exit(2);
}

interface GoldRow {
  id: string;
  title: string;
  summary?: string | null;
  url: string;
  issues: string[];
  sitemapOnly: boolean;
}

const gold: GoldRow[] = readFileSync(path, "utf8")
  .split("\n")
  .filter((l) => l.trim().length > 0)
  .map((l) => JSON.parse(l) as GoldRow);

for (const row of gold) {
  const unknown = row.issues.filter((i) => !ISSUE_IDS.includes(i));
  if (unknown.length > 0) {
    console.error(`gold row ${row.id} has ids outside the taxonomy: ${unknown.join(",")}`);
    process.exit(2);
  }
}

const engine = jevEngine();
const questions = buildQuestions(ISSUES);

/* One model call per article, reused across every threshold — the answers do
   not depend on the threshold, so sweeping it must not re-bill the run. */
const answersById = new Map<string, Record<string, unknown>>();
for (const row of gold) {
  const state = buildState({ title: row.title, summary: row.summary ?? null, url: row.url });
  answersById.set(row.id, await engine.characterize(state, questions));
}

const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9];
const pct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(0)}%` : "n/a");

for (const threshold of THRESHOLDS) {
  let tp = 0, fp = 0, fn = 0;
  const perIssue = new Map(ISSUE_IDS.map((i) => [i, { tp: 0, fp: 0, fn: 0 }]));
  let sitemapTp = 0, sitemapFp = 0, sitemapFn = 0;

  for (const row of gold) {
    const predicted = applyThreshold(answersById.get(row.id)!, threshold, ISSUE_IDS);
    const expected = new Set(row.issues);
    for (const id of ISSUE_IDS) {
      const p = predicted.includes(id);
      const e = expected.has(id);
      const bucket = perIssue.get(id)!;
      if (p && e) { tp++; bucket.tp++; if (row.sitemapOnly) sitemapTp++; }
      else if (p && !e) { fp++; bucket.fp++; if (row.sitemapOnly) sitemapFp++; }
      else if (!p && e) { fn++; bucket.fn++; if (row.sitemapOnly) sitemapFn++; }
    }
  }

  console.log(`\n=== threshold ${threshold} ===`);
  console.log(`overall  precision ${pct(tp / (tp + fp))}  recall ${pct(tp / (tp + fn))}  (tp=${tp} fp=${fp} fn=${fn})`);
  console.log(`sitemap-only rows  precision ${pct(sitemapTp / (sitemapTp + sitemapFp))}  recall ${pct(sitemapTp / (sitemapTp + sitemapFn))}`);
  for (const [id, b] of perIssue) {
    console.log(`  ${id.padEnd(12)} precision ${pct(b.tp / (b.tp + b.fp))}  recall ${pct(b.tp / (b.tp + b.fn))}  (tp=${b.tp} fp=${b.fp} fn=${b.fn})`);
  }
}
```

- [ ] **Step 3: Run the evaluation**

```bash
node scripts/news-characterize-eval.ts docs/general-election/news-characterization-goldset-2026-09-18.jsonl
```

Expected: one block per threshold, each with an overall line, a sitemap-only line, and eight per-issue lines.

- [ ] **Step 4: Write the report**

Create `docs/general-election/news-characterization-eval-2026-09-18.md` covering, per spec §6:

1. Per-issue precision and recall at each threshold (paste the script output).
2. **The chosen threshold and why**, read off the curve. Tagging is low-stakes and disclosed, so recall is worth more here than in a gating decision — but say that rather than assuming it.
3. Issue-tag distribution per candidate over `named` rows only (use `namedCountsByCandidate()`'s selection rule). **Report it; do not publish it; never feed it to `balance_audit_core`.**
4. Tag rate and empty rate, with sitemap-only rows separate.
5. Measured cost and latency per article and per sweep.
6. **Whether the Anthropic arm should be built at all**, and if so, naming the specific dissatisfaction it would answer.
7. Any issue whose precision or recall is poor enough to be a taxonomy or question-wording problem — that is a Task 1/2 fix, not a threshold fix.

- [ ] **Step 5: Update `DEFAULT_THRESHOLD` if the curve disagrees with 0.7**

If the report chooses a different threshold, change `DEFAULT_THRESHOLD` in `src/lib/news-characterize.ts` and re-run:

```bash
node scripts/verify-news-characterize.ts
```

Expected: OK (the guardrail only asserts it is in range).

- [ ] **Step 6: Commit**

```bash
git add docs/general-election/news-characterization-eval-2026-09-18.md \
        docs/general-election/news-characterization-goldset-2026-09-18.jsonl \
        scripts/news-characterize-eval.ts src/lib/news-characterize.ts
git commit -m "test(news): gold-set evaluation and chosen threshold (C14)

100 hand-labelled rows as ground truth, per-issue precision/recall across
a threshold sweep. Not engine agreement — two models agreeing does not
make either right.

Sitemap-only rows (no dek) reported separately: that is the input floor,
and averaging over it would hide it.

Per-candidate tag distribution is reported, never published, and never
reaches balance_audit_core — CN-R10's denominator stays named rows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## After this plan

- **Gate G4 (surface)** is the founder's, with Task 6's numbers in hand. Nothing renders to a voter before that. If issue tags ever do render, they inherit `news-fairness.md` §1: disclosed, never judged, never colour-coded.
- **Unit 2 (candidate suggestions)** stays blocked on Q5 and ingest B2. Spec §5.
- **Migration 0027 is written, not applied.** Applying it to the live project is a founder action, recorded in the ledger when it happens.
