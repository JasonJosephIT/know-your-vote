import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SourceLinks } from "@/components/features/SourceLinks";
import type { IssueBlock, SourcedClaim } from "@/lib/briefs";

function ClaimList({ items, withVerdict }: { items: SourcedClaim[]; withVerdict?: boolean }) {
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

const buckets = [
  { key: "say", label: "What They Say", tone: "text-accent-strong" },
  { key: "done", label: "What They've Done", tone: "text-primary" },
  { key: "factCheck", label: "Fact-Check", tone: "text-info" },
] as const;

/* One issue for one candidate — the same three buckets, in the same order,
   for everyone (equal by construction). */
export function IssueSection({ block }: { block: IssueBlock }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="text-h3">
        {block.issue.title}
        {block.issue.tier === "candidate" && (
          <span className="ml-2 align-middle text-caption font-medium text-on-surface-muted">
            candidate-added issue
          </span>
        )}
      </h3>

      {block.coverage === "no_stated_position_found" && (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-body-sm text-on-surface-muted">
          No stated position found — we searched this candidate&apos;s own
          sources and found no position on this issue. Silence is recorded
          honestly, never filled in.
        </p>
      )}

      {buckets.map(({ key, label, tone }) => {
        const items = block[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-2">
            <h4 className={`text-overline uppercase tracking-[0.08em] ${tone}`}>
              {label}
            </h4>
            <ClaimList items={items} withVerdict={key === "factCheck"} />
          </div>
        );
      })}
    </section>
  );
}
