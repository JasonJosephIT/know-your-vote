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
   6. The card line is chosen by the race, never by the candidate: a listed
      race in UNFINISHED_BRIEF_RACES gets UNFINISHED_BRIEF_LINE on every
      card, every other listed race keeps NO_BRIEF_CARD_LINE (unchanged,
      founder decision BC6), and the unfinished line names no candidate
      and promises nothing (ballot-content-completion §3.3, BC15).

   Run: node scripts/verify-listing.ts */

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

/* 3b. Founder decision 4 (launch handoff 2026-10-04): LISTED_IS_FINAL picks
   a listed race's intros and card line. A published race on the roster is a
   brief that is briefly unreadable (audit re-check, rebuild), so its cards
   keep the in-review line either way. The no-brief line says so first,
   never says published, and promises neither a review nor a later brief. */
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
check(
  "no-brief line: says so first, never published, promises nothing",
  NO_BRIEF_CARD_LINE.startsWith("No brief for this race") &&
    !/\bpublished\b|in review|\bonce\b|\bsoon\b|\byet\b/i.test(
      NO_BRIEF_CARD_LINE
    )
);
check(
  "switch on: no listed-race copy promises a review",
  !LISTED_IS_FINAL ||
    ![
      listingCardLine("listed", "FL-TEST-general", NONE_UNFINISHED),
      LISTING_INTRO_PRINTED,
      LISTING_INTRO_NOT_PRINTED,
      LISTED_RACE_LABEL,
    ].some((l) => /in review/i.test(l))
);
check(
  "switch off: the in-review wording is back",
  LISTED_IS_FINAL ||
    (LISTING_INTRO_PRINTED.endsWith("The full briefs are still in review.") &&
      LISTING_INTRO_NOT_PRINTED.endsWith(
        "The full brief is still in review."
      ) &&
      LISTED_RACE_LABEL === "Names on the ballot · brief in review")
);

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
