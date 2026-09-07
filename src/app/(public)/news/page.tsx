import { NewsFeed } from "@/components/features/NewsFeed";
import { COVERED_COUNTIES } from "@/lib/resolve";

export const metadata = { title: "Electoral news — Know Your Vote" };

/* County filter — candidate-news-PRD.md §7 (task C9).

   A plain GET form, the same shape CandidateBrowser already uses for its
   county picker, so switching county is a normal navigation: shareable,
   reload-stable, and working without JavaScript. It deliberately does NOT
   write anything to the device — §7's rule is that looking at Broward is a
   view, not a move. (TASK-070 removed the location store entirely, so there
   is nothing to overwrite; this keeps it that way.) */
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ county?: string }>;
}) {
  const sp = await searchParams;
  const selected = COVERED_COUNTIES.find((c) => c.fips === sp.county);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        {/* "Local" came off with the ZIP gate (TASK-069): with no location
            this page is statewide, and calling that local would be the same
            overclaim the landing page dropped in TASK-067. */}
        <h1 className="text-h1">Electoral news</h1>
        <p className="text-body-sm text-on-surface-muted">
          A calm digest of what actually changed — election news, candidate
          news, pipeline updates, and official sources only, no hot takes.
          {selected
            ? ` Showing ${selected.name} County plus statewide items.`
            : " Statewide by default — pick a county to see its news too."}
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="news-county" className="text-caption text-on-surface-muted">
            County
          </label>
          <select
            id="news-county"
            name="county"
            defaultValue={selected?.fips ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-3 text-body text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">Statewide only</option>
            {COVERED_COUNTIES.map((c) => (
              <option key={c.fips} value={c.fips}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-border-strong bg-surface px-4 py-3 text-body text-on-surface hover:bg-surface-muted focus:border-primary focus:outline-none"
        >
          Show news
        </button>
      </form>

      <NewsFeed county={selected?.fips} />
    </main>
  );
}
