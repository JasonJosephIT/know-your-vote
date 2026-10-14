/* The art files a page fetches are the files the code says it fetches
   (docs/design/mobile-visuals-2026-10-14/, PR 1: lighter files).

   Art reserves each piece's box from src/components/brand/art-sizes.json
   and picks a piece's -xs file by itself when it is drawn 96px tall or
   less, so a wrong number there is a box that shifts on load or a file that
   costs more than the plan says. The footer's phone file is chosen by a
   <source> in SiteFooter, outside Art. Pinned:

   1. Every art-sizes.json entry is its file's real size: "<name>" is
      illustrations/<name>-sm.webp, "xs/<name>" is <name>-xs.webp, and
      "rotator/<name>" is rotator/<name>.webp.
   2. Every -xs file keeps its -sm file's ratio (within 1%), so a ledge,
      a fraction of the height, lands on the same line, and is lighter than
      the -sm file it stands in for.
   3. Every Art or LedgeArt drawn 96px tall or less has an -xs file, and
      that file is at least 2x the height it is drawn at.
   4. Below sm the footer's <source> serves the 750w town strip: one file,
      no sizes attribute (with sizes, WebKit picked the 2400w file on 402px+
      @3x iPhones), the width and height of the file, the ratio of the
      phone box, and lighter than the -sm file. It is named only there, so
      from sm up the <img> never fetches it.

   Sizes are read from the WebP headers, so nothing here decodes an image.
   Source checks read the files with comments stripped, so a comment
   quoting a class or a path cannot pass or fail them.

   Pure and offline: no DB, no network.

   Run: node scripts/verify-art-files.ts */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = "public/brand/site";
const SIZES = "src/components/brand/art-sizes.json";
const FOOTER = "src/components/nav/SiteFooter.tsx";
const XS_MAX = 96; // Art.tsx: an -xs file is used at this height or less

const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const stripComments = (src: string) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
const rendered = (file: string) =>
  stripComments(source(file)).replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* A WebP's canvas size from its first chunk: VP8X (extended, any file with
   alpha), VP8L (lossless) or VP8 (lossy). */
function webpSize(file: string): { width: number; height: number } | null {
  let b: Buffer;
  try {
    b = readFileSync(join(ROOT, file));
  } catch {
    return null;
  }
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP")
    return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X")
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ")
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  return null;
}
const bytes = (file: string) => statSync(join(ROOT, file)).size;
const kb = (file: string) => `${(bytes(file) / 1024).toFixed(1)}KB`;

const sizes: Record<string, [number, number]> = JSON.parse(source(SIZES));

function fileFor(key: string): string {
  if (key.startsWith("rotator/")) return `${SITE}/${key}.webp`;
  if (key.startsWith("xs/"))
    return `${SITE}/illustrations/${key.slice(3)}-xs.webp`;
  return `${SITE}/illustrations/${key}-sm.webp`;
}

/* ---- 1. Every entry is its file's size ---------------------------------- */

const wrong = Object.entries(sizes).flatMap(([key, [w, h]]) => {
  const real = webpSize(fileFor(key));
  if (!real) return [`${key}: no WebP at ${fileFor(key)}`];
  return real.width === w && real.height === h
    ? []
    : [`${key}: art-sizes says ${w}x${h}, the file is ${real.width}x${real.height}`];
});
check(
  `all ${Object.keys(sizes).length} art-sizes.json entries match their files`,
  wrong.length === 0,
  wrong.join("\n      ")
);

/* ---- 2. -xs files ------------------------------------------------------- */

const xsNames = Object.keys(sizes)
  .filter((k) => k.startsWith("xs/"))
  .map((k) => k.slice(3));
check(
  "every -xs entry has its -sm entry",
  xsNames.every((n) => n in sizes),
  xsNames.filter((n) => !(n in sizes)).join(", ")
);
for (const name of xsNames.filter((n) => n in sizes)) {
  const [w, h] = sizes[name];
  const [xw, xh] = sizes[`xs/${name}`];
  const drift = Math.abs(xw / xh / (w / h) - 1);
  const xs = fileFor(`xs/${name}`);
  const sm = fileFor(name);
  check(
    `${name}-xs keeps the -sm ratio and is lighter (${kb(xs)} vs ${kb(sm)})`,
    drift < 0.01 && bytes(xs) < bytes(sm),
    `ratio off by ${(drift * 100).toFixed(2)}%`
  );
}

/* ---- 3. Small pieces fetch small files ---------------------------------- */

const ART_FILES = [
  ...readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" }),
]
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `src/${f}`)
  .filter((f) => !f.endsWith("brand/Art.tsx") && !f.endsWith("brand/Ledge.tsx"));
const uses = ART_FILES.flatMap((file) => {
  const src = rendered(file);
  const tags = src.match(/<(?:Art|LedgeArt) /g)?.length ?? 0;
  const parsed = [
    ...src.matchAll(/<(?:Art|LedgeArt) name="([^"]+)" height=\{(\d+)\}/g),
  ].map((m) => ({ file, name: m[1], height: Number(m[2]) }));
  return parsed.length === tags
    ? parsed
    : [{ file, name: "(unparsed)", height: Number.NaN }];
});
check(
  "every Art and LedgeArt is written name=\"...\" height={n}, so this reads them all",
  uses.every((u) => !Number.isNaN(u.height)),
  uses.filter((u) => Number.isNaN(u.height)).map((u) => u.file).join(", ")
);
const small = uses.filter((u) => u.height <= XS_MAX);
const noXs = small.filter((u) => !(`xs/${u.name}` in sizes));
check(
  `every piece drawn ${XS_MAX}px tall or less has an -xs file (${small.length} uses)`,
  small.length > 0 && noXs.length === 0,
  noXs.map((u) => `${u.name} at ${u.height}px in ${u.file}`).join(", ")
);
const thin = small.filter(
  (u) => `xs/${u.name}` in sizes && sizes[`xs/${u.name}`][1] < 2 * u.height
);
check(
  "every -xs file is at least 2x the height it is drawn at",
  thin.length === 0,
  thin
    .map((u) => `${u.name} at ${u.height}px: -xs is ${sizes[`xs/${u.name}`][1]}px`)
    .join(", ")
);
for (const name of ["sit-divider", "pet-cat-peek"]) {
  const drawn = small.filter((u) => u.name === name).map((u) => u.height);
  check(
    `${name} is drawn on phones at ${drawn.join(", ") || "no height"}px and fetches its -xs file`,
    drawn.length > 0 && `xs/${name}` in sizes
  );
}

/* ---- 4. The footer's phone file ----------------------------------------- */

const PHONE = "/brand/site/illustrations/footer-town-strip-750.webp";
const footer = rendered(FOOTER);
const phoneSource = footer.match(/<source media="\(width < 40rem\)"[^>]*\/>/)?.[0] ?? "";
check(
  "below sm the footer's <source> is the 750w file alone, with its width and height",
  phoneSource ===
    `<source media="(width < 40rem)" srcSet="${PHONE}" width={750} height={318} />`,
  phoneSource || "no <source media=\"(width < 40rem)\">"
);
check(
  "the phone <source> has no sizes attribute",
  phoneSource !== "" && !/\bsizes=/.test(phoneSource)
);
check(
  "the 750w file is named only in that <source>, so from sm up it is never fetched",
  footer.split(PHONE).length === 2
);
check(
  "from sm up the <img> still offers the -sm (1200w) and full (2400w) files",
  footer.includes(
    'srcSet="/brand/site/illustrations/footer-town-strip-sm.webp 1200w, /brand/site/illustrations/footer-town-strip.webp 2400w"'
  )
);
{
  const file = `public${PHONE}`;
  const real = webpSize(file);
  const box = footer.match(/aspect-\[(\d+)\/(\d+)\]/);
  const boxRatio = box ? Number(box[1]) / Number(box[2]) : Number.NaN;
  check(
    "the 750w file is 750x318",
    real?.width === 750 && real?.height === 318,
    real ? `${real.width}x${real.height}` : `no WebP at ${file}`
  );
  check(
    "it has the phone box's ratio (within 1%), so object-cover crops nothing",
    real !== null && Math.abs(real.width / real.height / boxRatio - 1) < 0.01,
    `box ${box?.[0] ?? "not found"}`
  );
  const sm = `${SITE}/illustrations/footer-town-strip-sm.webp`;
  check(
    `it is lighter than the -sm file (${kb(file)} vs ${kb(sm)})`,
    real !== null && bytes(file) < bytes(sm)
  );
  const full = webpSize(`${SITE}/illustrations/footer-town-strip.webp`);
  const smReal = webpSize(sm);
  check(
    "the srcset's 1200w and 2400w are the files' real widths",
    smReal?.width === 1200 && full?.width === 2400,
    `${smReal?.width}w, ${full?.width}w`
  );
}

if (failures) {
  console.error(`\n${failures} art-file check(s) failed`);
  process.exit(1);
}
console.log("\nAll art-file checks passed.");
