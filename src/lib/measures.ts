import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION } from "@/lib/election";
/* The same rule the database enforces (0010), re-checked here so a measure
   that somehow reached 'published' without it never renders one-sided. Lives
   in its own module so the verify script can run it without next/cache. */
import { sidesBalanced } from "@/lib/measure-balance";
import type { Source } from "@/types/schema";
import type { BallotMeasure, MeasureArgument, MeasureSide } from "@/types/app";

/* Published-only read layer for ballot measures (TASK-062), mirroring
   briefs.ts:

   1. RLS already hides every row tied to an unpublished measure, so the gate
      is at the database, not here.
   2. This module re-checks the symmetry rule anyway — belt and braces over
      the publication trigger, exactly as briefs.ts re-checks
      balance_check_passed over the publication gate.
   3. Arguments carry a NOT NULL source_id, so "no source -> dropped" is a
      schema guarantee rather than a query detail. The join is still inner:
      a dangling source reference drops the argument rather than rendering
      one with nothing behind it.

   Note the election vocabulary here is the cycle key ('general_2026'), not
   the race enum — see src/lib/election.ts for why those are separate. */

export { sidesBalanced };

export interface MeasureArgumentWithSource {
  argument: MeasureArgument;
  source: Source;
}

export interface MeasureBrief {
  measure: BallotMeasure;
  support: MeasureArgumentWithSource[];
  oppose: MeasureArgumentWithSource[];
}

type ArgumentRow = MeasureArgument & { source: Source | null };

function toSourced(rows: ArgumentRow[], side: MeasureSide): MeasureArgumentWithSource[] {
  return rows
    .filter((row) => row.side === side && row.source !== null)
    .map((row) => {
      const { source, ...argument } = row;
      return { argument: argument as MeasureArgument, source: source as Source };
    });
}

async function fetchMeasureBrief(measureId: string): Promise<MeasureBrief | null> {
  const supabase = await createAnonServerClient();

  const { data: measure } = await supabase
    .from("ballot_measure")
    .select("*")
    .eq("measure_id", measureId)
    .eq("election", ACTIVE_ELECTION)
    .maybeSingle<BallotMeasure>();
  if (!measure) return null;

  const { data: rows } = await supabase
    .from("measure_argument")
    .select("*, source!inner(*)")
    .eq("measure_id", measureId)
    .order("display_order");

  const all = (rows ?? []) as ArgumentRow[];
  const support = toSourced(all, "support");
  const oppose = toSourced(all, "oppose");

  if (!sidesBalanced(support.length, oppose.length)) return null;

  return { measure, support, oppose };
}

export function getMeasureBrief(measureId: string) {
  return unstable_cache(
    () => fetchMeasureBrief(measureId),
    ["measure-brief", measureId],
    { revalidate: 3600, tags: ["measures", `measure:${measureId}`] }
  )();
}

async function fetchActiveMeasures(): Promise<BallotMeasure[]> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    /* Unconfigured environment. Since TASK-067 this read is on the landing
       page, which is prerendered — an unset NEXT_PUBLIC_SUPABASE_URL would
       otherwise fail the build outright rather than render no measures. */
    return [];
  }
  const { data } = await supabase
    .from("ballot_measure")
    .select("*")
    .eq("election", ACTIVE_ELECTION)
    .order("display_order");
  return (data ?? []) as BallotMeasure[];
}

/* Every published measure for the active election. Statewide measures are on
   every Florida voter's ballot, so this needs no ZIP — which is what lets
   Phase 7 render them with no input at all. */
export function getActiveMeasures() {
  return unstable_cache(fetchActiveMeasures, ["active-measures", ACTIVE_ELECTION], {
    revalidate: 3600,
    tags: ["measures"],
  })();
}
