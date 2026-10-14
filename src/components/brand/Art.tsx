import type { CSSProperties } from "react";
import artSizes from "./art-sizes.json";

/* The site illustration layer (design.md "Site illustration layer").

   Every piece of art is decoration: it says nothing a reader needs, so it is
   alt="" inside an aria-hidden wrapper, never takes a click or a selection,
   and never gets a tab stop. Its box is reserved up front (width/height from
   art-sizes.json, the intrinsic size of each -sm file), so nothing shifts
   when the image arrives.

   Placement is the caller's job: className and style go on the wrapper, so
   "absolute -top-4 right-6 hidden lg:block" positions and gates the piece
   without touching the image. Below lg only the pieces on design.md's
   closed list of phone art show: a second, lg:hidden Art beside its
   hidden lg:block twin when the sizes differ, or one ungated Art when the
   piece is the same size at every width (the magnifier beside "On this
   page"). See the rules in design.md before placing anything near text or
   a control. The line icons in Glyphs.tsx are product UI, not art. */

export type ArtName = keyof typeof artSizes;

/* Rotator frames live in their own folder at full size (450x600); everything
   else is an illustration served as its -sm WebP, or as its 192px-tall -xs
   WebP when it is drawn 96px tall or less and an -xs file exists ("xs/<name>"
   in art-sizes.json): a 36px sticker shouldn't fetch a 500px file. */
const XS_MAX = 96;

function wantsXs(name: ArtName, height?: number): boolean {
  return height !== undefined && height <= XS_MAX && `xs/${name}` in artSizes;
}

export function artSrc(name: ArtName, height?: number): string {
  if (name.startsWith("rotator/")) return `/brand/site/${name}.webp`;
  return wantsXs(name, height)
    ? `/brand/site/illustrations/${name}-xs.webp`
    : `/brand/site/illustrations/${name}-sm.webp`;
}

export function artSize(name: ArtName): { width: number; height: number } {
  const [width, height] = artSizes[name];
  return { width, height };
}

/* Rendered width for a given rendered height, keeping the file's ratio. */
export function artWidthAt(name: ArtName, height: number): number {
  const { width: w, height: h } = artSize(name);
  return (height * w) / h;
}

export function Art({
  name,
  height,
  className = "",
  style,
  eager = false,
}: {
  name: ArtName;
  /** Rendered height in px; the width follows from the file's ratio. */
  height: number;
  /** Goes on the wrapper, for positioning and breakpoint gating. */
  className?: string;
  style?: CSSProperties;
  /** Only the home hero's first walker should be eager. */
  eager?: boolean;
}) {
  const { width: w, height: h } = wantsXs(name, height)
    ? artSize(`xs/${name}` as ArtName)
    : artSize(name);
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a pre-sized
          WebP from public/; next/image's resizing adds nothing here. */}
      <img
        src={artSrc(name, height)}
        alt=""
        width={w}
        height={h}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : undefined}
        draggable={false}
        className="block max-w-none"
        style={{ height, width: "auto" }}
      />
    </span>
  );
}
