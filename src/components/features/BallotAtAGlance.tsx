import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";

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
      <h2
        id="at-a-glance"
        className="text-overline uppercase text-on-surface-muted"
      >
        On every Florida ballot
      </h2>
      <ul
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((t) => (
          <li key={t.many}>
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
