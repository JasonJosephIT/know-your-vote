import { MeasureResourceRow } from "@/components/features/MeasureResourceRow";
import type {
  MeasureBrief,
  MeasureResourceWithSource,
} from "@/lib/measures";
import { COLUMN_CAP, RESOURCE_TIER, TIER_LABEL } from "@/lib/measure-ladder";
import type { MeasureKind } from "@/types/app";

/* The measure page's body below the ballot text (spec §5):

   1. "Understand it first" — the neutral resources, shared by both sides,
      most credible material on the page. Omitted entirely when empty.
   2. Two equal columns, YES then NO, fixed order, equal-treatment stack on
      mobile. Neither is styled as preferred — the rule that keeps party
      chips uncoloured. Inside a column, rows sit under small tier headings
      so the ladder is visible, not implied. A tier with no rows shows no
      heading.

   Rows arrive already tier-ordered from measures.ts; this groups, it does
   not sort. The cap is the same on both sides (equal room), and the
   overflow is a native <details> so the page needs no client JavaScript. */

const COLUMN_KINDS: readonly MeasureKind[] = [
  "analysis",
  "argument",
  "commentary",
];
const NEUTRAL_KINDS: readonly MeasureKind[] = [
  "official",
  "analysis",
  "reporting",
];

function groupByKind(items: MeasureResourceWithSource[]) {
  const groups = new Map<MeasureKind, MeasureResourceWithSource[]>();
  for (const item of items) {
    const list = groups.get(item.resource.kind) ?? [];
    list.push(item);
    groups.set(item.resource.kind, list);
  }
  return groups;
}

function TieredList({
  items,
  kinds,
}: {
  items: MeasureResourceWithSource[];
  kinds: readonly MeasureKind[];
}) {
  const groups = groupByKind(items);
  const present = kinds
    .filter((k) => (groups.get(k) ?? []).length > 0)
    .sort((a, b) => RESOURCE_TIER[a] - RESOURCE_TIER[b]);
  return (
    <div className="flex flex-col gap-3">
      {present.map((k) => (
        <div key={k} className="flex flex-col gap-2">
          <h3 className="text-caption uppercase tracking-wide text-on-surface-muted">
            {TIER_LABEL[k]}
          </h3>
          <ul className="flex flex-col gap-2">
            {(groups.get(k) ?? []).map((item) => (
              <MeasureResourceRow
                key={item.resource.resource_id}
                item={item}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Column({
  heading,
  items,
}: {
  heading: string;
  items: MeasureResourceWithSource[];
}) {
  const shown = items.slice(0, COLUMN_CAP);
  const rest = items.slice(COLUMN_CAP);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-on-surface">
      <h2 className="text-h3">{heading}</h2>
      <TieredList items={shown} kinds={COLUMN_KINDS} />
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer text-label text-primary underline underline-offset-2">
            Show all {items.length}
          </summary>
          <div className="mt-3">
            <TieredList items={rest} kinds={COLUMN_KINDS} />
          </div>
        </details>
      )}
    </section>
  );
}

export function MeasureResourceLadder({ brief }: { brief: MeasureBrief }) {
  return (
    <div className="flex flex-col gap-5">
      {brief.neutral.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h3">Understand it first</h2>
          <TieredList items={brief.neutral} kinds={NEUTRAL_KINDS} />
        </section>
      )}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
        <Column heading="The case for a YES" items={brief.support} />
        <Column heading="The case for a NO" items={brief.oppose} />
      </div>
    </div>
  );
}
