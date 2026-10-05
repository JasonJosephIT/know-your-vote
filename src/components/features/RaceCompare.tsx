import Link from "next/link";
import { PartyChip } from "@/components/ui/PartyChip";
import { Chip } from "@/components/ui/Chip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { PolicyAreaChip, policyAreaHref } from "@/components/ui/PolicyAreaChip";
import { IssueBuckets } from "@/components/features/IssueSection";
import { NoStatedPositionNote } from "@/components/features/ClaimList";
import type { RaceBrief } from "@/lib/briefs";
import { CONTACT_EMAIL } from "@/lib/contact";
import { showIncumbentChip } from "@/lib/incumbency";
import { candidateExtras, raceRows } from "@/lib/race-rows";
import { statusBranch } from "@/lib/listing-copy";

/* The race page, issue first (inspiration pass 2026-10-05, after CalMatters'
   2026 guide). It used to be one full CandidateBrief column per candidate,
   with each candidate's issues stacked inside it: on FL-GOV, 8 columns and
   37,837 px, and "Property taxes" sat at a different height in every column,
   so comparing two candidates on one issue meant hunting. Now:

   1. Who's running: one short card per candidate (name, party, Keep in mind,
      official site, full profile). Socials live on the profile page.
   2. One row per spine issue, with a cell for every candidate in ballot
      order, so an issue reads across. Claims past the first two sit behind
      "Show N more from <name>" (ClaimList).
   3. Other issues they raise: each candidate's candidate-tier issues, under
      their own name, each closed behind a <details>.

   Equal space and equal scrutiny are still layout invariants: every row has
   a cell for every candidate, the collapse rule and the column rule are the
   same for everyone, and nobody is behind a tab. No client JavaScript beyond
   SaveToggle, which was already here.

   The roster cards keep the candidate-<candidate_id> ids that the old jump
   links targeted (a11y-perf-2026-10-04.md fix 11), so existing links into a
   candidate still land; and the collapsed claims cut the tab stops that fix
   was working around.

   Recommended (pending founder confirmation). TO FLIP back to columns:
   render brief.candidates.map(c => <CandidateBrief data={c} />) in the old
   grid (git history of this file, before 2026-10-05). */
export function RaceCompare({ brief }: { brief: RaceBrief }) {
  const count = brief.candidates.length;
  const cols = { "--cols": Math.min(count, 3) } as React.CSSProperties;
  const grid =
    "grid grid-cols-1 gap-4 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]";
  const rows = raceRows(brief);
  const extras = candidateExtras(brief);
  const anyExtras = extras.some((e) => e.blocks.length > 0);
  /* The roster's heading follows the same status rule as the line above it
     (src/lib/listing-copy.ts): a seat settled in August or elected without
     opposition has nobody "running" on this ballot. */
  const branch = statusBranch({
    decidedInPrimary: brief.decidedInPrimary,
    notPrintedOnBallot: brief.notPrintedOnBallot,
    count,
  });
  const rosterHeading =
    branch === "decided_in_primary"
      ? count === 1 ? "The winner" : "The winners"
      : branch === "not_printed"
        ? "Elected without opposition"
        : "Who's running";

  return (
    <>
      <section aria-labelledby="whos-running" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="whos-running" className="text-h2">
            {rosterHeading}
          </h2>
          {count > 1 && (
            <p className="text-body-sm text-on-surface-muted">
              {count} candidates, in ballot order.
            </p>
          )}
        </div>
        <ul className={grid} style={cols}>
          {brief.candidates.map(({ candidate, socials }) => (
            <li
              key={candidate.candidate_id}
              id={`candidate-${candidate.candidate_id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
            >
              <h3 className="text-h3">
                <Link
                  href={`/candidates/${candidate.candidate_id}`}
                  className="hover:underline"
                >
                  {candidate.legal_name}
                </Link>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <PartyChip party={candidate.party} />
                {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
                <SaveToggle
                  candidateId={candidate.candidate_id}
                  name={candidate.legal_name}
                />
              </div>
              <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
                <Link
                  href={`/candidates/${candidate.candidate_id}`}
                  className="inline-flex min-h-[24px] items-center text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  {socials.length > 0 ? "Full profile and socials" : "Full profile"}
                  <span className="sr-only">: {candidate.legal_name}</span>
                </Link>
                {candidate.official_site && (
                  <a
                    href={candidate.official_site}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
                  >
                    Official site
                    <span className="sr-only">: {candidate.legal_name}</span>
                  </a>
                )}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Flag%20brief%3A%20${candidate.candidate_id}`}
                  className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
                >
                  {/* The same words as the candidate page (CandidateBrief): the
                      object is our brief, never the candidate. */}
                  Flag this brief as biased
                  <span className="sr-only">: {candidate.legal_name}</span>
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {rows.length > 0 && <NoStatedPositionNote />}

      {rows.map((row) => (
        <section
          key={row.issueId}
          id={`issue-${row.subIssueId}`}
          aria-labelledby={`issue-${row.subIssueId}-title`}
          className="flex flex-col gap-3 border-t border-border pt-5"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id={`issue-${row.subIssueId}-title`} className="text-h2">
              {row.title}
            </h2>
            {row.policyAreas.length > 0 && (
              <ul aria-label="Policy areas" className="flex flex-wrap gap-2">
                {row.policyAreas.map((area) => (
                  <li key={area.id}>
                    <PolicyAreaChip label={area.label} href={policyAreaHref(area.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${grid} items-start`} style={cols}>
            {row.cells.map(({ candidate, block }) => (
              <article
                key={candidate.candidate_id}
                className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4"
              >
                <h3 className="text-label">
                  <Link
                    href={`/candidates/${candidate.candidate_id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {candidate.legal_name}
                  </Link>
                </h3>
                {block ? (
                  <IssueBuckets block={block} compact name={candidate.legal_name} />
                ) : (
                  <Link
                    href={`/candidates/${candidate.candidate_id}`}
                    className="text-caption text-primary underline underline-offset-2"
                  >
                    See the full record
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      {anyExtras && (
        <section
          aria-labelledby="other-issues"
          className="flex flex-col gap-3 border-t border-border pt-5"
        >
          <div className="flex flex-col gap-1">
            <h2 id="other-issues" className="text-h2">
              Other issues they raise
            </h2>
            <p className="max-w-[680px] text-body-sm text-on-surface-muted">
              Issues beyond the ones above where we quoted a candidate from
              their own campaign website. Each is quoted for one candidate
              only, so these aren&apos;t side by side.
            </p>
          </div>
          <div className={`${grid} items-start`} style={cols}>
            {extras.map(({ candidate, blocks }) => (
              <article
                key={candidate.candidate_id}
                className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4"
              >
                <h3 className="text-label">{candidate.legal_name}</h3>
                {/* About our process, not the candidate: an empty list here
                    is what we quoted, not what they said. */}
                {blocks.length === 0 ? (
                  <p className="text-body-sm text-on-surface-muted">
                    We quoted no other issues.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {blocks.map((block) => {
                      const n =
                        block.say.length + block.done.length + block.factCheck.length;
                      return (
                        <li key={block.issue.issue_id}>
                          <details className="group/issue py-1">
                            <summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between gap-3 text-body-sm [&::-webkit-details-marker]:hidden">
                              <span className="flex items-baseline gap-2">
                                <span
                                  aria-hidden="true"
                                  className="inline-block w-3 text-on-surface-muted transition-transform group-open/issue:rotate-90 motion-reduce:transition-none"
                                >
                                  ›
                                </span>
                                {block.issue.title}
                              </span>
                              <span className="shrink-0 text-caption text-on-surface-muted">
                                {n === 0 ? "" : n === 1 ? "1 quote" : `${n} quotes`}
                                {/* Two candidates can raise the same issue, so
                                    the control names whose it is
                                    (a11y-perf-2026-10-04.md fix 6). After the
                                    visible words, for 2.5.3 Label in Name. */}
                                <span className="sr-only"> from {candidate.legal_name}</span>
                              </span>
                            </summary>
                            <div className="flex flex-col gap-2 pt-2 pb-3">
                              <IssueBuckets block={block} compact name={candidate.legal_name} />
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
