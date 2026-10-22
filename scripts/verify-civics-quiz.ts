/* The civics quiz's answers and the stay-informed signup (spec
   docs/superpowers/specs/2026-10-15-civics-quiz-landing-design.md §3-§6).

   1. Every answer names a source on an official https site and a check
      date, and every link into KYV is a site path.
   2. isStale hides an answer checked more than 14 days ago, and nothing
      newer, so a name that may have changed is never shown as current.
   3. The signup accepts an email and one of Florida's 67 counties, and
      refuses anything else, so a typo or a made-up county can't reach the
      mailing list.

   Run: node scripts/verify-civics-quiz.ts */

import { CIVICS_QUESTIONS, isStale } from "../src/lib/civics-quiz.ts";
import { updatesSignup } from "../src/lib/updates-signup.ts";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}

const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(gov|flgov\.com|myfloridalegal\.com|myfloridacfo\.com)\//;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

check("six questions", CIVICS_QUESTIONS.length === 6);
check("question ids are unique", new Set(CIVICS_QUESTIONS.map((q) => q.id)).size === CIVICS_QUESTIONS.length);
for (const q of CIVICS_QUESTIONS) {
  check(`${q.id}: source is an official https page`, OFFICIAL.test(q.source.url));
  check(`${q.id}: about-the-office source is official`, OFFICIAL.test(q.about.sourceUrl));
  check(`${q.id}: checked date is a date`, DATE.test(q.checkedAt));
  check(`${q.id}: ballot link is a site path`, q.ballot.href.startsWith("/"));
  check(`${q.id}: has an answer`, q.answer.trim().length > 0);
}

check("checked today is fresh", !isStale("2026-10-15", "2026-10-15"));
check("checked 14 days ago is fresh", !isStale("2026-10-01", "2026-10-15"));
check("checked 15 days ago is stale", isStale("2026-09-30", "2026-10-15"));
check("a date that isn't one is stale", isStale("soon", "2026-10-15"));

check("signup: email and county pass", updatesSignup.safeParse({ email: "a@b.co", countyFips: "12086" }).success);
check("signup: a non-Florida code fails", !updatesSignup.safeParse({ email: "a@b.co", countyFips: "13121" }).success);
check("signup: 12025 (old Dade code) fails", !updatesSignup.safeParse({ email: "a@b.co", countyFips: "12025" }).success);
check("signup: a bad email fails", !updatesSignup.safeParse({ email: "nope", countyFips: "12086" }).success);
check("signup: no county fails", !updatesSignup.safeParse({ email: "a@b.co" }).success);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll civics quiz checks passed");
