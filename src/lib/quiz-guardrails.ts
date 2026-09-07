import type { QuizResultCandidate } from "../types/app.ts";

/* Guardrails + normalization (TASK-034), kept dependency-free so they are
   directly testable: whatever the model does, the response leaving here
   covers the full field in the given (ballot) order with endorsement-shaped
   language stripped and fabricated issues dropped.

   TASK-065 added the second filter. The prompt now asks for what a candidate
   STATED rather than how they align with the voter, and COMPARATIVE_RE
   enforces that at the boundary: in a two-way general, "aligns with your
   answers" is a verdict even with nothing ranked, and it collapses to naming
   a party. A model that slips back into match language gets replaced with
   the neutral fallback rather than shipped. */

export const NEUTRAL_FALLBACK_NOTE =
  "We couldn't summarize this candidate's stated positions on the issues you picked — their full brief is the best place to look.";

export const ENDORSEMENT_RE =
  /\b(vote for|best (choice|candidate|pick|match)|top (pick|choice|match|candidate)|strongest candidate|clear winner|front[- ]?runner|should (win|elect|support)|we recommend|your match)\b/i;

/* Match-shaped language, which is distinct from endorsement: none of these
   name a winner, but each measures a candidate against the voter, and with
   two candidates that measurement IS the ranking. */
export const COMPARATIVE_RE =
  /\b(aligns? (with|closely)|alignment with|lines? up with|matches? your|match(es|ed)? with your|agrees? with (you|your)|shares? your|closest to your|in line with your|similar to your|differs? from your|disagrees? with (you|your)|opposed to your)\b/i;

export interface QuizCandidateShape {
  candidateId: string;
  legalName: string;
  party: string;
  raceId: string;
  office: string;
  positions: Array<{ issue: string; stance: string; says: string[] }>;
}

export interface RawStance {
  candidateRef: number;
  stanceSummary: string;
  issuesCovered: string[];
}

export function normalizeQuizResults(
  candidates: QuizCandidateShape[],
  raw: RawStance[],
  answeredIssues: string[]
): QuizResultCandidate[] {
  const byRef = new Map(raw.map((r) => [r.candidateRef, r]));
  return candidates.map((candidate, i) => {
    const entry = byRef.get(i + 1);
    let note = entry?.stanceSummary?.trim() || NEUTRAL_FALLBACK_NOTE;
    if (ENDORSEMENT_RE.test(note) || COMPARATIVE_RE.test(note)) {
      note = NEUTRAL_FALLBACK_NOTE;
    }
    const knownIssues = new Set([
      ...candidate.positions.map((p) => p.issue),
      ...answeredIssues,
    ]);
    return {
      candidateId: candidate.candidateId,
      legalName: candidate.legalName,
      party: candidate.party,
      raceId: candidate.raceId,
      office: candidate.office,
      stanceSummary: note,
      issuesCovered: (entry?.issuesCovered ?? []).filter((t) => knownIssues.has(t)),
    };
  });
}
