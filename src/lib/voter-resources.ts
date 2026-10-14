/* Relative, with the extension: scripts/verify-voter-links.ts walks these
   day by day in plain Node, which doesn't know the @/ alias. The
   election-events import is type-only, so its server-only guard is erased. */
import type { ElectionEvent } from "./notifications/election-events";
import { bannerLongDate } from "./notifications/banner.ts";
import { eventsForCounty } from "./notifications/schedule.ts";
import { COVERED_COUNTIES } from "./counties.ts";
import {
  STATE_VOTER_LINKS,
  SUPERVISOR_DIRECTORY_URL,
  voterLinks,
} from "./supervisors.ts";

/* The tiles in the home page's "Sample ballot and how to vote" block
   (VotingResources; docs/design/home-readability-2026-10-12/ §2): the same
   four for every county, in the same order and the same words, so no
   county's voters get more or less than another's.

   Every date comes from a verified election_event row, and is stated,
   never counted down, the same rule as the deadline banner beside it
   (src/lib/notifications/banner.ts). "Today" appears only on the date
   itself. Pure, so the day-by-day walk can check every note. */

export type MailBallotRow = {
  kind: "request" | "return" | "info";
  label: string;
  note: string | null;
};

/* The mail-ballot tile asks for a ballot through the request deadline
   (5 p.m., as the banner says) and switches to returning one the day
   after. A returned ballot must reach the Supervisor by 7 p.m. on
   Election Day (s. 101.67(2), Fla. Stat.), and an Election Day polling
   place can't take one, which is what a voter still holding one late
   needs to know. With no verified rows it is neither: the mail-ballot
   page, undated. */
export function mailBallotRow(
  events: ElectionEvent[],
  today: string
): MailBallotRow {
  const request = events.find((e) => e.event_type === "vbm_request_deadline");
  const ret = events.find((e) => e.event_type === "ballot_return_deadline");
  if (request && today <= request.event_date) {
    const date = bannerLongDate(request.event_date);
    return {
      kind: "request",
      label: "Request a mail ballot",
      note:
        request.event_date === today
          ? `By 5 p.m. today, ${date}`
          : `By 5 p.m. on ${date}`,
    };
  }
  if (ret && today <= ret.event_date) {
    const date = bannerLongDate(ret.event_date);
    return {
      kind: "return",
      label: "Return your mail ballot",
      note: `It must be received by 7 p.m. ${ret.event_date === today ? `today, ${date}` : `on ${date}`}, and can’t be handed in at an Election Day polling place.`,
    };
  }
  return { kind: "info", label: "Vote by mail", note: null };
}

export type ResourceTile = {
  key: "sample-ballot" | "polling-place" | "early-voting" | "mail";
  label: string;
  note: string | null;
  href: string;
};

/* A county's own early-voting window, from its own verified rows (0043),
   or null when it has no pair of its own. */
function ownWindow(
  all: ElectionEvent[],
  fips: string
): { start: string; end: string } | null {
  const own = all.filter((e) => e.county_fips === fips);
  const start = own.find((e) => e.event_type === "early_voting_start");
  const end = own.find((e) => e.event_type === "early_voting_end");
  return start && end ? { start: start.event_date, end: end.event_date } : null;
}

/* The four tiles for a covered county, or for "Another Florida county"
   (the Division of Elections' links) when countyFips is null or names a
   county we don't cover. null once a verified election_day row is before
   today, the deadline banner's rule (bannerDates), so the block goes when
   the election does. With no verified rows at all the links still show:
   they don't depend on dates, only the notes do. */
export function resourceTiles(
  countyFips: string | null,
  all: ElectionEvent[],
  today: string
): ResourceTile[] | null {
  const links = voterLinks(countyFips);
  const events = eventsForCounty(all, links ? countyFips : null);
  const electionDay = events.find((e) => e.event_type === "election_day");
  if (electionDay && electionDay.event_date < today) return null;
  const mail = mailBallotRow(events, today);

  if (!links) {
    /* The statewide window is the least every county must offer (s.
       101.657(1)(d)), so it is said as that, and only until it closes. */
    const start = events.find((e) => e.event_type === "early_voting_start");
    const end = events.find((e) => e.event_type === "early_voting_end");
    return [
      {
        key: "sample-ballot",
        label: "Find your county’s Supervisor of Elections",
        note: "They have your official sample ballot",
        href: SUPERVISOR_DIRECTORY_URL,
      },
      {
        key: "polling-place",
        label: "Where to vote on Election Day",
        note: "Every county’s polling-place finder",
        href: STATE_VOTER_LINKS.pollingPlace,
      },
      {
        key: "early-voting",
        label: "Early voting sites and hours",
        note:
          start && end && today <= end.event_date
            ? `Every county: at least ${bannerLongDate(start.event_date)} to ${bannerLongDate(end.event_date)}`
            : null,
        href: STATE_VOTER_LINKS.earlyVoting,
      },
      {
        key: "mail",
        label: mail.label,
        note: mail.note,
        href: STATE_VOTER_LINKS.mail,
      },
    ];
  }

  /* A county's own window shows only when all four covered counties have
     theirs, so no county's voters get a date another's don't. Then the
     tile goes the day after that county's window closes. Otherwise every
     county keeps the tile, undated, through Election Day. */
  const window =
    countyFips && COVERED_COUNTIES.every((c) => ownWindow(all, c.fips))
      ? ownWindow(all, countyFips)
      : null;

  const tiles: ResourceTile[] = [
    {
      key: "sample-ballot",
      label: "See your sample ballot",
      note: `Asks for ${links.sampleBallotAsks}`,
      href: links.sampleBallot,
    },
    {
      key: "polling-place",
      label: "Where to vote on Election Day",
      /* Polls are open 7 a.m. to 7 p.m. in every county (s. 100.011, Fla.
         Stat.), so the hours are stated for all four alike. */
      note: electionDay
        ? `${electionDay.event_date === today ? "Today, " : ""}${bannerLongDate(electionDay.event_date)}, 7 a.m. to 7 p.m.`
        : null,
      href: links.pollingPlace,
    },
  ];
  if (!window || today <= window.end) {
    tiles.push({
      key: "early-voting",
      label: "Early voting sites and hours",
      note: window
        ? `${bannerLongDate(window.start)} to ${bannerLongDate(window.end)}`
        : null,
      href: links.earlyVoting,
    });
  }
  tiles.push({
    key: "mail",
    label: mail.label,
    note: mail.note,
    href: mail.kind === "return" ? links.mailReturn : links.mailRequest,
  });
  return tiles;
}
