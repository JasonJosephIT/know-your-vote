import type { Metadata, ResolvingMetadata } from "next";
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
import { VotingResources } from "@/components/features/VotingResources";
import { RaceScopePicker } from "@/components/features/RaceScopePicker";
import { ScopedRaces, ScopeNote } from "@/components/features/ScopedRaces";
import { Art } from "@/components/brand/Art";
import { LedgeArt } from "@/components/brand/Ledge";
import { HeroRotator } from "@/components/brand/HeroRotator";
import { pickLead } from "@/components/brand/hero-walk";
import { SectionDivider } from "@/components/brand/SectionDivider";
import { coveredCountyNames } from "@/lib/counties";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { districtRace, getCoveredDistricts } from "@/lib/resolve";
import { addressEntryEnabled, geocoderConfigured } from "@/lib/geocode";
import { reminderPromotionLive } from "@/lib/notifications/config";
import {
  houseRaceNotOnBallot,
  locationFieldCopy,
  NOT_COVERED_SENTENCE,
} from "@/lib/scope-copy";
import { districtOptions, homeSections, parseRaceScope } from "@/lib/race-scope";

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

/* The home page's share card: the walkers card (site illustration layer,
   2026-10-11), on this page only. Every other page inherits the layout's
   text-only card, so illustrated people never sit under a race's or a
   candidate's link (src/app/layout.tsx). Title and words are the layout's;
   only the image changes. Recommended (pending founder confirmation). To
   flip: delete this function and the home page shares the text card too. */
export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const og = (await parent).openGraph;
  return {
    openGraph: {
      type: "website",
      ...(og?.title ? { title: og.title } : {}),
      ...(og?.siteName ? { siteName: og.siteName } : {}),
      ...(og?.description ? { description: og.description } : {}),
      images: [
        {
          url: "/brand/site/og-card-walkers.png",
          width: 1200,
          height: 630,
          alt: "Know Your Vote. Florida candidates, in their own words. Every quote linked to its source. No ZIP needed.",
        },
      ],
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ show?: string | string[] }>;
}) {
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

  /* "Show races for" (RaceScopePicker, founder 2026-10-13). ?show= from its
     GET form, parsed against the counties and districts we cover; anything
     else is "all", which is this page exactly as it was before the control.
     "statewide" keeps the shared ballot and drops the House-race step and
     the coverage summary; a county or a district replaces the shared ballot
     with just that set of races (ScopedRaces). The masthead, the key dates
     and sample-ballot block, the "On this page" row and the news column
     stay in every view.

     The picker sits right after the "On this page" row (home PR A, #190,
     replaced the count tiles it used to follow). A narrowed view leaves
     sections out, so the row is told which are on the page and drops any
     chip that would jump to nothing (homeSections): the U.S. House chip
     outside "all", and the statewide and ballot-question chips where
     ScopedRaces stands in for the shared ballot (verify-race-scope). */
  const scope = parseRaceScope(
    (await searchParams).show,
    districts.map((d) => d.district)
  );
  const showAll = scope.kind === "all";

  /* The field takes a street address, and only that (no ZIP, founder
     2026-10-12). It suggests addresses only when Pelias is configured (off
     in production: a typed address goes to the Census Bureau instead;
     /privacy says so). With ADDRESS_LOOKUP_OFF set there is no field, just
     the district picker. */
  const addressEnabled = addressEntryEnabled();
  const suggestEnabled = geocoderConfigured();
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
     column on the right beside it. Below lg it is one column, and the news
     comes after the House-race step, before the coverage summary, with
     its four newest stories (home readability, 2026-10-12, A8; founder
     decision 3a). The grid areas do the reordering, so the DOM order is
     the phone order and a screen reader reads the ballot first at every
     width.

     The news column scrolls with the page. It was sticky, with its own
     scrollbar and a viewport-tall cap, which hid most of its eight
     stories inside a second scroll on desktop; now the page has one. */
  return (
    <>
      <HomeMasthead />
      {/* 24 px top and bottom below lg, and 64 px from lg as before (home
          readability A2), so on a phone the h1 starts 40 px higher. */}
      <main className="mx-auto grid w-full max-w-[680px] flex-1 grid-cols-1 content-start gap-6 px-5 py-5 lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-12 lg:py-8">
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          {/* The h1 and the lede read as one group, 12 px apart on a phone
          (A3), where the h1 is 32 px on two lines; from sm it is the
          40 px display size, and from lg the column's 32 px gap again. */}
          <div className="flex flex-col gap-3 lg:gap-6">
            {/* Kept in step with SITE_TITLE in src/app/layout.tsx (founder decision
            1, recommended): the old h1, "Everything on every Florida ballot.",
            and the old promise of records and verified facts overclaimed what
            ships. Flip both together.

            "See everyone you can vote for" went for the same reason it left
            the share description in layout.tsx: it reads as the whole ballot,
            and Florida House and Senate seats, judges and city races are on
            real ballots and not here. */}
            <h1 className="text-h1 sm:text-display">
              Florida candidates, in their own words.
            </h1>
            {/* The lede and the walkers (design.md "Site illustration
            layer"). From lg up the paragraph takes 58% and the rotator the
            rest of the row, in its own cell, so it never sits over or under
            the text. Below lg HeroRotator hides itself (hidden lg:block), the
            grid is one column and the paragraph is full width, as before.

            Shorter and in the body colour (A4): 16 px on a phone, 18 px
            from sm. "See the races we cover" stays: it claims the races
            we cover, not the whole ballot (verify-home-coverage). */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[58%_minmax(0,1fr)]">
              <p className="text-body text-on-surface sm:text-body-lg">
                See the races we cover and what each candidate says, quoted
                from their own campaign sites with every source linked. The
                same rules for every candidate. No ZIP, no account, no
                agenda.
              </p>
              {/* The walker in the still is drawn per page view, so across
                  visitors every one of the eight leads equally often
                  (design.md: equal attention). The page is already dynamic
                  (cookies()), and passing it as a prop keeps the server
                  render and hydration identical. */}
              <HeroRotator lead={pickLead()} />
            </div>
          </div>
          {/* The dates, then what to do about them, as one group 12 px
          apart (A1): the official sample ballot and how to vote, from the
          county's Supervisor of Elections or the state. The key-dates sun
          rises only into the gap above its card, so nothing overlaps. The
          line icons on the key-dates links and the sample-ballot tiles are
          product UI on the voter's own tasks, not art (Glyphs.tsx).
          empty:hidden: after Election Day both render nothing, and an
          empty group would add a second gap. */}
          <div className="flex flex-col gap-3 empty:hidden">
            <DeadlineBanner
              remindersHref={
                promoteReminders ? `#${REMINDER_SIGNUP_ID}` : undefined
              }
              countyFips={saved?.countyFips}
            />
            <VotingResources countyFips={saved?.countyFips} />
          </div>
          <BallotAtAGlance sections={homeSections(scope)} />
          <RaceScopePicker
            action="/"
            scope={scope}
            districts={districtOptions(districts)}
          />
          {scope.kind !== "all" && <ScopeNote scope={scope} allHref="/" />}

          {scope.kind === "county" || scope.kind === "district" ? (
            <ScopedRaces scope={scope} />
          ) : (
            <>
              {ballotRendered && <TrackView event="ballot_viewed" />}
              <SharedBallot seam />
            </>
          )}

          {/* Only on the whole page: the House-race step (and the coverage
              summary after the news) are about the voter's whole ballot,
              which a narrowed view is deliberately not. */}
          {showAll && (
            <>
              {/* The zigzag that used to be this section's border-t, with a
              figure sitting on it at the right end: 150px from lg up, 88px on a
              phone (design.md's closed list of phone art). The divider is a
              mask, which would clip a child, so the figure hangs from a
              zero-height marker at the band's centre line: sit-divider's ledge
              (0.618 of its height) lands on that line. At 150px that is ~93px
              of figure above the line and ~57px of legs below it.

              Above: the ballot-question list ends just before this, and art
              never goes over a list, so lg adds 72px to the column's 32px gap
              (104px clear for a 93px head). Below: the legs reach ~57px under the
              band's centre line, beside the section's h2 and the start of its
              paragraph. So the text block under each h2 (h2 and paragraphs)
              carries lg:pr-[112px], which keeps every line out of the figure's
              99px at the right. The figure and that guard are both px; the
              spacing above the section is rem, so a rem guard (the old
              lg:pr-32 on the h2 only) let the paragraph run under the legs at
              a smaller root font size. The text block runs well past ~57px at
              any root size, so the link and the form below it start clear of
              the feet.

              Below lg the 88px sitter has ~54px of figure above the line and
              ~34px below, so the band takes 28px above and 12px below on top of
              the column's 32px gap: the head clears the end of the list by
              ~12px and the feet clear the h2 by ~16px, whichever h2 renders (no
              district, or a saved one). The clearances are vertical and px, so
              no text needs a right guard on a phone. */}
              <div className="relative mt-[28px] mb-[12px] lg:mt-[72px] lg:mb-0">
                <SectionDivider variant="zigzag" />
                <div className="absolute inset-x-0 top-1/2">
                  <LedgeArt
                    name="sit-divider"
                    height={150}
                    edge="top"
                    className="right-0 hidden lg:block"
                  />
                  <LedgeArt
                    name="sit-divider"
                    height={88}
                    edge="top"
                    className="right-0 lg:hidden"
                  />
                </div>
              </div>

              {/* id="house-race": the "On this page" list jumps here. */}
              <section id="house-race" className="flex flex-col gap-3">
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
                      as the voter's race. The sentence saying the statewide
                      races are the same for every voter went (A7): both lists'
                      intros above already say so. lg:max-w-[65ch] keeps
                      desktop lines readable (A11). */}
                      <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
                        You&rsquo;re set to {saved.district}.{" "}
                        {savedSeat
                          ? houseRaceNotOnBallot(saved.district, savedSeat)
                          : "Your House race depends on where you live, so it's linked below rather than listed above."}{" "}
                        {NOT_COVERED_SENTENCE}
                      </p>
                      <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
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
                      claim, is that the address is never kept.

                      It asks for what the field takes (field.noun): a street
                      address, never a ZIP (founder, 2026-10-12). With
                      ADDRESS_LOOKUP_OFF set there is no field, only the
                      district picker, so it asks the voter to choose.

                      Shorter (home readability A7): it now also says which
                      counties have House races, so the field's own coverage
                      note below it is off (coverageNote={false}) rather than
                      said twice. */}
                      {addressEnabled ? (
                        <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
                          Your U.S. House race isn&rsquo;t in the list above, because
                          it depends on where you live. Give us your {field.noun} and
                          we&rsquo;ll add it. We have House races for{" "}
                          {coveredCountyNames()} counties so far, and we keep only
                          the district, never your {field.noun}.
                        </p>
                      ) : (
                        <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
                          Your U.S. House race isn&rsquo;t in the list above, because
                          it depends on where you live. Choose your district below
                          and we&rsquo;ll add it. We have House races for{" "}
                          {coveredCountyNames()} counties so far, and we keep only
                          the district you choose.
                        </p>
                      )}
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
                        {/* The picker stays behind its toggle here, and the
                            field's privacy line is off: the paragraph above
                            already says the district is all that's kept. */}
                        <LocationEntry
                          submitLabel="Add my House race"
                          addressEnabled={addressEnabled}
                          suggestEnabled={suggestEnabled}
                          coverageNote={false}
                          districts={districts}
                          pickerCollapsed
                          privacyNote={false}
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
            </>
          )}
        </div>

        {/* In the page's flow at every width (A8): from lg a column with a
        rule on its left that scrolls with the page, below lg the section
        after the House-race step, where NewsRail shows the four newest. */}
        <aside
          aria-label="Florida election news"
          className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border-strong lg:pl-6"
        >
          <HomeNews countyFips={saved?.countyFips} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          {/* Drafts from the inspiration pass (2026-10-05), recommended pending
          founder confirmation: what the guide covers in one place, and the
          newest news. After the House-race step, so the ballot still comes
          first (TASK-067); below lg after the news too (A8), from lg in
          the same place under the ballot as before. Remove either line to
          flip it.

          Only on the whole page, like the House-race step: it is about the
          voter's whole ballot, which a narrowed view is deliberately not. */}
          {showAll && (
            <CoverageSummary
              hasDistrict={Boolean(saved)}
              addressEnabled={addressEnabled}
            />
          )}
          {/* A wave between the coverage summary above and the reminder and
          install cards; shows at every width (the section dividers are on
          design.md's closed list of phone art).

          Below lg, the eight hero walkers stand on it, still and equal
          height (design.md "Art on phones"). Their soles are the file's
          bottom edge, so bottom-[6px] stands them on the band's centre line;
          24px above the band keeps their heads ~14px clear of the coverage
          card. Right-aligned, clear of the reminder envelope (left-0) when
          reminders are live. Only on the whole page, after the coverage
          card: a narrowed view has no card, and the row would stand right
          under the news. Never on a screen with a candidate list
          (verify-walker-row). */}
          <div className={showAll ? "relative mt-[24px] lg:mt-0" : undefined}>
            <SectionDivider variant="wave" />
            {showAll && (
              <Art
                name="walker-row"
                height={48}
                className="absolute bottom-[6px] right-0 lg:hidden"
              />
            )}
          </div>
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
