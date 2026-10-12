/* The home hero walk (src/components/brand/HeroRotator.tsx, hero-walk.ts,
   HeroRotator.module.css).

   The neutrality promise is arithmetic, so it is checked as arithmetic:
   every walker is on screen for the same time per lap at every cell width
   the layout can produce, passes the centre once, never overlaps another,
   and each lap ends exactly where it began, so the endless loop has no
   seam. Then source checks that
   the CSS literals agree with the module's constants and that the retired
   swap rotator (blur frames, timers, aria-pressed) is gone.

   Run: node scripts/verify-hero-walk.ts */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOB_RISE_PX,
  CELL_H,
  CHIP_BOTTOM_PX,
  FEET_PX,
  FRAME_H,
  FRAME_W,
  LAP_MS,
  PATH_FROM_PX,
  PATH_TO_PX,
  SLOT_MS,
  STEP_MS,
  WALKERS,
  pickLead,
  positionAt,
  walkSchedule,
} from "../src/components/brand/hero-walk.ts";

const ROOT = resolve(import.meta.dirname, "..");
const read = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const RUN_MS = LAP_MS; // one lap; the walk repeats it forever
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/* ---- 1. The schedule ---------------------------------------------------- */

for (let lead = 0; lead < WALKERS.length; lead++) {
  const sched = walkSchedule(lead);
  check(
    `lead ${lead}: the line is all eight walkers, led by ${WALKERS[lead]}`,
    sched.length === 8 &&
      new Set(sched.map((w) => w.name)).size === 8 &&
      sched[0].name === WALKERS[lead]
  );
}
{
  const sched = walkSchedule(0);
  check(
    "each walker passes the centre once, one slot after the one before",
    sched.every((w) => close(positionAt(w.p, w.j * SLOT_MS), 0))
  );
  check(
    "each lap ends where it began, so the loop has no seam",
    sched.every(
      (w) =>
        close(positionAt(w.p, 0), w.x0) && close(positionAt(w.p, RUN_MS), w.x0)
    ) && sched[0].x0 === 0
  );
  check(
    "each walker's travel starts at its place on the path (delay = -p x lap)",
    sched.every((w) => close(-w.beltDelayMs, w.p * LAP_MS))
  );
  /* Circular gaps between neighbours on the path. */
  const xs = sched.map((w) => w.x0).sort((a, b) => a - b);
  const len = PATH_TO_PX - PATH_FROM_PX;
  const gaps = xs.map((x, k) =>
    k + 1 < xs.length ? xs[k + 1] - x : xs[0] + len - x
  );
  check(
    "no walker ever overlaps another",
    Math.min(...gaps) >= FRAME_W,
    String(gaps)
  );
  check(
    "the wrap point is off stage for any cell up to 600px",
    PATH_FROM_PX + FRAME_W / 2 < -300 && PATH_TO_PX - FRAME_W / 2 > 300
  );
  check(
    "the lap is a whole number of steps and strides, so it ends at contact and 0deg",
    LAP_MS % STEP_MS === 0 && LAP_MS % (2 * STEP_MS) === 0
  );
  check(
    "heads clear the pause chip at the top of the bob",
    CELL_H - FEET_PX - FRAME_H - BOB_RISE_PX >= CHIP_BOTTOM_PX + 2
  );
}

/* Equal screen time: sample every millisecond of the lap for each lead and
   each cell width the 58/42 grid can produce (and a wide 600px). */
for (const W of [209, 215, 255, 600]) {
  let worst = 0;
  let typical = 0;
  for (let lead = 0; lead < WALKERS.length; lead++) {
    const visible = walkSchedule(lead).map((w) => {
      let ms = 0;
      for (let t = 0; t < RUN_MS; t++) {
        if (Math.abs(positionAt(w.p, t)) < W / 2 + FRAME_W / 2) ms++;
      }
      return ms;
    });
    worst = Math.max(worst, Math.max(...visible) - Math.min(...visible));
    typical = visible[0];
  }
  check(
    `cell ${W}px: every walker is on screen for the same time per lap (~${Math.round(typical / 100) / 10}s)`,
    worst <= 2,
    `spread ${worst}ms`
  );
}

{
  const seen = new Set<number>();
  let ok = true;
  for (let n = 0; n < 4000; n++) {
    const v = pickLead();
    if (!Number.isInteger(v) || v < 0 || v > 7) ok = false;
    seen.add(v);
  }
  check("the lead is drawn from all eight walkers", ok && seen.size === 8);
}

/* ---- 2. The CSS agrees with the module ----------------------------------- */

const css = read("src/components/brand/HeroRotator.module.css");
for (const lit of [
  `${LAP_MS / 1000}s`,
  `${STEP_MS}ms`,
  `${2 * STEP_MS}ms`,
  `translateX(${PATH_FROM_PX}px)`,
  `translateX(${PATH_TO_PX}px)`,
  `width: ${FRAME_W}px`,
  `height: ${FRAME_H}px`,
  `margin-left: -${FRAME_W / 2}px`,
  `bottom: ${FEET_PX}px`,
  `translateY(-${BOB_RISE_PX}px)`,
  "0.6deg",
]) {
  check(`HeroRotator.module.css has ${lit}`, css.includes(lit));
}
{
  const gate = css.indexOf("@media (prefers-reduced-motion: no-preference)");
  const decls = [...css.matchAll(/\banimation(?:-name)?\s*:/g)].map(
    (m) => m.index ?? 0
  );
  check(
    "every animation is declared inside the no-preference media query",
    gate > 0 && decls.length > 0 && decls.every((i) => i > gate)
  );
  check("no var() inside a keyframe", !/@keyframes[^}]*\{[^@]*var\(/.test(css));
}

/* Code only: the header comment names what was retired. */
const tsx = read("src/components/brand/HeroRotator.tsx")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
for (const gone of [
  "aria-pressed",
  "1024px",
  "min-width",
  "max-width",
  "blur-",
  "setTimeout",
  ".animate(",
]) {
  check(`HeroRotator.tsx has no ${gone}`, !tsx.includes(gone));
}
check(
  "below lg the lead's <source> is the same rem breakpoint as Tailwind's lg",
  tsx.includes('"(width < 64rem)"') && /<source media=\{BELOW_LG\}/.test(tsx)
);
check(
  "the walk loops forever (founder, 2026-10-11)",
  /walk-belt 40\.96s linear infinite/.test(css) &&
    !/iteration-count/.test(css) &&
    !tsx.includes("lapDone") &&
    !tsx.includes("onAnimationEnd")
);
check(
  "HeroRotator gates motion on prefers-reduced-motion in JS too",
  tsx.includes("prefers-reduced-motion: no-preference")
);
check(
  "art-sizes.json has no blur frames",
  !Object.keys(JSON.parse(read("src/components/brand/art-sizes.json"))).some(
    (k) => k.includes("-blur-")
  )
);
{
  const files = readdirSync(`${ROOT}/public/brand/site/rotator`).sort();
  const want = WALKERS.map((w) => `${w}.webp`).sort();
  check(
    "public/brand/site/rotator holds exactly the eight walker frames",
    JSON.stringify(files) === JSON.stringify(want),
    files.join(", ")
  );
}
check(
  "the home page draws the lead per view",
  read("src/app/(public)/page.tsx").includes("<HeroRotator lead={pickLead()}")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-hero-walk: all checks passed.");
