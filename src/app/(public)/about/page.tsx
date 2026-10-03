import Link from "next/link";
import { COVERED_COUNTIES } from "@/lib/counties";
import { CONTACT_EMAIL } from "@/lib/contact";
import { DONATE_URL } from "@/components/features/SitePrompts";

export const metadata = { title: "About — Know Your Vote" };

/* Named from the coverage list itself, so adding a county can't leave this
   page describing a different map than the one the site serves. */
const COUNTY_LIST = new Intl.ListFormat("en-US", {
  style: "long",
  type: "conjunction",
}).format(COVERED_COUNTIES.map((c) => c.name));

const link = "text-primary underline underline-offset-2";

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-overline uppercase tracking-[0.08em] text-accent-strong">
          About
        </p>
        <h1 className="text-h1">Who&apos;s behind Know Your Vote</h1>
        <p className="text-body-lg text-on-surface-muted">
          A free guide to everything on a Florida ballot, run by Know Yours Inc,
          a nonprofit. No account, no paywall, no side.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">What this is</h2>
        <p className="text-body">
          Know Your Vote lays out Florida&apos;s 2026 general election: the
          statewide races, the constitutional amendments, and the U.S. House and
          county races in {COUNTY_LIST}. For each candidate we show what they
          say, what they&apos;ve done, and what&apos;s been verified, with every
          claim linked to its source.
        </p>
        <p className="text-body">
          We never tell you who to vote for, never rank candidates, and never
          color-code parties.{" "}
          <Link href="/methodology" className={link}>
            How we stay fair
          </Link>{" "}
          spells out the whole method, including the checks a write-up has to
          pass before it goes up.
        </p>
      </section>

      {/* Both claims below were confirmed by the founder on 2026-10-03.
          Change them only on the founder's word: the funding line is a
          trust claim, and the deductibility line is a tax statement. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Who pays for it</h2>
        <p className="text-body">
          Readers, through donations. No candidate, party, or campaign funds
          Know Your Vote or reviews what we publish.
        </p>
        <p className="text-body">
          Donations go through{" "}
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            Zeffy
          </a>
          , which charges us no fees. Know Yours Inc is a nonprofit but not a
          501(c)(3), so donations are not tax-deductible.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Get in touch</h2>
        <p className="text-body">
          Spotted a mistake, a missing source, or something that reads as
          slanted? Tell us. Corrections are the point. The same address works
          for press and everything else:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">The official word</h2>
        <p className="text-body">
          We&apos;re not a government site. For your registration, your polling
          place, and your sample ballot, your county Supervisor of Elections and
          the{" "}
          <a href="https://dos.fl.gov/elections/" className={link}>
            Florida Division of Elections
          </a>{" "}
          have the final say. If we ever disagree with them, they&apos;re right.
        </p>
      </section>
    </main>
  );
}
