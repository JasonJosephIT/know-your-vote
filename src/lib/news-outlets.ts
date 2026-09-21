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
  outlets: readonly Outlet[],
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
  unratedPlaceholder: string,
): LeanDisclosure {
  const basis = outlet.leanBasis === unratedPlaceholder ? null : outlet.leanBasis;

  if (outlet.leanTag === null) {
    return {
      state: "pending",
      label: "Not yet reviewed",
      explanation:
        "Independent ratings exist for this outlet, and the review that settles "
        + "which one this page shows has not happened yet. That is a gap on our "
        + "side, not a fact about the outlet.",
      basis,
    };
  }

  if (outlet.leanTag === "unrated") {
    return {
      state: "unrated",
      label: "No independent rating",
      explanation:
        "No rating agency publishes a political-lean rating for this outlet. "
        + "AllSides, Ad Fontes Media and Media Bias/Fact Check rate national and "
        + "large-metro outlets, and most local newsrooms are not on their lists. "
        + "This is not a judgement about the outlet, and it does not mean the "
        + "outlet has no perspective — only that no independent rater has "
        + "published one, so we do not assert one either.",
      basis,
    };
  }

  if (outlet.leanTag === "N/A") {
    return {
      state: "not-applicable",
      label: "Lean does not apply",
      explanation:
        "This source is a primary document rather than journalism — a government "
        + "filing or an official record — so an editorial lean is not a property "
        + "it has.",
      basis,
    };
  }

  return {
    state: "rated",
    label: LEAN_WORD[outlet.leanTag],
    explanation:
      "This is the lean an independent rating agency published for this outlet, "
      + "shown as they published it. We disclose it; we do not score articles, "
      + "and we never correct or offset a lean.",
    basis,
  };
}

/** Every listed outlet, for an index of outlets. Ordered by publisher so the
    page is not implicitly ranked by anything. */
export function listedOutlets(outlets: readonly Outlet[]): Outlet[] {
  return [...outlets].sort((a, b) => a.publisher.localeCompare(b.publisher));
}
