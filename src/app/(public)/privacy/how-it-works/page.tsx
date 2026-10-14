import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";
import { privacyDeployment } from "../deployment";

export const metadata = { title: "How privacy works — Know Your Vote" };

/* The detail behind /privacy (founder, 2026-10-13). /privacy states each
   point in a sentence or two and links to a section here by its id, so the
   ids below are a contract: scripts/verify-privacy-pages.ts fails if a
   "How this works" link on /privacy names an id this page doesn't have.

   Same rule as /privacy: every sentence must be literally true in every
   configuration it renders under, so the same deployment facts drive the
   same branches (privacyDeployment in ../deployment.ts). Most of the
   claims below are pinned by scripts/verify-no-stored-location.ts and
   scripts/verify-unsubscribe.ts, which read this file.

   The request-logs section says exactly two things and no more. Both rest on
   the address-lookup change that shipped with this page: nothing on the site
   puts an address in a URL, and a district is found from a copy of the
   district tables held on our own server rather than by asking the database
   (src/lib/resolve.ts). Nothing here says whether an email address reaches
   a log: that waits on a database migration, and until it is applied this
   page can't honestly answer it either way. */

const link = "text-primary underline underline-offset-2";

export default function PrivacyHowItWorksPage() {
  const {
    addressOn,
    geocoder,
    analyticsOn,
    adsOn,
    errorReportsOn,
    remindersOn,
  } = privacyDeployment();
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <p className="text-body-sm">
        <Link href="/privacy" className={link}>
          &larr; Privacy, in plain language
        </Link>
      </p>
      <h1 className="text-h1">How privacy works here</h1>
      <p className="text-body-lg text-on-surface-muted">
        The detail behind each point on our privacy page, for anyone who wants
        to check it rather than trust it. Much of it you can see for yourself in
        your browser&rsquo;s developer tools.
      </p>

      <section id="on-your-device" className="flex flex-col gap-2">
        {/* Rewritten in TASK-071 to describe what the code actually does:
            quiz answers were never stored (they live in React state), and the
            list had left out the install-prompt flag. It names every key the
            app writes, because a claim you can check in devtools beats a
            claim you have to trust; scripts/verify-no-stored-location.ts
            finds every key in the code and fails if one is missing here.

            It no longer says these "never reach our servers". The browser
            sends the district cookie with every request, which is how the
            ballot pages read it, and SavedCandidates asks /api/candidates for
            the kept candidates by id. kyv.ads-consent is listed only while
            the ad tag is on: with it off nothing asks the question, so
            nothing is written. */}
        <h2 className="text-h2">What stays on your device</h2>
        <p className="text-body">
          This is the whole list of what the site saves in your browser. The
          district is a cookie; the rest are in local storage.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
          <li>
            <code>kyv.district</code>: the district you chose (see the next
            section).
          </li>
          <li>
            <code>kyv.saved</code>: the candidates you &ldquo;keep in
            mind&rdquo;, by their public IDs, written only when you press the
            button.
          </li>
          <li>
            <code>kyv.install-dismissed</code>: whether you closed the &ldquo;get
            the app&rdquo; prompt.
          </li>
          {adsOn && (
            <li>
              <code>kyv.ads-consent</code>: your answer to the cookie question.
            </li>
          )}
          <li>
            <code>kyv.donate-dismissed</code>: whether you closed the donation
            prompt.
          </li>
        </ul>
        <p className="text-body">
          None of them holds your name, your address or your ZIP, and clearing
          your browser data removes them all. Two are used by our server: your
          browser sends the district cookie with each request to this site,
          which is how a page shows your races, and opening your keep-in-mind
          list asks our server for those candidates by their IDs, so it can show
          their names.
        </p>
        {adsOn && (
          <p className="text-body">
            If you accept advertising cookies, Google stores cookies of its own;
            that&rsquo;s under advertising, below.
          </p>
        )}
      </section>

      <section id="district-cookie" className="flex flex-col gap-2">
        {/* Named exactly, with its value, because that is the only version of
            this claim a skeptic can check. The district is a public electoral
            unit; the address that found it is not kept anywhere, which is the
            distinction the whole design rests on. The shape guard and the
            180 days are src/lib/district-cookie.ts. */}
        <h2 className="text-h2">The district cookie</h2>
        <p className="text-body">
          The district is one cookie, <code>kyv.district</code>, holding exactly
          this: <code>FL-27|12086</code> &mdash; a district and the county it
          sits in. Not your address. Not your ZIP. Not a coordinate. It is
          written only when you ask for it, the chip at the top of every page
          shows it, and &ldquo;Forget my district&rdquo; deletes it on the spot.
        </p>
        <p className="text-body">
          A congressional district is a public area of about three-quarters of a
          million people, so it doesn&rsquo;t point to you. The site won&rsquo;t
          write anything else into this cookie: a value that isn&rsquo;t a
          district and a county is refused when it&rsquo;s written and ignored
          when it&rsquo;s read. Left alone, it expires 180 days after you set it.
        </p>
      </section>

      <section id="your-address" className="flex flex-col gap-2">
        <h2 className="text-h2">Your address</h2>
        <p className="text-body">
          Your address and your ZIP aren&rsquo;t stored &mdash; not on your
          device, not with us.
        </p>
        {addressOn ? (
          <p className="text-body">
            We use your address for one thing: finding the census block it sits
            in. The block tells us your district, using Florida&rsquo;s enacted
            2026 map, and the district is the only thing that is kept. We
            don&rsquo;t log the address and we don&rsquo;t store it.
          </p>
        ) : (
          <p className="text-body">
            This deployment doesn&rsquo;t take an address at all: you choose
            your district from a list.
          </p>
        )}
        <p className="text-body">
          The one exception to &ldquo;not stored&rdquo; is a ZIP you give us
          yourself, for email reminders. That&rsquo;s under the one thing we
          store, below.
        </p>
      </section>

      <section id="request-logs" className="flex flex-col gap-2">
        {/* Two statements only; see the note at the top of this file before
            adding a third. The second is scoped to finding the district
            because the reminder signup does store a ZIP with the database
            provider, on purpose. */}
        <h2 className="text-h2">Request logs</h2>
        <p className="text-body">
          Your address is never put in a web address on this site, so our
          hosting provider&rsquo;s request logs don&rsquo;t record it.
        </p>
        {addressOn && (
          <p className="text-body">
            We look up your district from a copy of the district tables held on
            our own server, so finding your district never sends your ZIP, your
            address or your census block to our database provider.
          </p>
        )}
      </section>

      <section id="typed-address" className="flex flex-col gap-2">
        {/* Who sees an address is a deployment fact (src/lib/geocode.ts):
            ADDRESS_LOOKUP_OFF removes the field, and PELIAS_BASE_URL adds
            completion from an instance we run or a hosted one. Prose can't
            know which, and a paragraph that is wrong on some deployments is
            worse than none, so the section is read from the configuration. */}
        <h2 className="text-h2">When you type an address</h2>
        {!addressOn ? (
          <p className="text-body">
            Address lookup is switched off on this deployment &mdash;
            there&rsquo;s no address field. You choose your district from a
            list, and nothing you choose reaches anyone else.
          </p>
        ) : geocoder ? (
          <>
            <p className="text-body">
              Address completion is{" "}
              <a href="https://pelias.io" className={link}>
                Pelias
              </a>
              , an open-source geocoder built on public address data. What you
              type goes to <strong>{geocoder}</strong> so it can finish the
              address. We don&rsquo;t log it and we don&rsquo;t store it.
            </p>
            <p className="text-body">
              Turning that address into a district takes no second lookup:
              Pelias returns the map coordinates along with the suggestion you
              picked, and we send just those coordinates to the U.S. Census
              Bureau to find which census block they fall in. The Census Bureau
              never receives your address. If you press Enter without picking a
              suggestion, the site asks you to pick one rather than send what
              you typed anywhere else.
            </p>
          </>
        ) : (
          <>
            <p className="text-body">
              When you type a street address and press Enter, we send what you
              typed to the U.S. Census Bureau&rsquo;s public geocoder, which
              finds the census block the address sits in. The block tells us
              your district, using Florida&rsquo;s enacted 2026 map, and the
              district is the only thing that is kept. We don&rsquo;t log the
              address and we don&rsquo;t store it.
            </p>
            <p className="text-body">
              The request goes from our server, not your browser, so the Census
              Bureau receives the address and nothing else: not your IP address,
              not your name, not anything that says who typed it.
            </p>
          </>
        )}
        {addressOn && (
          <p className="text-body">
            Rather not share your address? Choose your district from the list
            instead &mdash; it works with no third party at all.
          </p>
        )}
      </section>

      <section id="official-sites" className="flex flex-col gap-2">
        {/* The "Sample ballot and how to vote" block on the home page (#190,
            src/components/features/VotingResources.tsx) links out and
            nothing else: it never embeds a county's tool, which would load
            the county's reCAPTCHA and Google Translate here, and each link
            opens a new tab (scripts/verify-voter-links.ts). Its rows say
            "We never see what you enter there"; this is the same claim. */}
        <h2 className="text-h2">Official election sites</h2>
        <p className="text-body">
          The sample-ballot and how-to-vote links open your county Supervisor
          of Elections&rsquo; site or the Florida Division of Elections&rsquo;
          site in a new tab. We never see what you enter there; their own
          privacy policies apply. We link to their tools rather than putting
          them on our pages, so their scripts don&rsquo;t run on this site.
        </p>
      </section>

      <section id="email-signup" className="flex flex-col gap-2">
        {/* This said the link "works immediately" and later called it
            "instant". Opening the link no longer unsubscribes, because mail
            scanners open links before the voter does: it shows a confirm
            button, and the button (or the mail app's own Unsubscribe,
            RFC 8058) does it. See src/lib/notifications/unsubscribe.ts. */}
        <h2 className="text-h2">The one thing we store</h2>
        <p className="text-body">
          If you ask us to email you where to vote, we store your email, your
          ZIP, when you consented, an unsubscribe token, whether you&rsquo;re
          still subscribed, and when we last sent you the welcome email (so we
          send it at most once a day). Nothing is linked to your browsing,
          nothing is shared or sold, and every email has an unsubscribe link:
          open it and press the confirm button, and you&rsquo;re off the list.
          Your mail app&rsquo;s own Unsubscribe button works too.
        </p>
        <p className="text-body">
          {remindersOn
            ? "That same signup also gets you"
            : "Deadline reminders are paused right now, so nothing more sends. While they run, that same signup gets you"}{" "}
          a handful of deadline reminders by
          email &mdash; voter registration, vote-by-mail request, early voting,
          returning your vote-by-mail ballot, and election day. Every reminder
          contains only dates and official links, every date is verified against
          its official source before anything sends, and every email carries the
          same unsubscribe link. Our send records store counts, never addresses.
          Prefer zero email? The same dates are available as a{" "}
          <a href="/api/calendar/general_2026.ics" className={link}>
            calendar file
          </a>{" "}
          that never touches our servers again after download.
        </p>
      </section>

      <section id="contact" className="flex flex-col gap-2">
        {/* The footer's "Report a mistake" is a mailto with a fixed subject
            and no body, and "Contact" goes to /about's "Get in touch"
            (src/components/nav/SiteFooter.tsx, #184; pinned by
            scripts/verify-site-footer.ts). The address is CONTACT_EMAIL.
            Nothing in the code reads that inbox into the reminder list. */}
        <h2 className="text-h2">Writing to us</h2>
        <p className="text-body">
          &ldquo;Report a mistake&rdquo;, at the bottom of every page, opens an
          email to <strong>{CONTACT_EMAIL}</strong> in your own mail app, and
          &ldquo;Contact&rdquo; leads to the same address. When you write, we
          get what any email brings: your email address and what you write.
        </p>
        <p className="text-body">
          &ldquo;Report a mistake&rdquo; fills in only the subject line,
          &ldquo;Correction&rdquo;. It adds nothing about you or the page you
          were on; say which page in your message if you like. Writing to us
          doesn&rsquo;t sign you up for anything: only the email signup above
          does that.
        </p>
      </section>

      <section id="analytics" className="flex flex-col gap-2">
        {/* The events are src/lib/analytics.ts. Described by kind rather
            than listed, so a new event doesn't make this incomplete; what
            must hold for every one is PRD §12: no ZIP, no email, no id in a
            property. district_set carries only how the district was set. */}
        <h2 className="text-h2">Analytics</h2>
        {analyticsOn ? (
          <>
            <p className="text-body">
              We use cookieless, aggregate analytics (Plausible) &mdash; no
              cookies, no personal data, no cross-site tracking.
            </p>
            <p className="text-body">
              Besides page views, it counts a few named moments, such as a
              ballot being shown or a candidate being kept in mind. None carries
              anything about you: when a district is set, the count records only
              whether it came from an address or the list, never which district.
            </p>
          </>
        ) : (
          <p className="text-body">
            We don&rsquo;t run site analytics right now. If we turn on
            cookieless, aggregate analytics (Plausible), this page will say so.
          </p>
        )}
      </section>

      <section id="advertising" className="flex flex-col gap-2">
        {/* Follows the ads switch (src/lib/ads.ts), so a flip can't leave this
            page describing a tag that no longer loads. The ZIP stripping is
            GoogleTag in src/components/features/SitePrompts.tsx. */}
        <h2 className="text-h2">Advertising</h2>
        {adsOn ? (
          <>
            <p className="text-body">
              We ask before setting advertising cookies. If you accept, our ad
              provider (Google) receives the page you&rsquo;re on and your IP
              address; decline and they&rsquo;re never set. Until you accept,
              Google&rsquo;s ad tag doesn&rsquo;t load at all. It&rsquo;s there
              to tell us whether our ads bring people here.
            </p>
            <p className="text-body">
              Some old shared links carry a ZIP in the page address; the tag
              removes it before Google sees the address. If you accept, Google
              also stores cookies of its own in your browser. See{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                className={link}
              >
                Google&rsquo;s advertising policy
              </a>
              .
            </p>
          </>
        ) : (
          <p className="text-body">
            We don&rsquo;t use advertising cookies, and no ad tag runs on this
            site.
          </p>
        )}
      </section>

      <section id="error-reports" className="flex flex-col gap-2">
        {/* What a report keeps is set by src/lib/sentry-scrub.ts and
            src/lib/sentry-options.ts, and checked by
            scripts/verify-sentry-scrub.ts and verify-sentry-server.ts. */}
        <h2 className="text-h2">Error reports</h2>
        {errorReportsOn ? (
          <>
            <p className="text-body">
              If something breaks, an error report goes to Sentry. It includes
              the error and the page address, never your ZIP, email, IP address
              or cookies.
            </p>
            <p className="text-body">
              Before a report leaves, we cut everything after the
              &ldquo;?&rdquo; in any web address, keep only two request headers
              (our site&rsquo;s name and your browser type), drop every cookie,
              and blank out anything shaped like an email address, a ZIP or an
              IP address. The body of an address lookup is dropped whole. We
              send no performance traces and no session counts.
            </p>
          </>
        ) : (
          <p className="text-body">
            We don&rsquo;t collect error reports right now.
          </p>
        )}
      </section>

      {adsOn && (
        <section id="cookie-choice" className="flex flex-col gap-2">
          {/* ResetAdsConsent in SitePrompts.tsx: removes kyv.ads-consent and
              reloads. It can't reach Google's own cookies, so this says so. */}
          <h2 className="text-h2">Your cookie choice</h2>
          <p className="text-body">
            Your answer to the cookie question is saved in your browser as{" "}
            <code>kyv.ads-consent</code>. &ldquo;Change your cookie
            choice&rdquo; on our privacy page forgets that answer and reloads
            the page, so the question comes back, and Google&rsquo;s ad tag
            doesn&rsquo;t load unless you accept again. Cookies Google already
            set stay until they expire or you clear them in your
            browser&rsquo;s settings.
          </p>
        </section>
      )}

      <p className="text-body-sm text-on-surface-muted">
        Something here unclear, or not what you see in your browser? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
          {CONTACT_EMAIL}
        </a>
        .{" "}
        <Link href="/privacy" className={link}>
          Back to privacy, in plain language
        </Link>
      </p>
    </main>
  );
}
