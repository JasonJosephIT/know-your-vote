/* The civics quiz's questions and answers (spec
   docs/superpowers/specs/2026-10-15-civics-quiz-landing-design.md §3-§5).

   Facts only, each from an official source, re-checked weekly to Nov 3.
   The same six answers hold for every Florida voter, which is why the quiz
   needs no address. The mayor question waits for city data (spec §8, v1.1).

   checkedAt is the day the named source was read. isStale hides a name
   checked more than 14 days ago: the card then sends the voter to the
   source instead of showing a name that may have changed (spec §4.4).

   No @/ imports: scripts/verify-civics-quiz.ts loads this under plain node. */

export interface CivicsQuestion {
  id: string;
  question: string;
  answer: string;
  /* The office, never the person (brand guide, Voice): one line from the
     constitution that creates it. */
  about: { text: string; source: string; sourceUrl: string };
  source: { name: string; url: string };
  checkedAt: string;
  ballot: { text: string; href: string; linkText: string };
}

const FL_CONSTITUTION = "https://www.flsenate.gov/Laws/Constitution";

export const CIVICS_QUESTIONS: readonly CivicsQuestion[] = [
  {
    id: "senators",
    question: "Who are your two U.S. Senators?",
    answer: "Rick Scott and Ashley Moody",
    about: {
      text: "Each state has two senators. The Senate passes federal laws and confirms federal judges and Cabinet members.",
      source: "U.S. Constitution, Art. I §3 and Art. II §2",
      sourceUrl: "https://constitution.congress.gov/browse/article-1/section-3/",
    },
    source: { name: "U.S. Senate", url: "https://www.senate.gov/states/FL/intro.htm" },
    checkedAt: "2026-10-15",
    ballot: {
      text: "Ashley Moody's seat is on your ballot this year, in a special election. Rick Scott's is not.",
      href: "/races/FL-SEN-general",
      linkText: "See who's running",
    },
  },
  {
    id: "governor",
    question: "Who is your Governor?",
    answer: "Ron DeSantis",
    about: {
      text: "The Governor leads the state's executive branch and signs or vetoes the bills the Legislature passes.",
      source: "Florida Constitution, Art. III §8 and Art. IV §1",
      sourceUrl: FL_CONSTITUTION,
    },
    source: { name: "Executive Office of the Governor", url: "https://www.flgov.com/eog/" },
    checkedAt: "2026-10-15",
    ballot: {
      text: "The Governor's race is on your ballot this year.",
      href: "/races/FL-GOV-general",
      linkText: "See who's running",
    },
  },
  {
    id: "attorney-general",
    question: "Who is your Attorney General?",
    answer: "James Uthmeier",
    about: {
      text: "The Attorney General is the state's chief legal officer and sits on the Governor's Cabinet.",
      source: "Florida Constitution, Art. IV §4",
      sourceUrl: FL_CONSTITUTION,
    },
    source: { name: "Office of the Attorney General", url: "https://www.myfloridalegal.com/newsreleases" },
    checkedAt: "2026-10-15",
    ballot: {
      text: "The Attorney General's race is on your ballot this year.",
      href: "/races/FL-ATG-general",
      linkText: "See who's running",
    },
  },
  {
    id: "cfo",
    question: "Who is your Chief Financial Officer?",
    answer: "Blaise Ingoglia",
    about: {
      text: "The Chief Financial Officer is the state's chief fiscal officer, keeps state funds and sits on the Governor's Cabinet.",
      source: "Florida Constitution, Art. IV §4",
      sourceUrl: FL_CONSTITUTION,
    },
    source: { name: "Florida Department of Financial Services", url: "https://www.myfloridacfo.com/" },
    checkedAt: "2026-10-15",
    ballot: {
      text: "The Chief Financial Officer's race is on your ballot this year.",
      href: "/races/FL-CFO-general",
      linkText: "See who's running",
    },
  },
  {
    id: "agriculture",
    question: "Who is your Commissioner of Agriculture?",
    answer: "Wilton Simpson",
    about: {
      text: "The Commissioner of Agriculture supervises matters of agriculture and sits on the Governor's Cabinet.",
      source: "Florida Constitution, Art. IV §4",
      sourceUrl: FL_CONSTITUTION,
    },
    source: {
      name: "Florida Department of Agriculture and Consumer Services",
      url: "https://www.fdacs.gov/",
    },
    checkedAt: "2026-10-15",
    ballot: {
      text: "The Commissioner of Agriculture's race is on your ballot this year.",
      href: "/races/FL-AGR-general",
      linkText: "See who's running",
    },
  },
  {
    id: "amendments",
    question:
      "How many statewide amendments are on your ballot, and what share of the vote does each one need to pass?",
    answer: "Three, and each needs 60% of the vote",
    about: {
      text: "The Legislature put all three on the ballot. A simple majority is not enough to change Florida's constitution.",
      source: "Florida Constitution, Art. XI §5(e)",
      sourceUrl: FL_CONSTITUTION,
    },
    source: {
      name: "Florida Division of Elections, 2026 amendment booklet",
      url: "https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf",
    },
    checkedAt: "2026-10-15",
    ballot: {
      text: "All three are on every Florida ballot this year.",
      href: "/ballot?scope=statewide",
      linkText: "Read the amendments",
    },
  },
];

const DAY_MS = 86_400_000;
const STALE_AFTER_DAYS = 14;

/** True when an answer was checked more than 14 days before `today`
    (both YYYY-MM-DD), or its date can't be read. */
export function isStale(checkedAt: string, today: string): boolean {
  const age = (Date.parse(today) - Date.parse(checkedAt)) / DAY_MS;
  return !(age <= STALE_AFTER_DAYS);
}
