import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Terms — Know Your Vote" };

/* Plain-language terms, written 2026-10-03 without a lawyer's review. Bump
   the date whenever the substance changes, since the page tells readers the
   date is how they can tell. */
const EFFECTIVE = "October 3, 2026";

const link = "text-primary underline underline-offset-2";

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Terms, in plain language</h1>
        <p className="text-body-lg text-on-surface-muted">
          The short version: this is a free information site. Double-check
          anything official with the official source, and tell us when we get
          something wrong.
        </p>
        <p className="text-body-sm text-on-surface-muted">
          In effect from {EFFECTIVE}.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">What this site is</h2>
        <p className="text-body">
          Know Your Vote is run by Know Yours Inc, a nonprofit. It gives general
          information about candidates and ballot measures in Florida&apos;s
          elections. It is not official election guidance, not legal advice, and
          not affiliated with any government agency, candidate, party, or
          campaign. Nothing here endorses anyone or tells you how to vote.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The official source wins</h2>
        <p className="text-body">
          Deadlines, polling places, sample ballots, and your registration
          status come from your county Supervisor of Elections and the{" "}
          <a href="https://dos.fl.gov/elections/" className={link}>
            Florida Division of Elections
          </a>
          . If anything here conflicts with them, go with them, and please let
          us know so we can fix it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Accuracy and corrections</h2>
        <p className="text-body">
          We link every claim to its source and check our work before it goes
          up, but mistakes can still happen, and candidates and measures change
          during a campaign. The site is provided as is, without warranties of
          any kind, including that it is complete, current, or error-free.
        </p>
        <p className="text-body">
          Found an error or something that reads as slanted? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          or use the &quot;flag this brief&quot; link on any candidate brief.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Links to other sites</h2>
        <p className="text-body">
          We link to sources, news outlets, candidate websites, government
          sites, and our donation page. We don&apos;t control those sites and
          aren&apos;t responsible for what they say or do. A link is a citation,
          not an endorsement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Sharing what you find here</h2>
        <p className="text-body">
          Quote it, screenshot it, and share it, as long as you link back and
          don&apos;t change it in a way that misrepresents what we or a
          candidate said. Please don&apos;t present our pages as an endorsement
          by Know Your Vote of anyone or anything.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Donations</h2>
        <p className="text-body">
          Donations are processed by Zeffy and are covered by Zeffy&apos;s own
          terms. Know Yours Inc is not a 501(c)(3), so donations are not
          tax-deductible. For a refund or any question about a donation, email
          us at the address above.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Email reminders</h2>
        <p className="text-body">
          Reminders are opt-in, and every email has a link that unsubscribes you
          immediately.{" "}
          <Link href="/privacy" className={link}>
            Our privacy page
          </Link>{" "}
          says exactly what we keep and why.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Limits on our liability</h2>
        <p className="text-body">
          To the fullest extent the law allows, Know Yours Inc is not liable for
          any loss or damage that comes from using this site or relying on it,
          including relying on it in place of an official source.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Changes to these terms</h2>
        <p className="text-body">
          We may update these terms. The date at the top changes when we do, and
          using the site after that means the new version applies.
        </p>
      </section>
    </main>
  );
}
