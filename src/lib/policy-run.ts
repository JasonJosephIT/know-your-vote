/* The run file: one JSON object describing one pass over one candidate's
   site, written so a later run can be compared to it.

   WHY A FORMAT AND NOT JUST A DIFF. Two questions get asked of two runs, and
   `diff` answers neither:

     1. ARE THESE COMPARABLE? Two runs are only comparable on scores when they
        asked the same questions of the same taxonomy with the same model. The
        provenance string carries all three (`jev:MODEL/tax-VERSION/q-HASH`),
        so the comparison starts by checking it rather than by lining up
        numbers that may mean different things.
     2. WHAT MOVED — the site, or the model? A campaign edits its issues page;
        a threshold or a taxonomy changes on our side. Those produce the same
        shaped diff and are opposite findings, so the comparison separates
        CORPUS changes from VERDICT changes and never merges them.

   A run file is also written when nothing was asked (`status: "not_run"`).
   That is the manifest: the corpus and the questions, with every verdict null.
   It is worth writing, because "did the other run see the same 120 passages
   and ask the same 17 questions?" is answerable from it alone, and it is the
   first thing to check when two runs disagree.

   Pure and offline: no network, no clock, no DB — the caller passes the time
   in. scripts/verify-policy-run.ts drives this file. */

import type { Passage } from "./candidate-site.ts";
import type { AreaFinding, PassageVerdict, PolicyCitation } from "./policy-noul.ts";
import { groupByArea } from "./policy-noul.ts";

/** Bumped when a field changes meaning. A comparison across two schema
    versions is refused rather than guessed at. */
export const POLICY_RUN_SCHEMA = "kyv.policy-run/1";

export type RunStatus =
  /** The questions were built and the corpus read; nothing was sent. */
  | "not_run"
  /** Every passage was asked and answered. */
  | "complete"
  /** Some requests failed; their verdicts are null and `counts.failed` says
      how many. Distinguished from `complete` because a passage with no
      verdict because nobody asked and a passage with no verdict because the
      request failed are different facts. */
  | "partial";

export interface RunVerdict {
  commitment: number | null;
  states_policy: boolean;
  issues: string[];
  scores: Record<string, number>;
}

export interface RunPassage {
  id: string;
  url: string;
  heading: string | null;
  text: string;
  /** null on a manifest, and on a passage whose request failed. */
  verdict: RunVerdict | null;
}

export interface PolicyRun {
  schema: string;
  status: RunStatus;
  /** Origin of the first passage. Recorded so two files are obviously about
      the same candidate, never sent to the model. */
  site: string | null;
  created_at: string;
  model: string;
  taxonomy_version: string;
  threshold: number;
  /** `jev:MODEL/tax-VERSION/q-HASH` — the comparability key. */
  provenance: string;
  /** The question names asked, in order. Cheap to read; the hash inside the
      provenance is what actually proves the wording. */
  question_ids: string[];
  counts: {
    passages: number;
    asked: number;
    states_policy: number;
    with_issue: number;
    failed: number;
  };
  passages: RunPassage[];
  /** Grouped findings. Empty on a manifest. Derived from `passages`, kept in
      the file so a reader does not have to re-derive it. */
  areas: AreaFinding[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

/* Scores are written with their keys SORTED. JSON object order is preserved
   by JSON.stringify, and two runs whose only difference is key order would
   diff as different in every text tool while being identical runs. */
function sortedScores(scores: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(scores).sort()) out[key] = scores[key];
  return out;
}

function toRunVerdict(verdict: PassageVerdict): RunVerdict {
  return {
    commitment: verdict.commitment,
    states_policy: verdict.statesPolicy,
    issues: [...verdict.issueIds],
    scores: sortedScores(verdict.scores),
  };
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Assemble a run file.

    `answered` holds the passages that came back; `passages` is every passage
    that was READ, answered or not. Passing both is what lets the file record
    a failed request as a null verdict rather than as an absence. */
export function buildRun(input: {
  passages: readonly Passage[];
  answered: readonly PolicyCitation[];
  status: RunStatus;
  createdAt: string;
  model: string;
  taxonomyVersion: string;
  threshold: number;
  provenance: string;
  questionIds: readonly string[];
  failed?: number;
  usage?: { input_tokens: number; output_tokens: number } | null;
}): PolicyRun {
  const byId = new Map(input.answered.map((c) => [c.passage.id, c.verdict]));
  const rows: RunPassage[] = input.passages.map((p) => {
    const verdict = byId.get(p.id);
    return {
      id: p.id,
      url: p.url,
      heading: p.heading,
      text: p.text,
      verdict: verdict ? toRunVerdict(verdict) : null,
    };
  });

  return {
    schema: POLICY_RUN_SCHEMA,
    status: input.status,
    site: input.passages.length > 0 ? originOf(input.passages[0].url) : null,
    created_at: input.createdAt,
    model: input.model,
    taxonomy_version: input.taxonomyVersion,
    threshold: input.threshold,
    provenance: input.provenance,
    question_ids: [...input.questionIds],
    counts: {
      passages: rows.length,
      asked: input.answered.length,
      states_policy: input.answered.filter((c) => c.verdict.statesPolicy).length,
      with_issue: input.answered.filter(
        (c) => c.verdict.statesPolicy && c.verdict.issueIds.length > 0,
      ).length,
      failed: input.failed ?? 0,
    },
    passages: rows,
    areas: groupByArea(input.answered),
    usage: input.usage ?? null,
  };
}

/* ---- comparison ------------------------------------------------------- */

/** Default tolerance for calling a score "moved". Below this, two runs of the
    same model on the same text are reporting the same thing with noise. It is
    a reporting threshold only: nothing is rounded in the file. */
export const SCORE_TOLERANCE = 0.05;

export interface Comparability {
  /** Same schema. False means the rest of this comparison is not attempted. */
  schema: boolean;
  /** Same `jev:MODEL/tax-VERSION/q-HASH`. False means scores are NOT
      comparable, whatever else matches. */
  provenance: boolean;
  model: boolean;
  taxonomy_version: boolean;
  /** The question-wording hash out of the provenance string. */
  questions: boolean;
  /** Same threshold. A different one changes which issues are tagged without
      changing a single score. */
  threshold: boolean;
}

export interface CorpusDiff {
  /** Passage ids present in both. Identity is url + text, so a shared id is a
      guarantee the same words were asked about. */
  shared: string[];
  onlyA: RunPassage[];
  onlyB: RunPassage[];
  /** Same url and heading, different text: the campaign edited that block. */
  edited: Array<{ url: string; heading: string | null; a: RunPassage; b: RunPassage }>;
}

export interface VerdictDiff {
  /** Passages both runs answered. Only these can be compared. */
  compared: number;
  /** Passages a run read but never answered, on either side. */
  unanswered: { a: number; b: number };
  gateFlips: Array<{ id: string; url: string; from: boolean; to: boolean }>;
  issuesAdded: Array<{ id: string; url: string; issues: string[] }>;
  issuesRemoved: Array<{ id: string; url: string; issues: string[] }>;
  scoreMoves: Array<{ id: string; issue: string; from: number; to: number }>;
}

export interface RunComparison {
  comparability: Comparability;
  corpus: CorpusDiff;
  verdicts: VerdictDiff | null;
}

const questionHash = (provenance: string) =>
  provenance.split("/").at(-1) ?? "";

/** Compare two runs. Never throws on a shape mismatch: an unreadable pair is
    reported as not comparable, because "these cannot be compared" is the most
    useful thing a comparison can say when it is true. */
export function compareRuns(
  a: PolicyRun,
  b: PolicyRun,
  tolerance: number = SCORE_TOLERANCE,
): RunComparison {
  const comparability: Comparability = {
    schema: a.schema === b.schema,
    provenance: a.provenance === b.provenance,
    model: a.model === b.model,
    taxonomy_version: a.taxonomy_version === b.taxonomy_version,
    questions: questionHash(a.provenance) === questionHash(b.provenance),
    threshold: a.threshold === b.threshold,
  };

  const aById = new Map(a.passages.map((p) => [p.id, p]));
  const bById = new Map(b.passages.map((p) => [p.id, p]));

  const shared = a.passages.filter((p) => bById.has(p.id)).map((p) => p.id);
  const onlyA = a.passages.filter((p) => !bById.has(p.id));
  const onlyB = b.passages.filter((p) => !aById.has(p.id));

  /* A passage id is a hash of url + text, so edited text looks like a removal
     plus an addition. Re-pair them on url + heading to say what actually
     happened: the campaign changed that block. One pairing per slot, so a
     page that gained a second block under the same heading is not reported as
     an edit of the first. */
  const edited: CorpusDiff["edited"] = [];
  const takenB = new Set<string>();
  for (const left of onlyA) {
    const match = onlyB.find(
      (r) => !takenB.has(r.id) && r.url === left.url && r.heading === left.heading,
    );
    if (!match) continue;
    takenB.add(match.id);
    edited.push({ url: left.url, heading: left.heading, a: left, b: match });
  }
  const editedA = new Set(edited.map((e) => e.a.id));

  const corpus: CorpusDiff = {
    shared,
    onlyA: onlyA.filter((p) => !editedA.has(p.id)),
    onlyB: onlyB.filter((p) => !takenB.has(p.id)),
    edited,
  };

  /* Verdicts are only compared where both runs actually answered. A manifest
     on either side means there is nothing to compare, and saying so is more
     honest than reporting "no differences". */
  const pairs = shared
    .map((id) => ({ a: aById.get(id)!, b: bById.get(id)! }))
    .filter((p) => p.a.verdict !== null && p.b.verdict !== null);

  if (pairs.length === 0) {
    return { comparability, corpus, verdicts: null };
  }

  const gateFlips: VerdictDiff["gateFlips"] = [];
  const issuesAdded: VerdictDiff["issuesAdded"] = [];
  const issuesRemoved: VerdictDiff["issuesRemoved"] = [];
  const scoreMoves: VerdictDiff["scoreMoves"] = [];

  for (const { a: left, b: right } of pairs) {
    const lv = left.verdict!;
    const rv = right.verdict!;
    if (lv.states_policy !== rv.states_policy) {
      gateFlips.push({
        id: left.id,
        url: left.url,
        from: lv.states_policy,
        to: rv.states_policy,
      });
    }
    const added = rv.issues.filter((i) => !lv.issues.includes(i));
    const removed = lv.issues.filter((i) => !rv.issues.includes(i));
    if (added.length > 0) issuesAdded.push({ id: left.id, url: left.url, issues: added });
    if (removed.length > 0) issuesRemoved.push({ id: left.id, url: left.url, issues: removed });

    for (const issue of Object.keys({ ...lv.scores, ...rv.scores }).sort()) {
      const from = lv.scores[issue];
      const to = rv.scores[issue];
      /* A score present on one side and absent on the other is a shape
         change, not a move, and it is already visible as an issue added or
         removed. Only two real numbers are compared. */
      if (typeof from !== "number" || typeof to !== "number") continue;
      if (Math.abs(to - from) >= tolerance) {
        scoreMoves.push({ id: left.id, issue, from, to });
      }
    }
  }

  return {
    comparability,
    corpus,
    verdicts: {
      compared: pairs.length,
      unanswered: {
        a: a.passages.filter((p) => p.verdict === null).length,
        b: b.passages.filter((p) => p.verdict === null).length,
      },
      gateFlips,
      issuesAdded,
      issuesRemoved,
      scoreMoves,
    },
  };
}

/** True when two runs may be compared on their numbers. Corpus differences
    are always worth reporting; score differences are only meaningful here. */
export function scoresComparable(c: Comparability): boolean {
  return c.schema && c.provenance && c.threshold;
}
