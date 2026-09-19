/* The characterizer's decision core —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.

   Everything here is PURE: no network, no clock, no DB, no vendor SDK, and no
   taxonomy. That split is the same one the sweep makes (src/lib/news-sweep.ts
   pure, scripts/news-sweep.ts fetches) and for the same reason — a function
   that reaches the network cannot be verified offline, and every rule below is
   a neutrality rule that has to be provable.

   THE RULE THAT CARRIES EVERYTHING: the state this file builds contains no
   identity that we supplied. No roster, no candidate name, no race, no party,
   no outlet, no lean — and no URL host, which is why slugPath exists. Whatever
   identity reaches the model is what the publisher put in the headline itself.

   The honest limit, stated here so nobody claims more than this file delivers:
   candidate names DO appear inside headlines, and we cannot strip them without
   mangling the text. So symmetry is not proven by construction; what is proven
   is that we added nothing. The rest is measured (spec §6).

   THE TAXONOMY IS A PARAMETER, NEVER AN IMPORT. Gate G3 is open — three rival
   issue lists exist (docs/general-election/news-issue-taxonomy-options-2026-09-18.md)
   — and this file must not care which one wins. Passing the taxonomy in also
   makes the whole core testable against a fixture, which is what
   scripts/verify-news-characterize.ts does.

   node:crypto is used for a deterministic hash. It is not I/O, and this module
   is imported only by scripts, never into a client bundle. */

import { createHash } from "node:crypto";

/** The shape the core consumes. The taxonomy module conforms to this; the core
    defines it so the core depends on nothing. */
export interface NewsIssue {
  /** Stable id. Becomes the question name and the stored tag. */
  id: string;
  /** Voter-facing label, used verbatim in the question text. */
  label: string;
  /** Surface forms that mean this issue — how the taxonomy explains itself. */
  aliases: readonly string[];
}

/** Founder-set 2026-09-18, from the first live run rather than from taste.
    At 0.7 a property-insurance story over-tagged into "Housing affordability"
    (A2) and "Cost of living" (A4), dragging `housing` in as a category; at
    0.85 that collapses to A1 alone and no true positive was lost anywhere in
    the sample. Ten fixtures is a signal, not a tuning: the gold-set sweep
    (spec §6 item 4) is still what settles it. */
export const DEFAULT_THRESHOLD = 0.85;

export interface CharacterizableArticle {
  title: string;
  /** Dek/summary. Null on sitemap-retrieved rows — that is the input floor. */
  summary?: string | null;
  url: string;
}

/* A type alias, NOT an interface, and that is load-bearing: TypeScript gives
   type aliases an implicit index signature but not interfaces, so only this
   form is assignable to the SDK's `EntryType` (`{ [key: string]: JsonValue }`).
   As an interface it forces a cast in the adapter, and a cast there would be
   the one place a stray field could slip into the request unchecked. */
export type ArticleState = {
  headline: string;
  dek: string | null;
  /** URL path only. Never the host — see the header. */
  slug: string | null;
};

/** A JSON object an engine can carry as state. Structural, so a caller with a
    different input shape (a passage from a candidate's site, say) uses the
    same adapter without the adapter learning about it — and so the rule that
    matters stays where it is: what goes in the state is decided by the module
    that builds it, and that module is verified offline.

    A type alias, not an interface, for the same reason ArticleState is one:
    only an alias gets the implicit index signature the SDK's EntryType wants. */
export type EngineState = {
  [key: string]: string | number | boolean | null | EngineState | EngineState[] | string[];
};

/** A TypeSafe NoulQuestion, structurally. Declared here rather than imported so
    the core stays free of the vendor SDK; the adapter passes these straight
    through and is where the shape meets the SDK's own types. */
export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

/** The path of a URL, with host, query and fragment removed. Returns null when
    there is no meaningful path, or when the input is not a URL at all — never
    throws, because one malformed stored URL must not stop a whole sweep. */
export function slugPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return path.length > 0 ? path : null;
}

/** The complete input the model sees. Three fields, and no fourth. */
export function buildState(article: CharacterizableArticle): ArticleState {
  const dek = (article.summary ?? "").trim();
  return {
    headline: article.title.trim(),
    dek: dek.length > 0 ? dek : null,
    slug: slugPath(article.url),
  };
}

/* One Noul per issue. The wording is deliberately flat and identical across
   issues — only the issue's own label and aliases vary — so no issue gets a
   more persuasive question than another; the guardrail asserts that by
   stripping each issue's own words and comparing what is left.

   "Does this relate to" rather than "is this about" is intentional: an article
   can touch an issue without being about it, and the threshold decides how
   much is enough, not the verb. */
export function buildQuestions(
  issues: readonly NewsIssue[],
): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {};
  for (const issue of issues) {
    questions[issue.id] = {
      type: "noul",
      instructions:
        `Does this news article relate to the policy issue "${issue.label}"? ` +
        `That issue covers topics such as: ${issue.aliases.join(", ")}. ` +
        `Judge only the subject matter of the headline and dek. ` +
        `Do not judge the article's tone, slant, fairness, or which side it favours.`,
      criteria: {
        true: `The article substantially concerns ${issue.label}.`,
        false: `The article does not substantially concern ${issue.label}.`,
      },
    };
  }
  return questions;
}

/* Turn a response into tags. Fail-closed at every step: anything that is not a
   known taxonomy id mapped to a finite number in [0,1] is DROPPED, never
   coerced and never guessed. This is the whole of §4.4's "there is no field a
   lean could arrive in" — an unexpected key simply has nowhere to go, because
   we iterate the taxonomy rather than the response.

   Returns [] when nothing clears the threshold. The caller must write [] and
   not NULL: [] means "we looked and found nothing", NULL means "never looked",
   and the column distinguishes them (§4.6). */
export function applyThreshold(
  answers: Record<string, unknown>,
  threshold: number,
  issueIds: readonly string[],
): string[] {
  const tags: string[] = [];
  for (const id of issueIds) {
    const answer = answers[id];
    if (answer === null || typeof answer !== "object") continue;
    const value = (answer as { noul?: unknown }).noul;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < 0 || value > 1) continue;
    if (value >= threshold) tags.push(id);
  }
  return tags;
}

/** One string for news_item.characterized_by, carrying everything needed to
    reproduce a run: which model, which taxonomy version, and a hash of the
    exact questions asked — which covers the taxonomy's contents, so two runs
    over different issue lists can never collide on the same provenance.
    Two rows with the same value are comparable; two with different values are
    not, and the difference says why. */
export function provenance(
  modelId: string,
  questions: Record<string, NoulQuestion>,
  taxonomyVersion: string,
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(questions))
    .digest("hex")
    .slice(0, 8);
  return `jev:${modelId}/tax-${taxonomyVersion}/q-${digest}`;
}
