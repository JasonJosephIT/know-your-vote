import { PolicyAreaChip, policyAreaHref } from "@/components/ui/PolicyAreaChip";
import { ClaimList, NoStatedPosition } from "@/components/features/ClaimList";
import type { IssueBlock } from "@/lib/briefs";

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

      {/* The policy areas this issue belongs to, derived from its title. A
          race-specific issue that the shared taxonomy has no home for shows
          nothing here, which is the honest rendering of "no area", not a gap
          to fill. Spine issues are race-wide, so these chips are identical for
          every candidate in the race. */}
      {block.policyAreas.length > 0 && (
        <ul aria-label="Policy areas" className="flex flex-wrap gap-2">
          {block.policyAreas.map((area) => (
            <li key={area.id}>
              <PolicyAreaChip label={area.label} href={policyAreaHref(area.id)} />
            </li>
          ))}
        </ul>
      )}

      {block.coverage === "no_stated_position_found" && <NoStatedPosition />}

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
