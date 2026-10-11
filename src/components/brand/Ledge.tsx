import type { CSSProperties } from "react";
import ledges from "../../../public/brand/site/illustrations/ledges.json";
import { Art, artWidthAt, type ArtName } from "./Art";

/* Characters that touch the UI: fingers over a card's top edge, a figure
   sitting on a divider, hands hanging from the masthead. Each one has a
   recorded edge in public/brand/site/illustrations/ledges.json:

     { axis: "y", at: f }  the real UI edge sits at f x image height
     { axis: "x", at: f }  the real UI edge sits at f x image width

   f can fall slightly outside 0..1 (lean-card-side 1.038 leans on an edge
   just right of the figure; lie-footer 1.006 lies on an edge just below).

   The math, for a piece rendered h px tall (w = h x file ratio), placed
   absolutely inside the element whose edge it touches:

     edge "top"     top:    -(f x h)        the line f x h down the image
                                            lands on the ancestor's top
     edge "bottom"  bottom: -((1 - f) x h)  the image's bottom hangs
                                            (1 - f) x h below the ancestor's
                                            bottom, so f x h lands on it
     edge "left"    left:   -(f x w)
     edge "right"   right:  -((1 - f) x w)

   "top"/"bottom" need an axis-y ledge and "left"/"right" an axis-x one; the
   other coordinate (how far along the edge) is the caller's className. */

export type LedgeName = keyof typeof ledges;
export type LedgeEdge = "top" | "bottom" | "left" | "right";

export function ledgeOffset(
  name: LedgeName,
  height: number,
  edge: LedgeEdge,
): CSSProperties {
  const { axis, at } = ledges[name];
  const vertical = edge === "top" || edge === "bottom";
  if ((axis === "y") !== vertical) {
    throw new Error(
      `ledge "${name}" is recorded on axis ${axis}; edge "${edge}" needs the other axis`,
    );
  }
  const size = vertical ? height : artWidthAt(name as ArtName, height);
  const lead = edge === "top" || edge === "left";
  return { [edge]: -(lead ? at : 1 - at) * size };
}

/* An Art piece pinned to an edge of its nearest positioned ancestor (give
   that ancestor "relative"). className adds the along-the-edge position and
   the breakpoint gate, e.g. "right-8 hidden lg:block". Keep the piece clear
   of any text or control the ancestor holds. */
export function LedgeArt({
  name,
  height,
  edge,
  className = "",
}: {
  name: LedgeName & ArtName;
  height: number;
  edge: LedgeEdge;
  className?: string;
}) {
  return (
    <Art
      name={name}
      height={height}
      className={`absolute ${className}`}
      style={ledgeOffset(name, height, edge)}
    />
  );
}
