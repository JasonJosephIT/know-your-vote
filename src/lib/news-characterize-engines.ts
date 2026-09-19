/* The engine adapters —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.4.

   This is the ONLY file in the characterizer that imports a vendor SDK or
   reaches the network. Everything decidable lives in news-characterize.ts and
   is verified offline; this file just carries a request there and back, and
   deliberately does no validation of its own — validation that lives here
   could not be tested without a network.

   One implementation today: TypeSafe's Jev. The interface exists because spec
   §2.2 decided to build the Anthropic arm only if the gold-set evaluation asks
   for it, so a second engine is an addition here rather than a refactor
   everywhere.

   Why Jev for this job (§4.4): a Noul returns a NUMBER. There is no free-text
   field in the response, so a lean, a sentiment or a summary cannot be emitted
   even if the question wording is wrong. That is a structural guarantee of the
   kind this project prefers over a well-worded instruction. */

import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { EngineState, NoulQuestion } from "./news-characterize.ts";

/** Pinned, not `jev-latest`. A run's provenance records the model, so the
    model must not change underneath two runs we intend to compare. Bump this
    deliberately, and re-run the gold-set evaluation when you do. */
export const JEV_MODEL_ID = "jev-1.13.0";

/** What an engine hands back: the raw answers, plus whatever the vendor
    reported about cost. Usage is carried deliberately — spec §6 item 5 wants
    cost per article MEASURED, and an engine that drops it makes that
    impossible to report honestly. */
export interface CharacterizeResult {
  answers: Record<string, unknown>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface CharacterizeEngine {
  readonly modelId: string;
  /** Returns the raw answers. Thresholding and validation are NOT done here —
      they belong to news-characterize.ts, which is testable offline. */
  characterize(
    state: EngineState,
    questions: Record<string, NoulQuestion>,
  ): Promise<CharacterizeResult>;
}

export function jevEngine(modelId: string = JEV_MODEL_ID): CharacterizeEngine {
  /* The SDK would fall back to TYPESAFE_API_KEY itself and fail later, per
     request. Checking here instead turns a missing key into one loud error at
     startup rather than N identical per-article failures — and a run that
     quietly characterized nothing looks exactly like "no issues found". */
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error(
      "TYPESAFE_API_KEY is not set — refusing to run. A missing key must fail " +
        "loudly, because a silent skip looks exactly like 'no issues found'.",
    );
  }
  const client = new TypeSafeClient();

  return {
    modelId,
    async characterize(state, questions) {
      /* Every issue in ONE request. The documented multi-label recipe is
         "define one Noul per label", and independent questions over the same
         state are evaluated together — so this is one request per article,
         never one per issue. */
      const { answers, usage } = await client.systemOne({
        model: modelId,
        state,
        questions,
      });
      return { answers: answers as Record<string, unknown>, usage };
    },
  };
}
