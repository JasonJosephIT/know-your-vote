import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsStoryCard } from "@/components/features/NewsStoryCard";
import { formatNewsDate } from "@/lib/format";
import { leanDisclosure, outletBySlug } from "@/lib/news-outlets";
import { OUTLETS, UNRATED, urlBelongsTo } from "@/lib/news-sources";
import { createAnonServerClient } from "@/lib/supabase/server";

/* The outlet page — news-fairness.md §1 as amended by the founder 2026-09-19.

   This page exists because lean came off the card. The card shows an image, an
   outlet and a headline; a reader who wants to know where an outlet sits taps
   the outlet name and lands here. So this page owes them the full answer, and
   "the full answer" includes the case the old per-card chip handled worst: that
   for most of these outlets, nobody has published a rating at all.

   Four states, never collapsed into two (src/lib/news-outlets.ts): rated,
   unrated, not-applicable, and pending. "No rating exists" and "we have not
   looked yet" are different claims and only one of them is about the outlet. */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const outlet = outletBySlug((await params).slug, OUTLETS);
  return {
    title: outlet
      ? `${outlet.publisher} — Know Your Vote`
      : "Outlet — Know Your Vote",
  };
}

export default async function OutletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Fail-closed: an unlisted slug is a 404, not a page built around whatever
     the URL claimed. Same posture as the sweep's host matching. */
  const outlet = outletBySlug(slug, OUTLETS);
  if (!outlet) notFound();

  const disclosure = leanDisclosure(outlet, UNRATED);

  /* Articles are matched by `urlBelongsTo`, the one home for "does this URL
     belong to this outlet" (news-sources.ts). Matching on publisher name would
     be easier and wrong: a manually-added row can carry any publisher string,
     while the URL rule is the same fail-closed one the sweep uses, so the two
     can never disagree about what this outlet published. */
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("news_item")
    .select(
      "id, title, url, summary, published_at, image_url, source(publisher, type, lean_tag)"
    )
    .not("url", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    title: string;
    url: string | null;
    summary: string | null;
    published_at: string | null;
    image_url: string | null;
    source:
      | { publisher: string; type: string; lean_tag: string }
      | { publisher: string; type: string; lean_tag: string }[]
      | null;
  };

  const rows = error
    ? []
    : ((data ?? []) as unknown as Row[]).filter(
        (r) => r.url !== null && urlBelongsTo(r.url, outlet)
      );

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        {/* Up to the index of every outlet (/news/outlet), so one outlet's
            disclosure can be read next to all the others'. */}
        <p className="text-body-sm">
          <Link
            href="/news/outlet"
            className="text-primary underline underline-offset-2"
          >
            All outlets
          </Link>
        </p>
        <p className="font-mono text-mono text-on-surface-muted">
          {outlet.domain}
        </p>
        <h1 className="text-h1">{outlet.publisher}</h1>
      </header>

      {/* The disclosure. Plain text in the ordinary muted style, never
          colour-coded — a red or blue lean chip would imply a verdict, which is
          the README's standing rule and the reason this is prose. */}
      <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-4">
        <h2 className="text-h3">
          Political lean:{" "}
          <span className="font-normal">{disclosure.label}</span>
        </h2>
        <p className="text-body-sm text-on-surface-muted">
          {disclosure.explanation}
        </p>
        {disclosure.basis && (
          <>
            <h3 className="text-caption text-on-surface-muted">
              What this is based on
            </h3>
            {/* The recorded basis verbatim — rater, value, confidence where the
                rater publishes one, URL and the date we read it. Shown as
                recorded rather than summarised, so a reader can check it. */}
            <p className="text-body-sm text-on-surface-muted">
              {disclosure.basis}
            </p>
          </>
        )}
        {/* Attribution owed wherever AllSides data renders — spec
            CAP_Change_Spec_Stances_and_RelatedNews_v1.md §7. This page is the
            first surface that renders it, so the line lives here. */}
        {disclosure.basis?.includes("AllSides") && (
          <p className="text-caption text-on-surface-muted">
            Source credibility ratings via AllSides (CC BY-NC 4.0).
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Stories we have from {outlet.publisher}</h2>
        {rows.length === 0 ? (
          /* Empty is stated, not hidden, and the reason matters: an outlet with
             no retrieval path will never have stories here, and a reader
             deserves that distinction rather than an empty rectangle. */
          <p className="text-body-sm text-on-surface-muted">
            {outlet.feed === null && outlet.sitemap === undefined
              ? "We have no way to read this outlet's stories yet — it publishes no feed we can reach, so nothing from it appears here."
              : "No stories from this outlet yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((r) => {
              const raw = r.source;
              const source = Array.isArray(raw)
                ? (raw[0] ?? null)
                : (raw ?? null);
              return (
                <li key={r.id}>
                  <NewsStoryCard
                    title={r.title}
                    url={r.url}
                    imageUrl={r.image_url}
                    source={source as never}
                    summary={r.summary}
                    dateLabel={
                      r.published_at ? formatNewsDate(r.published_at) : null
                    }
                    /* No outlet link on this page — it is this page. */
                    outletDomain={null}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
