import Link from "next/link";
import { NewsFeed } from "@/components/features/NewsFeed";
import {
  CATEGORIES,
  CATEGORY_IDS,
  SUB_ISSUES,
  issueFilterIds,
  issueFilterLabel,
} from "@/lib/news-issues";
import { COVERED_COUNTIES } from "@/lib/resolve";

export const metadata = { title: "Electoral news — Know Your Vote" };

/* County filter — candidate-news-PRD.md §7 (task C9).

   A plain GET form, the same shape CandidateBrowser already uses for its
   county picker, so switching county is a normal navigation: shareable,
   reload-stable, and working without JavaScript. It deliberately does NOT
   write anything to the device — §7's rule is that looking at Broward is a
   view, not a move. (TASK-070 removed the location store entirely, so there
   is nothing to overwrite; this keeps it that way.)

   Issue filter — added 2026-09-23. A second <select> in the same GET form, so
   it composes with the county and still works without JavaScript. The id is
   checked against the taxonomy HERE (`issueFilterIds`), and an unknown value
   is dropped rather than echoed: the subtitle and the empty state then say
   nothing about an issue that does not exist. The route re-checks it with
   zod; neither trusts the other. */
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ county?: string; issue?: string }>;
}) {
  const sp = await searchParams;
  const selected = COVERED_COUNTIES.find((c) => c.fips === sp.county);
  const issue =
    typeof sp.issue === "string" && issueFilterIds(sp.issue)
      ? sp.issue
      : undefined;
  const issueLabel = issueFilterLabel(issue) ?? undefined;

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
          {/* A category matches any of its sub-issues (issueFilterIds), so
              the wording says "an issue under", not "tagged". */}
          {issueLabel &&
            (issue && CATEGORY_IDS.includes(issue)
              ? ` Only stories tagged with an issue under “${issueLabel}”.`
              : ` Only stories tagged “${issueLabel}”.`)}
        </p>
        {/* Where the outlets and their lean disclosures live, now that lean is
            not on the card (news-fairness.md §1, amended 2026-09-19). */}
        <p className="text-body-sm">
          <Link
            href="/news/outlet"
            className="text-primary underline underline-offset-2"
          >
            Where the news comes from
          </Link>
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="news-county"
            className="text-caption text-on-surface-muted"
          >
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
        <div className="flex flex-col gap-1">
          <label
            htmlFor="news-issue"
            className="text-caption text-on-surface-muted"
          >
            Issue
          </label>
          {/* Categories first, then every sub-issue grouped under its
              category — both in the taxonomy's own order, which is the quiz's
              and not a ranking. */}
          <select
            id="news-issue"
            name="issue"
            defaultValue={issue ?? ""}
            className="max-w-full rounded-md border border-border-strong bg-surface px-3 py-3 text-body text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="">All issues</option>
            <optgroup label="Issue areas">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            {CATEGORIES.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {SUB_ISSUES.filter((s) => s.categoryId === c.id).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
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

      <NewsFeed county={selected?.fips} issue={issue} issueLabel={issueLabel} />
    </main>
  );
}
