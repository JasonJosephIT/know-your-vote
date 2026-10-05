/* The outlet page's data rules — news-fairness.md §1 as amended 2026-09-19.

   This is where lean is disclosed, now that it has left the card. The whole
   point of moving it was to disclose it BETTER: on the card it was one word
   among four, and on 32 of 37 outlets that word would have been an absence. On
   a page about one outlet there is room to say what the rating is, who says so,
   when they said it, and — the case that matters most here — that nobody has
   rated this outlet at all and what that does and does not mean.

   TYPE-ONLY IMPORTS, on purpose. news-sources.ts's header explains the rule:
   keeping value imports out lets a plain `node` script run this file with no
   build step, which is how every guardrail here works. So the outlet list and
   the UNRATED placeholder arrive as ARGUMENTS rather than imports — the same
   injectable-dependency shape `sweep()` uses for `belongsTo`. It costs each
   call site one explicit argument and buys an offline-testable module.

   Pure and dependency-free, like news-labels.ts: scripts/verify-news-outlets.ts
   drives it with no DB and no browser. */

import type { Outlet } from "./news-sources";
import type { LeanTag } from "./news-labels";

/* ---- slugs -------------------------------------------------------------
   Two listed domains are path-scoped (`cbsnews.com/miami`), and a slash cannot
   sit in a single URL path segment. Percent-encoding it survives neither
   round-tripping through Next's router nor being read by a human in a URL bar,
   so the slash becomes `--`. No listed domain contains `--`, which is what
   makes the transform reversible; the guardrail asserts that rather than
   trusting it. */

export function outletSlug(domain: string): string {
  return domain.replaceAll("/", "--");
}

export function outletDomainFromSlug(slug: string): string {
  return slug.replaceAll("--", "/");
}

export function outletPathFor(domain: string): string {
  return `/news/outlet/${outletSlug(domain)}`;
}

/** The listed outlet for a slug, or null. Fail-closed: an unknown slug is a
    404, never a page invented around whatever the URL said. */
export function outletBySlug(
  slug: string,
  outlets: readonly Outlet[]
): Outlet | null {
  const domain = outletDomainFromSlug(slug);
  return outlets.find((o) => o.domain === domain) ?? null;
}

/* ---- lean disclosure ---------------------------------------------------- */

/** Why this outlet's lean reads the way it does. Four states, not two, because
    collapsing them is the small untruth this project keeps refusing to tell. */
export type LeanDisclosureState =
  /** A rating agency published a lean and the founder signed it off. */
  | "rated"
  /** No rating agency covers this outlet (`unrated`, migration 0028). */
  | "unrated"
  /** A lean does not apply to this kind of source (`N/A`). */
  | "not-applicable"
  /** `leanTag` is null — nobody has decided yet. Not the same as "unrated": it
      means the review has not happened, and saying "no rating exists" here
      would be a claim about the world made from our own backlog. */
  | "pending";

export interface LeanDisclosure {
  state: LeanDisclosureState;
  /** The heading a reader sees. Never a verdict, never colour-coded. */
  label: string;
  /** One or two sentences explaining what the label does and does not mean. */
  explanation: string;
  /** The recorded basis — rater, value, confidence, URL, access date — or null
      when the shared UNRATED placeholder is all there is, which is not a
      citation and must not be shown as one. */
  basis: string | null;
}

const LEAN_WORD: Record<Exclude<LeanTag, "N/A" | "unrated">, string> = {
  left: "Left",
  "center-left": "Center-left",
  center: "Center",
  "center-right": "Center-right",
  right: "Right",
};

/** `unratedPlaceholder` is news-sources.ts's exported `UNRATED` text. It is
    passed rather than imported (see the header), and it matters: that string is
    the note saying no rating was found, NOT a rating's basis, so it must never
    be rendered as a citation. */
export function leanDisclosure(
  outlet: Outlet,
  unratedPlaceholder: string
): LeanDisclosure {
  const basis =
    outlet.leanBasis === unratedPlaceholder ? null : outlet.leanBasis;

  if (outlet.leanTag === null) {
    return {
      state: "pending",
      label: "Not yet reviewed",
      explanation:
        "Independent ratings exist for this outlet, and the review that settles " +
        "which one this page shows has not happened yet. That is a gap on our " +
        "side, not a fact about the outlet.",
      basis,
    };
  }

  if (outlet.leanTag === "unrated") {
    return {
      state: "unrated",
      label: "No independent rating",
      explanation:
        "No rating agency publishes a political-lean rating for this outlet. " +
        "AllSides, Ad Fontes Media and Media Bias/Fact Check rate national and " +
        "large-metro outlets, and most local newsrooms are not on their lists. " +
        "This is not a judgement about the outlet, and it does not mean the " +
        "outlet has no perspective — only that no independent rater has " +
        "published one, so we do not assert one either.",
      basis,
    };
  }

  if (outlet.leanTag === "N/A") {
    return {
      state: "not-applicable",
      label: "Lean does not apply",
      explanation:
        "This source is a primary document rather than journalism — a government " +
        "filing or an official record — so an editorial lean is not a property " +
        "it has.",
      basis,
    };
  }

  return {
    state: "rated",
    label: LEAN_WORD[outlet.leanTag],
    explanation:
      "This is the lean an independent rating agency published for this outlet, " +
      "shown as they published it. We disclose it; we do not score articles, " +
      "and we never correct or offset a lean.",
    basis,
  };
}

/* One collator, pinned to English and case-insensitive, so the order does not
   depend on the server's locale (a bare `localeCompare()` uses the runtime
   default, which differs between a laptop and a Vercel function) and
   "el Nuevo Herald" sorts among the E's rather than after every capital. */
const PUBLISHER_ORDER = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

/** Every listed outlet, for an index of outlets (/news/outlet). Ordered
    alphabetically by publisher so the page is not implicitly ranked by
    anything — not by county, not by lean, not by whether we read it. Ties
    (none today) break on domain so the order is total and stable. */
export function listedOutlets(outlets: readonly Outlet[]): Outlet[] {
  return [...outlets].sort(
    (a, b) =>
      PUBLISHER_ORDER.compare(a.publisher, b.publisher) ||
      (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0)
  );
}

/* ---- whether we read it -------------------------------------------------
   The outlets index says, per outlet, whether the sweep reads it today. "Not
   read" alone would invite a reader to guess why, and most guesses (we dislike
   it, it is unimportant) would be wrong, so each state carries its reason.

   The usable set and the AI-policy hold arrive as ARGUMENTS for the same
   reason the outlet list does (header): news-sources.ts's `usableOutlets()` and
   `AI_POLICY_HOLD` stay the single source of truth, and this file stays
   type-only and offline-testable. */

export type OutletReadingState =
  /** In `usableOutlets()` — the sweep reads its feed or sitemap. */
  | "reading"
  /** On `AI_POLICY_HOLD`: readable, and deliberately not read. Checked FIRST,
      because it is the one reason that would still hold if every other gate
      were cleared — Sun Sentinel, Tampa Bay Times and Orlando Sentinel are
      also lean-pending, and saying only that would understate why. */
  | "ai-policy-hold"
  /** No RSS feed and no news sitemap we can reach. */
  | "no-retrieval-path"
  /** `leanTag` null — not read until a human has decided the lean. */
  | "lean-pending"
  /** `mixedFeed` — opinion and reporting share its only feed. */
  | "mixed-feed"
  /** `syndicated` — the feed is mostly other outlets' copy. */
  | "syndicated"
  /** Excluded by a gate this function does not know about yet. */
  | "other";

export interface OutletReading {
  state: OutletReadingState;
  reading: boolean;
  /** Short: "We read its stories" / "Not read". */
  label: string;
  /** One neutral sentence on why, or null when we do read it. */
  explanation: string | null;
}

export function outletReading(
  outlet: Outlet,
  usableDomains: ReadonlySet<string>,
  aiPolicyHold: ReadonlySet<string>
): OutletReading {
  if (usableDomains.has(outlet.domain)) {
    return {
      state: "reading",
      reading: true,
      label: "We read its stories",
      explanation: null,
    };
  }
  const notRead = (
    state: OutletReadingState,
    explanation: string
  ): OutletReading => ({
    state,
    reading: false,
    label: "Not read",
    explanation,
  });
  if (aiPolicyHold.has(outlet.domain)) {
    /* Neutral on purpose: this is the outlet's stated preference and our open
       decision, not a dispute. It says what the robots file asks, that parts
       of our pipeline run on Claude, and that the question is ours to settle
       (news-sources.ts AI_POLICY_HOLD, founder 2026-09-21). */
    return notRead(
      "ai-policy-hold",
      "Its site asks AI agents, including Anthropic's Claude, not to read it, " +
        "and parts of our pipeline run on Claude, so we are holding off while we " +
        "decide whether that request covers reading its feed."
    );
  }
  if (outlet.feed === null && outlet.sitemap === undefined) {
    return notRead(
      "no-retrieval-path",
      "It publishes no feed we can reach, so we have no way to read its stories yet."
    );
  }
  if (outlet.leanTag === null) {
    return notRead(
      "lean-pending",
      "We do not read an outlet until its lean has been reviewed, and that review " +
        "has not happened yet."
    );
  }
  if (outlet.mixedFeed) {
    return notRead(
      "mixed-feed",
      "Its only feed carries opinion pieces alongside reporting, and we cannot yet " +
        "tell the two apart, so we do not read it."
    );
  }
  /* `syndicated`, or any future gate `usableOutlets()` gains before this
     function learns about it — the reading is still "not read", and the
     generic sentence stays true. */
  return notRead(
    outlet.syndicated ? "syndicated" : "other",
    outlet.syndicated
      ? "Its feed is mostly stories republished from other outlets, so reading it " +
          "would credit it with other newsrooms' reporting."
      : "It does not yet meet the conditions we set before reading an outlet."
  );
}
