/* Guardrail for the `listed` publication tier's race-page copy (design brief
   2026-09-23).

   A listed race is visible with no brief under it, so every sentence the
   page prints has to be true of a bare roster. The copy lives in
   src/lib/listing-copy.ts, pure, so this can drive it with no database:

   1. The four-state branch rule is shared with the brief and its precedence
      holds — decided in the primary beats unopposed beats one candidate.
      A primary winner is also a single candidate; getting the order wrong
      tells a voter "one candidate qualified" about someone who beat three.
   2. The brief's four sentences are byte-for-byte what the race page shipped
      before this change, so moving them into the helper changed nothing.
   3. The listing's sentences never make the brief's claims ("same scrutiny",
      "what we have on them") — nothing has been scrutinized yet.
   4. The printed-ballot intro, the county note and the write-in note appear
      only where the contest is actually on a November ballot.
   5. The listing path feeds the predicates with no write-in (the belt
      without the brace, see src/lib/listing.ts): a carried UNO / primary
      code alone decides it, and a `qualified` survivor never does.

   Run: node scripts/verify-listing.ts */

import {
  BRIEF_IN_REVIEW_LINE,
  COUNTY_NOTE,
  LISTING_INTRO_NOT_PRINTED,
  LISTING_INTRO_PRINTED,
  WRITE_IN_NOTE,
  listingCopy,
  raceStatusLine,
  statusBranch,
} from "../src/lib/listing-copy.ts";
import {
  isDecidedInPrimary,
  isUnopposedContest,
} from "../src/lib/unopposed.ts";
import type { QualifyingStatus } from "../src/types/schema.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* 1. Branch precedence. */
check(
  "decided in primary wins over everything",
  statusBranch({
    decidedInPrimary: true,
    notPrintedOnBallot: true,
    count: 1,
  }) === "decided_in_primary"
);
check(
  "unopposed wins over single candidate",
  statusBranch({ notPrintedOnBallot: true, count: 1 }) === "not_printed"
);
check(
  "one qualifier with no carried code is single_candidate",
  statusBranch({ count: 1 }) === "single_candidate"
);
check("two or more is a contest", statusBranch({ count: 3 }) === "contest");
check(
  "undefined booleans mean the weaker claim (cache-safe)",
  statusBranch({
    decidedInPrimary: undefined,
    notPrintedOnBallot: undefined,
    count: 2,
  }) === "contest"
);

/* 2. Brief wording unchanged. */
const BRIEF_BEFORE = {
  decided:
    "This contest was decided in the August primary, so it will not appear on your November ballot — here's what we have on the winner.",
  unopposed:
    "No one filed against this candidate, so they are elected without opposition and this contest will not appear on your ballot — here's what we have on them.",
  single:
    "One candidate qualified for this race, so there is nothing to compare — here's what we have on them.",
  contest: "Here's your race — every candidate, same space, same scrutiny.",
};
check(
  "brief: decided line unchanged",
  raceStatusLine({ decidedInPrimary: true, count: 1 }, "brief") ===
    BRIEF_BEFORE.decided
);
check(
  "brief: unopposed line unchanged",
  raceStatusLine({ notPrintedOnBallot: true, count: 1 }, "brief") ===
    BRIEF_BEFORE.unopposed
);
check(
  "brief: single-candidate line unchanged",
  raceStatusLine({ count: 1 }, "brief") === BRIEF_BEFORE.single
);
check(
  "brief: contest line unchanged",
  raceStatusLine({ count: 2 }, "brief") === BRIEF_BEFORE.contest
);

/* 3. Listing lines: the same facts, none of the brief's claims. */
const listingLines = [
  raceStatusLine({ decidedInPrimary: true, count: 1 }, "listing"),
  raceStatusLine({ notPrintedOnBallot: true, count: 1 }, "listing"),
  raceStatusLine({ count: 1 }, "listing"),
  raceStatusLine({ count: 2 }, "listing"),
];
check(
  "listing: four distinct lines",
  new Set(listingLines).size === 4,
  JSON.stringify(listingLines)
);
check(
  "listing: decided line names the primary",
  listingLines[0].includes("decided in the August primary")
);
check(
  "listing: unopposed line says elected without opposition",
  listingLines[1].includes("elected without opposition")
);
check(
  "listing: decided line never says nobody filed",
  !/no one filed/i.test(listingLines[0])
);
for (const [i, line] of listingLines.entries()) {
  check(
    `listing line ${i + 1} makes no scrutiny / brief claim`,
    !/scrutiny|what we have on|published/i.test(line),
    line
  );
}
check(
  "brief-in-review line says in review, not published",
  BRIEF_IN_REVIEW_LINE.startsWith("Brief in review") &&
    !/\bpublished\b/i.test(BRIEF_IN_REVIEW_LINE)
);

/* 4. Captions only where the contest is printed. */
const contestState = listingCopy({ count: 3, level: "state" });
check(
  "printed state race: printed intro",
  contestState.intro === LISTING_INTRO_PRINTED
);
check("printed state race: no county note", contestState.countyNote === null);
check(
  "printed state race: write-in note",
  contestState.writeInNote === WRITE_IN_NOTE
);

const contestCounty = listingCopy({ count: 2, level: "county" });
check(
  "printed county race: county note",
  contestCounty.countyNote === COUNTY_NOTE
);
check(
  "county note names district seats and the sample ballot",
  COUNTY_NOTE.includes("commission or school-board district") &&
    COUNTY_NOTE.includes("sample ballot")
);
check(
  "printed county race: write-in note",
  contestCounty.writeInNote === WRITE_IN_NOTE
);

const singleCounty = listingCopy({ count: 1, level: "county" });
check(
  "single qualifier is still printed: printed intro + notes",
  singleCounty.intro === LISTING_INTRO_PRINTED &&
    singleCounty.countyNote === COUNTY_NOTE &&
    singleCounty.writeInNote === WRITE_IN_NOTE
);

const decidedCounty = listingCopy({
  decidedInPrimary: true,
  count: 1,
  level: "county",
});
check(
  "decided county seat: not-printed intro",
  decidedCounty.intro === LISTING_INTRO_NOT_PRINTED
);
check("decided county seat: no county note", decidedCounty.countyNote === null);
check(
  "decided county seat: no write-in note",
  decidedCounty.writeInNote === null
);

const unopposedFederal = listingCopy({
  notPrintedOnBallot: true,
  count: 1,
  level: "federal",
});
check(
  "unopposed race: not-printed intro, no notes",
  unopposedFederal.intro === LISTING_INTRO_NOT_PRINTED &&
    unopposedFederal.countyNote === null &&
    unopposedFederal.writeInNote === null
);
check(
  "not-printed intro never says 'printed on the ballot'",
  !/printed on the ballot/.test(LISTING_INTRO_NOT_PRINTED)
);

/* 5. The listing path's predicates: hasWriteIn is always false there. */
const one = (qualifying_status: QualifyingStatus) => [{ qualifying_status }];
const LISTING_HAS_WRITE_IN = false;
check(
  "listing: carried UNO alone marks not printed",
  isUnopposedContest(one("unopposed"), LISTING_HAS_WRITE_IN) === true
);
check(
  "listing: carried elected_in_primary alone marks decided",
  isDecidedInPrimary(one("elected_in_primary"), LISTING_HAS_WRITE_IN) === true
);
check(
  "listing: a qualified survivor is never 'not printed'",
  isUnopposedContest(one("qualified"), LISTING_HAS_WRITE_IN) === false &&
    isDecidedInPrimary(one("qualified"), LISTING_HAS_WRITE_IN) === false
);
check(
  "listing: two candidates are never decided or unopposed",
  isUnopposedContest(
    [{ qualifying_status: "unopposed" }, { qualifying_status: "qualified" }],
    LISTING_HAS_WRITE_IN
  ) === false
);
check(
  "brief path's brace still works: a write-in makes UNO printed",
  isUnopposedContest(one("unopposed"), true) === false
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-listing: all checks passed.");
