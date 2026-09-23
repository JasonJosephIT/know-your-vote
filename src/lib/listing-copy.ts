/* The voter-facing sentences a race page picks between, in one pure place.

   Two render modes share these (design brief "listed publication tier",
   2026-09-23): the full audited brief, and the roster LISTING a race gets
   when it is visible but no brief has cleared the Balance Audit. The branch
   selection is the same in both — decided in August beats unopposed beats
   one-candidate beats the ordinary race, for the reasons written up on the
   race page and in src/lib/unopposed.ts — so it lives once, here, and
   scripts/verify-listing.ts pins every branch.

   What differs is the tail. The brief's lines end in "here's what we have on
   them" and "same space, same scrutiny", which are claims about the audited
   brief below them. A listing has no brief below it: nothing has been
   scrutinized yet, so the ordinary-race line cannot say it was, and the
   single-candidate lines stop at the fact rather than promising a write-up.
   The facts themselves (not printed, decided in the primary, one qualifier)
   are public record from the DoE / county Supervisors and read the same.

   Pure and dependency-free so a Node script can drive it with no build. */

export type RaceRenderMode = "brief" | "listing";

export interface StatusLineInput {
  /* Optional because RaceBrief carries both as optional across the
     unstable_cache boundary (see briefs.ts): `undefined` must mean the
     weaker claim, i.e. "a normal, printed race". */
  decidedInPrimary?: boolean;
  notPrintedOnBallot?: boolean;
  count: number;
}

export type StatusBranch =
  "decided_in_primary" | "not_printed" | "single_candidate" | "contest";

/** Which of the four states a race is in. Order is load-bearing: a
    primary winner is ALSO a single candidate, and saying "one candidate
    qualified" about someone who beat three people would be false. */
export function statusBranch(input: StatusLineInput): StatusBranch {
  if (input.decidedInPrimary) return "decided_in_primary";
  if (input.notPrintedOnBallot) return "not_printed";
  if (input.count === 1) return "single_candidate";
  return "contest";
}

const LINES: Record<RaceRenderMode, Record<StatusBranch, string>> = {
  /* Byte-for-byte the copy the race page shipped before the listed tier.
     verify-listing.ts asserts it did not move. */
  brief: {
    decided_in_primary:
      "This contest was decided in the August primary, so it will not appear on your November ballot — here's what we have on the winner.",
    not_printed:
      "No one filed against this candidate, so they are elected without opposition and this contest will not appear on your ballot — here's what we have on them.",
    single_candidate:
      "One candidate qualified for this race, so there is nothing to compare — here's what we have on them.",
    contest: "Here's your race — every candidate, same space, same scrutiny.",
  },
  listing: {
    decided_in_primary:
      "This contest was decided in the August primary, so it will not appear on your November ballot.",
    not_printed:
      "No one filed against this candidate, so they are elected without opposition and this contest will not appear on your ballot.",
    single_candidate:
      "One candidate qualified for this race, so there is nothing to compare.",
    contest:
      "Here's who is on the ballot for this race, in ballot order — every candidate gets the same card.",
  },
};

export function raceStatusLine(
  input: StatusLineInput,
  mode: RaceRenderMode
): string {
  return LINES[mode][statusBranch(input)];
}

/* Whether the contest is absent from the November ballot altogether. The
   listing's other captions all talk about "the ballot", and for these two
   states there is no line on it to talk about. */
function notOnNovemberBallot(branch: StatusBranch): boolean {
  return branch === "decided_in_primary" || branch === "not_printed";
}

export interface ListingCopyInput extends StatusLineInput {
  level: string;
}

export interface ListingCopy {
  status: string;
  /* The paragraph above the cards: where the names come from, and that the
     briefs are not written yet. */
  intro: string;
  /* Only for county races that are actually printed. */
  countyNote: string | null;
  /* Only for races that are actually printed. */
  writeInNote: string | null;
}

export const LISTING_INTRO_PRINTED =
  "These are the names printed on the ballot for this race, from the Florida Division of Elections and the county Supervisor of Elections. The full briefs are still in review.";

/* A decided or unopposed seat has no printed names to speak of, so the
   printed-ballot intro would contradict the status line right above it. */
export const LISTING_INTRO_NOT_PRINTED =
  "The name below is from the Florida Division of Elections and the county Supervisor of Elections. The full brief is still in review.";

/* Nothing places a voter inside a commission or school-board district yet
   (design brief: no crosswalk built). Some county seats are countywide and
   are on every ballot in that county, but the row alone cannot say which, so
   the sentence covers both rather than claiming either for this race. */
export const COUNTY_NOTE =
  "This is a county race. Whether it is on your ballot depends on your county and, for district seats, your commission or school-board district, which we can't place from a ZIP yet — your county's sample ballot will say.";

/* The app never shows write-in filers (data-architecture.md D1), and they
   are never in race.candidate_ids. A qualified write-in still puts a blank
   line on the printed ballot, so a voter comparing this page to their
   sample ballot deserves to know why the two can differ. Stated for every
   printed race because the listing cannot see whether one filed. */
export const WRITE_IN_NOTE =
  "We list the names printed on the ballot. If a write-in candidate qualified, your ballot also shows a blank line where you can write a name in.";

export function listingCopy(input: ListingCopyInput): ListingCopy {
  const branch = statusBranch(input);
  const absent = notOnNovemberBallot(branch);
  return {
    status: raceStatusLine(input, "listing"),
    intro: absent ? LISTING_INTRO_NOT_PRINTED : LISTING_INTRO_PRINTED,
    countyNote: input.level === "county" && !absent ? COUNTY_NOTE : null,
    writeInNote: absent ? null : WRITE_IN_NOTE,
  };
}

/* The line every listed candidate card carries, identical for everyone. */
export const BRIEF_IN_REVIEW_LINE =
  "Brief in review — we publish what a candidate says, has done, and what's verified only after every candidate in the race has equal space and equal scrutiny.";
