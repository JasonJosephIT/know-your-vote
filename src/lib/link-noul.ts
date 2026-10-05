/* Which homepage links to follow, decided by Jev instead of a word list.

   The keyword selector (selectPolicyPages in candidate-site.ts) follows a link
   only when its path or text carries a word like "issues" or "platform", and
   it never follows the About page. On the 2026-09-29 ingest that left 32 of 81
   readable sites at their homepage: campaigns name their pages "/taxes",
   "/position-papers", "/my-mission" or "/meet-maxwell", and no list keeps up
   (docs/general-election/brief-runs/ingest-2026-09-29.md).

   Here every on-site content link is put to Jev as its path and anchor text,
   with two questions: does it lead to the candidate's stated positions, and is
   it the candidate's own About page. A Noul returns a number, so the model
   ranks links; it cannot invent one. What is fetched is still capped, still
   checked against robots.txt, and still one request at a time, by the ingest.

   Everything decidable is here and verified offline by
   scripts/verify-link-noul.ts. */

import { createHash } from "node:crypto";
import { canonicalizeUrl, isLegalLink, isSameSite, type SiteLink } from "./candidate-site.ts";
import type { NoulQuestion } from "./news-characterize.ts";
import { noulValue } from "./policy-noul.ts";

export const POLICY_PAGE_ID = "policy_page";
export const ABOUT_PAGE_ID = "about_page";

/** Links are cheap to follow and a missed policy page is the failure being
    fixed, so the bar is "more likely than not", not the 0.85 a quote needs. */
export const DEFAULT_LINK_THRESHOLD = 0.5;

/* Never offered to the model: these cost a request and hold no statement
   (payments, carts, forms, logins, site plumbing). News, press and blog
   posts ARE offered — a campaign's positions often live there, and whether a
   given post states one is the model's call, not a word list's. */
const HARD_SKIP_SEGMENTS = new Set([
  "donate", "contribute", "store", "shop", "cart", "checkout", "events", "volunteer",
  "contact", "contact-us", "login", "signin", "sign-in", "signout", "member", "members",
  "search", "feed", "feeds", "wp-admin", "wp-content", "wp-json", "cdn-cgi",
]);
const SKIP_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|mp4|mp3|zip|css|js|xml|rss)$/i;

function hardSkip(url: string): boolean {
  if (SKIP_EXTENSIONS.test(url)) return true;
  const segs = new URL(url).pathname.toLowerCase().split("/").filter(Boolean);
  return segs.some((s) => HARD_SKIP_SEGMENTS.has(s) || /^(donate|contribute)-/.test(s));
}

/** The homepage's links worth asking about: on this site, not the homepage,
    not legal or plumbing, each once (keeping the first non-empty anchor). */
export function candidateLinks(links: readonly SiteLink[], siteUrl: string): SiteLink[] {
  const byUrl = new Map<string, SiteLink>();
  for (const link of links) {
    const url = canonicalizeUrl(link.url);
    if (!url || !isSameSite(url, siteUrl)) continue;
    /* One site, one spelling: apex and www fold together. */
    const folded = url.replace(/^(https?:\/\/)www\./i, "$1");
    if (new URL(url).pathname === "/" || hardSkip(url) || isLegalLink(link)) continue;
    const seen = byUrl.get(folded);
    if (!seen) byUrl.set(folded, { url, text: link.text });
    else if (!seen.text.trim() && link.text.trim()) seen.text = link.text;
  }
  return [...byUrl.values()];
}

export interface LinkState {
  path: string;
  text: string;
}

/** What the model sees: the path and the anchor text. Not the host, which is
    the candidate's name and says nothing about the page. */
export function buildLinkState(link: SiteLink): LinkState {
  return { path: new URL(link.url).pathname, text: link.text.replace(/\s+/g, " ").trim() };
}

export function buildLinkQuestions(): Record<string, NoulQuestion> {
  return {
    [POLICY_PAGE_ID]: {
      type: "noul",
      instructions:
        "This is one link on a political candidate's campaign website: its path and its " +
        "link text. Is it likely to lead to a page where the candidate states policy " +
        "positions, plans, priorities or what they would do in office? Judge only what " +
        "the page is likely to contain, not whether the positions are good.",
      criteria: {
        true: "The link likely leads to the candidate's stated positions, plans or priorities.",
        false:
          "The link likely leads to something else: fundraising, volunteering, events, " +
          "endorsements, photos, contact, shopping, or news that states no position.",
      },
    },
    [ABOUT_PAGE_ID]: {
      type: "noul",
      instructions:
        "This is one link on a political candidate's campaign website: its path and its " +
        "link text. Is it the candidate's own biography page: an About, Meet, or " +
        "\"my story\" page describing who the candidate is and what they have done?",
      criteria: {
        true: "The link likely leads to the candidate's own biography or About page.",
        false: "The link likely leads to something other than the candidate's biography.",
      },
    },
  };
}

export interface LinkVerdict {
  policy: number | null;
  about: number | null;
}

/** Null for anything missing or not a probability: an unjudged link is
    never fetched on a guess. */
export function readLinkVerdict(answers: Record<string, unknown>): LinkVerdict {
  return { policy: noulValue(answers, POLICY_PAGE_ID), about: noulValue(answers, ABOUT_PAGE_ID) };
}

export interface ScoredLink extends LinkVerdict {
  url: string;
}

/** Policy pages: at or above the threshold, strongest first, at most `cap`.
    About page: the single strongest about link at or above the threshold that
    is not already a policy page; it is fetched in addition to the cap, so the
    bio section never costs a candidate a policy page. */
export function chooseLinks(
  scored: readonly ScoredLink[],
  threshold: number,
  cap: number,
): { policy: string[]; about: string | null } {
  const strongest = (key: "policy" | "about") =>
    scored
      .filter((s) => s[key] !== null && (s[key] as number) >= threshold)
      .sort((a, b) => (b[key] as number) - (a[key] as number));
  const policy = strongest("policy").slice(0, cap).map((s) => s.url);
  const about = strongest("about").find((s) => !policy.includes(s.url))?.url ?? null;
  return { policy, about };
}

/** Which questions picked the links, in the same form as a policy run's
    provenance: two ingests are comparable only when this matches. */
export function linkProvenance(modelId: string): string {
  const digest = createHash("sha256").update(JSON.stringify(buildLinkQuestions())).digest("hex").slice(0, 8);
  return `jev:${modelId}/links/q-${digest}`;
}
