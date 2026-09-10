import Link from "next/link";
import { notFound } from "next/navigation";
import { ElectionOfficeCard } from "@/components/features/ElectionOfficeCard";
import { listElectionOffices, officeBySlug } from "@/lib/election-office";

/* One page per county, prerendered at build time.

   The data is a checked-in module, so all 67 are static with no database and
   no revalidation — they change only when someone regenerates the table and
   deploys. That is also why each is worth its own URL: it is the page a
   search for "Polk County election office" should find, and the link the
   ZIP/county resolver can hand a voter directly. */

export function generateStaticParams() {
  return listElectionOffices().map((o) => ({ county: o.slug }));
}

/* A slug outside the 67 is a 404, not a rendered guess. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ county: string }>;
}) {
  const { county } = await params;
  const office = officeBySlug(county);
  if (!office) return { title: "County not found — Know Your Vote" };
  return {
    title: `${office.county} County election office — Know Your Vote`,
    description: `Contact the ${office.county} County Supervisor of Elections: phone ${office.phone}, email ${office.email}, and where to go in person. Registration, polling place, and vote-by-mail questions.`,
  };
}

export default async function CountyElectionOfficePage({
  params,
}: {
  params: Promise<{ county: string }>;
}) {
  const { county } = await params;
  const office = officeBySlug(county);
  if (!office) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/election-office"
          className="w-fit text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
        >
          ← All counties
        </Link>
        <h1 className="text-h1">Your election office</h1>
        <p className="text-body-lg text-on-surface-muted">
          The {office.county} County Supervisor of Elections is the official
          source for your registration status, your polling place, your sample
          ballot, and vote-by-mail.
        </p>
      </div>

      <ElectionOfficeCard office={office} />

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-h3">What this office can do for you</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface-muted">
          <li>Confirm you&apos;re registered, or update your address or name.</li>
          <li>Tell you your precinct and polling place, and its hours.</li>
          <li>Send you a vote-by-mail ballot and track the one you returned.</li>
          <li>Give you your official sample ballot for this election.</li>
          <li>Tell you which districts you live in.</li>
        </ul>
        <p className="text-body-sm text-on-surface-muted">
          To register or update your registration online, Florida runs{" "}
          <a
            href="https://registertovoteflorida.gov"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            registertovoteflorida.gov
          </a>
          .
        </p>
      </section>

      <p className="text-caption text-on-surface-muted">
        We show what each candidate says, has done, and what&apos;s verified —
        your county office is the authority on the mechanics of voting.{" "}
        <Link
          href="/"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          See your ballot
        </Link>
      </p>
    </main>
  );
}
