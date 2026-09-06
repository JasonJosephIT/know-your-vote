import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getActiveMeasures } from "@/lib/measures";

/* The ballot questions every Florida voter shares (TASK-063).

   Deliberately NOT part of ResolveResult. Measures are statewide and
   identical for everyone, so threading them through ZIP resolution would
   couple location-free data to a location lookup — and it is exactly what
   Phase 7's TASK-067 needs to render with no ZIP at all. Fetching them here
   keeps resolve.ts about location and makes that task a re-use rather than a
   rewrite. (The Phase 6 plan listed resolve.ts and app.ts for this task; it
   was written before the measure tables existed.)

   Renders nothing when no measure is published, so it is safe on the page
   before TASK-066 content lands. */
export async function BallotQuestions() {
  const measures = await getActiveMeasures();
  if (measures.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3">Ballot questions</h2>
        <p className="text-caption text-on-surface-muted">
          These are on every Florida ballot, whatever your ZIP. Each needs a
          supermajority to pass, not a simple majority.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {measures.map((m) => (
          <li key={m.measure_id}>
            <Link href={`/measures/${m.measure_id}`} className="block">
              <Card className="transition-shadow hover:shadow-elevation-1">
                <h3 className="text-h3">
                  Amendment {m.number}: {m.official_title}
                </h3>
                <p className="text-body-sm text-on-surface-muted">
                  {m.jurisdiction === "FL" ? "Statewide" : m.jurisdiction} ·
                  Needs {Number.isInteger(m.threshold_pct)
                    ? m.threshold_pct
                    : m.threshold_pct.toFixed(1)}
                  % to pass
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
