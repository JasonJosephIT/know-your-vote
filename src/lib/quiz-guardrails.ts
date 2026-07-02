import type { QuizResultCandidate } from "../types/app.ts";

/* Guardrails + normalization (TASK-034), kept dependency-free so they are
   directly testable: whatever the model does, the response leaving here
   covers the full field in the given (ballot) order with endorsement-shaped
   language stripped and fabricated issues dropped. */

export const NEUTRAL_FALLBACK_NOTE =
  "We couldn't read a clear signal between your answers and this candidate's stated positions — their brief is the best place to look.";

export const ENDORSEMENT_RE =
  /\b(vote for|best (choice|candidate|pick|match)|top (pick|choice|match|candidate)|strongest candidate|clear winner|front[- ]?runner|should (win|elect|support)|we recommend|your match)\b/i;

export interface QuizCandidateShape {
  candidateId: string;
  legalName: string;
  party: string;
  raceId: string;
  office: string;
  positions: Array<{ issue: string; stance: string; says: string[] }>;
}

export interface RawAlignment {
  candidateRef: number;
  alignmentNote: string;
  alignedIssues: string[];
}

export function normalizeQuizResults(
  candidates: QuizCandidateShape[],
  raw: RawAlignment[],
  answeredIssues: string[]
): QuizResultCandidate[] {
  const byRef = new Map(raw.map((r) => [r.candidateRef, r]));
  return candidates.map((candidate, i) => {
    const entry = byRef.get(i + 1);
    let note = entry?.alignmentNote?.trim() || NEUTRAL_FALLBACK_NOTE;
    if (ENDORSEMENT_RE.test(note)) note = NEUTRAL_FALLBACK_NOTE;
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
      alignmentNote: note,
      alignedIssues: (entry?.alignedIssues ?? []).filter((t) => knownIssues.has(t)),
    };
  });
}
