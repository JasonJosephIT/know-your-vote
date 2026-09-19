/* What a candidate is running on, from their own site — the decidable half.

   THE SHAPE OF THE ANSWER. For each passage ingested by
   src/lib/candidate-site.ts we ask Jev a set of yes/no questions: one gate
   ("is this a policy commitment at all?") and one per sub-issue in the shared
   taxonomy ("does this state a position on X?"). A passage that clears both
   becomes a POLICY WITH A CITATION: the issue is the model's answer, the
   quote and the link are the passage we sent.

   WHY A NOUL AND NOT A SUMMARY. A Noul returns a number. The response has no
   free-text field, so the model cannot write a policy summary, cannot name a
   candidate, and — the part that matters here — cannot produce a quote or a
   url. Every citation this pipeline emits was retrieved before the model ran
   and is reproduced verbatim. A wrong answer can therefore attach a real
   quote to the wrong issue, which a reader can see and check. It can never
   invent the quote, which a reader cannot check. That asymmetry is the whole
   reason to ask a number instead of asking for prose.

   THE GATE EARNS ITS REQUEST. "Relates to housing" and "says what I will do
   about housing" are different claims, and a campaign site is full of the
   first: a biography, an endorsement, an event listing. Without the gate,
   "she worked as a nurse for twenty years" is filed as a healthcare policy.

   WHAT THE MODEL IS NOT TOLD, same rule as the news characterizer
   (docs/superpowers/specs/2026-09-18-news-characterization-design.md §4): no
   candidate name, no party, no office, no race, and no host — only the
   passage, its heading, and the url PATH. The honest limit is the same too,
   and worth stating plainly: a candidate's own site says their name in their
   own words all over the page, and stripping it would corrupt the quote. What
   is proven is that we added no identity. The rest is measured, and for this
   input shape it has not been measured yet.

   Pure and offline: no network, no clock, no DB. The vendor call is in
   src/lib/news-characterize-engines.ts; the runner is
   scripts/candidate-policy-noul.ts. scripts/verify-policy-noul.ts drives this
   file. */

import { applyThreshold, type NoulQuestion } from "./news-characterize.ts";
import type { NewsIssue } from "./news-characterize.ts";
import type { Passage } from "./candidate-site.ts";
import { policyAreasFor, type PolicyAreaRef } from "./policy-areas.ts";
import { SUB_ISSUES } from "./news-issues.ts";

/** The gate question's name. Prefixed so it can never collide with a taxonomy
    id, and asserted against the taxonomy in the guardrail: a collision would
    silently turn the gate's answer into an issue tag. */
export const COMMITMENT_ID = "q_states_policy";

/** Inherited from the news characterizer (0.85), where it WAS measured — on
    headlines. A passage is a different input, so treat this as a starting
    point that a gold set has yet to confirm, not a tuned value. The runner
    takes --threshold for exactly that reason. */
export const DEFAULT_POLICY_THRESHOLD = 0.85;

/** Everything the model sees about one passage, and no fourth field. */
export type PassageState = {
  /** The section the text sits under, or null. */
  heading: string | null;
  /** The candidate's words, verbatim. */
  text: string;
  /** URL path only. Never the host — a host is an identity we would be
      supplying, and the point is that we supply none. */
  slug: string | null;
};

/** The path of a url, with host, query and fragment removed. Never throws: a
    single malformed url must not stop a run. */
export function slugOf(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

export function buildPassageState(passage: Passage): PassageState {
  const heading = (passage.heading ?? "").trim();
  return {
    heading: heading.length > 0 ? heading : null,
    text: passage.text.trim(),
    slug: slugOf(passage.url),
  };
}

/* One gate plus one Noul per issue, in ONE request per passage: independent
   questions over the same state are evaluated together, so a passage costs a
   request, not seventeen.

   The per-issue wording is flat and identical across issues — only the label
   and the issue's own aliases vary — so no issue gets a more persuasive
   question than another. The guardrail asserts it by stripping each issue's
   own words and comparing what is left. */
export function buildPolicyQuestions(
  issues: readonly NewsIssue[]
): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {
    [COMMITMENT_ID]: {
      type: "noul",
      instructions:
        "Does this passage state a policy position: something the speaker " +
        "says they would do, support, oppose, fund, or change if elected? " +
        "Judge only whether a position is stated. Do not judge whether the " +
        "position is good, workable, popular, or correct.",
      criteria: {
        true: "The passage states a policy position the speaker holds.",
        false:
          "The passage is biography, endorsement, event, fundraising, or " +
          "other text that states no policy position.",
      },
    },
  };
  for (const issue of issues) {
    questions[issue.id] = {
      type: "noul",
      instructions:
        `Does this passage state a policy position on "${issue.label}"? ` +
        `That issue covers topics such as: ${issue.aliases.join(", ")}. ` +
        `Judge only the subject matter of the passage. ` +
        `Do not judge the position's tone, slant, fairness, or which side it favours.`,
      criteria: {
        true: `The passage states a position on ${issue.label}.`,
        false: `The passage states no position on ${issue.label}.`,
      },
    };
  }
  return questions;
}

/** One number from an answer set, or null. Fail-closed: anything that is not
    a finite number in [0,1] under a `noul` key is absent, never coerced. */
export function noulValue(
  answers: Record<string, unknown>,
  id: string
): number | null {
  const answer = answers[id];
  if (answer === null || typeof answer !== "object") return null;
  const value = (answer as { noul?: unknown }).noul;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

/** What one passage came back as. */
export interface PassageVerdict {
  /** Did the gate clear the threshold? A passage that states no policy is
      reported, not dropped: "we looked and it is not a policy" is a different
      fact from "we never asked". */
  statesPolicy: boolean;
  commitment: number | null;
  /** Sub-issue ids over the threshold, in taxonomy order. Empty when the
      passage cleared the gate but matched no issue. */
  issueIds: string[];
  /** Every issue score that came back well-formed, for the record. */
  scores: Record<string, number>;
}

export function readVerdict(
  answers: Record<string, unknown>,
  threshold: number,
  issueIds: readonly string[]
): PassageVerdict {
  const commitment = noulValue(answers, COMMITMENT_ID);
  const scores: Record<string, number> = {};
  for (const id of issueIds) {
    const value = noulValue(answers, id);
    if (value !== null) scores[id] = value;
  }
  return {
    commitment,
    statesPolicy: commitment !== null && commitment >= threshold,
    /* The same fail-closed reader the news path uses, over the taxonomy rather
       than over the response, so a key we did not ask for has nowhere to go. */
    issueIds: applyThreshold(answers, threshold, issueIds),
    scores,
  };
}

/** A passage that cleared the gate, with the issues it was tagged with. */
export interface PolicyCitation {
  passage: Passage;
  verdict: PassageVerdict;
}

export interface SubIssueFinding {
  id: string;
  label: string;
  /** Strongest first: a reader looking for one quote should get the clearest
      one. Ties keep ingest order, so the ranking is deterministic. */
  citations: Array<{ passage: Passage; score: number }>;
}

export interface AreaFinding {
  area: PolicyAreaRef;
  subIssues: SubIssueFinding[];
}

/** Roll passage verdicts up into "what this candidate is running on".

    Only passages that cleared the gate AND matched an issue appear. Ordering
    is taxonomy order for areas and sub-issues, and score order for citations
    within a sub-issue — never by how many citations an issue has, which would
    rank a candidate's issues by how much their web copy repeats. */
export function groupByArea(
  citations: readonly PolicyCitation[]
): AreaFinding[] {
  const byIssue = new Map<string, Array<{ passage: Passage; score: number }>>();
  for (const { passage, verdict } of citations) {
    if (!verdict.statesPolicy) continue;
    for (const id of verdict.issueIds) {
      const list = byIssue.get(id) ?? [];
      list.push({ passage, score: verdict.scores[id] ?? 0 });
      byIssue.set(id, list);
    }
  }

  const areas = policyAreasFor(
    SUB_ISSUES.filter((s) => byIssue.has(s.id)).map((s) => s.categoryId)
  );

  return areas.map((area) => ({
    area,
    subIssues: SUB_ISSUES.filter(
      (s) => s.categoryId === area.id && byIssue.has(s.id)
    ).map((s) => ({
      id: s.id,
      label: s.label,
      citations: [...(byIssue.get(s.id) ?? [])].sort(
        (a, b) => b.score - a.score
      ),
    })),
  }));
}

/** Passages we asked about that state no policy, or state one the taxonomy
    has no question for. Reported rather than dropped: a site whose every
    passage lands here is a finding about the site, and a silent empty result
    looks exactly like a broken run. */
export function unmatched(
  citations: readonly PolicyCitation[]
): { noPolicy: PolicyCitation[]; noIssue: PolicyCitation[] } {
  return {
    noPolicy: citations.filter((c) => !c.verdict.statesPolicy),
    noIssue: citations.filter(
      (c) => c.verdict.statesPolicy && c.verdict.issueIds.length === 0
    ),
  };
}
