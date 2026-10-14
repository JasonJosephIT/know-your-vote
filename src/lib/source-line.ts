/* What one source line under a claim says: who published it, what kind of
   source it is and when we read it (Mobbin catalog 2026-10-12, CP3; Top 12
   item "Each source line says what kind of source it is and when we read
   it"). A voter can tell a campaign's own website from an official record
   before clicking.

   Three rules, pinned by scripts/verify-source-line.ts:

   1. Only what the row holds. A type this table doesn't know, or a
      retrieved_at that isn't a date, prints nothing rather than a guess.
      The live check on 2026-10-13: all 119 sources behind the 648 published
      claims have a type (every one candidate_self) and a retrieved_at.
   2. Every type is a plain word of the same weight. "Opinion" reads like
      the other three, and lean is never on this line: it is disclosed once,
      on the outlet page (news-labels.ts, news-fairness.md §1).
   3. The url is shown only when it is plain http(s) (safeHttpUrl), since
      `new URL()` throws on a malformed one. Without it the publisher is
      plain text and there is no host to read out.

   retrieved_at is the FIRST time we fetched the url (sources are inserted
   ON CONFLICT DO NOTHING; methodology/page.tsx says the same). The date is
   Florida's, the zone HomeNews pins, so a late-evening read never shows as
   the next day.

   Pure and offline, so the verify script can drive it without a browser. */

import type { Source } from "../types/schema.ts";
import { safeHttpUrl } from "./format.ts";

/* The four `source.type` values (CHECK-constrained in migration 0000).
   Stated positions are quoted only from the candidate's own campaign
   website (brief-rows.ts checks the site), so candidate_self says so. */
export const SOURCE_TYPE_LABEL: Record<Source["type"], string> = {
  candidate_self: "Campaign website",
  primary_doc: "Official record",
  factual_reporting: "News report",
  opinion: "Opinion",
};

export interface SourceLine {
  /** The link text: the publisher, or the host when the row has none. */
  publisher: string;
  /** The url, or null when it isn't plain http(s). */
  href: string | null;
  /** For screen readers, only when the publisher doesn't already say it. */
  host: string | null;
  typeLabel: string | null;
  retrieved: { iso: string; label: string } | null;
}

const bare = (name: string) => name.trim().toLowerCase().replace(/^www\./, "");

/* formatNewsDate's format, pinned to Florida's zone. */
export function retrievedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export function sourceLine(
  s: Pick<Source, "url" | "publisher" | "type" | "retrieved_at">
): SourceLine {
  const href = safeHttpUrl(s.url);
  const hostname = href ? bare(new URL(href).hostname) : null;
  const publisher = s.publisher?.trim() || hostname || "";
  const label = retrievedLabel(s.retrieved_at);
  return {
    publisher,
    href,
    host: hostname && bare(publisher) !== hostname ? hostname : null,
    typeLabel: Object.hasOwn(SOURCE_TYPE_LABEL, s.type)
      ? SOURCE_TYPE_LABEL[s.type]
      : null,
    retrieved: label ? { iso: s.retrieved_at, label } : null,
  };
}
