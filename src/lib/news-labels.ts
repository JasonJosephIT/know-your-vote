/* Presentation rules for a news item's source label (news-fairness.md §1).

   Pure and dependency-free so the neutrality rules below are testable without
   a DB or a browser: scripts/verify-news-labels.ts drives this file.

   Two rules are load-bearing and easy to break by accident:

   1. Lean is DISCLOSED, never judged. The label is plain text in the same
      muted style as every other chip. Never colour-code it — the README's
      "party chips are never colour-coded" rule exists so the UI cannot imply
      a verdict, and a red/blue lean chip would do exactly that.
   2. 'N/A' is not a lean. It is the schema's value for "lean does not apply"
      (a government primary document has no editorial lean). Printing "N/A"
      would read as a missing value; we print nothing. */

/** `source.type` — CHECK-constrained in migration 0000. */
export type SourceType =
  | "factual_reporting"
  | "opinion"
  | "primary_doc"
  | "candidate_self";

/** `source.lean_tag` — CHECK-constrained in migration 0000. */
export type LeanTag =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "N/A";

export interface NewsSource {
  publisher: string;
  type: SourceType;
  lean_tag: LeanTag;
}

export interface NewsLabels {
  /** What kind of thing this is. Null when there is no source to describe. */
  kind: string | null;
  /** Lean, or null when it does not apply. Never colour-coded. */
  lean: string | null;
  /** Drives the visually-distinct container (news-fairness.md §1). */
  isOpinion: boolean;
}

const KIND: Record<SourceType, string> = {
  factual_reporting: "Reporting",
  opinion: "Opinion",
  primary_doc: "Official document",
  candidate_self: "From the candidate",
};

const LEAN: Record<LeanTag, string | null> = {
  left: "Left",
  "center-left": "Center-left",
  center: "Center",
  "center-right": "Center-right",
  right: "Right",
  "N/A": null, // rule 2 — not a lean, so not printed
};

/** Labels for one item. A null/unknown source yields no labels rather than
    invented ones — an unattributed item must never look attributed. */
export function newsLabels(source: NewsSource | null | undefined): NewsLabels {
  if (!source) return { kind: null, lean: null, isOpinion: false };
  const kind = KIND[source.type] ?? null;
  const lean = LEAN[source.lean_tag] ?? null;
  return { kind, lean, isOpinion: source.type === "opinion" };
}
