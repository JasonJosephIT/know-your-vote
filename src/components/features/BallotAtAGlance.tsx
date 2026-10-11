import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { Art } from "@/components/brand/Art";

/* "On every Florida ballot" (layout pass 2026-10-11, item 3): three counts
   from the same cached reads SharedBallot makes, so the tiles and the lists
   below them cannot disagree. Each tile jumps to its list.

   Real counts only. A tile whose count is zero is left out rather than
   shown as "0", and with no races and no questions there is nothing to
   count, so nothing renders and SharedBallot's "not published yet" line
   speaks alone. */
export async function BallotAtAGlance() {
  const [races, measures] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
  ]);
  const candidates = races.reduce((n, r) => n + r.candidates.length, 0);

  const tiles = [
    {
      n: races.length,
      one: "statewide race",
      many: "statewide races",
      href: "#statewide-races",
    },
    {
      n: candidates,
      one: "candidate in them",
      many: "candidates in them",
      href: "#statewide-races",
    },
    {
      n: measures.length,
      one: "ballot question",
      many: "ballot questions",
      href: "#ballot-questions",
    },
  ].filter((t) => t.n > 0);
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="at-a-glance" className="flex flex-col gap-2">
      {/* The magnifier sticker (site illustration layer, design.md), lg+
         only. It used to peek off the ballot-questions tile into the 48 px
         column gap, where it sat 9 px from the news column's rule and read
         as art in the news slot (review, 2026-10-11). It now sits just
         right of this short, left-aligned heading, on the ballot side of
         the page: 8 px past the heading's last letter, bottom-aligned with
         the heading, so at 30 px tall it rises about 14 px above it into
         the 32 px gap under the key-dates card. The 8 px gap-2 below the
         heading keeps it clear of the tiles and of their focus rings,
         which reach 4 px past a tile. */}
      <div className="relative w-fit">
        <h2
          id="at-a-glance"
          className="text-overline uppercase text-on-surface-muted"
        >
          On every Florida ballot
        </h2>
        <Art
          name="sticker-magnifier"
          height={30}
          className="absolute bottom-0 left-[calc(100%+8px)] hidden lg:block"
        />
      </div>
      <ul
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((t) => (
          <li key={t.many} className="relative">
            {/* The palm sticker (site illustration layer, design.md).
               Every tile is a link edge to edge, and art never sits over
               or under a link, so it cannot go inside a tile's corner. It
               peeks off the top-left of the statewide-races tile instead
               (always first when it shows, since the candidates tile needs
               races), picked by label, not position, because empty tiles
               drop out. The other tiles stay plain.

               It starts 6 px past the tile: the global :focus-visible
               outline (2 px, 2 px offset) reaches 4 px past it, and the
               art must not cover a focus ring. It hangs into the page
               gutter, which is only the 24 px main padding until the
               1120 px container stops growing, so it waits for 1400 px.
               It rises 12 px above the tiles, left of the heading's
               start, never over it. */}
            {t.many === "statewide races" && (
              <Art
                name="sticker-palm"
                height={36}
                className="absolute -top-[12px] right-[calc(100%+6px)] hidden min-[1400px]:block"
              />
            )}
            <a
              href={t.href}
              className="flex h-full flex-col gap-1 rounded-lg bg-primary-muted px-3 py-3 text-primary-hover ring-primary transition-shadow hover:ring-1 sm:px-4"
            >
              <span className="font-heading text-h1 leading-none text-primary">
                {t.n}
              </span>
              <span className="text-caption sm:text-body-sm">
                {t.n === 1 ? t.one : t.many}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
