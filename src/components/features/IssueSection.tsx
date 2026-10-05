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
      {/* A real space before the tag, not only a margin: with the margin
          alone the heading's accessible name ran together as "School choice
          and voucherscandidate-added issue" (a11y-perf-2026-10-04.md fix 8;
          WCAG 2.4.6 Headings and Labels). The space ends the title's own
          text node. A separate {" "} does not work: React's server HTML puts
          <!-- --> between it and the title, and Chromium leaves a
          whitespace-only text node after a comment out of the accessible
          name. ml-1 plus the space keeps the visual gap that ml-2 gave. */}
      <h3 className="text-h3">
        {block.issue.tier === "candidate"
          ? `${block.issue.title} `
          : block.issue.title}
        {block.issue.tier === "candidate" && (
          <span className="ml-1 align-middle text-caption font-medium text-on-surface-muted">
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

      <IssueBuckets block={block} />
    </section>
  );
}

/* The coverage state and the three buckets, without the issue heading.
   IssueSection wraps it for one candidate's brief; the race page's issue
   rows (RaceCompare) put one per candidate under a shared heading, compact
   and collapsed after two claims. Same buckets, same order, either way. */
export function IssueBuckets({
  block,
  compact,
  name,
}: {
  block: IssueBlock;
  compact?: boolean;
  name?: string;
}) {
  /* In a compact cell "What They Say" is dropped when it is the only
     bucket: every live claim is a stated position (2026-10-05), so over
     every cell it said nothing the row heading didn't. Any other bucket
     keeps its label, alone or not, so a record or a fact-check can never
     read as the candidate's own words. */
  const filled = buckets.filter(({ key }) => block[key].length > 0).length;
  const labelled = !compact || filled > 1 || block.say.length === 0;
  return (
    <>
      {block.coverage === "no_stated_position_found" && (
        <NoStatedPosition compact={compact} />
      )}
      {buckets.map(({ key, label, tone }) => {
        const items = block[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-2">
            {labelled && (
              <h4 className={`text-overline uppercase tracking-[0.08em] ${tone}`}>
                {label}
              </h4>
            )}
            <ClaimList
              items={items}
              withVerdict={key === "factCheck"}
              collapseAfter={compact ? 2 : undefined}
              name={name}
              topic={block.issue.title}
            />
          </div>
        );
      })}
    </>
  );
}
