/* The race page's issue-first layout (RaceCompare), pure so
   scripts/verify-race-rows.ts can check it with no database and no React.

   Every spine issue becomes one row with a cell for every candidate, in
   ballot order, whether or not the brief has a block for them: equal space
   is a property of the shape, not of the data. Candidate-tier issues (raised
   by one candidate only) can't sit in a shared row, so each candidate gets
   their own list of them, in the same place for everyone. */

import type { CandidateBriefData, IssueBlock, RaceBrief } from "@/lib/briefs";
import type { PolicyAreaRef } from "@/lib/policy-areas";
import { subIssueIdOf } from "./issue-pick.ts";

export interface RaceRowCell {
  candidate: CandidateBriefData["candidate"];
  /* null = the brief has no block for this candidate on this issue: a data
     gap, not the recorded "we searched and found nothing", so the cell says
     nothing rather than making that claim (same rule as IssueCell). */
  block: IssueBlock | null;
}

export interface RaceRow {
  issueId: string;
  subIssueId: string;
  title: string;
  /* Spine issues are race-wide, so their policy areas are the same for every
     candidate; shown once per row instead of once per cell. */
  policyAreas: PolicyAreaRef[];
  cells: RaceRowCell[];
}

export interface CandidateExtras {
  candidate: CandidateBriefData["candidate"];
  blocks: IssueBlock[];
}

export function raceRows(brief: RaceBrief): RaceRow[] {
  return brief.spineIssues
    .filter((issue) => issue.tier === "spine")
    .map((issue) => {
      const cells = brief.candidates.map((c) => ({
        candidate: c.candidate,
        block: c.issues.find((b) => b.issue.issue_id === issue.issue_id) ?? null,
      }));
      return {
        issueId: issue.issue_id,
        subIssueId: subIssueIdOf(issue),
        title: issue.title,
        policyAreas: cells.find((c) => c.block)?.block?.policyAreas ?? [],
        cells,
      };
    });
}

/* Every candidate, in ballot order, with the issues only they raised. A
   candidate with none still gets an entry, so the section's shape doesn't
   depend on who wrote more. */
export function candidateExtras(brief: RaceBrief): CandidateExtras[] {
  const spine = new Set(
    brief.spineIssues.filter((i) => i.tier === "spine").map((i) => i.issue_id)
  );
  return brief.candidates.map((c) => ({
    candidate: c.candidate,
    blocks: c.issues.filter((b) => !spine.has(b.issue.issue_id)),
  }));
}
