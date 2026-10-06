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

   The facts (every name, count and link, with where each was checked on
   2026-10-04) live in src/lib/judicial-retention.ts, so that
   scripts/verify-judicial-retention.ts can check each covered county's lines
   under plain node. Re-check them there if a judge leaves the bench before
   Election Day. After the election this content is stale and should go with
   the 2026 cycle. */

import {
  appealsForCounty,
  appealsLineLabel,
  DOE_JUDICIAL_LIST,
  SUPREME_COURT,
} from "@/lib/judicial-retention";

export const SHOW_JUDICIAL_RETENTION_NOTE = true;

const linkClass = "text-primary underline underline-offset-2";

function NewTab() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}

/* `county` is a county NAME, the value resolve returns as result.county
   ("Miami-Dade", not "12086"). It narrows the appeals court lines to the
   voter's own county when it is known: the "Your races" view, and the home
   page when the saved district names a covered county. Without it, or for a
   county outside the list, every covered county is shown, which is still
   true for everyone (appealsForCounty). The Supreme Court line is outside
   that choice: Justice Muñiz is on every Florida ballot. */
export function JudicialRetentionNote({ county }: { county?: string | null }) {
  if (!SHOW_JUDICIAL_RETENTION_NOTE) return null;

  const appeals = appealsForCounty(county);

  return (
    <aside
      aria-label="Judges on your ballot"
      className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted px-4 py-3"
    >
      <h3 className="text-label">Judges on your ballot</h3>
      <p className="text-body-sm text-on-surface-muted">
        Your ballot also asks whether to keep some judges in office. Know Your
        Vote doesn&rsquo;t cover these questions. The links go to the
        state&rsquo;s list of who is up and to the courts&rsquo; own pages.
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
                  {appealsLineLabel(a)}
                  <NewTab />
                </a>{" "}
                (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  about this court&rsquo;s judges
                  {/* Three of these sit on one page; a links list must
                      say which court each is (production re-run,
                      2026-10-05). */}
                  <span className="sr-only">: {a.court}</span>
                  <NewTab />
                </a>
                )
              </>
            ) : (
              <>{appealsLineLabel(a)}</>
            )}
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-on-surface-muted">
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
        don&rsquo;t cover either.
      </p>
    </aside>
  );
}
