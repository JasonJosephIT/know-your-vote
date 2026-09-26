import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SourceLinks } from "@/components/features/SourceLinks";
import type { SourcedClaim } from "@/lib/briefs";

/* A candidate's claims with their sources. Shared by the full brief
   (IssueSection) and the race page's issue filter (IssueRows), so a claim
   reads the same wherever it appears. */
export function ClaimList({
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
   every view, so silence is described the same way everywhere. */
export function NoStatedPosition() {
  return (
    <p className="rounded-md bg-surface-muted px-3 py-2 text-body-sm text-on-surface-muted">
      No stated position found — we searched this candidate&apos;s own
      sources and found no position on this issue. Silence is recorded
      honestly, never filled in.
    </p>
  );
}
