/* The writer: one policy run per candidate in, the rows a brief is made of
   out. Pure — no DB, no network, no clock (the caller passes `retrievedAt`),
   so scripts/verify-brief-rows.ts can prove the whole contract offline before
   a single row reaches the live project.

   WHY THIS FILE EXISTS. Everything upstream of it was built and everything
   downstream of it was built, and the middle was missing: the site ingest
   produces passages, the Noul pass scores them, `set_race_publication` (0018)
   publishes a race — and nothing anywhere turned a scored passage into an
   `issue` / `position` / `claim` / `claim_source` / `profile` row. The roster
   has been complete and unpublishable for exactly that reason.

   FOUR RULES IT DOES NOT BEND.

   1. NO SOURCE, NO CLAIM. Every claim is emitted with the `claim_source` row
      that carries it. src/lib/briefs.ts inner-joins `claim_source`, so a claim
      without one is invisible anyway — emitting them as a pair means the
      invisible case cannot be constructed here.

   2. IT CANNOT MANUFACTURE A FACT. A Noul scores how well a passage matches
      an issue. That is evidence of a STATED POSITION and nothing else, from a
      single campaign-controlled page, so every claim leaves here as
      `stated_position` / `single_source` with a NULL verdict. `verifiable_fact`
      belongs to the Record agent and `verdict` to the Fact-Checker; this file
      writing either would be inventing adjudication that never happened.

   3. SILENCE IS RENDERED AS SILENCE. Every candidate gets a `position` row on
      every spine issue. One with nothing behind it is written as
      `no_stated_position_found`, not omitted — CAP_Schema_v1 §6.3's sourced
      absence. A missing row and a searched-and-found-nothing row look
      identical to a reader, and only one of them is true.

   4. THE SPINE IS AN INPUT. This file never invents what makes two candidates
      comparable. It is handed the spine and writes against it, because which
      questions a race is judged on is an editorial decision with a name
      attached, not a by-product of whichever campaign wrote the most web copy.

   WHAT IT DELIBERATELY DOES NOT WRITE: `audit.balance_check_passed`. The
   Balance Audit (T10, `balance_audit_core.py`) owns that field and merges it
   in over this row; it is also what the publication gate in briefs.ts reads.
   A writer that set it would be marking its own homework. See §"audit" below
   for the fields this file DOES owe that tool. */

import { canonicalizeUrl, isSameSite } from "./candidate-site.ts";
import { SUB_ISSUES } from "./news-issues.ts";
import type { PolicyRun, RunPassage } from "./policy-run.ts";

/** Bumped when a row's meaning changes, so a re-run against an older file is
    refused rather than silently mixed with rows built under other rules. */
export const BRIEF_ROWS_SCHEMA = "kyv.brief-rows/1";

/* ---- input ------------------------------------------------------------ */

/** One question the race is judged on, identical for every candidate in it.

    `id` is a taxonomy sub-issue id wherever one fits, so two races asking the
    same question carry the same id inside their (necessarily per-race) rows.
    `issue.race_id` is NOT NULL, so a "shared spine" can only ever mean the
    same ids repeated per race — that part is settled by the schema, and this
    keeps the repetition recognizable. */
export interface SpineIssue {
  id: string;
  title: string;
  description?: string | null;
}

export interface CandidateRun {
  candidateId: string;
  /** The candidate's `official_site`. Not decoration: every passage is checked
      against it, so a run attached to the wrong candidate is rejected rather
      than published under their name. */
  officialSite: string;
  run: PolicyRun;
}

export interface BriefRowsInput {
  raceId: string;
  spine: readonly SpineIssue[];
  candidates: readonly CandidateRun[];
  /** ISO8601. Passed in — this file never reads a clock. */
  retrievedAt: string;
}

/* ---- rows ------------------------------------------------------------- */

export interface SourceRow {
  source_id: string;
  url: string;
  url_norm: string;
  publisher: string;
  type: "candidate_self";
  lean_tag: "N/A";
  retrieved_at: string;
}

export interface IssueRow {
  issue_id: string;
  race_id: string;
  tier: "spine" | "candidate";
  candidate_id: string | null;
  title: string;
  description: string | null;
  source_id: string | null;
  display_order: number;
}

export interface ClaimRow {
  claim_id: string;
  candidate_id: string;
  race_id: string;
  issue_id: string;
  text: string;
  bucket: "stated_position";
  attributed: boolean;
  derived_from: null;
  verdict: null;
  verification: "single_source";
}

export interface ClaimSourceRow {
  claim_id: string;
  source_id: string;
}

export interface PositionRow {
  position_id: string;
  candidate_id: string;
  race_id: string;
  issue_id: string;
  stance_summary: string;
  claim_ids: string[];
  attributed: boolean;
  coverage: "stated" | "no_stated_position_found";
}

export interface ProfileAuditRow {
  word_count: number;
  verifiable_fact_count: number;
  stated_position_count: number;
  fact_checks_performed: number;
  spine_issue_count: number;
  spine_issues_covered: number;
}

export interface ProfileRow {
  candidate_id: string;
  race_id: string;
  facts: string[];
  positions: string[];
  opinions: string[];
  audit: ProfileAuditRow;
}

export interface BriefRows {
  sources: SourceRow[];
  issues: IssueRow[];
  claims: ClaimRow[];
  claimSources: ClaimSourceRow[];
  positions: PositionRow[];
  profiles: ProfileRow[];
}

/** A passage or a whole candidate that did not become rows, and why. Returned
    rather than logged: a run that silently dropped half a site looks exactly
    like a candidate who said little, and those are opposite findings. */
export interface Rejection {
  candidate_id: string;
  passage_id: string | null;
  reason:
    | "schema_mismatch"
    | "not_official_site"
    | "unparseable_url"
    | "no_verdict"
    | "states_no_policy"
    | "no_issue_matched";
}

export interface BriefRowsResult {
  schema: string;
  rows: BriefRows;
  rejected: Rejection[];
}

/* ---- helpers ---------------------------------------------------------- */

/* FNV-1a, the same short stable hash the passage ids use. An id here is a
   de-duplication key so a re-run overwrites its own rows instead of doubling
   them; it is not a security boundary. */
function fnv(input: string): string {
  let hash = 0x811c9dc5;
  for (const ch of input) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Lowercased host + path with the trailing slash stripped, query kept,
    scheme and fragment dropped.

    This MUST stay identical to `url_norm` in the Fact-Checker's
    allowlist_b_core.py, because `source.url_norm` is UNIQUE and the Python
    tool layer dedupes new sources against it. Two spellings of one
    normalization means one page becomes two source rows, and the "cited by
    two independent documents" rule then counts a page against itself. */
export function urlNorm(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/\.+$/, "").toLowerCase();
  if (!host) return null;
  const path = url.pathname.replace(/\/+$/, "");
  return host + path + (url.search ? url.search : "");
}

/** Words as a reader meets them. Feeds `audit.word_count`, which is a HARD
    GATE in the Balance Audit — so it counts what the page actually renders,
    including a quote that appears under two issues, and never a tidier
    number than the one a voter sees. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const subIssueLabel = (id: string): string | null =>
  SUB_ISSUES.find((s) => s.id === id)?.label ?? null;

/* ---- the writer ------------------------------------------------------- */

/** Turn one policy run per candidate into the rows a brief is made of.

    Never throws on bad input: a candidate whose run is unusable comes back in
    `rejected` with a profile row and a full set of `no_stated_position_found`
    positions, because a candidate who drops out of the output entirely takes
    the race's comparability with them. */
export function buildBriefRows(input: BriefRowsInput): BriefRowsResult {
  const { raceId, spine, candidates, retrievedAt } = input;

  const rejected: Rejection[] = [];
  const sources = new Map<string, SourceRow>();
  const issues: IssueRow[] = [];
  const claims: ClaimRow[] = [];
  const claimSources: ClaimSourceRow[] = [];
  const positions: PositionRow[] = [];
  const profiles: ProfileRow[] = [];

  /* Spine first, and in the order given: display_order IS that order, so two
     candidates' briefs never disagree about which question comes first. */
  const spineIssueId = (id: string) => `${raceId}--issue-${id}`;
  spine.forEach((s, i) => {
    issues.push({
      issue_id: spineIssueId(s.id),
      race_id: raceId,
      tier: "spine",
      candidate_id: null,
      title: s.title,
      description: s.description ?? null,
      source_id: null,
      /* 1-based, matching the demo seed's shape. */
      display_order: i + 1,
    });
  });
  const spineIds = new Set(spine.map((s) => s.id));

  for (const { candidateId, officialSite, run } of candidates) {
    /* A run built under other rules is not mixed in with these. */
    const usable = run.schema === "kyv.policy-run/1";
    if (!usable) {
      rejected.push({
        candidate_id: candidateId,
        passage_id: null,
        reason: "schema_mismatch",
      });
    }

    /* claim ids per spine issue id, and the extras this candidate raised. */
    const byIssue = new Map<string, string[]>();
    const attributedByIssue = new Map<string, boolean>();
    const extraIssues = new Map<string, number>();
    const ownClaims: ClaimRow[] = [];

    const passages: readonly RunPassage[] = usable ? run.passages : [];
    for (const passage of passages) {
      if (!passage.verdict) {
        rejected.push({
          candidate_id: candidateId,
          passage_id: passage.id,
          reason: "no_verdict",
        });
        continue;
      }
      if (!passage.verdict.states_policy) {
        rejected.push({
          candidate_id: candidateId,
          passage_id: passage.id,
          reason: "states_no_policy",
        });
        continue;
      }
      if (passage.verdict.issues.length === 0) {
        rejected.push({
          candidate_id: candidateId,
          passage_id: passage.id,
          reason: "no_issue_matched",
        });
        continue;
      }

      const canonical = canonicalizeUrl(passage.url);
      const norm = canonical ? urlNorm(canonical) : null;
      if (!canonical || !norm) {
        rejected.push({
          candidate_id: candidateId,
          passage_id: passage.id,
          reason: "unparseable_url",
        });
        continue;
      }

      /* The identity check. `--site` is supplied by a human and a run file is
         just a file, so nothing upstream stops one candidate's run being
         handed to another's id — at which point their opponent's words are
         published over their name. Cheap to check, unrecoverable to miss. */
      if (!isSameSite(canonical, officialSite)) {
        rejected.push({
          candidate_id: candidateId,
          passage_id: passage.id,
          reason: "not_official_site",
        });
        continue;
      }

      const sourceId = `src-${fnv(norm)}`;
      if (!sources.has(sourceId)) {
        sources.set(sourceId, {
          source_id: sourceId,
          url: canonical,
          url_norm: norm,
          publisher: new URL(canonical).hostname.toLowerCase(),
          type: "candidate_self",
          lean_tag: "N/A",
          retrieved_at: retrievedAt,
        });
      }

      /* A passage tagged with three issues becomes three claims, one per
         issue, because `claim.issue_id` is singular and a stated position
         dropped from two of the three issues it covers is a silence we would
         have invented. The cost is that the quote occupies real estate under
         each — which `word_count` then counts, correctly: that is what the
         page renders. */
      for (const issueId of passage.verdict.issues) {
        const targetIssue = spineIds.has(issueId)
          ? spineIssueId(issueId)
          : `${raceId}--issue-${issueId}--${candidateId}`;

        if (!spineIds.has(issueId) && !extraIssues.has(issueId)) {
          extraIssues.set(issueId, extraIssues.size);
        }

        const claimId = `claim-${candidateId}-${fnv(`${issueId}\u0000${passage.id}`)}`;
        ownClaims.push({
          claim_id: claimId,
          candidate_id: candidateId,
          race_id: raceId,
          issue_id: targetIssue,
          text: passage.text,
          bucket: "stated_position",
          /* Candidate-controlled, and checked rather than assumed: the
             passage came off the site recorded as theirs. */
          attributed: true,
          derived_from: null,
          verdict: null,
          verification: "single_source",
        });
        claimSources.push({ claim_id: claimId, source_id: sourceId });

        const list = byIssue.get(issueId) ?? [];
        list.push(claimId);
        byIssue.set(issueId, list);
        attributedByIssue.set(issueId, true);
      }
    }

    /* Candidate-tier issues: what this candidate ran on that the spine does
       not ask about. Ordered after every spine issue, never counted toward
       spine coverage — an extra issue is not an answer to a question the race
       is judged on. */
    for (const [issueId, order] of extraIssues) {
      issues.push({
        issue_id: `${raceId}--issue-${issueId}--${candidateId}`,
        race_id: raceId,
        tier: "candidate",
        candidate_id: candidateId,
        title: subIssueLabel(issueId) ?? issueId,
        description: null,
        source_id: null,
        display_order: 100 + order,
      });
    }

    /* Rule 3: a position on every spine issue, stated or explicitly not. */
    for (const s of spine) {
      const claimIds = byIssue.get(s.id) ?? [];
      positions.push({
        position_id: `pos-${candidateId}-${fnv(s.id)}`,
        candidate_id: candidateId,
        race_id: raceId,
        issue_id: spineIssueId(s.id),
        /* Left empty on purpose. A neutral synthesis of a stance is a
           sentence nobody said; writing one here would be this file's only
           ungrounded output. The sourced quotes carry the content. */
        stance_summary: "",
        claim_ids: claimIds,
        attributed: attributedByIssue.get(s.id) ?? false,
        coverage: claimIds.length > 0 ? "stated" : "no_stated_position_found",
      });
    }
    for (const [issueId] of extraIssues) {
      const claimIds = byIssue.get(issueId) ?? [];
      positions.push({
        position_id: `pos-${candidateId}-${fnv(issueId)}`,
        candidate_id: candidateId,
        race_id: raceId,
        issue_id: `${raceId}--issue-${issueId}--${candidateId}`,
        stance_summary: "",
        claim_ids: claimIds,
        attributed: attributedByIssue.get(issueId) ?? false,
        coverage: claimIds.length > 0 ? "stated" : "no_stated_position_found",
      });
    }

    claims.push(...ownClaims);

    /* The profile arrays are claim-id lists (CAP_Schema_v1 §7), and they are
       NOT decoration: balance_audit_core._extract reads
       `verifiable_fact_count` as len(facts) and `stated_position_count` as
       len(positions), deriving both from the arrays so the "opinions excluded"
       rule is enforced there rather than trusted from here. The counts below
       are written to agree with the arrays by construction — the demo seed
       shipped empty arrays beside an audit claiming six facts apiece, and an
       audit that disagrees with its own arrays is the one failure this layer
       cannot detect at read time. */
    const facts: string[] = [];
    const opinions: string[] = [];
    const statedPositions = ownClaims.map((c) => c.claim_id);
    const covered = spine.filter(
      (s) => (byIssue.get(s.id) ?? []).length > 0,
    ).length;

    profiles.push({
      candidate_id: candidateId,
      race_id: raceId,
      facts,
      positions: statedPositions,
      opinions,
      audit: {
        word_count: ownClaims.reduce((n, c) => n + wordCount(c.text), 0),
        verifiable_fact_count: facts.length,
        stated_position_count: statedPositions.length,
        /* No Fact-Checker ran. Zero is the true number, and it is equal
           across the race, so the 10% fact-check gate passes on a fact rather
           than on a guess. */
        fact_checks_performed: 0,
        spine_issue_count: spine.length,
        spine_issues_covered: covered,
      },
    });
  }

  return {
    schema: BRIEF_ROWS_SCHEMA,
    rows: {
      sources: [...sources.values()],
      issues,
      claims,
      claimSources,
      positions,
      profiles,
    },
    rejected,
  };
}
