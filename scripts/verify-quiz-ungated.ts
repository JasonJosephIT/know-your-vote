/* TASK-068 verify: the quiz runs with no ZIP ever entered.

   The acceptance is "the quiz completes end to end with no ZIP" — an
   assertion about a flow that needs a database and an Anthropic key to run
   for real. What this script guards is the part that would silently regress
   without either: the ZIP gate must not come back, and the API must keep
   accepting a body without one.

   Re-adding a ZIP stage before the questions is a one-line change that looks
   harmless in review and puts the whole feature back behind a location the
   answer barely depends on. That is the regression worth catching.

   Run: node scripts/verify-quiz-ungated.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(`${ROOT}/${rel}`, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const quiz = stripComments(read("src/components/features/Quiz.tsx"));
const route = stripComments(read("src/app/api/quiz/route.ts"));
const lib = stripComments(read("src/lib/quiz.ts"));

/* 1. No ZIP stage in the flow at all. */
assert(
  "Quiz has no zip stage",
  !/kind:\s*"zip"/.test(quiz),
  "a { kind: \"zip\" } stage is back in the state machine"
);

/* 2. The intro leads straight into the questions, not into a location step. */
assert(
  "intro starts the questions directly",
  /setStage\(\{\s*kind:\s*"questions",\s*index:\s*0\s*\}\)/.test(quiz)
);

/* 3. Question 1's Back goes to the intro. If it points at a zip stage the
      gate has returned by another name. */
assert(
  "first question goes back to intro",
  /stage\.index === 0\s*\?\s*setStage\(\{\s*kind:\s*"intro"\s*\}\)/.test(quiz)
);

/* 4. The API must accept a body with no zip. */
assert(
  "API schema makes zip optional",
  /zip:\s*z\.string\(\)\.regex\(ZIP_RE\)\.optional\(\)/.test(route)
);

/* 5. ...but not a district without one, which would silently answer a
      different question than the client asked. */
assert(
  "API rejects district without zip",
  /\.refine\(/.test(route) && /district\s*\|\|\s*b?\.?zip/.test(route.replace(/\s+/g, " "))
);

/* 6. runQuiz's zip parameter is optional at the type level, so a caller
      passing nothing is a compile-time-valid path rather than a cast. */
assert(
  "runQuiz accepts an absent zip",
  /zip:\s*string\s*\|\s*undefined/.test(lib)
);

/* 7. With no zip, the races come from the statewide read rather than a
      location lookup. */
assert(
  "no-zip path reads statewide races",
  /getStatewideRaces\(\)/.test(lib) && /zip\s*\?\s*await resolveZip/.test(lib)
);

/* 8. The ZIP offer still exists — demoted, not deleted. Losing it would drop
      the district race from the quiz entirely. */
assert(
  "results step still offers the district-race upgrade",
  /addDistrictRace/.test(quiz) && /usedZip/.test(quiz)
);

/* 9. Copy honesty: with no ZIP this is not "your ballot" (same rule as the
      landing page in TASK-067). */
assert(
  "quiz disclaimer does not claim to be the whole ballot",
  !/every candidate on your ballot/i.test(lib)
);

if (failures) {
  console.error(`\n${failures} quiz-ungating check(s) failed`);
  process.exit(1);
}
console.log("\nAll quiz-ungating checks passed.");
