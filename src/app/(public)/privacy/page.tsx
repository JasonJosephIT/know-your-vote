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
        <h2 className="text-h2">What stays on your device</h2>
        <p className="text-body">
          Candidates you &quot;keep in mind&quot; and your quiz answers are
          stored in your browser only. They never reach our servers, and
          clearing your browser data removes them completely.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The one thing we ever store</h2>
        <p className="text-body">
          If you ask us to email your polling place, we store exactly four
          things: your email, your ZIP, when you consented, and an unsubscribe
          token. Nothing is linked to your browsing, nothing is shared or
          sold, and the unsubscribe link in every email works immediately.
        </p>
        <p className="text-body">
          That same signup also gets you a handful of deadline reminders by
          email — voter registration, vote-by-mail request, early voting, and
          election day. Every reminder contains only dates and official
          links, every date is verified against its official source before
          anything sends, and every email carries the same instant
          unsubscribe link. Our send records store counts, never addresses.
          Prefer zero email? The same dates are available as a{" "}
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
          Quiz answers are interpreted by an AI model. We send it only your
          ZIP-resolved races and your issue answers — never your name, email,
          or any identifier. Candidates are even anonymized in that request,
          so the model can&apos;t favor anyone it recognizes.
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
        <Link href="/methodology" className="text-primary underline underline-offset-2">
          Read the methodology
        </Link>{" "}
        — fairness and privacy are both things you can check, not just trust.
      </p>
    </main>
  );
}
