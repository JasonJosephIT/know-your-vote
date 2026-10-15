import { cookies } from "next/headers";
import { MarkBallot } from "@/components/features/MarkBallot";
import { DISTRICT_COOKIE, parseDistrictCookie } from "@/lib/district-cookie";

export const metadata = { title: "Mark your ballot — Know Your Vote" };

/* Mark your ballot (founder 2026-10-14): its own page in the Ballot section
   (SectionNav), not a Candidates tab, because it holds the ballot questions
   as well as the races. It reads the location the way /candidates does: a
   location in the URL wins and never writes the cookie; with none, the
   saved district. No ZIP: nothing links here with one. With neither,
   MarkBallot shows the statewide ballot and the address field. */
export default async function BallotPage({
  searchParams,
}: {
  searchParams: Promise<{
    district?: string;
    county?: string;
    scope?: string;
    change?: string;
  }>;
}) {
  const sp = await searchParams;
  const hasUrlLocation = Boolean(sp.district || sp.county || sp.scope);
  /* change=1 is "Change location": the field, not the saved district. */
  const saved = hasUrlLocation || sp.change
    ? null
    : parseDistrictCookie((await cookies()).get(DISTRICT_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      {/* The printed sheet carries its own title (MarkBallot). */}
      <header className="flex flex-col gap-2 print:hidden">
        <h1 className="text-h1">Mark your ballot</h1>
        <p className="text-body text-on-surface">
          Mark your choices in ballot order, then print them to take with you.
          Nothing is marked for you, and your choices stay on this device: we
          never see them.
        </p>
      </header>
      <MarkBallot
        district={sp.district ?? saved?.district}
        county={sp.county ?? saved?.countyFips}
        scope={sp.scope === "statewide" ? "statewide" : undefined}
      />
    </main>
  );
}
