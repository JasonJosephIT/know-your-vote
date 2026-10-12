/* The home hero walk: numbers and schedule (HeroRotator).

   Pure and import-free, so the client component, the home page and
   scripts/verify-hero-walk.ts (plain Node, type stripping) all read the
   same values. Erasable TypeScript only. The CSS literals in
   HeroRotator.module.css mirror these constants; verify-hero-walk.ts
   checks that they agree.

   One procession: the eight walkers cross the cell left to right in a
   fixed order at one speed and size, spaced SPACING_PX apart, so every
   SLOT_MS the next one passes the centre (the sun). The line loops for as
   long as the page is open (founder, 2026-10-11): every lap each walker
   crosses exactly once, for the same visible time, and the lap ends in
   exactly the pose it started from, so the loop has no seam. */

export const WALKERS = [
  "person-phone-reader",
  "walker-nurse",
  "walker-lineworker",
  "walker-fisherman",
  "walker-teacher",
  "walker-student",
  "walker-chef",
  "walker-prosthetic",
] as const;
export type WalkerName = (typeof WALKERS)[number];

/** One step of the gait: the bob's period. */
export const STEP_MS = 640;
/** Time between walkers passing the centre: eight steps. */
export const SLOT_MS = 8 * STEP_MS; // 5120
/** One lap: every walker crosses once. The walk repeats it forever. */
export const LAP_MS = WALKERS.length * SLOT_MS; // 40960

export const SPACING_PX = 200;
/** The path, as a translateX from the cell's centre. It starts two slots
    left of centre, so the lead (j = 0) begins exactly at the centre. */
export const PATH_FROM_PX = -2 * SPACING_PX; // -400
export const PATH_TO_PX = PATH_FROM_PX + WALKERS.length * SPACING_PX; // 1200

/** Each frame is the 450x600 source drawn at 0.4 (sharp at 2x DPR). */
export const FRAME_W = 180;
export const FRAME_H = 240;
/** Feet sit this far above the cell's bottom edge. */
export const FEET_PX = 10;
export const BOB_RISE_PX = 4;
/** The pause chip's bottom edge, measured from the cell's top. */
export const CHIP_BOTTOM_PX = 40;
export const CELL_H = 300;

export type WalkerSlot = {
  name: WalkerName;
  /** Place in the line behind the lead: 0 is the lead. */
  j: number;
  /** Fraction of the path already walked at t = 0. */
  p: number;
  /** Resting translateX: the first-paint and end-of-lap position. */
  x0: number;
  /** Negative delay that puts the travel animation at p. */
  beltDelayMs: number;
  /** Half a step for every other walker, so neighbours never march in step. */
  gaitDelayMs: number;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function walkSchedule(lead: number): WalkerSlot[] {
  const n = WALKERS.length;
  const L = mod(Math.trunc(lead), n);
  const slotsBehind = -PATH_FROM_PX / SPACING_PX; // 2
  return WALKERS.map((_, j) => {
    const p = mod(slotsBehind - j, n) / n;
    return {
      name: WALKERS[(L + j) % n],
      j,
      p,
      x0: PATH_FROM_PX + p * n * SPACING_PX,
      beltDelayMs: -p * LAP_MS,
      gaitDelayMs: j % 2 ? -STEP_MS / 2 : 0,
    };
  });
}

/** Where a walker that starts at fraction p is at time t (ms of running). */
export function positionAt(p: number, tMs: number): number {
  return PATH_FROM_PX + mod(p + tMs / LAP_MS, 1) * (PATH_TO_PX - PATH_FROM_PX);
}

/** The lead for one page view, uniform over the eight (256 % 8 === 0), so
    across visitors every walker stands in the still equally often. */
export function pickLead(): number {
  const b = new Uint8Array(1);
  crypto.getRandomValues(b);
  return b[0] % WALKERS.length;
}
