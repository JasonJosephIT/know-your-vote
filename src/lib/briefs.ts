import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import type { NewsSource } from "@/lib/news-labels";
import type { CandidateContact, NewsItem } from "@/types/app";
import type {
  Candidate,
  CandidateSocialAccount,
  Claim,
  Issue,
  Position,
  Profile,
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
export function orderCandidates<
  T extends { candidate_id: string; legal_name: string },
>(candidates: T[], ballotOrder: string[]): T[] {
  if (ballotOrder.length > 0) {
    const rank = new Map(ballotOrder.map((id, i) => [id, i]));
    return [...candidates].sort(
      (a, b) =>
        (rank.get(a.candidate_id) ?? 999) - (rank.get(b.candidate_id) ?? 999)
    );
  }
  return [...candidates].sort((a, b) =>
    a.legal_name.localeCompare(b.legal_name)
  );
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
    /* The embed carries the candidate's ballot tier so the filter below can
       run before the audit check (A3's handoff). */
    supabase
      .from("profile")
      .select("*, candidate(ballot_status)")
      .eq("race_id", raceId),
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

  /* Only printed ballot lines are briefed (data-architecture.md D1). This is
     the third and last layer of the same rule: B2 keeps non-ballot filers out
     of race.candidate_ids, A3 keeps them out of the Balance Audit, and this
     keeps them out of the read.

     Without it the audit fix is undone here: A3 deliberately does NOT write
     balance_check_passed onto an excluded candidate (they passed no audit),
     so a stale profile for one would fail the .every() below and make the
     whole race permanently unpublishable — the same symptom, reached by a
     different path.

     PostgREST returns a to-one embed as an object, but some relationship
     shapes return a one-element array; normalize both rather than trusting
     one. A profile with no candidate row resolves to null and is dropped —
     fail closed. */
  const allProfiles = (profilesRes.data ?? []) as Array<
    Profile & { candidate?: { ballot_status?: string } | Array<{ ballot_status?: string }> | null }
  >;
  const profiles = allProfiles.filter((p) => {
    const embed = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
    return embed?.ballot_status === "ballot";
  });
  if (profiles.length === 0) return null;
  /* FR-005: all profiles must pass the Balance Audit, not just be present. */
  if (
    !profiles.every(
      (p) => (p.audit as ProfileAudit)?.balance_check_passed === true
    )
  ) {
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
  return unstable_cache(() => fetchRaceBrief(raceId), ["race-brief", raceId], {
    revalidate: 3600,
    tags: ["races", `race:${raceId}`],
  })();
}

export interface CandidateDetail {
  candidate: Candidate;
  socials: CandidateSocialAccount[];
  raceId: string;
  office: string;
  brief: CandidateBriefData | null;
}

async function fetchCandidateDetail(
  candidateId: string
): Promise<CandidateDetail | null> {
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
    raceBrief.candidates.find(
      (c) => c.candidate.candidate_id === candidateId
    ) ?? null;

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

/* A candidate_news row with the source it is attributed to. The embed carries
   the two fairness axes (news-fairness.md §0): `type` drives Reporting /
   Opinion, `lean_tag` drives the lean spread in src/lib/news-slots.ts. */
export type CandidateNewsItem = NewsItem & { source: NewsSource | null };

/* Candidate-scoped feed items written by the R1 curator (CAP_Refresh_Agents
   _Plan §6). The page this renders on is already publication-gated by
   getCandidateDetail, and R1 only covers published races; the item_type
   filter keeps pipeline/official rows (race-scoped, not candidate-scoped)
   out by construction.

   Deliberately UNLIMITED. This used to take the 10 newest rows; the 10 newest
   can all share one lean, which would hand the selector a pool it cannot
   spread and quietly defeat news-fairness.md §2. selectNewsSlots is the only
   cap, and the 30-day window plus one candidate keeps the row count small.

   Ordering — `named` before `related`, then lean spread — lives in
   news-slots.ts and nowhere else. The published_at sort here only feeds that
   rule's recency tiebreak. */
async function fetchCandidateNews(
  candidateId: string,
): Promise<CandidateNewsItem[]> {
  const supabase = await createAnonServerClient();
  const { data } = await supabase
    .from("news_item")
    .select("*, source(publisher, type, lean_tag)")
    .eq("candidate_id", candidateId)
    .eq("item_type", "candidate_news")
    .order("published_at", { ascending: false });
  /* PostgREST returns a to-one embed as an object, but some relationship
     shapes return a one-element array. Normalize both rather than trusting
     one — the same guard /api/news/route.ts uses. */
  type Row = NewsItem & { source: NewsSource | NewsSource[] | null };
  return ((data ?? []) as unknown as Row[]).map((row) => {
    const raw = row.source;
    return {
      ...row,
      source: Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null),
    };
  });
}

export function getCandidateNews(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateNews(candidateId),
    ["candidate-news", candidateId],
    { revalidate: 3600, tags: ["races", `candidate:${candidateId}`] }
  )();
}

/* Contact & logistics row kept fresh by the R2 refresher (weekly upsert
   with last_verified_at). Missing row is the normal state until R2 has
   covered the candidate. */
async function fetchCandidateContact(
  candidateId: string
): Promise<CandidateContact | null> {
  const supabase = await createAnonServerClient();
  const { data } = await supabase
    .from("candidate_contact")
    .select("*")
    .eq("candidate_id", candidateId)
    .maybeSingle<CandidateContact>();
  return data ?? null;
}

export function getCandidateContact(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateContact(candidateId),
    ["candidate-contact", candidateId],
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
