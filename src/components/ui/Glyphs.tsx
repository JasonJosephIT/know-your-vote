/* Small state icons, drawn as SVG in the same idiom as the nav and close
   icons (20-unit grid, currentColor, 1.75 stroke), sized to the text they
   sit in (1em). They replace the ✓ and ▾ characters (interface review
   2026-10-05): the Inter subsets this site serves don't include those
   glyphs, so each platform drew them from its own symbol font, at its own
   weight and baseline, next to an Inter "+". Decorative: the controls they
   sit in carry the words. */

const svg = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  "aria-hidden": true,
  className: "inline-block size-[1em] shrink-0",
} as const;

export function CheckGlyph() {
  return (
    <svg {...svg}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusGlyph() {
  return (
    <svg {...svg}>
      <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
    </svg>
  );
}

export function CaretGlyph() {
  return (
    <svg {...svg}>
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* A circled "!" before an error line, so an error isn't told by its colour
   alone (Mobbin AD1, Square). */
export function ErrorGlyph() {
  return (
    <svg {...svg}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6.25v4.5M10 13.75h.01" strokeLinecap="round" />
    </svg>
  );
}

/* A padlock before a line about what happens to what the voter types
   (Mobbin AD3, komoot). */
export function LockGlyph() {
  return (
    <svg {...svg}>
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
      <path d="M7 9V6.75a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </svg>
  );
}

/* A link that jumps further down this page (race "Jump to", amendment
   YES/NO jump row), in place of the ↓ character the Inter subset lacks. */
export function ArrowDownGlyph() {
  return (
    <svg {...svg}>
      <path d="M10 4.5v11M5.5 11l4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* An arrow leaving a box: the link opens another site in a new tab. In
   place of ↗, which the Inter subsets don't include either. The link's
   own sr-only text says it opens a new tab. */
export function ExternalGlyph() {
  return (
    <svg {...svg}>
      <path
        d="M8.5 4.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M11.5 4.5h4v4M15.5 4.5l-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Line icons on a voter's own tasks and on a prose page's headings (phone
   visuals round 2, docs/design/mobile-visuals-2026-10-14/; design.md "Art on
   phones"): the sample-ballot tiles, keyed by task, never by county; the
   key dates' calendar and reminder links; and every /privacy heading, one
   each, so no section gets more weight than another. Product UI, not art,
   at every width, and always beside words that say the same thing. They
   never mark a candidate, party, race, a measure's YES/NO, a verdict or a
   news item, and none has a tick, a filled shape or an oval: at 20px a
   1.75 stroke closes a small oval into a solid dot, which reads as a
   marked ballot. So the ballot is a ruled sheet, the calendar a plain grid
   and the pin's centre a ring wide enough to stay open at 14px.

   Each takes a className that replaces the 1em default: the tiles and the
   headings draw them at 20px, the key-dates links at 1em. */

/* A ruled sheet: the sample-ballot tile. */
export function BallotGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="4.5" y="2.75" width="11" height="14.5" rx="1.5" />
      <path d="M7.5 7h5M7.5 10h5M7.5 13h3" strokeLinecap="round" />
    </svg>
  );
}

/* Where to vote; on /privacy, the map point a typed address becomes. */
export function PinGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path
        d="M10 17.25s-5.25-4.75-5.25-8.75a5.25 5.25 0 0 1 10.5 0c0 4-5.25 8.75-5.25 8.75z"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="2" />
    </svg>
  );
}

/* Early voting, and the key dates' "Add these dates to your calendar". */
export function CalendarGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 2.75v3.5M13 2.75v3.5" strokeLinecap="round" />
    </svg>
  );
}

/* Voting by mail; on /privacy, the email signup. */
export function MailGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="1.75" />
      <path d="M3.5 6l6.5 5 6.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* "Get deadline reminders by email". */
export function BellGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.25 1.75H4.25z" strokeLinejoin="round" />
      <path d="M8 16.75a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

/* /privacy: what stays on your device. */
export function PhoneGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="5.75" y="2.75" width="8.5" height="14.5" rx="1.75" />
      <path d="M9 14.25h2" strokeLinecap="round" />
    </svg>
  );
}

/* /privacy: your district, an area on a folded map. */
export function MapGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path
        d="M2.75 5.5l4.75-2 5 2 4.75-2v11l-4.75 2-5-2-4.75 2z"
        strokeLinejoin="round"
      />
      <path d="M7.5 3.5v11M12.5 5.5v11" />
    </svg>
  );
}

/* /privacy: your address. */
export function HouseGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M3.25 9.25L10 3.5l6.75 5.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.25 7.75v8.75h9.5V7.75M8.25 16.5v-4.25h3.5v4.25" strokeLinejoin="round" />
    </svg>
  );
}

/* /privacy: writing to us. */
export function MessageGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path
        d="M4.5 4h11a1.75 1.75 0 0 1 1.75 1.75v6.5A1.75 1.75 0 0 1 15.5 14h-6l-3.75 3v-3H4.5a1.75 1.75 0 0 1-1.75-1.75v-6.5A1.75 1.75 0 0 1 4.5 4z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* /privacy: analytics. Site usage, not polling. */
export function ChartGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M3.5 3.5v13h13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 13.5v-3M11 13.5V7M14.5 13.5V9" strokeLinecap="round" />
    </svg>
  );
}

/* /privacy: advertising, a page with a box for an ad in it. No megaphone:
   on an election site that reads as campaigning. */
export function AdGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="1.75" />
      <path d="M2.75 7.25h14.5" />
      <rect x="5.75" y="9.75" width="8.5" height="4.25" rx="0.5" />
    </svg>
  );
}

/* /privacy: error reports, a software bug. Not the circled "!" above:
   its dot is a filled shape, and on a heading it would read as an alert. */
export function BugGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="6.25" y="6.5" width="7.5" height="10.25" rx="3.75" />
      <path
        d="M8 6.75v-.5a2 2 0 0 1 4 0v.5M6.25 11H3.5M16.5 11h-2.75M6.5 8.25l-2-2M13.5 8.25l2-2M6.5 14.25l-2 1.75M13.5 14.25l2 1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* /privacy: your cookie choice, two sliders. Bars for handles, not
   knobs, so there is no circle. */
export function SlidersGlyph({ className = svg.className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M3.5 6.5h13M3.5 13.5h13M7.5 4.25v4.5M12.5 11.25v4.5" strokeLinecap="round" />
    </svg>
  );
}
