import Link from "next/link";
import { geocoderHost } from "@/lib/geocode";
import { ResetAdsConsent } from "@/components/features/SitePrompts";
import { ADS_TAG_ENABLED } from "@/lib/ads";

export const metadata = { title: "Privacy — Know Your Vote" };

export default function PrivacyPage() {
  const geocoder = geocoderHost();
  const analyticsOn = Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <h1 className="text-h1">Privacy, in plain language</h1>
      <p className="text-body-lg text-on-surface-muted">
        You can use everything here without an account or a login. That&apos;s a
        design decision, not a settings page.
      </p>

      <section className="flex flex-col gap-2">
        {/* Rewritten in TASK-071 to describe what the code actually does.
            Two claims here were wrong. Quiz answers were never stored at all
            — they live in React state and vanish on refresh — and the list
            omitted the install-prompt flag. The section now names every key
            the app writes, which is the point: a claim you can check in
            devtools beats a claim you have to trust. */}
        <h2 className="text-h2">What stays on your device</h2>
        <p className="text-body">
          Five things, and you can check all five in your browser&apos;s
          devtools: the district you chose, the candidates you &quot;keep in
          mind&quot;, whether you dismissed the &quot;get the app&quot; prompt,
          your answer to the cookie question (<code>kyv.ads-consent</code>), and
          whether you closed the donation prompt (
          <code>kyv.donate-dismissed</code>). That is the whole list of what we
          store. They never reach our servers, and clearing your browser data
          removes them completely. If you accept Google&apos;s ad cookies,
          Google stores cookies of its own; that is covered under analytics and
          advertising below.
        </p>
        {/* Named exactly, with its value, because that is the only version of
            this claim a skeptic can check. The district is a public electoral
            unit of roughly 750,000 people; the address that found it is not
            kept anywhere, which is the distinction the whole design rests on. */}
        <p className="text-body">
          The district is one cookie, <code>kyv.district</code>, holding exactly
          this: <code>FL-27|12086</code> — a district and the county it sits in.
          Not your address. Not your ZIP. Not a coordinate. It is written only
          when you ask for it, the chip at the top of every page shows it, and
          &quot;Forget my district&quot; deletes it on the spot.
        </p>
        <p className="text-body">
          Your address and your ZIP aren&apos;t stored either — not on your
          device, not with us. We use them to work out which district you are
          in, keep the district, and forget the rest. The single exception is
          below, and only if you ask for it: an email reminder needs a ZIP to
          know which polling place to send you.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">When you type an address</h2>
        {/* This section states who sees an address, and that is a deployment
            fact rather than a constant: PELIAS_BASE_URL points either at an
            instance we run or at a hosted one. Prose cannot know which, and a
            paragraph that is wrong on half of the deployments is worse than no
            paragraph — so the host is read from the configuration. */}
        {geocoder ? (
          <>
            <p className="text-body">
              Address completion is{" "}
              <a
                href="https://pelias.io"
                className="text-primary underline underline-offset-2"
              >
                Pelias
              </a>
              , an open-source geocoder built on public address data. What you
              type goes to <strong>{geocoder}</strong> so it can finish the
              address. We don&apos;t log it and we don&apos;t store it.
            </p>
            <p className="text-body">
              Turning that address into a district takes no second lookup:
              Pelias returns the map coordinates along with the suggestion you
              picked, and we send just those coordinates to the U.S. Census
              Bureau to find which census block they fall in. The Census Bureau
              never receives your address. The block tells us your district,
              using Florida&apos;s enacted 2026 map, and the district is the
              only thing that is kept.
            </p>
          </>
        ) : (
          <p className="text-body">
            Address completion is switched off on this deployment — the field
            takes a ZIP only, and nothing you type reaches anyone else.
          </p>
        )}
        <p className="text-body">
          Prefer neither? Enter your ZIP, or pick your district from the list —
          both work with no third party at all.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The one thing we ever store</h2>
        <p className="text-body">
          If you ask us to email your polling place, we store exactly four
          things: your email, your ZIP, when you consented, and an unsubscribe
          token. Nothing is linked to your browsing, nothing is shared or sold,
          and the unsubscribe link in every email works immediately.
        </p>
        <p className="text-body">
          That same signup also gets you a handful of deadline reminders by
          email — voter registration, vote-by-mail request, early voting,
          returning your vote-by-mail ballot, and election day. Every reminder
          contains only dates and official links, every date is verified against
          its official source before anything sends, and every email carries the
          same instant unsubscribe link. Our send records store counts, never
          addresses. Prefer zero email? The same dates are available as a{" "}
          <a
            href="/api/calendar/general_2026.ics"
            className="text-primary underline underline-offset-2"
          >
            calendar file
          </a>{" "}
          that never touches our servers again after download.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        {/* Rewritten when the Google Ads tag went into the root layout. The old
            copy said "no cookies, no cross-site tracking", which stopped being
            true for the site as a whole — the Plausible claim still holds, so
            the two are now stated separately. The tag is opt-in: SitePrompts
            loads it only after the visitor accepts. */}
        <h2 className="text-h2">Analytics, advertising, and errors</h2>
        {/* Read from the same variable the root layout uses to load the
            script, so this sentence can't drift from what runs. On 2026-10-04
            NEXT_PUBLIC_PLAUSIBLE_DOMAIN was unset in production and the page
            still said "We use … Plausible" (docs/scope-changes.md). */}
        {analyticsOn ? (
          <p className="text-body">
            We use cookieless, aggregate analytics (Plausible) — no cookies, no
            personal data, no cross-site tracking.
          </p>
        ) : (
          <p className="text-body">
            We don&apos;t run site analytics right now. If we turn on
            cookieless, aggregate analytics (Plausible), this page will say so.
          </p>
        )}
        {/* Follows the ads switch (src/lib/ads.ts, founder decision 2), so a
            flip can't leave this page describing a tag that no longer loads. */}
        {ADS_TAG_ENABLED && (
          <p className="text-body">
            We also advertise on Google. On your first visit we ask whether to
            load Google&apos;s advertising tag, which tells us whether an ad
            brought you here. If you decline, it never loads. If you accept, it
            runs on every page and sets cookies. Google receives the page you
            are on, your IP address, and details about your browser, and can
            connect your visit with other sites that use Google advertising. We
            remove your ZIP from the page address before it is sent. What Google
            does with the rest is covered by{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              className="text-primary underline underline-offset-2"
            >
              Google&apos;s advertising policy
            </a>
            . The site works exactly the same either way. <ResetAdsConsent /> to
            be asked again.
          </p>
        )}
        <p className="text-body">
          Error reports are scrubbed of ZIPs, emails, and IP addresses before
          they leave the app.
        </p>
      </section>

      <p className="text-body-sm text-on-surface-muted">
        Questions about how any of this works?{" "}
        <Link
          href="/methodology"
          className="text-primary underline underline-offset-2"
        >
          Read the methodology
        </Link>{" "}
        — fairness and privacy are both things you can check, not just trust.
        The rest of the ground rules are in our{" "}
        <Link
          href="/terms"
          className="text-primary underline underline-offset-2"
        >
          terms of use
        </Link>
        .
      </p>
    </main>
  );
}
