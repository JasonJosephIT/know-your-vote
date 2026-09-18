/* Guardrail for the two-level news issue taxonomy —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.1.

   This file is EDITORIAL CONTENT, so these checks matter more than they would
   for ordinary code. Each property below, if it broke, would produce a
   plausible-looking product that is quietly wrong:

     - A duplicate id silently merges two issues, or lets a sub-issue shadow a
       category, and every row tagged with it becomes ambiguous forever.
     - A banned (valence / horse-race / motive) term in a label leaks into every
       card that renders it. The taxonomy is voter-facing.
     - Drift from the quiz breaks the one thing the shared ids buy: a voter who
       answers a question about `housing` must see the same `housing` on their
       news.
     - An orphaned sub-issue can never roll up, so it is invisible at category
       level while looking perfectly fine in the database.

   Pure and offline. Run: node scripts/verify-news-issues.ts */

import {
  ASKABLE,
  ASKABLE_IDS,
  CATEGORIES,
  CATEGORY_IDS,
  SUB_ISSUES,
  SUB_ISSUE_IDS,
  TAXONOMY_VERSION,
  categoriesFor,
} from "../src/lib/news-issues.ts";
import { QUIZ_QUESTIONS } from "../src/lib/quiz-questions.ts";
import { buildQuestions } from "../src/lib/news-characterize.ts";
import { findBannedTermMatch } from "../src/lib/neutrality.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

check("TAXONOMY_VERSION is set", TAXONOMY_VERSION.trim().length > 0);
check("there are categories", CATEGORIES.length > 0);
check("there are sub-issues", SUB_ISSUES.length > 0);

/* ---- ids: unique, and never colliding across the two levels ----------- */
check("category ids are unique", new Set(CATEGORY_IDS).size === CATEGORY_IDS.length);
check("sub-issue ids are unique", new Set(SUB_ISSUE_IDS).size === SUB_ISSUE_IDS.length);
const collisions = CATEGORY_IDS.filter((c) => SUB_ISSUE_IDS.includes(c));
check("no id is both a category and a sub-issue", collisions.length === 0, collisions.join(","));
check("ASKABLE ids are unique", new Set(ASKABLE_IDS).size === ASKABLE_IDS.length);
check("ASKABLE is exactly categories + sub-issues",
  ASKABLE.length === CATEGORIES.length + SUB_ISSUES.length);

/* ---- the hierarchy is total: no orphans, no childless parent --------- */
for (const sub of SUB_ISSUES) {
  check(`${sub.id}: its category exists`, CATEGORY_IDS.includes(sub.categoryId), sub.categoryId);
}
for (const cat of CATEGORIES) {
  const children = SUB_ISSUES.filter((s) => s.categoryId === cat.id);
  check(`${cat.id}: has at least one sub-issue`, children.length > 0);
}

/* ---- wording: nothing valence-laden reaches a voter ------------------- */
for (const entry of [...CATEGORIES, ...SUB_ISSUES]) {
  check(`${entry.id}: label is non-empty`, entry.label.trim().length > 0);
  check(`${entry.id}: has aliases`, entry.aliases.length > 0);
  check(`${entry.id}: aliases are non-empty strings`,
    entry.aliases.every((a) => typeof a === "string" && a.trim().length > 0));
  const hit = findBannedTermMatch(`${entry.label} ${entry.aliases.join(" ")}`);
  check(`${entry.id}: no banned term`, hit === null, hit ? `"${hit.term}"` : "");
}

/* ---- the quiz contract ------------------------------------------------ */
const quizIds = QUIZ_QUESTIONS.filter((q) => q.id !== "free-response").map((q) => q.id);
const inQuiz = CATEGORIES.filter((c) => c.inQuiz).map((c) => c.id);
const missing = quizIds.filter((q) => !inQuiz.includes(q));
check("every quiz issue is an inQuiz category", missing.length === 0, missing.join(","));
const extra = inQuiz.filter((c) => !quizIds.includes(c));
check("every inQuiz category is a quiz issue", extra.length === 0, extra.join(","));
for (const q of QUIZ_QUESTIONS) {
  if (q.id === "free-response") continue;
  const cat = CATEGORIES.find((c) => c.id === q.id);
  if (!cat) continue;
  check(`${q.id}: label matches the quiz title verbatim`, cat.label === q.issueTitle,
    `"${cat.label}" vs "${q.issueTitle}"`);
}
/* The three non-quiz categories are the whole point of the second level:
   without them, four researched issues have nowhere to go. */
check("some categories are deliberately outside the quiz",
  CATEGORIES.some((c) => !c.inQuiz));

/* ---- rollup ----------------------------------------------------------- */
check("a sub-issue rolls up to its parent",
  JSON.stringify(categoriesFor(["A1"])) === '["insurance"]', JSON.stringify(categoriesFor(["A1"])));
check("two sub-issues under one parent roll up once",
  JSON.stringify(categoriesFor(["A1", "A3"])) === '["insurance"]');
check("an explicit category tag survives rollup",
  JSON.stringify(categoriesFor(["housing"])) === '["housing"]');
check("rollup returns CATEGORIES order, not input order",
  JSON.stringify(categoriesFor(["B7", "A2"])) === '["housing","safety"]',
  JSON.stringify(categoriesFor(["B7", "A2"])));
check("an unknown id is ignored, not guessed at",
  JSON.stringify(categoriesFor(["not_a_real_id"])) === "[]");
check("no tags roll up to no categories", JSON.stringify(categoriesFor([])) === "[]");
/* Every sub-issue must be reachable at category level, or it is invisible to
   a voter filtering by the quiz's vocabulary. */
for (const sub of SUB_ISSUES) {
  check(`${sub.id}: rolls up to exactly one category`, categoriesFor([sub.id]).length === 1);
}

/* ---- the taxonomy actually drives the core ---------------------------- */
const questions = buildQuestions(ASKABLE);
check("one question per askable entry", Object.keys(questions).length === ASKABLE.length);
check("question names are the askable ids",
  JSON.stringify(Object.keys(questions)) === JSON.stringify([...ASKABLE_IDS]));
check("no question text carries a banned term",
  Object.values(questions).every((q) => findBannedTermMatch(q.instructions) === null));

if (failures > 0) {
  console.error(`\nverify-news-issues: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-issues: OK — ${CATEGORIES.length} categories (${inQuiz.length} in the quiz), ` +
  `${SUB_ISSUES.length} sub-issues, no orphans, no drift from the quiz`,
);
