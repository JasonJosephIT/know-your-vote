import type { ReactNode } from "react";
import { newsCardLabels, type NewsSource } from "@/lib/news-labels";
import { outletPathFor } from "@/lib/news-outlets";
import { safeHttpUrl } from "@/lib/format";

/* The story card — news-fairness.md §1 as amended by the founder on 2026-09-19.

   THREE THINGS, AND NOT A FOURTH: a cropped image, the outlet, the headline.
   Everything else that used to sit in the byline is gone from the card.

   NO LEAN HERE, and not by omission — `newsCardLabels` returns a type with no
   `lean` field, so this component could not print one if it tried. Lean is
   disclosed on the outlet page, one tap away, in full, including when no rating
   exists. §1 and src/lib/news-labels.ts carry the reasoning: with 32 of 37
   outlets unrated, a per-card lean chip would read "No independent rating" on
   most cards and "Center" on a few, foregrounding the rated minority and making
   an absence look like a finding.

   OPINION IS STILL MARKED, because that failure is the other way round. §1's
   words: "a voter reading a columnist's argument as established fact because
   both arrived in the same grey rectangle." Unlike lean, `type` is populated on
   every row, so marking it creates no sparse-label problem. Ordinary reporting
   is deliberately unmarked — it is the default, and a "Reporting" chip on every
   card is noise in front of the two things the card is for.

   ONE COMPONENT, TWO CALLERS. CandidateNews.tsx (server) and NewsFeed.tsx
   (client) used to carry near-identical card bodies that had already drifted
   apart in small ways. A neutrality rule enforced in two places is a rule that
   will eventually hold in one of them, so the card lives here and they both
   render it. */

export interface NewsStoryCardProps {
  title: string;
  /** Article URL at the publisher. A card with no usable URL still renders —
      the story existing is information; it just is not a link. */
  url: string | null;
  /** From `news_item.image_url` (migration 0029). Null is common and expected:
      many feeds carry no image, and both Tribune dailies reach us by sitemap,
      which carries none at all. */
  imageUrl: string | null;
  source: NewsSource | null | undefined;
  /** Registrable domain, for the outlet-page link. Null hides that link. */
  outletDomain?: string | null;
  /** Rendered under the headline when present — the feed's dek. */
  summary?: string | null;
  /** Shown as supplied; the caller formats it. */
  dateLabel?: string | null;
  /** Extra actions under the card — the site feed uses it for "View the
      candidate" / "View the race". Kept a slot rather than baked in, because a
      card on a candidate's own page must not offer to navigate to that same
      candidate. */
  footer?: ReactNode;
  /** A word for rows that are NOT journalism and carry no source: the site
      feed mixes in official resources and pipeline updates. Used only when the
      source yields no flag of its own, so it can never override or soften a
      real "Opinion". */
  kindFallback?: string | null;
}

export function NewsStoryCard({
  title,
  url,
  imageUrl,
  source,
  outletDomain = null,
  summary = null,
  dateLabel = null,
  footer = null,
  kindFallback = null,
}: NewsStoryCardProps) {
  const href = safeHttpUrl(url);
  /* Images are validated https at parse time (news-sweep.ts `feedImage`), but
     a row could predate that or arrive by another path, so re-check here
     rather than trusting the column. An http image on an https page renders as
     a broken box, which is worse than the text-only variant. */
  const image = safeHttpUrl(imageUrl);
  const { publisher, flag, isOpinion } = newsCardLabels(source);
  const outletHref = outletDomain ? outletPathFor(outletDomain) : null;
  /* `flag` wins. A sourced row's own label is never replaced by the caller's
     fallback, so an opinion column cannot be relabelled "update" by a caller
     that passed one. */
  const shownFlag = flag ?? (publisher ? null : kindFallback);

  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-lg border bg-surface text-on-surface",
        /* Opinion gets a distinct container, never a colour — a colour would
           imply a verdict about the piece (README neutrality rule). */
        isOpinion ? "border-border-strong bg-surface-muted" : "border-border",
      ].join(" ")}
    >
      {image ? (
        /* 2:1, cropped. `object-cover` means we show the middle of whatever the
           publisher sent rather than letter-boxing it, so a portrait crop and a
           panorama both read as the same card.

           Plain <img>, not next/image, on purpose: next/image proxies every
           image through our own server, which would make us fetch and cache
           publisher assets — the copying this project avoids — and would need
           each of 27+ CDN hosts allowlisted. This way the reader's browser
           loads it straight from the publisher, like any feed reader.

           No alt text is invented. The image is decorative here: the headline
           beside it carries the meaning, and a made-up description of a photo
           nobody on this side has seen would be worse than silence for a
           screen-reader user. */
        /* eslint-disable-next-line @next/next/no-img-element --
           next/image is the wrong tool here, not an oversight. It would route
           every publisher's photo through our own server to optimise it, which
           means fetching and caching their assets — the copying this project
           avoids on purpose — and it needs every CDN host allowlisted, across
           27+ outlets whose CDNs we do not control. A plain img keeps the fetch
           between the reader and the publisher. Do not "fix" this. */
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="aspect-[2/1] w-full object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-1 p-4">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-mono text-on-surface-muted">
          {shownFlag && (
            <span className={isOpinion ? "text-on-surface" : undefined}>{shownFlag}</span>
          )}
          {publisher &&
            (outletHref ? (
              /* Tapping the outlet is how a reader reaches the lean. */
              <a href={outletHref} className="underline underline-offset-2">
                {publisher}
              </a>
            ) : (
              <span>{publisher}</span>
            ))}
          {dateLabel && <span>· {dateLabel}</span>}
        </p>

        <h3 className="text-h3">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>

        {summary && <p className="text-body-sm text-on-surface-muted">{summary}</p>}

        {footer && <div className="flex flex-wrap gap-3 pt-1 text-caption">{footer}</div>}
      </div>
    </article>
  );
}
