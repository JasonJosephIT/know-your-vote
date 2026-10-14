/* Guardrail for phone visuals round 2, PR 3 (docs/design/mobile-visuals-
   2026-10-14/; founder decisions 2A and 6B, 2026-10-14): the line icons on
   a voter's own tasks and /privacy's headings, the magnifier beside "On
   this page", and the error page's spot.

   design.md's "Art on phones" line makes the Glyphs.tsx line icons product
   UI, not art, on two conditions that would fail silently:

   1. Their shapes. No tick (it reads as "verified"), no filled shape and no
      oval: at 20px a 1.75 stroke closes a small oval into a solid dot, which
      reads as a marked ballot. Every icon is drawn from the shared
      aria-hidden svg (currentColor, 1.75 stroke, no fill). The one circle,
      the pin's centre, keeps r >= 2 so it stays a ring at 14px.
   2. Where they go. Only on a voter's own tasks and a prose page's
      headings: the sample-ballot tiles, keyed by task and never by county;
      the key-dates links, with the five stops left plain; and /privacy,
      one per heading at one size and colour, so no point is marked out.
      Nothing else imports them, so none can land on a candidate, party,
      race, a measure's YES/NO, a verdict or a news item. No legend over the
      county rows (decision 6B).

   Then the two art pieces:

   3. The "On this page" magnifier is one 30px Art at every width, with no
      breakpoint gate.
   4. The error page shows the 404's piece as one plain img (it is a client
      component, and Art would pull art-sizes.json into its chunk): the same
      file and sizes as the 404, its box reserved, decorative and lazy.

   And design.md states the rule.

   Source checks read the files with comments stripped, so a comment
   quoting a class or a string cannot pass or fail them. Pure and offline:
   no DB, no network.

   Run: node scripts/verify-task-icons.ts */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { FROZEN_FILES } from "./freeze-manifest.ts";

const ROOT = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const artSizes: Record<string, [number, number]> = JSON.parse(
  source("src/components/brand/art-sizes.json")
);
const stripComments = (src: string) =>
  src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
const code = (file: string) => stripComments(source(file));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const GLYPHS = "src/components/ui/Glyphs.tsx";
const TILES = "src/components/features/VotingResources.tsx";
const BANNER = "src/components/features/DeadlineBanner.tsx";
const RAIL = "src/components/features/KeyDatesRail.tsx";
const PRIVACY = "src/app/(public)/privacy/page.tsx";
const GLANCE = "src/components/features/BallotAtAGlance.tsx";
const ERROR = "src/app/error.tsx";
const NOT_FOUND = "src/app/not-found.tsx";

/* The line icons design.md's line governs, and the only files that may
   draw them. */
const TASK_ICONS = [
  "BallotGlyph",
  "PinGlyph",
  "CalendarGlyph",
  "MailGlyph",
  "BellGlyph",
  "PhoneGlyph",
  "MapGlyph",
  "HouseGlyph",
  "MessageGlyph",
  "ChartGlyph",
  "AdGlyph",
  "BugGlyph",
  "SlidersGlyph",
];
const ALLOWED = new Set([GLYPHS, TILES, BANNER, PRIVACY]);

const glyphs = code(GLYPHS);

/* The body of one exported glyph, from its declaration to the next. */
function glyphBody(name: string): string {
  const start = glyphs.indexOf(`export function ${name}(`);
  if (start < 0) return "";
  const next = glyphs.indexOf("\nexport function ", start + 1);
  return glyphs.slice(start, next < 0 ? undefined : next);
}

/* ---- 1. Their shapes ---------------------------------------------------- */

console.log("\n1. Shapes");
check(
  "the shared svg is a 20-unit grid, unfilled, a 1.75 currentColor stroke, aria-hidden",
  /const svg = \{\s*viewBox: "0 0 20 20",\s*fill: "none",\s*stroke: "currentColor",\s*strokeWidth: 1\.75,\s*"aria-hidden": true,/.test(
    glyphs
  )
);
const tick = glyphBody("CheckGlyph").match(/d="([^"]+)"/)?.[1] ?? "";
check("CheckGlyph's tick path was read", tick.length > 0);
for (const name of TASK_ICONS) {
  const body = glyphBody(name);
  check(
    `${name} is drawn from the shared svg and takes a className`,
    new RegExp(
      `^export function ${name}\\(\\{ className = svg\\.className \\}: \\{ className\\?: string \\}\\) \\{\\s*return \\(\\s*<svg \\{\\.\\.\\.svg\\} className=\\{className\\}>`
    ).test(body)
  );
  const circles = [...body.matchAll(/<circle\b[^>]*\br="([\d.]+)"/g)].map((m) => Number(m[1]));
  check(
    `${name} has no fill, no ellipse, no tick, and no circle small enough to close`,
    !/\bfill=/.test(body) &&
      !/<ellipse\b/.test(body) &&
      !body.includes(tick) &&
      !/\bstrokeWidth=/.test(body) &&
      circles.every((r) => r >= 2),
    circles.length ? `circle radii: ${circles.join(", ")}` : ""
  );
  check(`${name} has no motion`, !/animate-|transition/.test(body));
}
check(
  "the ballot is a ruled sheet: a rect and straight lines, no circle",
  /<rect\b/.test(glyphBody("BallotGlyph")) && !/<circle\b/.test(glyphBody("BallotGlyph"))
);

/* ---- 2. Where they go --------------------------------------------------- */

console.log("\n2. Placements");
{
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|mjs|js)$/.test(entry)) files.push(relative(ROOT, full));
    }
  };
  walk(join(ROOT, "src"));
  const users = files.filter((f) => {
    if (f === GLYPHS) return false;
    const imports = [...code(f).matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/components\/ui\/Glyphs"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim()))
      .filter(Boolean);
    return imports.some((n) => TASK_ICONS.includes(n));
  });
  const stray = users.filter((f) => !ALLOWED.has(f));
  check(
    "only the sample-ballot tiles, the key dates and /privacy draw the line icons",
    stray.length === 0 && users.length === 3,
    `drawn in: ${users.join(", ")}`
  );
  check("no frozen file draws them", !users.some((f) => FROZEN_FILES.includes(f)));
}

const tiles = code(TILES);
{
  const map = tiles.match(/const TILE_GLYPH = \{([\s\S]*?)\} as const;/)?.[1] ?? "";
  const pairs = [...map.matchAll(/"?([\w-]+)"?:\s*(\w+Glyph)/g)].map((m) => `${m[1]}=${m[2]}`);
  check(
    "one icon per task, keyed by the tile: ballot, pin, calendar, mail",
    pairs.join(" ") ===
      "sample-ballot=BallotGlyph polling-place=PinGlyph early-voting=CalendarGlyph mail=MailGlyph",
    pairs.join(" ")
  );
  const keys = code("src/lib/voter-resources.ts").match(/key:\s*((?:"[\w-]+"\s*\|?\s*)+);/)?.[1] ?? "";
  check(
    "the map covers every tile key, so no tile goes without one",
    [...keys.matchAll(/"([\w-]+)"/g)].map((m) => m[1]).sort().join(" ") ===
      ["early-voting", "mail", "polling-place", "sample-ballot"].join(" ")
  );
  check(
    "never keyed by county: the icon comes from the tile's key alone",
    /const Glyph = TILE_GLYPH\[t\.key\];/.test(tiles) && !/TILE_GLYPH\[[^\]]*(fips|county)/i.test(tiles)
  );
  check(
    "the icon is 20px and comes before the label, so the link's name still starts with the label",
    /<span className="flex items-start gap-3">\s*<Glyph className="block size-\[20px\] shrink-0" \/>\s*<span className="flex flex-col gap-0\.5">\s*<span className="text-label">\{t\.label\}<\/span>/.test(
      tiles
    ) && /<span className="sr-only">, \{who\} \(opens in a new tab\)<\/span>/.test(tiles)
  );
  check(
    "no legend of the icons over the county rows (decision 6B)",
    (tiles.match(/<Glyph\b/g) ?? []).length === 1 && !/TILE_GLYPH\)/.test(tiles)
  );
}

const banner = code(BANNER);
check(
  "the key-dates links lead with a calendar and a bell, 1em, on the first line",
  /const link =\s*"inline-flex min-h-\[24px\] w-fit items-start gap-\[6px\] text-body-sm underline underline-offset-2";/.test(
    banner
  ) &&
    /const glyph = "mt-\[0\.25em\] block size-\[1em\] shrink-0";/.test(banner) &&
    /className=\{link\}\s*>\s*<CalendarGlyph className=\{glyph\} \/>\s*Add these dates to your calendar \(downloads a file\)/.test(
      banner
    ) &&
    /<a href=\{remindersHref\} className=\{link\}>\s*<BellGlyph className=\{glyph\} \/>\s*Get deadline reminders by email/.test(
      banner
    )
);
check(
  "the five stops stay plain: the rail draws none of the line icons",
  !TASK_ICONS.some((n) => code(RAIL).includes(n))
);

const privacy = code(PRIVACY);
{
  const h2s = [...privacy.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)];
  const marked = h2s.filter((m) =>
    /^\s*<h2 className=\{heading\}>\s*<(\w+Glyph) className=\{icon\} \/>\s*[^<{]+\S\s*<\/h2>$/.test(m[0])
  );
  check(
    "every /privacy heading has one icon, first, at the same class, and nothing else",
    h2s.length >= 8 && marked.length === h2s.length,
    `${marked.length} of ${h2s.length}`
  );
  const used = h2s.map((m) => m[1].match(/<(\w+Glyph)/)?.[1] ?? "");
  check(
    "each heading's icon is its own, and one of the line icons",
    new Set(used).size === used.length && used.every((n) => TASK_ICONS.includes(n)),
    used.join(", ")
  );
  check(
    "one size and one colour for every heading's icon",
    /const heading = "flex items-start gap-2 text-h2";/.test(privacy) &&
      /const icon = "mt-\[4px\] block size-\[20px\] shrink-0 text-primary";/.test(privacy)
  );
}

/* ---- 3. The "On this page" magnifier ------------------------------------ */

console.log("\n3. The magnifier beside \"On this page\"");
{
  const glance = code(GLANCE);
  const arts = [...glance.matchAll(/<Art\b[\s\S]*?\/>/g)].map((m) => m[0]);
  check(
    "one magnifier, 30px, at every width",
    arts.length === 1 &&
      /name="sticker-magnifier"/.test(arts[0]) &&
      /height=\{30\}/.test(arts[0]) &&
      /className="absolute bottom-0 left-\[calc\(100%\+8px\)\]"/.test(arts[0]),
    arts.join("\n")
  );
}

/* ---- 4. The error page's spot ------------------------------------------- */

console.log("\n4. The error page's spot");
{
  const error = code(ERROR);
  const img = error.match(/<img\b[\s\S]*?\/>/)?.[0] ?? "";
  const [w, h] = artSizes["error-404-funk"];
  check(
    "error.tsx stays a client component that doesn't import Art or art-sizes.json",
    /^\s*"use client";/.test(source(ERROR)) && !/brand\/Art|art-sizes/.test(error)
  );
  check(
    "one img of the 404's piece, its box reserved at the file's size",
    (error.match(/<img\b/g) ?? []).length === 1 &&
      img.includes('src="/brand/site/illustrations/error-404-funk-sm.webp"') &&
      img.includes(`width={${w}}`) &&
      img.includes(`height={${h}}`) &&
      existsSync(join(ROOT, "public/brand/site/illustrations/error-404-funk-sm.webp")),
    img
  );
  check(
    "decorative and lazy: aria-hidden wrapper, alt=\"\", no pointer events, not eager",
    /<span aria-hidden="true" className="pointer-events-none select-none">\s*<img\b/.test(error) &&
      img.includes('alt=""') &&
      img.includes('loading="lazy"') &&
      img.includes('decoding="async"') &&
      img.includes("draggable={false}") &&
      !/fetchPriority|eager/.test(img)
  );
  check(
    "120px on a phone and 220px from lg, the same sizes as the 404",
    img.includes('className="block h-[120px] w-auto max-w-none lg:h-[220px]"') &&
      /<Art name="error-404-funk" height=\{120\} className="lg:hidden" \/>/.test(code(NOT_FOUND)) &&
      /<Art name="error-404-funk" height=\{220\} className="hidden lg:block" \/>/.test(code(NOT_FOUND))
  );
  check(
    "it sits on its own row above the heading",
    error.indexOf("<img") >= 0 && error.indexOf("<img") < error.indexOf("<h1")
  );
}

/* ---- 5. design.md states the rule --------------------------------------- */

console.log("\n5. design.md");
{
  const line =
    source("docs/design.md")
      .split(/\n\n+/)
      .find((p) => p.startsWith("**Art on phones")) ?? "";
  check(
    "\"Art on phones\" lists the magnifier at every width and the error page's spot",
    line.includes('the magnifier beside "On this page" (30px, the same piece at every width)') &&
      line.includes("one spot each on the 404 and the error page (120px, the same piece)")
  );
  check(
    "it makes the line icons product UI, on a voter's own tasks and /privacy's headings, with no tick, filled shape or oval",
    line.includes("Line icons drawn in Glyphs.tsx (20-unit grid, 1.75 stroke, currentColor, aria-hidden) are product UI, not art") &&
      line.includes("they mark a voter's own task (the sample-ballot tiles, the key-dates actions) or a prose page's headings (/privacy)") &&
      line.includes("they carry no tick, filled shape or ballot oval")
  );
  check(
    "no legend: the line doesn't add one (decision 6B)",
    !/the sample-ballot tiles and their legend/.test(line)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-task-icons: all checks passed.");
