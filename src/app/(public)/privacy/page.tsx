import Link from "next/link";

export const metadata = { title: "Privacy — Know Your Vote" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <h1 className="text-h1">Privacy, in plain language</h1>
      <p className="text-body-lg text-on-surface-muted">
        You can use everything here without an account, a login, or leaving a
        trace. That&apos;s a design decision, not a settings page.
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
          Three things, and you can check all three in your browser&apos;s
          devtools: the district you chose, the candidates you &quot;keep in
          mind&quot;, and whether you dismissed the &quot;get the app&quot;
          prompt. That is the whole list. They never reach our servers, and
          clearing your browser data removes them completely.
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
          Your quiz answers aren&apos;t stored anywhere — not on your device,
          not with us. They exist while you are answering and are gone when you
          close the tab.
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
        <p className="text-body">
          Address completion is Google Places. What you type goes to Google so
          it can finish the address — that is the whole of what Google is for
          here, and it is the only company that ever sees it. We don&apos;t log
          it and we don&apos;t store it.
        </p>
        <p className="text-body">
          Turning that address into a district takes one more step, and it is
          deliberately blind: we ask Google only for the map coordinates of the
          address you picked, and send just those coordinates to the U.S. Census
          Bureau to find which census block they fall in. The Census Bureau
          never receives your address. The block tells us your district, using
          Florida&apos;s enacted 2026 map, and the district is the only thing
          that is kept.
        </p>
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
        <h2 className="text-h2">The quiz and AI</h2>
        <p className="text-body">
          Quiz answers are interpreted by an AI model. We send it only the races
          on your ballot and your issue answers — never your name, email, or any
          identifier. Candidates are even anonymized in that request, so the
          model can&apos;t favor anyone it recognizes. Take the quiz without a
          ZIP and the races are simply the statewide ones.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Analytics and errors</h2>
        <p className="text-body">
          We use cookieless, aggregate analytics (Plausible) — no cookies, no
          personal data, no cross-site tracking. Error reports are scrubbed of
          ZIPs, emails, and IP addresses before they leave the app.
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
      </p>
    </main>
  );
}
