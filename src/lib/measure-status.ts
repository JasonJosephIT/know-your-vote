/* Which publication tier made a ballot measure visible (0033's `listed`
   tier), read off a PostgREST embed of `measure_publication(status)`.

   Two things make this worth a module of its own rather than an inline
   ternary in measures.ts:

   1. The embed's shape is not fixed. measure_publication's primary key is
      also its foreign key to ballot_measure, so PostgREST usually detects a
      one-to-one and hands back an object — but a to-one embed can still
      arrive as a one-element array (the same normalization briefs.ts does
      for fetchCandidateNews), or as null when the row is not visible.
   2. The mapping has to fail closed. RLS only ever shows anon a `listed` or
      `published` row, but this read layer re-checks the rule rather than
      trusting it — the same belt and braces measures.ts applies to the
      symmetry rule. Anything that is not exactly one of those two values
      (draft, in_review, a future status nobody taught the UI about, a
      missing row) means "do not render this measure".

   Pure and dependency-free (the one import is type-only, so it is erased at
   runtime) — scripts/verify-measure-balance.ts drives it, same split as
   measure-balance.ts. */

import type { PublicationStatus } from "@/types/app";

/** The two tiers a voter can see. `listed` shows the verbatim ballot text
    only; `published` adds the sourced case for and against. */
export type MeasureVisibleStatus = Extract<
  PublicationStatus,
  "listed" | "published"
>;

type StatusEmbed = { status?: unknown } | null | undefined;

export function measureVisibleStatus(
  embed: StatusEmbed | StatusEmbed[]
): MeasureVisibleStatus | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  const status = row?.status;
  return status === "listed" || status === "published" ? status : null;
}
