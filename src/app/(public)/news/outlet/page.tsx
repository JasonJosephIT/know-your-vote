import Link from "next/link";
import type { Metadata } from "next";
import { coveredCounty } from "@/lib/counties";
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
   collapsed — and whether the sweep reads it today, with the reason when it
   does not (`outletReading`). No row is highlighted, no lean is coloured, and
   the order is alphabetical by publisher (`listedOutlets`) so the page ranks
   nothing.

   Static: the data is the checked-in outlet list, not the database, so there
   is nothing to fetch and nothing to cache. It changes when the list changes,
   by PR, which redeploys it. */

export const metadata: Metadata = {
  title: "Where the news comes from — Know Your Vote",
  description:
    "Every news outlet Know Your Vote reads for Florida election coverage, " +
    "whether we read it today, and how its political lean is disclosed.",
};

export default function OutletsIndexPage() {
  const outlets = listedOutlets(OUTLETS);
  const usable = new Set(usableOutlets(OUTLETS).map((o) => o.domain));
  const readCount = outlets.filter((o) => usable.has(o.domain)).length;
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
          We read a fixed list of {outlets.length} newsrooms — local papers,
          broadcasters, public radio and statewide outlets covering Miami-Dade,
          Broward, Hillsborough and Orange counties and Florida as a whole. We
          read {readCount} of them today; each row below says why when we do
          not. The list changes only with a stated reason.
        </p>
        <p className="text-body text-on-surface-muted">
          Political lean is disclosed here, per outlet, rather than on each
          story. A lean rating describes an outlet, not an article, and no
          rating agency has rated most of these newsrooms — a label on every
          story would mostly say that, and would single out the few that are
          rated. Tap an outlet for its full disclosure and the stories we have
          from it.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {outlets.map((o) => {
          const disclosure = leanDisclosure(o, UNRATED);
          const reading = outletReading(o, usable, AI_POLICY_HOLD);
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
