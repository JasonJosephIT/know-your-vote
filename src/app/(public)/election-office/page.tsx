import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  ELECTION_OFFICE_SOURCES,
  listElectionOffices,
  officeBySlug,
} from "@/lib/election-office";

export const metadata = {
  title: "Your county election office — Know Your Vote",
  description:
    "Phone, email, address, and website for the Supervisor of Elections in all 67 Florida counties — the office that answers questions about registration, your polling place, and your ballot.",
};

/* All 67 counties, no ZIP, no coverage check.

   Race coverage is four counties; this is not. The office that answers a
   voter's question exists in every county, the state publishes all 67, and a
   voter in Leon County asking "who do I call?" deserves the answer rather
   than "we don't cover your area yet".

   Two ways in, both working without JavaScript: a county dropdown (which
   GETs back here and redirects to the county's own page) and the full A–Z
   list. The list is also what makes each county page discoverable — someone
   searching "Leon County election office" should land on one. */

export default async function ElectionOfficeIndex({
  searchParams,
}: {
  searchParams: Promise<{ county?: string }>;
}) {
  const { county } = await searchParams;

  /* The dropdown's no-JavaScript path: a plain GET arrives here, and the
     county page is the canonical, shareable URL for the answer. */
  const picked = officeBySlug(county);
  if (picked) redirect(`/election-office/${picked.slug}`);

  const offices = listElectionOffices();

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Your county election office</h1>
        <p className="text-body-lg text-on-surface-muted">
          Every Florida county has a Supervisor of Elections — the office that
          can confirm your registration, tell you your polling place, send you
          a vote-by-mail ballot, and answer questions about your ballot. Here
          is how to reach yours.
        </p>
      </div>

      <form
        action="/election-office"
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
      >
        <label htmlFor="county" className="text-label">
          Pick your county
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            id="county"
            name="county"
            defaultValue=""
            className="w-full rounded-md border border-border-strong bg-surface px-[14px] py-3 text-body text-on-surface focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] focus:outline-none"
          >
            <option value="" disabled>
              Select a county…
            </option>
            {offices.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.county}
              </option>
            ))}
          </select>
          <Button type="submit" className="shrink-0">
            Show my office
          </Button>
        </div>
        <p className="text-caption text-on-surface-muted">
          All 67 counties — including ones whose races we don&apos;t cover yet.
        </p>
      </form>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-h3">All 67 counties</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {offices.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/election-office/${o.slug}`}
                className="text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
              >
                {o.county}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-caption text-on-surface-muted">
        Contact details come from the{" "}
        <a
          href={ELECTION_OFFICE_SOURCES.stateUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          Florida Division of Elections
        </a>
        , revised {ELECTION_OFFICE_SOURCES.stateRevision}. Offices move and
        staff change — the state&apos;s list is always the last word.
      </p>
    </main>
  );
}
