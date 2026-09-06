/* Most voters believe a simple majority passes a Florida amendment; it takes
   60%. Correcting that is one of the more useful things this page does, so
   the threshold is stated plainly rather than buried in the summary. */
export function MeasureThreshold({ pct }: { pct: number }) {
  const rendered = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return (
    <p className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface">
      <span className="font-semibold">Needs {rendered}% to pass.</span> A simple
      majority is not enough — if fewer than {rendered}% of voters approve it,
      the measure fails.
    </p>
  );
}
