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
