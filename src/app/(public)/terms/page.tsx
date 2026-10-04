import Link from "next/link";

export const metadata = { title: "Terms of use — Know Your Vote" };

/* AWAITING FOUNDER (and ideally legal) REVIEW. Launch handoff §1, founder
   decision 1 ("decide on a terms page"): RECOMMENDED, pending founder
   confirmation — ship a short, plain terms page rather than none, because
   only /privacy existed and nothing on the site said in one place that we
   are independent, endorse no one, and quote candidates rather than speak
   for them. This is a plain-language draft, not legal advice; no lawyer has
   read it.

   It promises only what the site does today (see /methodology): verbatim
   quotes from candidates' own sites with a link to each source, no
   endorsements, no fact-checks. A change to what ships means a change here.

   TO FLIP (no terms page): delete this file, remove the /terms entry from
   FOOTER_LINKS in src/components/nav/SiteFooter.tsx and from staticPages in
   src/app/sitemap.ts, and drop the /terms sentence at the end of
   src/app/(public)/privacy/page.tsx. */

/* Bump on any change to the text below, so a reader can tell when it last
   changed. */
const TERMS_EFFECTIVE_DATE = "2026-10-04";

const CONTACT_EMAIL = "hello@knowyour.vote";

const linkClass = "text-primary underline underline-offset-2";

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <h1 className="text-h1">Terms of use</h1>
      <p className="text-body-lg text-on-surface-muted">
        Know Your Vote is a free voter guide for Florida. These are the ground
        rules for using it, in plain language.
      </p>
      <p className="text-body-sm text-on-surface-muted">
        Effective{" "}
        <time dateTime={TERMS_EFFECTIVE_DATE}>{TERMS_EFFECTIVE_DATE}</time>
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Who we are</h2>
        <p className="text-body">
          Know Your Vote is independent. We are not affiliated with any
          candidate, campaign, political party or government agency.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">No endorsements</h2>
        <p className="text-body">
          Nothing on this site is an endorsement. We don&apos;t tell you who to
          vote for or how to vote on a ballot question, and we don&apos;t rank
          candidates. Which candidates appear, and in what order, follows the
          same rules for everyone, described on our{" "}
          <Link href="/methodology" className={linkClass}>
            methodology
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Candidates&apos; words are their own</h2>
        <p className="text-body">
          What a candidate says here is quoted word for word from their own
          campaign website, with a link to the page it came from. The words are
          the candidate&apos;s, not ours. We don&apos;t check whether they are
          true, and quoting them doesn&apos;t mean we agree with them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Information is provided as is</h2>
        <p className="text-body">
          We work to keep everything here accurate and current, but we
          can&apos;t promise it is complete or free of errors, and a brief
          reflects what a candidate&apos;s site said on the day we read it. We
          provide the site as is, without guarantees of any kind.
        </p>
        <p className="text-body">
          For official information &mdash; your registration, your sample
          ballot, your polling place, and every deadline &mdash; rely on your
          county Supervisor of Elections and the{" "}
          <a href="https://dos.fl.gov/elections/" className={linkClass}>
            Florida Division of Elections
          </a>
          . If anything here disagrees with them, they are right.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Links to other sites</h2>
        <p className="text-body">
          We link to sites we don&apos;t run: candidates&apos; campaign sites,
          news outlets, official election offices, and others. We don&apos;t
          control them and aren&apos;t responsible for what they say or do,
          including how they handle your data. A link is not an endorsement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Your privacy</h2>
        <p className="text-body">
          You can use the whole site without an account. What we store, and what
          we don&apos;t, is set out on our{" "}
          <Link href="/privacy" className={linkClass}>
            privacy
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h2">Questions and corrections</h2>
        <p className="text-body">
          If you think something here is wrong, unfair or out of date, or you
          have a question about these terms, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <p className="text-body-sm text-on-surface-muted">
        We may update these terms. When we do, the date at the top changes.
      </p>
    </main>
  );
}
