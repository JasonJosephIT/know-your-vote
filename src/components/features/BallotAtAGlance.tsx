import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { Art } from "@/components/brand/Art";
import { homeNewsHasItems } from "@/components/features/HomeNews";
import { ArrowDownGlyph } from "@/components/ui/Glyphs";
import type { HomeSections } from "@/lib/race-scope";

/* "On this page" (home readability, 2026-10-12, A6; founder decision 1a,
   2026-10-13). It began as three count tiles, "On every Florida ballot"
   (layout pass 2026-10-11, item 3); the sample-ballot block above took
   their slot, and the counts moved into this one row of jumps down the
   page, which also reaches the House step and, on a phone, the news. The
   race and question counts come from the same cached reads SharedBallot
   makes, so the chips and the lists below them cannot disagree.

   It names sections, never a race or a candidate. Real counts only: a
   chip whose count is zero is left out rather than shown as "0", and with
   no races and no questions there is nothing to jump to, so nothing
   renders and SharedBallot's "not published yet" line speaks alone. The
   news chip is phones only: from lg the news is the column beside this.

   40 px chips with 10 px sides and 6 px gaps keep the four to two rows at
   375 px (three at 320). Each jumps to a heading; the root scroll-padding
   keeps it clear of the bars, so no scroll-mt (design.md).

   `sections` says which of the page's sections are rendered
   (homeSections, src/lib/race-scope.ts). "Show races for"
   (RaceScopePicker) narrows the home page: "Statewide races" drops the
   House step, and a county or a district replaces the shared ballot
   (statewide races and ballot questions) with ScopedRaces. A chip whose
   section is not on the page is left out, so no chip jumps to nothing.
   Not passed, every section is on the page, which is "All races" and
   renders exactly as before the picker. The news column is in every
   view, but HomeNews renders nothing when its read fails or finds no
   story from the last 45 days, so the news chip waits on the same read
   (homeNewsHasItems). If only the phones-only news chip is left, the
   whole row is phones-only too, so a desktop never shows the label over
   an empty row; with no chip left, nothing renders. */
export async function BallotAtAGlance({
  sections = {},
}: {
  sections?: Partial<HomeSections>;
} = {}) {
  const { statewide = true, questions = true, house = true } = sections;
  const [races, measures, news] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
    homeNewsHasItems(),
  ]);
  if (races.length === 0 && measures.length === 0) return null;

  const chips = [
    statewide && races.length > 0 && {
      label: `${races.length} statewide ${races.length === 1 ? "race" : "races"}`,
      href: "#statewide-races",
    },
    questions && measures.length > 0 && {
      label: `${measures.length} ballot ${measures.length === 1 ? "question" : "questions"}`,
      href: "#ballot-questions",
    },
    house && { label: "U.S. House race", href: "#house-race" },
    news && { label: "Election news", href: "#home-news", className: "lg:hidden" },
  ].filter(Boolean) as { label: string; href: string; className?: string }[];
  if (chips.length === 0) return null;
  const rowClass = chips.every((c) => c.className === "lg:hidden")
    ? "flex flex-col gap-2 lg:hidden"
    : "flex flex-col gap-2";

  return (
    <nav aria-labelledby="on-this-page" className={rowClass}>
      {/* The magnifier sticker (site illustration layer, design.md), lg+
         only, 8 px past the end of this short, left-aligned label and
         bottom-aligned with it, so at 30 px tall it rises into the gap
         above, on the ballot side of the page, clear of the news column's
         rule. The 8 px gap-2 below the label keeps it clear of the chips
         and of their focus rings, which reach 4 px past a chip. The palm
         sticker that sat on the races tile retired with the tiles. */}
      <div className="relative w-fit">
        <h2 id="on-this-page" className="text-label text-on-surface">
          On this page
        </h2>
        <Art
          name="sticker-magnifier"
          height={30}
          className="absolute bottom-0 left-[calc(100%+8px)] hidden lg:block"
        />
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <li key={c.href} className={c.className}>
            <a
              href={c.href}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 text-body-sm text-on-surface hover:bg-surface-muted"
            >
              {c.label}
              <ArrowDownGlyph />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
