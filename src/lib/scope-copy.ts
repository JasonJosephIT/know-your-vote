/* What this guide covers of a voter's ballot, said the same way on the home
   page and in the races view.

   The home page used to say the House race was "the one part of your ballot
   that depends on where you live", and the races view that every voter "gets
   the same ballot". Both read as the whole ballot. What ships is the
   statewide races, the amendments, U.S. House, and selected county races in
   four counties; Florida House and Senate seats, judges, local ballot
   questions, city races and special districts are on real ballots and not
   here (CoverageSummary's "Not covered" row, /methodology#not-covered). The
   sentences that make those claims live here so they can't drift apart, and
   so scripts/verify-home-coverage.ts can run them under plain node.

   Pure and dependency-free: the one import is type-only, so it is erased at
   runtime, the same split as unopposed.ts and listing-copy.ts. */

import type { DecidedSeat } from "@/lib/unopposed";

/** The contests on a voter's ballot that this guide doesn't cover, as one
    sentence. Judges come first because they are on every Florida ballot (the
    Supreme Court retention question); the rest depend on where you live.
    Keep in step with CoverageSummary's "Not covered" row. */
export const NOT_COVERED_SENTENCE =
  "Your ballot also has contests this guide doesn't cover: judges, and, depending on where you live, Florida House and Senate seats, local ballot questions, and city and special-district races. Your county's sample ballot lists every one.";

/** Why a decided seat is not on the November ballot, as the short tag a
    race list prints after the holder's name. Same words as CountyRaces. */
export const DECIDED_TAG: Record<DecidedSeat["decided"], string> = {
  unopposed: "elected without opposition",
  elected_in_primary: "decided in the August primary",
};

/** The home page's sentence for a saved district whose U.S. House race will
    not be printed. Names the one person who takes the seat, which is only
    ever done for a decided seat (unopposed.ts), and says why: the two
    reasons are opposite facts about an election and are never merged. */
export function houseRaceNotOnBallot(
  district: string,
  seat: DecidedSeat
): string {
  const name = seat.holder.legalName;
  return seat.decided === "unopposed"
    ? `There's no U.S. House race on your ballot this year. ${name} is elected without opposition: no one else qualified in ${district}, and Florida doesn't print an unopposed race.`
    : `There's no U.S. House race on your ballot this year. The ${district} race was decided in the August primary, and ${name} takes the seat.`;
}

/** The location field's words. The field takes a street address and
    nothing else (founder, 2026-10-12: no ZIP option): a ZIP can sit in
    more than one district, an address sits in one census block. A ZIP
    inside the address is fine, and Census needs it or the city. With
    ADDRESS_LOOKUP_OFF set there is no field at all, only the district
    picker, so the words are about the district and never ask for a ZIP. */
export function locationFieldCopy(addressEnabled: boolean): {
  /** What the voter gives, mid-sentence: "Give us your ___". */
  noun: string;
  label: string;
  /** The field's placeholder: an example of what to type, never the label
      (the label is visible above the field; interface review 2026-10-05).
      It is the shape, not a street: any real example would be someone's
      street, and Census needs the city or ZIP with it. */
  example?: string;
  /** A line under the label saying what the field needs, so the rule is
      visible after the placeholder goes. */
  hint?: string;
  /** street-address. It autofills the street lines alone, and the field
      then asks for the city or ZIP code (the needsPlace answer). The token
      it replaced, postal-code, would autofill the one thing the field now
      refuses. */
  autoComplete?: "street-address";
} {
  return addressEnabled
    ? {
        noun: "address",
        label: "Your address",
        example: "Street and city, or street and ZIP",
        hint: "Your house number and street, with your city or ZIP code.",
        autoComplete: "street-address",
      }
    : {
        noun: "district",
        label: "Your congressional district",
      };
}
