import Link from "next/link";
import { cookies } from "next/headers";
import { DISTRICT_COOKIE, parseDistrictCookie } from "@/lib/district-cookie";
import { DeadlineBanner } from "@/components/features/DeadlineBanner";
import { InstallCard } from "@/components/features/InstallCard";
import {
  REMINDER_SIGNUP_ID,
  ReminderSignupCta,
} from "@/components/features/ReminderSignupCta";
import { SharedBallot } from "@/components/features/SharedBallot";
import { TrackView } from "@/components/features/TrackView";
import { LocationEntry } from "@/components/features/LocationEntry";
import { CoverageSummary } from "@/components/features/CoverageSummary";
import { HomeNews } from "@/components/features/HomeNews";
import { HomeMasthead } from "@/components/features/HomeMasthead";
import { BallotAtAGlance } from "@/components/features/BallotAtAGlance";
import { Art } from "@/components/brand/Art";
import { LedgeArt } from "@/components/brand/Ledge";
import { HeroRotator } from "@/components/brand/HeroRotator";
import { SectionDivider } from "@/components/brand/SectionDivider";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { districtRace, getCoveredDistricts } from "@/lib/resolve";
import { geocoderConfigured } from "@/lib/geocode";
import { reminderPromotionLive } from "@/lib/notifications/config";
import {
  houseRaceNotOnBallot,
  locationFieldCopy,
  NOT_COVERED_SENTENCE,
} from "@/lib/scope-copy";

/* Ballot first, ZIP optional (TASK-067).

   The page used to be a ZIP wall: a headline and a text field, with the
   ballot behind them. In the general election that gate asked a question
   whose answer changes one race out of nine, so the ballot moved in front of
   it and the ZIP field became an upgrade.

   The headline changed with it. "Your ballot" was a promise this page cannot
   keep without a ZIP — what it shows is the races and amendments on *every*
   Florida ballot, which is part of yours, not all of it. The ZIP prompt below
   says what it adds, and CoverageSummary says what is not here at all
   (Florida House and Senate, judges, city races, special districts), rather
   than the copy overclaiming what is already there. */

export default async function Home() {
  /* The saved district. Reading cookies opts this route into dynamic rendering,
     which is why only this page and /candidates do it — the data behind the
     ballot still comes through unstable_cache, so what changes is the shell, not
     the queries. */
  const cookieDistrict = parseDistrictCookie(
    (await cookies()).get(DISTRICT_COOKIE)?.value
  );

  /* ballot_viewed is the funnel's new entry event (TASK-071), so it must mean
     "a ballot was on screen" — not "the landing page loaded". Both reads are
     the same unstable_cache calls SharedBallot makes in this render, so this
     costs a cache hit rather than a second query.

     Deliberately mounted here rather than inside SharedBallot: the tracker is
     a client component, and SharedBallot's whole point is that nothing it
     reaches needs JavaScript. verify-shared-ballot enforces exactly that.

     The saved district's race is read for one fact: whether it will be
     printed at all. FL-10 has one candidate, unopposed, so its voters have
     no House race, and this section used to present it as theirs. Cached
     (districtRace), and null on any failure, which keeps the ordinary copy. */
  const savedRaceRead = cookieDistrict && districtRace(cookieDistrict.district);
  const [races, measures, districts, savedRace] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
    getCoveredDistricts(),
    savedRaceRead,
  ]);
  /* A saved pair coverage no longer holds -- FL-7 in Orange, which 0045
     dropped -- is no saved district, the same rule resolveDistrict applies,
     so the page never files a voter under a House race their county doesn't
     vote in (or shows that county's dates for it). An empty list means the
     read failed: unknown, not invalid. */
  const saved =
    cookieDistrict &&
    (districts.length === 0 ||
      districts.some(
        (d) =>
          d.countyFips === cookieDistrict.countyFips &&
          d.district === cookieDistrict.district
      ))
      ? cookieDistrict
      : null;
  const savedSeat =
    savedRace?.decided && savedRace.holder
      ? { decided: savedRace.decided, holder: savedRace.holder }
      : null;
  const ballotRendered = races.length > 0 || measures.length > 0;

  /* ZIP only unless address completion is configured (it is off in
     production; /privacy says the field takes a ZIP). */
  const addressEnabled = geocoderConfigured();
  const field = locationFieldCopy(addressEnabled);

  /* FOUNDER DECISION 3 — promote the reminder signup. Recommended (pending
     founder confirmation): yes, once email works. True only while email
     delivery is configured, reminders are not paused and
     PROMOTE_REMINDER_SIGNUP is on (src/lib/notifications/config.ts), so the
     card and the banner's link to it switch on by themselves with the
     redeploy after the env fix. Turn it off with that constant. The card
     sits after the ballot and the House-race step, so the ballot still comes
     first (TASK-067); the banner's link is what makes it visible from the
     top of the page. */
  const promoteReminders = reminderPromotionLive();

  /* Layout pass 2026-10-11 (docs/design/layout-2026-10-11/): a dateline
     strip, then two columns from lg up: the ballot on the left, the news
     column on the right, sticky, beside it. Below lg it is the one column
     it always was, with the news where it used to sit, after the
     coverage summary. The grid areas do the reordering, so the DOM order
     is the phone order and a screen reader reads the ballot first at
     every width. */
  return (
    <>
      <HomeMasthead />
      <main className="mx-auto grid w-full max-w-[680px] flex-1 grid-cols-1 content-start gap-6 px-5 py-8 lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          {/* Kept in step with SITE_TITLE in src/app/layout.tsx (founder decision
          1, recommended): the old h1, "Everything on every Florida ballot.",
          and the old promise of records and verified facts overclaimed what
          ships. Flip both together.

          "See everyone you can vote for" went for the same reason it left
          the share description in layout.tsx: it reads as the whole ballot,
          and Florida House and Senate seats, judges and city races are on
          real ballots and not here. */}
          <h1 className="text-display">
            Florida candidates, in their own words.
          </h1>
          {/* The lede and the walkers (design.md "Site illustration
          layer"). From lg up the paragraph takes 58% and the rotator the
          rest of the row, in its own cell, so it never sits over or under
          the text. Below lg HeroRotator hides itself (hidden lg:block), the
          grid is one column and the paragraph is full width, as before. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[58%_minmax(0,1fr)]">
            <p className="text-body-lg text-on-surface-muted">
              See the races we cover and what each candidate says, quoted word
              for word from their own campaign sites, with a link to every
              source. The same questions and the same rules for every
              candidate. No ZIP, no account, no agenda.
            </p>
            <HeroRotator />
          </div>
          <DeadlineBanner
            remindersHref={
              promoteReminders ? `#${REMINDER_SIGNUP_ID}` : undefined
            }
            countyFips={saved?.countyFips}
          />
          <BallotAtAGlance />

          {ballotRendered && <TrackView event="ballot_viewed" />}
          <SharedBallot />

          {/* The zigzag that used to be this section's border-t, with a
          figure sitting on it at the right end from lg up. The divider is a
          mask, which would clip a child, so the figure hangs from a
          zero-height marker at the band's centre line: sit-divider's ledge
          (0.618 of its height) lands on that line. At 150px that is ~93px
          of figure above the line and ~57px of legs below it.

          Above: the ballot-question list ends just before this, and art
          never goes over a list, so lg adds 72px to the 24px gap (96px
          clear for a 93px head). Below: the legs reach ~57px under the
          band's centre line, beside the section's h2 and the start of its
          paragraph. So the text block under each h2 (h2 and paragraphs)
          carries lg:pr-[112px], which keeps every line out of the figure's
          99px at the right. The figure and that guard are both px; the
          spacing above the section is rem, so a rem guard (the old
          lg:pr-32 on the h2 only) let the paragraph run under the legs at
          a smaller root font size. The text block runs well past ~57px at
          any root size, so the link and the form below it start clear of
          the feet. */}
          <div className="relative lg:mt-[72px]">
            <SectionDivider variant="zigzag" />
            <div className="absolute inset-x-0 top-1/2">
              <LedgeArt
                name="sit-divider"
                height={150}
                edge="top"
                className="right-0 hidden lg:block"
              />
            </div>
          </div>

          <section className="flex flex-col gap-3">
            {saved ? (
              <>
                <div className="flex flex-col gap-1 lg:pr-[112px]">
                  <h2 className="text-h2">
                    {savedSeat
                      ? "No U.S. House race on your ballot"
                      : "Your U.S. House race"}
                  </h2>
                  {/* The House race is the race here that depends on where you
                  live, not "the one part of your ballot" that does: Florida
                  House and Senate seats, city races and more depend on it
                  too, and this guide doesn't cover them. A decided seat
                  (savedSeat) is said plainly as no race at all, never shown
                  as the voter's race. */}
                  <p className="text-body-sm text-on-surface-muted">
                    You&rsquo;re set to {saved.district}.{" "}
                    {savedSeat
                      ? houseRaceNotOnBallot(saved.district, savedSeat)
                      : "Your House race depends on where you live, so it's linked below rather than listed above."}{" "}
                    The statewide races and amendments above are the same for
                    every Florida voter. {NOT_COVERED_SENTENCE}
                  </p>
                  <p className="text-body-sm text-on-surface-muted">
                    We remember the district, never your address or ZIP; the
                    chip at the top of the page changes it or forgets it.
                  </p>
                </div>
                <Link
                  href={`/candidates?view=races&district=${saved.district}&county=${saved.countyFips}`}
                  className="w-fit text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  See your races for {saved.district}
                </Link>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1 lg:pr-[112px]">
                  <h2 className="text-h2">
                    Add your U.S. House race
                  </h2>
                  {/* The storage claim, rewritten for the district cookie. TASK-070
                  removed kyv.location and this line said nothing was saved on
                  the device; that stopped being true when the district became
                  something we remember. What is still true, and is the sharper
                  claim, is that the address and the ZIP are never kept.

                  It asks for a ZIP unless address completion is configured
                  (field.noun): the field takes nothing else in production. */}
                  <p className="text-body-sm text-on-surface-muted">
                    Your U.S. House race isn&rsquo;t in the list above, because
                    it depends on where you live. Give us your {field.noun} and
                    we&rsquo;ll add it — or skip it and read the rest. We use it
                    to find your district and keep only the district itself,
                    never your {field.noun}.
                  </p>
                </div>
                {/* The tote figure stands beside the form from lg up, in
                its own flex item, so it can never cover the field, the
                button or the coverage note. LocationEntry is w-full (field
                capped at 320px, then the button, then a full-width note),
                so it gets flex-1 and the figure its own ~85px; the row is
                ~512px of a ~690px column, which leaves room for both.
                Bottom-aligned with the form; below lg the figure is hidden
                and the form is full width, as before. */}
                <div className="lg:flex lg:items-end lg:gap-8">
                  <div className="min-w-0 lg:flex-1">
                    <LocationEntry
                      submitLabel="Add my House race"
                      addressEnabled={addressEnabled}
                      districts={districts}
                    />
                  </div>
                  <Art
                    name="person-kyv-tote"
                    height={160}
                    className="hidden shrink-0 lg:block"
                  />
                </div>
              </>
            )}
          </section>

          {/* Drafts from the inspiration pass (2026-10-05), recommended pending
          founder confirmation: what the guide covers in one place, then the
          newest statewide news. After the House-race step, so the ballot
          still comes first (TASK-067). Remove either line to flip it. */}
          <CoverageSummary
            hasDistrict={Boolean(saved)}
            addressEnabled={addressEnabled}
          />
        </div>

        <aside
          aria-label="Florida election news"
          className="min-w-0 lg:sticky lg:top-[88px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto lg:border-l lg:border-border-strong lg:pl-6"
        >
          <HomeNews countyFips={saved?.countyFips} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          {/* A wave between the coverage summary above and the reminder and
          install cards; shows at every width (one of the three pieces that
          do). Below lg it falls between the news and the cards. */}
          <SectionDivider variant="wave" />
          {promoteReminders && (
            <ReminderSignupCta countyFips={saved?.countyFips} />
          )}

          <InstallCard />

          <p className="text-caption text-on-surface-muted">
            We quote what each candidate says, in their own words. You decide.{" "}
            <Link
              href="/methodology"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              How we stay fair
            </Link>{" "}
            ·{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              Privacy
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
