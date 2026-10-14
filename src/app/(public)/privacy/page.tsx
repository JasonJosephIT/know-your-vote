import Link from "next/link";
import { ResetAdsConsent } from "@/components/features/SitePrompts";
import {
  AdGlyph,
  BugGlyph,
  ChartGlyph,
  HouseGlyph,
  MailGlyph,
  MapGlyph,
  MessageGlyph,
  PhoneGlyph,
  PinGlyph,
  SlidersGlyph,
} from "@/components/ui/Glyphs";
import { privacyDeployment } from "./deployment";

export const metadata = { title: "Privacy — Know Your Vote" };

/* Short on purpose (founder, 2026-10-13). This page used to carry every
   detail: the cookie's exact value, the device keys, the Census and Pelias
   paths, what a Sentry report keeps. That made it a long disclaimer, when
   what a voter needs first is what happens, in a sentence or two. So each
   point here says only that, and ends with a "How this works" link to its
   section on /privacy/how-it-works, where the detail moved for anyone who
   wants to check it. scripts/verify-privacy-pages.ts checks that every link
   lands on a section that exists.

   Short is not looser. Every sentence must stay literally true in every
   configuration it renders under, which is why the address, analytics, ads
   and error-report points still branch on the deployment
   (privacyDeployment, shared with the explanation page so the two can't
   describe different sites). Two claims the long page made were not true
   and are gone: that what stays on the device "never reaches our servers"
   (the browser sends the district cookie with every request, and the
   keep-in-mind list asks our server for its candidates by id), and that
   the cookie answer is stored when the ad tag is switched off (nothing
   asks the question then). */

const link = "text-primary underline underline-offset-2";

/* Every heading gets one 20px line icon (phone visuals round 2,
   docs/design/mobile-visuals-2026-10-14/; design.md "Art on phones"), so
   no point is marked out over another: the same mark, the same size and
   colour, beside words that already say the same thing. The svg is
   aria-hidden, so each heading's name is unchanged. The 4px top margin
   centres it on the first line of the 24px heading, and when a heading
   wraps it wraps beside the icon. Inline SVG: no request, no image. */
const heading = "flex items-start gap-2 text-h2";
const icon = "mt-[4px] block size-[20px] shrink-0 text-primary";

/* Closes each point. `topic` is the id of its section on the explanation
   page; `about` names the point for a screen reader, whose list of links
   would otherwise be nine identical "How this works". */
function HowThisWorks({ topic, about }: { topic: string; about: string }) {
  return (
    <p className="text-body-sm">
      <Link href={`/privacy/how-it-works#${topic}`} className={link}>
        How this works<span className="sr-only">: {about}</span>
      </Link>
    </p>
  );
}

export default function PrivacyPage() {
  const { addressOn, geocoder, analyticsOn, adsOn, errorReportsOn } =
    privacyDeployment();
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <h1 className="text-h1">Privacy, in plain language</h1>
      <p className="text-body-lg text-on-surface-muted">
        You can use everything here without an account or a login. That&rsquo;s a
        design decision, not a settings page.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <PhoneGlyph className={icon} />
          What stays on your device
        </h2>
        {/* "Answered or closed": with the ad tag off there is no cookie
            question to answer, only prompts to close, and this sentence has
            to hold either way. */}
        <p className="text-body">
          The district you chose, the candidates you keep in mind, and whether
          you&rsquo;ve answered or closed the site&rsquo;s prompts are saved in
          your browser, not in an account. Clearing your browser data removes
          them all.
        </p>
        <HowThisWorks topic="on-your-device" about="what stays on your device" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <MapGlyph className={icon} />
          Your district
        </h2>
        <p className="text-body">
          Your district is kept in one cookie that holds a district and its
          county &mdash; not your address, not your ZIP. The chip at the top of
          every page shows it, and &ldquo;Forget my district&rdquo; deletes it.
        </p>
        <HowThisWorks topic="district-cookie" about="the district cookie" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <HouseGlyph className={icon} />
          Your address
        </h2>
        {/* The reminder signup is named as the exception because it does keep
            a ZIP, one the voter types into that form for that purpose. */}
        <p className="text-body">
          Your address and your ZIP aren&rsquo;t stored &mdash; not on your
          device, not with us.{" "}
          {addressOn ? (
            <>
              We use your address to find your district, keep the district, and
              forget the rest.
            </>
          ) : (
            <>
              This site doesn&rsquo;t ask for your address: you choose your
              district from a list.
            </>
          )}{" "}
          The only exception is a ZIP you give us for email reminders, below.
        </p>
        <HowThisWorks topic="your-address" about="your address" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <PinGlyph className={icon} />
          When you type an address
        </h2>
        {/* Who sees an address is a deployment fact: ADDRESS_LOOKUP_OFF
            removes the field, and PELIAS_BASE_URL adds completion from an
            instance we run or a hosted one. A sentence that is wrong on some
            deployments is worse than none, so this reads the configuration
            (src/lib/geocode.ts). With Pelias, a typed address that wasn't
            picked from the list is refused rather than sent on to the Census
            Bureau (LocationEntry), which is what makes "never the address"
            true. */}
        {!addressOn ? (
          <p className="text-body">
            Address lookup is switched off on this deployment &mdash;
            there&rsquo;s no address field. You choose your district from a
            list, and nothing you choose reaches anyone else.
          </p>
        ) : geocoder ? (
          <p className="text-body">
            What you type goes to <strong>{geocoder}</strong> (Pelias) to finish
            the address; the U.S. Census Bureau then gets only the map point of
            the address you picked, never the address itself.
          </p>
        ) : (
          <p className="text-body">
            When you press Enter, our server sends the address you typed to the
            U.S. Census Bureau&rsquo;s public geocoder, with nothing that says
            who typed it.
          </p>
        )}
        {addressOn && (
          <p className="text-body">
            Rather not share your address? Choose your district from the list
            instead &mdash; it works with no third party at all.
          </p>
        )}
        <HowThisWorks topic="typed-address" about="who sees a typed address" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <MailGlyph className={icon} />
          The one thing we store
        </h2>
        <p className="text-body">
          If you ask us to email you where to vote, we store your email address
          and your ZIP, and send you a few deadline reminders too. We never sell
          or share them, and every email has an unsubscribe link.
        </p>
        <HowThisWorks topic="email-signup" about="the email signup" />
      </section>

      <section className="flex flex-col gap-2">
        {/* "Report a mistake" is in the footer of every page (#184, a mailto
            with the fixed subject "Correction", src/components/nav/
            SiteFooter.tsx), so what writing to us hands over is said here
            too. Nothing in the code adds a sender to the reminder list. */}
        <h2 className={heading}>
          <MessageGlyph className={icon} />
          Writing to us
        </h2>
        <p className="text-body">
          If you email us, including through &ldquo;Report a mistake&rdquo;,
          we get your email address and your message, as with any email. It
          doesn&rsquo;t sign you up for anything.
        </p>
        <HowThisWorks topic="contact" about="writing to us" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <ChartGlyph className={icon} />
          Analytics
        </h2>
        {analyticsOn ? (
          <p className="text-body">
            We count visits with cookieless, aggregate analytics (Plausible)
            &mdash; no cookies, no personal data, no cross-site tracking.
          </p>
        ) : (
          <p className="text-body">
            We don&rsquo;t run site analytics right now. If we turn on
            cookieless, aggregate analytics (Plausible), this page will say so.
          </p>
        )}
        <HowThisWorks topic="analytics" about="analytics" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <AdGlyph className={icon} />
          Advertising
        </h2>
        {/* Brief by the founder's choice (2026-10-05), but it still names the
            provider and what it receives, here and not only on the
            explanation page: Google's ad policies expect a site using its ad
            cookies to say so, the cookie banner's "Details" link lands here,
            and the IP address is the personal data the PRD's opt-in promise
            is about (docs/prd.md §2). */}
        {adsOn ? (
          <p className="text-body">
            We ask before setting advertising cookies. If you accept, our ad
            provider (Google) receives the page you&rsquo;re on and your IP
            address; decline and they&rsquo;re never set. See{" "}
            <a href="https://policies.google.com/technologies/ads" className={link}>
              Google&rsquo;s advertising policy
            </a>
            .
          </p>
        ) : (
          <p className="text-body">
            We don&rsquo;t use advertising cookies, and no ad tag runs on this
            site.
          </p>
        )}
        <HowThisWorks topic="advertising" about="advertising" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={heading}>
          <BugGlyph className={icon} />
          Error reports
        </h2>
        {errorReportsOn ? (
          <p className="text-body">
            If something breaks, an error report goes to Sentry. It includes the
            error and the page address, never your ZIP, email, IP address or
            cookies.
          </p>
        ) : (
          <p className="text-body">
            We don&rsquo;t collect error reports right now.
          </p>
        )}
        <HowThisWorks topic="error-reports" about="error reports" />
      </section>

      {/* An action, not an explanation, so it stays on this page. With the
          ad tag off there is no choice to change, and ResetAdsConsent would
          render nothing anyway. */}
      {adsOn && (
        <section className="flex flex-col gap-2">
          <h2 className={heading}>
            <SlidersGlyph className={icon} />
            Your cookie choice
          </h2>
          <p className="text-body">
            Your answer to the cookie question is saved in your browser, and you
            can change it at any time.
          </p>
          <p className="text-body">
            <ResetAdsConsent />
          </p>
          <HowThisWorks topic="cookie-choice" about="your cookie choice" />
        </section>
      )}

      <p className="text-body-sm text-on-surface-muted">
        Every point above links to how it&rsquo;s done, so you can check it
        rather than trust it. How we keep the guide fair is on our{" "}
        <Link href="/methodology" className={link}>
          methodology
        </Link>{" "}
        page. The rest of the ground rules are in our{" "}
        <Link href="/terms" className={link}>
          terms of use
        </Link>
        .
      </p>
    </main>
  );
}
