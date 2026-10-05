import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SourceLinks } from "@/components/features/SourceLinks";
import type { SourcedClaim } from "@/lib/briefs";

/* A candidate's claims with their sources. Shared by the full brief
   (IssueSection), the race page's issue rows (RaceCompare) and its issue
   filter (IssueRows), so a claim reads the same wherever it appears.

   collapseAfter (race page only, inspiration pass 2026-10-05): the first N
   claims show and the rest sit behind a native <details>, "Show 4 more from
   Jane Doe". The race page put up to six quotes per issue per candidate in
   full, which made FL-GOV 37,837 px tall. Same N for every candidate, the
   count is always stated, and <details> needs no JavaScript and is found by
   the browser's find-in-page. The candidate's own page leaves it off and
   shows everything. */
export function ClaimList({
  items,
  withVerdict,
  collapseAfter,
  name,
}: {
  items: SourcedClaim[];
  withVerdict?: boolean;
  collapseAfter?: number;
  /* Whose claims these are, for the "Show N more" label. */
  name?: string;
}) {
  const cut =
    collapseAfter !== undefined && items.length > collapseAfter + 1
      ? collapseAfter
      : items.length;
  const shown = items.slice(0, cut);
  const rest = items.slice(cut);
  return (
    <div className="flex flex-col gap-3">
      <Claims items={shown} withVerdict={withVerdict} />
      {rest.length > 0 && (
        <details className="group/claims flex flex-col gap-3">
          <summary className="inline-flex min-h-[24px] w-fit cursor-pointer items-center text-caption text-primary underline underline-offset-2 hover:text-primary-hover">
            <span className="group-open/claims:hidden">
              Show {rest.length} more
              {name ? ` from ${name}` : ""}
            </span>
            <span className="hidden group-open/claims:inline">
              Show fewer
              {name ? <span className="sr-only"> from {name}</span> : null}
            </span>
          </summary>
          <div className="mt-3">
            <Claims items={rest} withVerdict={withVerdict} />
          </div>
        </details>
      )}
    </div>
  );
}

function Claims({
  items,
  withVerdict,
}: {
  items: SourcedClaim[];
  withVerdict?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ claim, sources }) => (
        <li key={claim.claim_id} className="flex flex-col gap-1">
          <p className="text-body-sm">{claim.text}</p>
          <span className="flex flex-wrap items-center gap-2">
            {withVerdict && claim.verdict && <VerdictBadge verdict={claim.verdict} />}
            <SourceLinks sources={sources} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* The recorded coverage state `no_stated_position_found`. One wording for
   every view, so silence is described the same way everywhere.

   compact: the race page's issue rows, where the full sentence repeated in
   every empty cell outweighed the quotes beside it. It keeps the same
   opening words, and the race page states the rest once above the rows
   (NO_STATED_POSITION_NOTE), so nothing is dropped, only not repeated. */
export function NoStatedPosition({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-body-sm text-on-surface-muted">
        No stated position found on their campaign website.
      </p>
    );
  }
  return (
    <p className="rounded-md bg-surface-muted px-3 py-2 text-body-sm text-on-surface-muted">
      No stated position found — we found no position on this issue that we
      could quote from this candidate&apos;s own campaign website. Silence is
      recorded honestly, never filled in.
    </p>
  );
}

export const NO_STATED_POSITION_NOTE =
  "Where a candidate's own campaign website says nothing we could quote on an issue, we say so: \"No stated position found.\" Silence is recorded honestly, never filled in.";
