/* A decorative band between page sections: one of the divider SVGs tiled
   across the full width as a mask, filled with currentColor, so the colour
   comes from a text-* class (accent at 60% by default) and never a hex.
   One of the three pieces of art that also shows on phones. */

const MASKS = {
  zigzag: "/brand/site/textures/divider-zigzag.svg",
  wave: "/brand/site/textures/divider-wave.svg",
  checker: "/brand/site/textures/divider-checker.svg",
} as const;

export type DividerVariant = keyof typeof MASKS;

export function SectionDivider({
  variant = "zigzag",
  colorClassName = "text-accent/60",
  className = "",
}: {
  variant?: DividerVariant;
  /** A text-* token class; the divider is painted in currentColor. */
  colorClassName?: string;
  /** Spacing and the like, on the band itself. */
  className?: string;
}) {
  const mask = `url(${MASKS[variant]}) left center / auto 12px repeat-x`;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-3 w-full select-none bg-current ${colorClassName} ${className}`}
      style={{ mask, WebkitMask: mask }}
    />
  );
}
