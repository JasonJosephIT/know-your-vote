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
  ISSUE_FILTER_IDS,
  TAXONOMY_VERSION,
  categoriesFor,
  issueChips,
  issueFilterIds,
  issueFilterLabel,
  subIssueLabel,
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
check(
  "category ids are unique",
  new Set(CATEGORY_IDS).size === CATEGORY_IDS.length
);
check(
  "sub-issue ids are unique",
  new Set(SUB_ISSUE_IDS).size === SUB_ISSUE_IDS.length
);
const collisions = CATEGORY_IDS.filter((c) => SUB_ISSUE_IDS.includes(c));
check(
  "no id is both a category and a sub-issue",
  collisions.length === 0,
  collisions.join(",")
);
check(
  "ASKABLE ids are unique",
  new Set(ASKABLE_IDS).size === ASKABLE_IDS.length
);
/* Sub-issues only: the categories are derived for display, never asked and
   never stored (news-issues.ts explains why, and what would reverse it). */
check(
  "ASKABLE is exactly the sub-issues",
  ASKABLE.length === SUB_ISSUES.length
);
check(
  "no category is asked as a question",
  !ASKABLE_IDS.some((id) => CATEGORY_IDS.includes(id))
);
check(
  "every sub-issue is asked",
  SUB_ISSUE_IDS.every((id) => ASKABLE_IDS.includes(id))
);

/* NO CATEGORY ALIAS IS ASKED NOWHERE.

   Categories stopped being asked on 2026-09-18, and 20 alias terms went with
   them — "homelessness", "police", "public schools", "property taxes",
   "visas" and more lived ONLY on a category, so from that day the model was
   never asked about them. Nothing failed; recall just quietly dropped, and
   A2 housing scored 0.0% across 834 articles while the corpus carried two
   homelessness stories. v4 folded them back into sub-issues.

   The property is "asked SOMEWHERE", not "asked under its own category": a
   term may legitimately belong to another category's child once the taxonomy
   grows. `development` was a `housing` alias and is now KYV3's, under
   `environment`, which is correct and must not be forced back. */
{
  const asked = new Set(
    SUB_ISSUES.flatMap((s) => s.aliases.map((a) => a.toLowerCase()))
  );
  for (const cat of CATEGORIES) {
    const lost = cat.aliases.filter((a) => !asked.has(a.toLowerCase()));
    check(
      `${cat.id}: every category alias is asked by some sub-issue`,
      lost.length === 0,
      `asked nowhere: ${lost.join(", ")}`
    );
  }
}

/* ---- the hierarchy is total: no orphans, no childless parent --------- */
for (const sub of SUB_ISSUES) {
  check(
    `${sub.id}: its category exists`,
    CATEGORY_IDS.includes(sub.categoryId),
    sub.categoryId
  );
}
for (const cat of CATEGORIES) {
  const children = SUB_ISSUES.filter((s) => s.categoryId === cat.id);
  check(`${cat.id}: has at least one sub-issue`, children.length > 0);
}

/* ---- wording: nothing valence-laden reaches a voter ------------------- */
for (const entry of [...CATEGORIES, ...SUB_ISSUES]) {
  check(`${entry.id}: label is non-empty`, entry.label.trim().length > 0);
  check(`${entry.id}: has aliases`, entry.aliases.length > 0);
  check(
    `${entry.id}: aliases are non-empty strings`,
    entry.aliases.every((a) => typeof a === "string" && a.trim().length > 0)
  );
  const hit = findBannedTermMatch(`${entry.label} ${entry.aliases.join(" ")}`);
  check(
    `${entry.id}: no banned term`,
    hit === null,
    hit ? `"${hit.term}"` : ""
  );
}

/* ---- the quiz contract ------------------------------------------------ */
const quizIds = QUIZ_QUESTIONS.filter((q) => q.id !== "free-response").map(
  (q) => q.id
);
const inQuiz = CATEGORIES.filter((c) => c.inQuiz).map((c) => c.id);
const missing = quizIds.filter((q) => !inQuiz.includes(q));
check(
  "every quiz issue is an inQuiz category",
  missing.length === 0,
  missing.join(",")
);
const extra = inQuiz.filter((c) => !quizIds.includes(c));
check(
  "every inQuiz category is a quiz issue",
  extra.length === 0,
  extra.join(",")
);
for (const q of QUIZ_QUESTIONS) {
  if (q.id === "free-response") continue;
  const cat = CATEGORIES.find((c) => c.id === q.id);
  if (!cat) continue;
  check(
    `${q.id}: label matches the quiz title verbatim`,
    cat.label === q.issueTitle,
    `"${cat.label}" vs "${q.issueTitle}"`
  );
}
/* The three non-quiz categories are the whole point of the second level:
   without them, four researched issues have nowhere to go. */
check(
  "some categories are deliberately outside the quiz",
  CATEGORIES.some((c) => !c.inQuiz)
);

/* ---- rollup ----------------------------------------------------------- */
check(
  "a sub-issue rolls up to its parent",
  JSON.stringify(categoriesFor(["A1"])) === '["insurance"]',
  JSON.stringify(categoriesFor(["A1"]))
);
check(
  "two sub-issues under one parent roll up once",
  JSON.stringify(categoriesFor(["A1", "A3"])) === '["insurance"]'
);
check(
  "an explicit category tag survives rollup",
  JSON.stringify(categoriesFor(["housing"])) === '["housing"]'
);
check(
  "rollup returns CATEGORIES order, not input order",
  JSON.stringify(categoriesFor(["B7", "A2"])) === '["housing","safety"]',
  JSON.stringify(categoriesFor(["B7", "A2"]))
);
check(
  "an unknown id is ignored, not guessed at",
  JSON.stringify(categoriesFor(["not_a_real_id"])) === "[]"
);
check(
  "no tags roll up to no categories",
  JSON.stringify(categoriesFor([])) === "[]"
);
/* Every sub-issue must be reachable at category level, or it is invisible to
   a voter filtering by the quiz's vocabulary. */
for (const sub of SUB_ISSUES) {
  check(
    `${sub.id}: rolls up to exactly one category`,
    categoriesFor([sub.id]).length === 1
  );
}

/* ---- the taxonomy actually drives the core ---------------------------- */
const questions = buildQuestions(ASKABLE);
check(
  "one question per askable entry",
  Object.keys(questions).length === ASKABLE.length
);
check(
  "question names are the askable ids",
  JSON.stringify(Object.keys(questions)) === JSON.stringify([...ASKABLE_IDS])
);
check(
  "no question text carries a banned term",
  Object.values(questions).every(
    (q) => findBannedTermMatch(q.instructions) === null
  )
);

/* ---- display and filter helpers (story cards, /news ?issue=) ----------

   The hard rule these carry: an untagged row still renders. NULL issues
   (never characterized) and {} (characterized, nothing over threshold) must
   both come out as "no chips", never as an error or a reason to drop the row
   (news-ingest-order-handoff-2026-09-23.md §1). */
check(
  "subIssueLabel returns a sub-issue's label",
  subIssueLabel("A1") === SUB_ISSUES.find((s) => s.id === "A1")?.label
);
check(
  "subIssueLabel is null for a category id",
  subIssueLabel("housing") === null
);
check(
  "subIssueLabel is null for an unknown id",
  subIssueLabel("not_a_real_id") === null
);
for (const sub of SUB_ISSUES) {
  check(
    `${sub.id}: subIssueLabel is its label`,
    subIssueLabel(sub.id) === sub.label
  );
}

check(
  "issueChips(null) is empty — never characterized still renders",
  issueChips(null).length === 0
);
check("issueChips(undefined) is empty", issueChips(undefined).length === 0);
check(
  "issueChips([]) is empty — characterized, nothing over threshold",
  issueChips([]).length === 0
);
{
  const chips = issueChips(["B7", "A1", "not_a_real_id", "A1", "KYV8"]);
  check(
    "issueChips drops unknown ids and dedupes",
    chips.map((c) => c.id).join(",") === "B7,A1,KYV8",
    chips.map((c) => c.id).join(",")
  );
  check(
    "issueChips keeps stored order, not taxonomy order",
    chips[0]?.id === "B7"
  );
  const a1 = chips.find((c) => c.id === "A1");
  check(
    "an issue chip carries its label and parent category",
    a1?.label === subIssueLabel("A1") &&
      a1?.categoryId === "insurance" &&
      a1?.categoryLabel === CATEGORIES.find((c) => c.id === "insurance")?.label,
    JSON.stringify(a1)
  );
  const cat = issueChips(["housing"]);
  check(
    "a stored category id renders as its own chip",
    cat.length === 1 &&
      cat[0].categoryId === "housing" &&
      cat[0].label === CATEGORIES.find((c) => c.id === "housing")?.label,
    JSON.stringify(cat)
  );
  /* Every chip label is voter-facing, so the neutrality lint applies. */
  const all = issueChips([...CATEGORY_IDS, ...SUB_ISSUE_IDS]);
  check(
    "every taxonomy id yields a chip",
    all.length === CATEGORY_IDS.length + SUB_ISSUE_IDS.length
  );
  check(
    "no chip label carries a banned term",
    all.every((c) => findBannedTermMatch(c.label) === null)
  );
}

check(
  "the filter accepts every category and sub-issue, categories first",
  JSON.stringify(ISSUE_FILTER_IDS) ===
    JSON.stringify([...CATEGORY_IDS, ...SUB_ISSUE_IDS])
);
check(
  "a sub-issue filter matches only itself",
  JSON.stringify(issueFilterIds("A1")) === '["A1"]',
  JSON.stringify(issueFilterIds("A1"))
);
{
  /* A category is never stored today, so filtering on the bare id would match
     nothing and read as "no coverage". It must expand to its children. */
  const housing = issueFilterIds("housing") ?? [];
  const kids = SUB_ISSUES.filter((s) => s.categoryId === "housing").map(
    (s) => s.id
  );
  check(
    "a category filter includes the category id itself",
    housing[0] === "housing"
  );
  check(
    "a category filter includes every sub-issue under it",
    kids.length > 0 && kids.every((k) => housing.includes(k)),
    housing.join(",")
  );
  check(
    "a category filter includes nothing from another category",
    housing.length === kids.length + 1,
    housing.join(",")
  );
}
for (const cat of CATEGORIES) {
  const ids = issueFilterIds(cat.id) ?? [];
  check(
    `${cat.id}: filter expands to at least one sub-issue`,
    ids.length >= 2,
    ids.join(",")
  );
  check(
    `${cat.id}: every expanded id rolls up to it`,
    ids.every((id) => id === cat.id || categoriesFor([id]).join() === cat.id)
  );
}
for (const bad of ["", "not_a_real_id", "HOUSING", "A1,A2", "a1"]) {
  check(
    `unknown filter "${bad}" is ignored (null)`,
    issueFilterIds(bad) === null
  );
}
check(
  "no filter id is ignored",
  issueFilterIds(undefined) === null && issueFilterIds(null) === null
);
check(
  "filter label for a category",
  issueFilterLabel("housing") ===
    CATEGORIES.find((c) => c.id === "housing")?.label
);
check(
  "filter label for a sub-issue",
  issueFilterLabel("A1") === subIssueLabel("A1")
);
check(
  "filter label for an unknown id is null",
  issueFilterLabel("nope") === null
);

if (failures > 0) {
  console.error(`\nverify-news-issues: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-issues: OK — ${CATEGORIES.length} categories (${inQuiz.length} in the quiz), ` +
    `${SUB_ISSUES.length} sub-issues, no orphans, no drift from the quiz`
);
