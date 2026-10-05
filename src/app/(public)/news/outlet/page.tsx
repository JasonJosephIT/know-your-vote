import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { coveredCounty } from "@/lib/counties";
import {
  outletListLine,
  outletPublishedLine,
  publishedLine,
  publishedStoriesByOutlet,
} from "@/lib/news-outlet-index";
import {
  leanDisclosure,
  listedOutlets,
  outletPathFor,
  outletReading,
} from "@/lib/news-outlets";
import {
  AI_POLICY_HOLD,
  OUTLETS,
  UNRATED,
  usableOutlets,
} from "@/lib/news-sources";
import { createAnonServerClient } from "@/lib/supabase/server";

/* The outlets index — every outlet on the news-intake list, in one place.

   WHY THIS PAGE EXISTS. news-fairness.md §1 (amended 2026-09-19) took lean off
   the story card and put it on a page per outlet. That is the better
   disclosure for a single outlet, but it left no way to see the list as a
   whole: which newsrooms we read at all, which we do not and why, and how few
   of them any rating agency covers. The list IS an editorial decision
   (news-sources.ts header), and an editorial decision a voter cannot see is
   one they cannot check.

   WHAT EACH ROW SAYS, and only this: the publisher (linking to its outlet
   page), its domain, where it is based, the lean DISCLOSURE LABEL exactly as
   the outlet page shows it — the four states of `leanDisclosure`, never
   collapsed — whether the sweep reads it today, with the reason when it
   does not (`outletReading`), and how many of its stories are published
   here. No row is highlighted, no lean is coloured, and the order is
   alphabetical by publisher (`listedOutlets`) so the page ranks nothing.

   The list is the checked-in outlet list and changes by PR. What has been
   published from it is read from news_item, because a page about where the
   news comes from must not imply stories it has never shown: until
   2026-10-05 it said "We read 24 of them today" while no story from any of
   them had been published. The counts and their sentences are in
   src/lib/news-outlet-index.ts. */

export const metadata: Metadata = {
  title: "Where the news comes from — Know Your Vote",
  description:
    "The newsrooms on Know Your Vote's list for Florida election coverage, " +
    "which of them we read, and how each one's political lean is disclosed.",
};

/* Re-rendered at most every 15 minutes, like the home page's news block,
   so the published counts follow the feed without a deploy. */
export const revalidate = 900;

/* Every published story URL, newest first. Raw URLs rather than counts, so
   the matching against OUTLETS happens at render with this deploy's list,
   never a list frozen in the data cache by an older deploy. Paged, because
   PostgREST caps a read at 1000 rows and an undercount would be a wrong
   number on the page. A failed read throws, so it is never cached. */
const publishedStoryUrls = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = await createAnonServerClient();
    const urls: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("news_item")
        .select("url")
        .not("url", "is", null)
        .order("published_at", { ascending: false })
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      urls.push(...(data ?? []).map((r) => r.url as string));
      if ((data ?? []).length < 1000) return urls;
    }
  },
  ["outlet-index-story-urls-v1"],
  { revalidate: 900, tags: ["news"] }
);

export default async function OutletsIndexPage() {
  const outlets = listedOutlets(OUTLETS);
  const usable = new Set(usableOutlets(OUTLETS).map((o) => o.domain));
  const readCount = outlets.filter((o) => usable.has(o.domain)).length;
  /* null when the read fails: the page then says nothing about published
     stories rather than claim there are none. */
  let published: Map<string, number> | null = null;
  try {
    published = publishedStoriesByOutlet(await publishedStoryUrls(), OUTLETS);
  } catch {
    published = null;
  }
  const publishedSummary = publishedLine(published);
  /* Attribution owed wherever AllSides data renders (CAP_Change_Spec_Stances_
     and_RelatedNews_v1.md §7), the same condition the outlet page uses: only
     once a RATED label shown here rests on an AllSides basis. None does today
     — every rated-basis outlet is still "Not yet reviewed" — so the line is
     absent until one is. */
  const owesAllSides = outlets.some((o) => {
    const d = leanDisclosure(o, UNRATED);
    return d.state === "rated" && (d.basis?.includes("AllSides") ?? false);
  });

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-body-sm">
          <Link
            href="/news"
            className="text-primary underline underline-offset-2"
          >
            Back to the news
          </Link>
        </p>
        <h1 className="text-h1">Where the news comes from</h1>
        <p className="text-body text-on-surface-muted">
          {outletListLine(outlets.length, readCount)}
          {publishedSummary && ` ${publishedSummary}`}
        </p>
        <p className="text-body text-on-surface-muted">
          Political lean is disclosed here, per outlet, rather than on each
          story. A lean rating describes an outlet, not an article, and no
          rating agency has rated most of these newsrooms — a label on every
          story would mostly say that, and would single out the few that are
          rated. Tap an outlet for its full disclosure and anything we have
          published from it.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {outlets.map((o) => {
          const disclosure = leanDisclosure(o, UNRATED);
          const reading = outletReading(o, usable, AI_POLICY_HOLD);
          const publishedNote = outletPublishedLine(o.domain, reading.reading, published);
          const base = o.countyFips ? coveredCounty(o.countyFips) : undefined;
          return (
            <li
              key={o.domain}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex flex-col gap-0.5">
                <h2 className="text-h3">
                  <Link
                    href={outletPathFor(o.domain)}
                    className="underline-offset-2 hover:underline"
                  >
                    {o.publisher}
                  </Link>
                </h2>
                <p className="font-mono text-mono text-on-surface-muted">
                  {o.domain}
                  {" · "}
                  {base ? `${base.name} County` : "Statewide"}
                </p>
              </div>

              {/* Two plain facts in one uniform style. The lean label is the
                  outlet page's own heading text, never a colour or a chip, so
                  "Not yet reviewed" and "No independent rating" read as the
                  different claims they are. */}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
                <dt className="text-on-surface-muted">Political lean</dt>
                <dd className="text-on-surface">{disclosure.label}</dd>
                <dt className="text-on-surface-muted">Stories</dt>
                <dd className="text-on-surface">
                  {reading.label}
                  {reading.explanation && (
                    <span className="block text-on-surface-muted">
                      {reading.explanation}
                    </span>
                  )}
                  {/* Read is not published: say which, so "We read its
                      stories" never stands in for stories on the site. */}
                  {publishedNote && (
                    <span className="block text-on-surface-muted">
                      {publishedNote}
                    </span>
                  )}
                </dd>
              </dl>
            </li>
          );
        })}
      </ul>

      {owesAllSides && (
        <p className="text-caption text-on-surface-muted">
          Source credibility ratings via AllSides (CC BY-NC 4.0).
        </p>
      )}
    </main>
  );
}
