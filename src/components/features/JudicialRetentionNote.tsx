/* The judges on the ballot that Know Your Vote doesn't cover (launch handoff
   2026-10-04 §4, founder decision 10).

   Every Florida general-election ballot asks whether to keep a Supreme Court
   justice in office, and most also ask about district court of appeal judges.
   The site models neither (data-architecture.md §6 deferred retention), so
   without this note the "Ballot questions" list reads as the whole ballot and
   a voter meets a run of judges in the booth that nothing here mentioned.

   ------------------------------------------------------------------------
   FOUNDER DECISION 10: Recommended (pending founder confirmation).
   Say plainly that retention is out of scope and point to the courts' and
   the Division of Elections' own pages, rather than model retention 30 days
   out. Nothing here describes a judge or how to vote: it names who is on the
   ballot, as the state lists it, and links away.

   To remove the note: set SHOW_JUDICIAL_RETENTION_NOTE to false. The
   component then renders nothing and BallotQuestions is unchanged. To remove
   it for good, delete this file and the one <JudicialRetentionNote /> line
   in BallotQuestions.tsx.
   ------------------------------------------------------------------------

   Every name, count and link below was checked on 2026-10-04 against
   official pages only (the record is in docs/general-election/
   ballots-handoff.md §7):
   - The Division of Elections' 2026 general-election candidate list,
     judicial offices: Justice Muñiz is the only justice up for retention;
     district 2 has four judges up, districts 3 and 4 five each, district 6
     none.
   - Florida Statutes 26.021 and 35.02–35.044 (2026): Miami-Dade is the 11th
     Circuit and so the 3rd District; Broward the 17th, 4th District;
     Hillsborough the 13th, 2nd District; Orange the 9th, which moved to the
     new 6th District in 2023.
   - Miami-Dade's own 2026-11-03 master ballot prints the Muñiz question and
     five 3rd District questions, matching the state list.
   Bar polls, voter guides and advocacy pages are deliberately not linked.

   Re-check the list if a judge leaves the bench before Election Day. After
   the election this content is stale and should go with the 2026 cycle. */

export const SHOW_JUDICIAL_RETENTION_NOTE = true;

/* The state's list of every judge on the 2026 general-election ballot. It is
   the only official page that names exactly who is up, grouped by court
   ("District Court of Appeal", "District 3" and so on), so each county's
   count links here. The courts' judges pages list every sitting judge (the
   3rd District's has 10 for 5 questions, checked 2026-10-04), so they are
   kept only as a second link for background (adversarial review,
   2026-10-04). */
const DOE_JUDICIAL_LIST =
  "https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeGroup=JUD";

const SUPREME_COURT = {
  justice: "Justice Carlos G. Muñiz",
  url: "https://supremecourt.flcourts.gov/the-court/about-the-court/justices/justice-carlos-g.-muniz",
};

/* One row per covered county, in COVERED_COUNTIES order. `judges: 0` is a
   real answer (Orange's 6th District has no one up this year), not missing
   data. Keyed by county name, the same value resolve returns. `url` is the
   court's own judges page, the secondary "about this court's judges" link. */
const APPEALS_BY_COUNTY: readonly {
  county: string;
  court: string;
  judges: number;
  url: string;
}[] = [
  {
    county: "Miami-Dade",
    court: "3rd District Court of Appeal",
    judges: 5,
    url: "https://3dca.flcourts.gov/Judges",
  },
  {
    county: "Broward",
    court: "4th District Court of Appeal",
    judges: 5,
    url: "https://4dca.flcourts.gov/Judges",
  },
  {
    county: "Hillsborough",
    court: "2nd District Court of Appeal",
    judges: 4,
    url: "https://2dca.flcourts.gov/Judges",
  },
  {
    county: "Orange",
    court: "6th District Court of Appeal",
    judges: 0,
    url: "https://6dca.flcourts.gov/Judges",
  },
];

const linkClass = "text-primary underline underline-offset-2";

function NewTab() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}

/* `county` narrows the appeals court lines to the voter's own county when it
   is known (the "Your races" view). Without it, or for a county outside the
   list, every covered county is shown, which is still true for everyone. */
export function JudicialRetentionNote({ county }: { county?: string | null }) {
  if (!SHOW_JUDICIAL_RETENTION_NOTE) return null;

  const own = APPEALS_BY_COUNTY.filter((a) => a.county === county);
  const appeals = own.length > 0 ? own : APPEALS_BY_COUNTY;

  return (
    <aside
      aria-label="Judges on your ballot"
      className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted px-4 py-3"
    >
      <h3 className="text-label">Judges on your ballot</h3>
      <p className="text-body-sm text-on-surface-muted">
        Your ballot also asks whether to keep some judges in office. Know Your
        Vote doesn&apos;t cover these questions. The links go to the
        state&apos;s list of who is up and to the courts&apos; own pages.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface">
        <li>
          Every Florida ballot:{" "}
          <a
            href={SUPREME_COURT.url}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            {SUPREME_COURT.justice}, Florida Supreme Court
            <NewTab />
          </a>
        </li>
        {appeals.map((a) => (
          <li key={a.county}>
            {a.county} ballots:{" "}
            {a.judges > 0 ? (
              <>
                <a
                  href={DOE_JUDICIAL_LIST}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {a.judges} judges of the {a.court}
                  <NewTab />
                </a>{" "}
                (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  about this court&apos;s judges
                  <NewTab />
                </a>
                )
              </>
            ) : (
              <>no appeals court judges this year</>
            )}
          </li>
        ))}
      </ul>
      <p className="text-caption text-on-surface-muted">
        The Florida Division of Elections{" "}
        <a
          href={DOE_JUDICIAL_LIST}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          lists every judge on the 2026 ballot
          <NewTab />
        </a>
        . Some county ballots also have a circuit judge race, which we
        don&apos;t cover either.
      </p>
    </aside>
  );
}
