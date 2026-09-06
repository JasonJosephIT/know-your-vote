import { SourceLinks } from "@/components/features/SourceLinks";
import type { MeasureArgumentWithSource, MeasureBrief } from "@/lib/measures";

function ArgumentList({ items }: { items: MeasureArgumentWithSource[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ argument, source }) => (
        <li key={argument.argument_id} className="flex flex-col gap-1">
          <p className="text-body-sm">{argument.text}</p>
          <SourceLinks sources={[source]} />
        </li>
      ))}
    </ul>
  );
}

/* The measure equivalent of RaceCompare: two equal columns, YES and NO, in a
   fixed order, on an equal-treatment stack on mobile. Neither side is styled
   to look preferred — the same rule that keeps party chips uncoloured.
   Nothing here recommends a vote. */
export function MeasureCompare({ brief }: { brief: MeasureBrief }) {
  const sides = [
    { key: "yes", heading: "What a YES does", items: brief.support },
    { key: "no", heading: "What a NO does", items: brief.oppose },
  ] as const;

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
      {sides.map((side) => (
        <section
          key={side.key}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-on-surface"
        >
          <h2 className="text-h3">{side.heading}</h2>
          <ArgumentList items={side.items} />
        </section>
      ))}
    </div>
  );
}
