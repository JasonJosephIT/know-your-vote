/* The measure page's two pure rules, in one dependency-free module so
   scripts/verify-measure-balance.ts can run them under Node's native type
   stripping (importing from measures.ts would drag in next/cache).

   Spec: docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md

   1. THE LADDER. A resource's credibility tier is a function of what KIND of
      thing it is — never a per-item judgment, never its format, never the
      outlet's lean. This table is the only place the ladder is written down;
      the database CHECK (0034) fixes the five values, and this fixes their
      order.
   2. THE SYMMETRY RULE. Mirrors measure_sides_balanced() in 0034. The two
      must agree: the database refuses to publish a measure that fails it,
      and the read layer refuses to render one. */

import type { MeasureKind } from "@/types/app";

export const RESOURCE_TIER: Record<MeasureKind, 1 | 2 | 3 | 4 | 5> = {
  official: 1, // government primary documents about this measure
  analysis: 2, // research with a method: studies, institutes, fiscal analyses
  reporting: 3, // a newsroom's explainer or coverage
  argument: 4, // a named person or group making the case
  commentary: 5, // unaffiliated takes: a YouTuber, a podcaster, a blog
};

/* The small headings inside a YES/NO column. `official` and `reporting`
   never appear in a column (they are neutral by CHECK), but the record is
   total so a future column cannot render an unlabelled group. */
export const TIER_LABEL: Record<MeasureKind, string> = {
  official: "Official documents",
  analysis: "Research",
  reporting: "Reporting",
  argument: "Positions",
  commentary: "Commentary",
};

/* Rows visible per column before the native <details> disclosure (spec §4,
   founder call F6). Equal room is the point: the same number for both sides. */
export const COLUMN_CAP = 8;

export interface Rankable {
  kind: MeasureKind;
  published_at: string | null;
  display_order: number;
}

/* Tier ascending, then newest first, undated last, then display_order.
   display_order is the editor's tie-break inside a tier — it cannot lift a
   row above its tier. */
export function compareResources(a: Rankable, b: Rankable): number {
  const tier = RESOURCE_TIER[a.kind] - RESOURCE_TIER[b.kind];
  if (tier !== 0) return tier;
  if (a.published_at !== b.published_at) {
    if (a.published_at === null) return 1;
    if (b.published_at === null) return -1;
    return a.published_at < b.published_at ? 1 : -1;
  }
  return a.display_order - b.display_order;
}

/* Returns a new array in ladder order. */
export function rankResources<T extends Rankable>(rows: readonly T[]): T[] {
  return [...rows].sort(compareResources);
}

/* Both sides present, and the larger no more than twice the smaller. Neutral
   resources are not a side and are not counted (spec §4, founder call F2). */
export function sidesBalanced(
  supportCount: number,
  opposeCount: number
): boolean {
  if (supportCount <= 0 || opposeCount <= 0) return false;
  return (
    Math.max(supportCount, opposeCount) <=
    2 * Math.min(supportCount, opposeCount)
  );
}
