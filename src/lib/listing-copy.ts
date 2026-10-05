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

/* Founder decision 4 (docs/general-election/launch-handoff-2026-10-04.md
   §3): is "listed, no brief" the Election Day state for the 17 races where
   no candidate's own site gave us a position we could quote?

   RECOMMENDED (pending founder confirmation): yes. The evidence, race by
   race, is in docs/general-election/listed-races-2026-10-04.md: 10 of the
   17 are not on the November ballot at all (5 decided in August, 5
   unopposed), and in the other 7 a brief would read "No stated position
   found" in every cell.

   Under that call the tier's first wording turns false: "still in review"
   promises a brief that is not coming. So with this set, the intros drop
   that sentence, and a listed race's cards say it has no brief, under
   what rule, and that this is no judgment of the candidates
   (NO_BRIEF_CARD_LINE, through listingCardLine below). A published race
   shown as a roster keeps the in-review card line either way.

   TO FLIP: set this to false. The intros say "still in review" again and
   every card says "Brief in review", which is right only while briefs for
   these races are actually being written (for example, if the founder
   allows a second source, decision 6). This one constant is the whole
   switch. Every export keeps its HEAD name and BRIEF_IN_REVIEW_LINE still
   starts "Brief in review"; scripts/verify-listing.ts checks both
   positions of the switch. */
export const LISTED_IS_FINAL = true;

const INTRO_PRINTED =
  "These are the names printed on the ballot for this race, from the Florida Division of Elections and the county Supervisor of Elections.";

export const LISTING_INTRO_PRINTED = LISTED_IS_FINAL
  ? INTRO_PRINTED
  : `${INTRO_PRINTED} The full briefs are still in review.`;

/* A decided or unopposed seat has no printed names to speak of, so the
   printed-ballot intro would contradict the status line right above it. */
const INTRO_NOT_PRINTED =
  "The name below is from the Florida Division of Elections and the county Supervisor of Elections.";

export const LISTING_INTRO_NOT_PRINTED = LISTED_IS_FINAL
  ? INTRO_NOT_PRINTED
  : `${INTRO_NOT_PRINTED} The full brief is still in review.`;

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

/* The card line for a brief that is still coming: a listed race while its
   briefs are being written (LISTED_IS_FINAL = false), and a PUBLISHED race
   whose brief is briefly unreadable (src/lib/listing.ts: a published race
   whose brief fails the audit re-check renders this roster, as it does for
   the minutes of a rebuild, refresh-plan-2026-10.md Path B1). It names the
   one source a brief quotes, and never says "published" about the roster.

   It used to promise "what a candidate says, has done, and what's verified"
   with "equal space": no published brief carries a record or a fact-check,
   and the Balance Audit's word_count gate runs at 150, so space is not
   equalized (the trust-copy rewrite in src/app/layout.tsx, 2026-10-04,
   drops the same two promises). "The same rules" is what holds. */
export const BRIEF_IN_REVIEW_LINE =
  "Brief in review — we publish what candidates state on their own campaign websites only after every candidate in the race has been held to the same rules.";

/* The card line for a listed race when listed is the Election Day state.
   It has to be true in all 17 races (listed-races-2026-10-04.md §3): no
   site, a site we could not read, a site whose commitments fall outside
   the 25 issues we cover (Orange Clerk has no issue at all, so finding a
   quotable position there will never give it a brief), or a passage
   withheld as a past record. So it states the rule as a condition the race
   has not met, and promises no brief later. The last sentence is there
   because an empty card can read as "this candidate has no positions". */
export const NO_BRIEF_CARD_LINE =
  "No brief for this race. We write a brief only when a candidate's own campaign website states a position we can quote on an issue we cover, and we have not found one here. That is about our sources, not a judgment of the candidates.";

/* The line every candidate card on a roster carries, identical for everyone
   in the race. `status` is RaceListing["status"]: a published race is on
   the roster only while its brief is unreadable, so it keeps the "in
   review" line whatever LISTED_IS_FINAL says. RaceListing.tsx and
   CandidateListing.tsx pass listing.status here, src/lib/races.ts takes
   LISTED_RACE_LABEL below, and scripts/verify-listing.ts pins the switch
   (listed-races-2026-10-04.md §2). */
export function listingCardLine(status: "listed" | "published"): string {
  return LISTED_IS_FINAL && status === "listed"
    ? NO_BRIEF_CARD_LINE
    : BRIEF_IN_REVIEW_LINE;
}

/* The caption a race card carries on the landing page, Your races and the
   county list for a listed race. src/lib/races.ts raceStatusLabel reads
   it, so that caption follows the same switch as the roster cards. */
export const LISTED_RACE_LABEL = LISTED_IS_FINAL
  ? "Names on the ballot · no brief"
  : "Names on the ballot · brief in review";
