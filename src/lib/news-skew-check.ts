/* The per-race result of the source check — news-fairness.md §2 ("Before
   calling a skew real: the source check").

   The surplus expander (founder decision C, 2026-10-09) is offered ONLY for a
   race whose coverage skew has been checked against an outside index and
   labelled `real_world_skew`. While a race is a `pipeline_gap` or `unclear`,
   our counts are a fact about our feeds, not about the press, and showing
   "Show all 14 stories" next to a candidate with 0 would present our miss as
   the world's imbalance.

   WHY A FILE AND NOT A COLUMN. The source check is a written, human procedure
   whose evidence lives in a dated report (docs/general-election/
   source-check-*.md). Recording its verdict here puts every flip through a
   reviewed PR that can cite that report, at zero schema cost. If the label
   ever needs to change without a deploy (an admin-console toggle), the
   equivalent column is `race.news_skew_check text CHECK (... IN
   ('pipeline_gap','real_world_skew','unclear'))`, NULL = not checked — not
   added, pending founder approval.

   ABSENT MEANS NOT CHECKED, which means no expander. That is the fail-closed
   default: a race nobody has checked never shows its counts as the world's.

   STATE ON 2026-10-09 (source-check-2026-10-09.md): no race qualifies.
     - FL-SEN-general: Moody is a pipeline gap (registered WUSF and NBC Miami
       stories never reached review_item).
     - FL-GOV-general: every minor candidate reads as real-world skew, but the
       baselines carry a time-window pipeline gap (ingest began 2026-09-30
       against a 30-day window), so the race as a whole is `unclear` until
       the window is backfilled or re-checked.
   Both are recorded so the next reader sees they were checked, and why they
   stay closed. */

export type SkewCheckLabel = "pipeline_gap" | "real_world_skew" | "unclear";

export interface SkewCheck {
  label: SkewCheckLabel;
  /** ISO date the check was run. */
  checkedOn: string;
  /** Repo path of the report holding the queries and outside-search counts. */
  report: string;
}

export const NEWS_SKEW_CHECKS: Readonly<Record<string, SkewCheck>> = {
  "FL-SEN-general": {
    label: "pipeline_gap",
    checkedOn: "2026-10-09",
    report: "docs/general-election/source-check-2026-10-09.md",
  },
  "FL-GOV-general": {
    label: "unclear",
    checkedOn: "2026-10-09",
    report: "docs/general-election/source-check-2026-10-09.md",
  },
};

/** True only when the race's skew was checked and found real. */
export function skewPassedSourceCheck(
  raceId: string,
  checks: Readonly<Record<string, SkewCheck>> = NEWS_SKEW_CHECKS,
): boolean {
  return Object.hasOwn(checks, raceId) && checks[raceId].label === "real_world_skew";
}
