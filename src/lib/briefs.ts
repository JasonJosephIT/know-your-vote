import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import type {
  Candidate,
  CandidateSocialAccount,
  Claim,
  Issue,
  Position,
  ProfileAudit,
  Race,
  Source,
} from "@/types/schema";

/* Published-only read layer (FR-004/FR-005).

   Three guarantees, layered:
   1. RLS already hides every row tied to a race that is not published —
      unpublished races are unreachable at the database, not just here.
   2. This module re-checks that every candidate Profile in the race passed
      the Balance Audit (balance_check_passed) and refuses the whole race
      otherwise — belt and braces over the publication gate.
   3. Claims are fetched through an inner join on claim_source, so a claim
      with zero sources can never render ("no source -> dropped"). */

export interface SourcedClaim {
  claim: Claim;
  sources: Source[];
}

export interface IssueBlock {
  issue: Issue;
  coverage: "stated" | "no_stated_position_found";
  stanceSummary: string;
  say: SourcedClaim[];
  done: SourcedClaim[];
  factCheck: SourcedClaim[];
}

export interface CandidateBriefData {
  candidate: Candidate;
  socials: CandidateSocialAccount[];
  audit: ProfileAudit;
  issues: IssueBlock[];
}

export interface RaceBrief {
  race: Race;
  spineIssues: Issue[];
  candidates: CandidateBriefData[];
}

type ClaimRow = Claim & { claim_source: Array<{ source: Source }> };

/* Fixed neutral order rule, identical for every race: the pipeline's
   candidate_ids array is ballot order; when absent, alphabetical by
   legal name (FR-003). */
export function orderCandidates<T extends { candidate_id: string; legal_name: string }>(
  candidates: T[],
  ballotOrder: string[]
): T[] {
  if (ballotOrder.length > 0) {
    const rank = new Map(ballotOrder.map((id, i) => [id, i]));
    return [...candidates].sort(
      (a, b) =>
        (rank.get(a.candidate_id) ?? 999) - (rank.get(b.candidate_id) ?? 999)
    );
  }
  return [...candidates].sort((a, b) => a.legal_name.localeCompare(b.legal_name));
}

function toSourced(rows: ClaimRow[]): SourcedClaim[] {
  return rows.map((row) => {
    const { claim_source, ...claim } = row;
    return {
      claim: claim as Claim,
      sources: claim_source.map((cs) => cs.source),
    };
  });
}

function buildIssueBlock(
  issue: Issue,
  position: Position | undefined,
  claims: ClaimRow[]
): IssueBlock {
  const forIssue = claims.filter((c) => c.issue_id === issue.issue_id);
  return {
    issue,
    coverage: position?.coverage ?? "no_stated_position_found",
    stanceSummary: position?.stance_summary ?? "",
    say: toSourced(forIssue.filter((c) => c.bucket === "stated_position")),
    /* Done = the record (Record agent, not candidate-attributed);
       Fact-Check = adjudicated candidate claims (attributed, with verdict). */
    done: toSourced(
      forIssue.filter((c) => c.bucket === "verifiable_fact" && !c.attributed)
    ),
    factCheck: toSourced(
      forIssue.filter((c) => c.bucket === "verifiable_fact" && c.attributed)
    ),
  };
}

async function fetchRaceBrief(raceId: string): Promise<RaceBrief | null> {
  const supabase = await createAnonServerClient();

  const { data: race } = await supabase
    .from("race")
    .select("*")
    .eq("race_id", raceId)
    .eq("election", ACTIVE_ELECTION_KIND)
    .maybeSingle<Race>();
  if (!race) return null;

  const [profilesRes, issuesRes, positionsRes, claimsRes] = await Promise.all([
    supabase.from("profile").select("*").eq("race_id", raceId),
    supabase
      .from("issue")
      .select("*")
      .eq("race_id", raceId)
      .order("display_order"),
    supabase.from("position").select("*").eq("race_id", raceId),
    supabase
      .from("claim")
      .select("*, claim_source!inner(source(*))")
      .eq("race_id", raceId),
  ]);

  const profiles = profilesRes.data ?? [];
  if (profiles.length === 0) return null;
  /* FR-005: all profiles must pass the Balance Audit, not just be present. */
  if (!profiles.every((p) => (p.audit as ProfileAudit)?.balance_check_passed === true)) {
    return null;
  }

  const candidateIds = profiles.map((p) => p.candidate_id);
  const [candidatesRes, socialsRes] = await Promise.all([
    supabase.from("candidate").select("*").in("candidate_id", candidateIds),
    supabase
      .from("candidate_social_account")
      .select("*")
      .in("candidate_id", candidateIds)
      .eq("status", "verified"),
  ]);

  const candidates = orderCandidates(
    (candidatesRes.data ?? []) as Candidate[],
    race.candidate_ids ?? []
  );
  const issues = (issuesRes.data ?? []) as Issue[];
  const positions = (positionsRes.data ?? []) as Position[];
  const claims = (claimsRes.data ?? []) as ClaimRow[];
  const socials = (socialsRes.data ?? []) as CandidateSocialAccount[];

  const spineIssues = issues.filter((i) => i.tier === "spine");

  const briefFor = (candidate: Candidate): CandidateBriefData => {
    const own = claims.filter((c) => c.candidate_id === candidate.candidate_id);
    const ownPositions = positions.filter(
      (p) => p.candidate_id === candidate.candidate_id
    );
    const extras = issues.filter(
      (i) => i.tier === "candidate" && i.candidate_id === candidate.candidate_id
    );
    const audit =
      (profiles.find((p) => p.candidate_id === candidate.candidate_id)
        ?.audit as ProfileAudit) ?? {};
    return {
      candidate,
      socials: socials.filter((s) => s.candidate_id === candidate.candidate_id),
      audit,
      issues: [...spineIssues, ...extras].map((issue) =>
        buildIssueBlock(
          issue,
          ownPositions.find((p) => p.issue_id === issue.issue_id),
          own
        )
      ),
    };
  };

  return {
    race,
    spineIssues,
    candidates: candidates.map(briefFor),
  };
}

/* Race/brief pages change at most daily; cache with tags so the news cron
   and publication changes can revalidate on demand (TASK-024). */
export function getRaceBrief(raceId: string) {
  return unstable_cache(
    () => fetchRaceBrief(raceId),
    ["race-brief", raceId],
    { revalidate: 3600, tags: ["races", `race:${raceId}`] }
  )();
}

export interface CandidateDetail {
  candidate: Candidate;
  socials: CandidateSocialAccount[];
  raceId: string;
  office: string;
  brief: CandidateBriefData | null;
}

async function fetchCandidateDetail(candidateId: string): Promise<CandidateDetail | null> {
  const supabase = await createAnonServerClient();
  const { data: candidate } = await supabase
    .from("candidate")
    .select("*")
    .eq("candidate_id", candidateId)
    .maybeSingle<Candidate>();
  if (!candidate) return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("race_id")
    .eq("candidate_id", candidateId)
    .limit(1)
    .maybeSingle<{ race_id: string }>();
  if (!profile) return null;

  const raceBrief = await fetchRaceBrief(profile.race_id);
  if (!raceBrief) return null;
  const brief =
    raceBrief.candidates.find((c) => c.candidate.candidate_id === candidateId) ??
    null;

  return {
    candidate,
    socials: brief?.socials ?? [],
    raceId: raceBrief.race.race_id,
    office: raceBrief.race.office,
    brief,
  };
}

export function getCandidateDetail(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateDetail(candidateId),
    ["candidate-detail", candidateId],
    { revalidate: 3600, tags: ["races", `candidate:${candidateId}`] }
  )();
}

/* Summaries for saved-candidates lookups (Phase 2). */
export async function getCandidateSummaries(candidateIds: string[]) {
  if (candidateIds.length === 0) return [];
  const supabase = await createAnonServerClient();
  const { data } = await supabase
    .from("candidate")
    .select("candidate_id, legal_name, party, office_sought, official_site")
    .in("candidate_id", candidateIds);
  return data ?? [];
}
