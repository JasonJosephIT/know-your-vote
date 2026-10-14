import { MeasureResourceRow } from "@/components/features/MeasureResourceRow";
import { ArrowDownGlyph } from "@/components/ui/Glyphs";
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
   overflow is a native <details> so the page needs no client JavaScript.

   EQUAL REACH ON PHONES (Mobbin catalog AM1, 2026-10-12). Below md the
   columns stack, so the NO column starts only after up to eight YES rows.
   A row of two jump links at the top of the ladder puts both sides one tap
   away. The links and the columns are drawn from one SIDES list, so their
   words and order can't drift apart, and the row lives here, beside the
   columns, so it renders with both of them or not at all. No counts. The
   jump is instant (nothing moves below lg, founder D2 2026-10-13), and the
   root scroll-padding-top already lands each heading clear of the fixed
   bars, so the columns need no scroll-mt. */

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

/* Ballot order: YES, then NO. */
const SIDES = [
  { id: "case-yes", heading: "The case for a YES", stance: "support" },
  { id: "case-no", heading: "The case for a NO", stance: "oppose" },
] as const;

function groupByKind(items: MeasureResourceWithSource[]) {
  const groups = new Map<MeasureKind, MeasureResourceWithSource[]>();
  for (const item of items) {
    const list = groups.get(item.resource.kind) ?? [];
    list.push(item);
    groups.set(item.resource.kind, list);
  }
  return groups;
}

/* Rows are split by hairlines, not boxed (catalog AM4): the column card is
   the only box, so a row is never a box inside a box. */
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
        <div key={k} className="flex flex-col">
          <h3 className="text-caption uppercase tracking-wide text-on-surface-muted">
            {TIER_LABEL[k]}
          </h3>
          <ul className="flex flex-col divide-y divide-border">
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
  id,
  heading,
  items,
}: {
  id: string;
  heading: string;
  items: MeasureResourceWithSource[];
}) {
  const shown = items.slice(0, COLUMN_CAP);
  const rest = items.slice(COLUMN_CAP);
  return (
    <section
      id={id}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-on-surface"
    >
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

/* Both links come from one map with one className and one glyph: the same
   size, weight and colour for YES and NO. Only an in-page link gets the
   down arrow: on a new-tab link it would read as staying on the page.
   md:hidden, because from md the columns sit side by side and start at the
   same height. */
function JumpRow() {
  return (
    <nav aria-labelledby="measure-jump" className="flex flex-col gap-1 md:hidden">
      <p id="measure-jump" className="text-body-sm text-on-surface-muted">
        On this page
      </p>
      <ul className="grid grid-cols-2 gap-3">
        {SIDES.map((side) => (
          <li key={side.id}>
            <a
              href={`#${side.id}`}
              className="inline-flex min-h-[44px] items-center gap-1 text-label text-primary underline underline-offset-2"
            >
              <ArrowDownGlyph />
              {side.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function MeasureNeutralBlock({
  items,
}: {
  items: MeasureResourceWithSource[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2">Understand it first</h2>
      <TieredList items={items} kinds={NEUTRAL_KINDS} />
    </section>
  );
}

export function MeasureResourceLadder({ brief }: { brief: MeasureBrief }) {
  return (
    <div className="flex flex-col gap-5">
      <JumpRow />
      <MeasureNeutralBlock items={brief.neutral} />
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
        {SIDES.map((side) => (
          <Column
            key={side.id}
            id={side.id}
            heading={side.heading}
            items={brief[side.stance]}
          />
        ))}
      </div>
    </div>
  );
}
