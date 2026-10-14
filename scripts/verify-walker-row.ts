/* The phone walker row (docs/design/mobile-visuals-2026-10-14/
   mobile-visuals-2.md, PR 4; founder decisions 3A and 4A, 2026-10-14).

   One still picture of the home hero's eight walkers, 48px tall, standing
   on the wave after "What this guide covers" on home and on its own row
   after "What this is" on /about, below lg only. Its whole job is equal
   attention, so that is checked on the file's own pixels: eight figures in
   the hero's fixed order, every one scaled to the same height with its
   soles on the bottom edge, and the same gap between each. The row ships
   with today's eight (founder decision 4B, 2026-10-14): they span skin-1
   to skin-5, and the missing skin-6 is a logged gap
   (docs/brand-assets-roadmap.md, "Phone walker row"). A pixel re-tone of
   the fisherman was tried and withdrawn, because his ink eyes fade on
   skin-6. So the skin check here is that the row is not older than his
   files: whatever tone his files carry, his slot in both row files carries
   the same, so a regenerated skin-6 fisherman can't ship with a stale row.

   Then source checks: it is lazy (Art's default, never eager), phones only
   (lg:hidden, no desktop twin), still (no motion class), and only where
   the plan puts it. On home that is the whole page only, after the
   coverage card, which is after the news and the ballot: a narrowed view
   has no card, so the row would stand right under the news. Never on a
   page or a screen with a candidate list.

   Run: node scripts/verify-walker-row.ts */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { WALKERS } from "../src/components/brand/hero-walk.ts";

const ROOT = resolve(import.meta.dirname, "..");
const read = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");
const ILL = `${ROOT}/public/brand/site/illustrations`;

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* The pages draw it this tall; the -xs file is twice that, for 2x screens. */
const ROW_PX = 48;
/* The narrowest column it must fit: a 280px viewport less px-5 (24px) a side. */
const NARROWEST_COLUMN_PX = 280 - 2 * 24;

const sizes = JSON.parse(read("src/components/brand/art-sizes.json")) as Record<
  string,
  [number, number]
>;

async function rgba(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/* ---- 1. The order is the hero's ---------------------------------------- */

{
  const py = read("scripts/brand-assets/rotator.py");
  const list = /^WALKERS = \[([\s\S]*?)\]/m.exec(py)?.[1] ?? "";
  const pyWalkers = [...list.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  check(
    "rotator.py's WALKERS mirrors hero-walk.ts, in the same order",
    JSON.stringify(pyWalkers) === JSON.stringify([...WALKERS]),
    pyWalkers.join(", ")
  );
  const compose = read("scripts/brand-assets/compose.py");
  check(
    "compose.py row() takes the walkers from rotator.py, in that order",
    /^from rotator import WALKERS\b/m.test(compose) &&
      /def row\([\s\S]*?for slug in WALKERS:/.test(compose)
  );
}

/* ---- 2. The files: eight figures, one height, one gap ------------------ */

const masters = await Promise.all(
  WALKERS.map(async (slug) => {
    const m = await sharp(`${ILL}/${slug}.webp`).metadata();
    return { slug, w: m.width ?? 0, h: m.height ?? 0 };
  })
);

/* Each figure's slot in a row file: its master scaled to the row's height,
   as row() does (Python's round(), which takes a half to the even side).
   What is left over is the gaps, which must divide evenly. */
const pyRound = (v: number) => {
  const f = Math.floor(v);
  return v - f !== 0.5 ? Math.round(v) : f % 2 === 0 ? f : f + 1;
};
function slots(w: number, h: number) {
  const widths = masters.map((m) => pyRound((m.w * h) / m.h));
  const gap = (w - widths.reduce((a, b) => a + b, 0)) / (WALKERS.length - 1);
  return { widths, gap };
}

for (const [key, file] of [
  ["xs/walker-row", "walker-row-xs.webp"],
  ["walker-row", "walker-row-sm.webp"],
] as const) {
  const { data, w, h } = await rgba(`${ILL}/${file}`);
  check(
    `art-sizes.json "${key}" is ${file}'s real size (${w}x${h})`,
    sizes[key]?.[0] === w && sizes[key]?.[1] === h,
    JSON.stringify(sizes[key])
  );
  const alpha = (x: number, y: number) => data[(y * w + x) * 4 + 3];
  const { widths, gap } = slots(w, h);
  check(
    `${file}: eight slots in the hero's order with one gap between each (${gap}px)`,
    Number.isInteger(gap) && gap > 0,
    `gap ${gap}`
  );
  if (!Number.isInteger(gap) || gap <= 0) continue;

  let x0 = 0;
  const bad: string[] = [];
  let gapsClear = true;
  WALKERS.forEach((slug, i) => {
    const sw = widths[i];
    let top = h;
    let bottom = -1;
    let solid = 0;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x0 + sw; x++) {
        if (alpha(x, y) > 128) {
          solid++;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    /* One height: the figure spans the row, and its soles are the bottom
       edge (within 2%), so on the page they stand on the band's centre line. */
    if (bottom - top + 1 < 0.95 * h || bottom < h - 1 - Math.round(0.02 * h))
      bad.push(`${slug} rows ${top}-${bottom}`);
    if (solid < 0.25 * sw * h) bad.push(`${slug} only ${solid}px of figure`);
    if (i < WALKERS.length - 1) {
      for (let x = x0 + sw; x < x0 + sw + gap; x++) {
        for (let y = 0; y < h; y++) if (alpha(x, y) !== 0) gapsClear = false;
      }
    }
    x0 += sw + gap;
  });
  check(
    `${file}: every figure is the row's full height, soles on the bottom edge`,
    bad.length === 0,
    bad.join("; ")
  );
  check(`${file}: every gap between figures is empty`, gapsClear);
}

{
  const [w, h] = sizes["xs/walker-row"] ?? [0, 0];
  const xsMax = Number(
    /const XS_MAX = (\d+);/.exec(read("src/components/brand/Art.tsx"))?.[1]
  );
  check(
    `the -xs file is 2x the ${ROW_PX}px row, and Art picks it at that height`,
    h === 2 * ROW_PX && ROW_PX <= xsMax,
    `${h}px, XS_MAX ${xsMax}`
  );
  const drawn = (ROW_PX * w) / h;
  check(
    `at ${ROW_PX}px it is ${drawn.toFixed(1)}px wide, inside a 280px phone's ${NARROWEST_COLUMN_PX}px column`,
    drawn <= NARROWEST_COLUMN_PX
  );
}

/* ---- 3. The row matches the fisherman's files (decision 4B) ----------- */

{
  const design = read("docs/design.md");
  const tone = (n: number) => {
    const hex =
      new RegExp(`skin-${n}: "#([0-9A-Fa-f]{6})"`).exec(design)?.[1] ??
      "000000";
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  };
  const [skin5, skin6] = [tone(5), tone(6)];
  const near = (data: Buffer, i: number, t: number[], tol: number) =>
    Math.abs(data[i] - t[0]) <= tol &&
    Math.abs(data[i + 1] - t[1]) <= tol &&
    Math.abs(data[i + 2] - t[2]) <= tol;
  /* Which of the two deepest tones his skin is: the one with more pixels
     near it. */
  const deeper = (n5: number, n6: number) => (n6 > n5 ? 6 : 5);

  const files = new Set<number>();
  for (const file of [
    "illustrations/walker-fisherman.webp",
    "illustrations/walker-fisherman-sm.webp",
    "rotator/walker-fisherman.webp",
  ]) {
    const { data } = await rgba(`${ROOT}/public/brand/site/${file}`);
    let near5 = 0;
    let near6 = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      if (near(data, i, skin5, 8)) near5++;
      if (near(data, i, skin6, 8)) near6++;
    }
    files.add(deeper(near5, near6));
  }
  check(
    "the fisherman's three files carry one skin tone",
    files.size === 1,
    [...files].join(", ")
  );
  const filesTone = [...files][0];

  /* At 96px a flat fill is blurred by the lossy encoding, so the window is
     wider than for his own files. */
  const at = WALKERS.indexOf("walker-fisherman");
  for (const file of ["walker-row-xs.webp", "walker-row-sm.webp"]) {
    const { data, w, h } = await rgba(`${ILL}/${file}`);
    const { widths, gap } = slots(w, h);
    const x0 = widths.slice(0, at).reduce((a, b) => a + b, 0) + gap * at;
    let near5 = 0;
    let near6 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x0 + widths[at]; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] <= 128) continue;
        if (near(data, i, skin5, 10)) near5++;
        if (near(data, i, skin6, 10)) near6++;
      }
    }
    check(
      `${file}: the fisherman's slot is skin-${filesTone} like his files, so the row is not older than them`,
      near5 + near6 > 0 && deeper(near5, near6) === filesTone,
      `skin-6 ${near6}px, skin-5 ${near5}px in x ${x0}-${x0 + widths[at] - 1}`
    );
  }
  if (filesTone !== 6)
    console.log(
      "  note: no walker is skin-6 yet (decision 4B, a logged gap; docs/brand-assets-roadmap.md)"
    );
}

/* ---- 4. Where it goes, and how ----------------------------------------- */

function walk(dir: string): string[] {
  return readdirSync(`${ROOT}/${dir}`, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(`${dir}/${e.name}`)
      : /\.tsx?$/.test(e.name)
        ? [`${dir}/${e.name}`]
        : []
  );
}
const HOME = "src/app/(public)/page.tsx";
const ABOUT = "src/app/(public)/about/page.tsx";
const uses = walk("src").flatMap((f) =>
  [...read(f).matchAll(/<Art\s+([^>]*?)\/>/g)]
    .filter((m) => /name="walker-row"/.test(m[1]))
    .map((m) => ({ file: f, props: m[1], at: m.index ?? 0 }))
);
check(
  "the row is drawn twice: once on home and once on /about",
  uses.length === 2 &&
    uses.some((u) => u.file === HOME) &&
    uses.some((u) => u.file === ABOUT),
  uses.map((u) => u.file).join(", ")
);
check(
  "no other file names it",
  walk("src")
    .filter((f) => f !== HOME && f !== ABOUT)
    .every((f) => !read(f).includes("walker-row"))
);
for (const u of uses) {
  const cls = /className="([^"]*)"/.exec(u.props)?.[1] ?? "";
  check(
    `${u.file}: ${ROW_PX}px, phones only, lazy and still`,
    new RegExp(`height=\\{${ROW_PX}\\}`).test(u.props) &&
      /(?:^|\s)lg:hidden(?:\s|$)/.test(cls) &&
      !/(?:^|\s)(?:lg:)?block(?:\s|$)/.test(cls) &&
      !/\beager\b/.test(u.props) &&
      !/animate-|transition|duration-|hover:|motion-/.test(cls),
    u.props.replace(/\s+/g, " ")
  );
}
check(
  "Art is lazy unless told otherwise",
  /loading=\{eager \? "eager" : "lazy"\}/.test(
    read("src/components/brand/Art.tsx")
  )
);

{
  const page = read(HOME);
  const at = uses.find((u) => u.file === HOME)?.at ?? -1;
  const before = page.slice(0, at);
  check(
    "home: it stands on the wave, right-aligned, its soles on the band's centre line",
    /<div className=\{showAll \? "relative mt-\[24px\] lg:mt-0" : undefined\}>\s*<SectionDivider variant="wave" \/>\s*\{showAll && \(\s*$/.test(
      before
    ) &&
      /className="absolute bottom-\[6px\] right-0 lg:hidden"/.test(
        uses.find((u) => u.file === HOME)?.props ?? ""
      )
  );
  check(
    "home: after the ballot, the news and the coverage card, so never on a screen with a candidate list",
    at > page.indexOf("<SharedBallot") &&
      at > page.indexOf("<ScopedRaces scope={scope} />") &&
      at > page.indexOf("<HomeNews") &&
      at > page.indexOf("<CoverageSummary") &&
      page.indexOf("<SharedBallot") > 0 &&
      page.indexOf("<HomeNews") > 0 &&
      page.indexOf("<CoverageSummary") > 0
  );
}

{
  const about = read(ABOUT);
  const at = uses.find((u) => u.file === ABOUT)?.at ?? -1;
  check(
    '/about: on its own row after "What this is", before the desktop neighbours',
    at > about.indexOf("What this is</h2>") &&
      at > about.lastIndexOf("</section>", at) &&
      about.lastIndexOf("</section>", at) >
        about.indexOf("What this is</h2>") &&
      at < about.indexOf('name="about-neighbors"') &&
      about.indexOf("What this is</h2>") > 0
  );
  check(
    "/about names no candidates and draws no race",
    !/@\/lib\/(?:races|resolve|measures)|Race|Candidate|Ballot/.test(
      about.replace(/\/\*[\s\S]*?\*\//g, "")
    )
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-walker-row: all checks passed.");
