/* The race page's issue filter (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md).

   Pure, so scripts/verify-issue-pick.ts can drive it with no database and no
   React. The URL is the only state: `?pick=` ids are canonicalised here to
   spine order, and unknown ids are dropped, so two links with the same picks
   render the same page.

   issueRowsFor is where the no-authored-text rule is enforced: IssueCell has
   no field for stanceSummary, done or factCheck, so the view built on it
   cannot show what the site wrote about a candidate. Only what each
   candidate said, with its sources, crosses this boundary. */

import type { Issue } from "@/types/schema";
import type { IssueBlock, RaceBrief, SourcedClaim } from "@/lib/briefs";

export interface SpineOption {
  id: string;
  title: string;
}

export interface IssueCell {
  candidateId: string;
  name: string;
  /* null = the brief has no block for this candidate on this issue. That is
     a data gap, not the recorded "we searched and found nothing", so the
     view says nothing rather than making that claim. */
  coverage: IssueBlock["coverage"] | null;
  say: SourcedClaim[];
}

export interface IssueRow {
  subIssueId: string;
  title: string;
  cells: IssueCell[];
}

/* issue_id is `${race_id}--issue-${subIssueId}` (src/lib/brief-rows.ts). */
export function subIssueIdOf(issue: Pick<Issue, "issue_id" | "race_id">): string {
  const prefix = `${issue.race_id}--issue-`;
  return issue.issue_id.startsWith(prefix)
    ? issue.issue_id.slice(prefix.length)
    : issue.issue_id;
}

/* Spine issues only: every candidate in the race is measured on them, so a
   side-by-side row is meaningful. A candidate-tier extra would be empty for
   everyone else. */
export function spineOptions(spineIssues: Issue[]): SpineOption[] {
  return spineIssues
    .filter((i) => i.tier === "spine")
    .map((i) => ({ id: subIssueIdOf(i), title: i.title }));
}

export function parseIssuePick(
  raw: string | string[] | undefined,
  available: string[]
): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const wanted = new Set(
    joined
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return available.filter((id) => wanted.has(id));
}

export function pickHref(raceId: string, ids: string[]): string {
  const base = `/races/${encodeURIComponent(raceId)}`;
  if (ids.length === 0) return base;
  return `${base}/issues?pick=${ids.map(encodeURIComponent).join(",")}`;
}

export function togglePickHref(
  raceId: string,
  current: string[],
  id: string,
  available: string[]
): string {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return pickHref(
    raceId,
    available.filter((a) => next.has(a))
  );
}

export function issueRowsFor(brief: RaceBrief, selected: string[]): IssueRow[] {
  const want = new Set(selected);
  return brief.spineIssues
    .filter((issue) => issue.tier === "spine" && want.has(subIssueIdOf(issue)))
    .map((issue) => ({
      subIssueId: subIssueIdOf(issue),
      title: issue.title,
      cells: brief.candidates.map((c) => {
        const found = c.issues.find((b) => b.issue.issue_id === issue.issue_id);
        return {
          candidateId: c.candidate.candidate_id,
          name: c.candidate.legal_name,
          coverage: found ? found.coverage : null,
          say: found && found.coverage === "stated" ? found.say : [],
        };
      }),
    }));
}
