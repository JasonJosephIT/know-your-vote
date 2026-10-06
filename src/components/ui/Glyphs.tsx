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
