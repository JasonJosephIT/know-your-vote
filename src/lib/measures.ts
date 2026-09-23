import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION } from "@/lib/election";
/* The ladder and the symmetry rule, in their own module so the verify script
   can run them without next/cache. */
import { compareResources, sidesBalanced } from "@/lib/measure-ladder";
import {
  measureVisibleStatus,
  type MeasureVisibleStatus,
} from "@/lib/measure-status";
import type { Source } from "@/types/schema";
import type {
  BallotMeasure,
  MeasureResource,
  MeasureStance,
} from "@/types/app";

/* Read layer for ballot measures, mirroring briefs.ts. Two tiers since 0033
   (docs/general-election/listed-tier-2026-09-23.md): a `listed` measure
   exposes the measure row itself — the verbatim ballot text — and a
   `published` one adds the two-sided resource list (0034). Resources stay
   gated on `published` in RLS, so the rules below still describe every
   resource this module can ever return:

   1. RLS already hides every row tied to an unpublished measure, so the gate
      is at the database, not here.
   2. This module re-checks the symmetry rule anyway — belt and braces over
      the publication trigger, exactly as briefs.ts re-checks
      balance_check_passed over the publication gate.
   3. Resources carry a NOT NULL source_id, so "no source -> dropped" is a
      schema guarantee. The join is still inner: a dangling source reference
      drops the resource rather than rendering one with nothing behind it.
   4. Order is the ladder (measure-ladder.ts), applied here so every caller
      gets rows already in credible-first order and none re-sorts.

   Note the election vocabulary here is the cycle key ('general_2026'), not
   the race enum — see src/lib/election.ts for why those are separate. */

export { sidesBalanced };
export type { MeasureVisibleStatus };

export interface MeasureResourceWithSource {
  resource: MeasureResource;
  source: Source;
}

export interface MeasureBrief {
  measure: BallotMeasure;
  /* Shared context: official documents, research, reporting. Tier-ordered. */
  neutral: MeasureResourceWithSource[];
  /* The case for a YES. Tier-ordered. */
  support: MeasureResourceWithSource[];
  /* The case for a NO. Tier-ordered. */
  oppose: MeasureResourceWithSource[];
}

type ResourceRow = MeasureResource & { source: Source | null };

function toSourced(
  rows: ResourceRow[],
  stance: MeasureStance
): MeasureResourceWithSource[] {
  return rows
    .filter((row) => row.stance === stance && row.source !== null)
    .map((row) => {
      const { source, ...resource } = row;
      return {
        resource: resource as MeasureResource,
        source: source as Source,
      };
    })
    .sort((a, b) => compareResources(a.resource, b.resource));
}

async function fetchMeasureBrief(
  measureId: string
): Promise<MeasureBrief | null> {
  const supabase = await createAnonServerClient();

  const { data: measure } = await supabase
    .from("ballot_measure")
    .select("*")
    .eq("measure_id", measureId)
    .eq("election", ACTIVE_ELECTION)
    .maybeSingle<BallotMeasure>();
  if (!measure) return null;

  const { data: rows } = await supabase
    .from("measure_resource")
    .select("*, source!inner(*)")
    .eq("measure_id", measureId);

  const all = (rows ?? []) as ResourceRow[];
  const support = toSourced(all, "support");
  const oppose = toSourced(all, "oppose");
  const neutral = toSourced(all, "neutral");

  if (!sidesBalanced(support.length, oppose.length)) return null;

  return { measure, neutral, support, oppose };
}

export function getMeasureBrief(measureId: string) {
  return unstable_cache(
    () => fetchMeasureBrief(measureId),
    ["measure-brief", measureId],
    { revalidate: 3600, tags: ["measures", `measure:${measureId}`] }
  )();
}

/* Listing mode for one measure: the measure row and which tier made it
   visible, plus the brief when (and only when) the measure is published and
   its sides are balanced.

   `brief` is null in two different cases, and the page treats them alike on
   purpose: a `listed` measure (no resources are readable at all — RLS gates
   measure_resource on `published`), and a `published` one that fails the
   symmetry re-check. Either way the voter sees the ballot text and a plain
   statement that resources are being collected, never a one-sided list.

   The brief is only fetched for `published`: under RLS a listed measure's
   resources are unreadable anyway, but asking only when the tier allows it
   keeps the rule visible here instead of implied by a policy elsewhere. */
export interface MeasureListing {
  measure: BallotMeasure;
  status: MeasureVisibleStatus;
  brief: MeasureBrief | null;
}

type MeasureWithPublication = BallotMeasure & {
  measure_publication: { status: string } | { status: string }[] | null;
};

/* Splits the embed off so callers get a plain BallotMeasure — the shape every
   existing consumer was written against — and the status beside it. */
function splitPublication(row: MeasureWithPublication): {
  measure: BallotMeasure;
  status: MeasureVisibleStatus | null;
} {
  const { measure_publication, ...measure } = row;
  return { measure, status: measureVisibleStatus(measure_publication) };
}

async function fetchMeasureListing(
  measureId: string
): Promise<MeasureListing | null> {
  const supabase = await createAnonServerClient();

  const { data } = await supabase
    .from("ballot_measure")
    .select("*, measure_publication(status)")
    .eq("measure_id", measureId)
    .eq("election", ACTIVE_ELECTION)
    .maybeSingle<MeasureWithPublication>();
  if (!data) return null;

  const { measure, status } = splitPublication(data);
  if (!status) return null;

  const brief =
    status === "published" ? await fetchMeasureBrief(measureId) : null;
  return { measure, status, brief };
}

export function getMeasureListing(measureId: string) {
  return unstable_cache(
    () => fetchMeasureListing(measureId),
    ["measure-listing", measureId],
    { revalidate: 3600, tags: ["measures", `measure:${measureId}`] }
  )();
}

/* A measure as the ballot-questions list needs it: every BallotMeasure field,
   untouched, plus the tier. An intersection rather than a new shape so every
   caller written against BallotMeasure[] still type-checks. */
export type ActiveMeasure = BallotMeasure & { status: MeasureVisibleStatus };

async function fetchActiveMeasures(): Promise<ActiveMeasure[]> {
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
    .select("*, measure_publication(status)")
    .eq("election", ACTIVE_ELECTION)
    .order("display_order");
  /* RLS already hides every measure without a listed or published row; a
     row whose status still fails the re-check is dropped, not shown. */
  return ((data ?? []) as MeasureWithPublication[]).flatMap((row) => {
    const { measure, status } = splitPublication(row);
    return status ? [{ ...measure, status }] : [];
  });
}

/* Every visible measure for the active election — listed or published.
   Statewide measures are on every Florida voter's ballot, so this needs no
   ZIP — which is what lets Phase 7 render them with no input at all. */
export function getActiveMeasures() {
  return unstable_cache(
    fetchActiveMeasures,
    ["active-measures", ACTIVE_ELECTION],
    {
      revalidate: 3600,
      tags: ["measures"],
    }
  )();
}
