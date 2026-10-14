/* The motion safety net (Mobbin reference catalog 2026-10-12, MO1;
   design.md "Motion on phones", founder decision D2, 2026-10-13): the
   motion tokens, the 2-cycle cap on Tailwind's animate-pulse and the global
   reduced-motion rule, all in src/app/globals.css.

   What would fail silently and matter:

     - A skeleton that pulses forever again. The race and candidate
       loading.tsx routes and NewsFeed pulse exactly where candidate content
       renders, and an endless pulse is WCAG 2.2.2's "moves for more than 5
       seconds".
     - The reduced-motion rule losing one of its declarations or an
       !important, which is what lets it beat the utilities and CSS
       modules.
     - A motion utility with Tailwind's important modifier (duration-300!
       or !duration-300). Among important declarations a layered one beats
       the unlayered reduced-motion rule, so it would keep its motion.
     - Tokens that drift from design.md's motion.* values.
     - A new looping animate-* utility, or a CSS animation outside a
       prefers-reduced-motion: no-preference gate (an @media rule or
       Tailwind's @variant motion-safe). animation: none is not motion.

   Pure source checks, offline. Run: node scripts/verify-motion.ts */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const read = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* The at-rule and selector preludes that enclose position `at`, outermost
   first. Comments must already be blanked out. */
function enclosing(css: string, at: number): string[] {
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < at; i++) {
    const c = css[i];
    if (c === "{") {
      stack.push(css.slice(start, i).trim());
      start = i + 1;
    } else if (c === "}") {
      stack.pop();
      start = i + 1;
    } else if (c === ";") start = i + 1;
  }
  return stack;
}

/* The body of the block whose prelude starts at `at`. */
function blockBody(css: string, at: number): string {
  const open = css.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  return "";
}

const globals = stripComments(read("src/app/globals.css"));
const design = read("docs/design.md");

/* ---- 1. The tokens match design.md --------------------------------------- */

const motion = Object.fromEntries(
  [...(/^motion:\n((?: {2}.+\n)+)/m.exec(design)?.[1] ?? "").matchAll(
    /^ {2}(\w+): "(.+)"$/gm
  )].map((m) => [m[1], m[2]])
);
check(
  "design.md lists motion.fast, base, slow and easing",
  ["fast", "base", "slow", "easing"].every((k) => typeof motion[k] === "string"),
  JSON.stringify(motion)
);
{
  const at = globals.search(/:root\s*\{\s*--motion-fast/);
  const body = at >= 0 ? blockBody(globals, at) : "";
  for (const [token, key] of [
    ["--motion-fast", "fast"],
    ["--motion-base", "base"],
    ["--motion-slow", "slow"],
    ["--ease-kyv", "easing"],
  ]) {
    check(
      `globals.css :root has ${token}: ${motion[key]} (design.md motion.${key})`,
      body.includes(`${token}: ${motion[key]};`)
    );
  }
  check(
    "the token block is unlayered",
    at >= 0 && enclosing(globals, at).length === 0
  );
}
check(
  "the utilities' default transition is motion.fast on the standard easing",
  globals.includes(`--default-transition-duration: ${motion.fast};`) &&
    globals.includes(`--default-transition-timing-function: ${motion.easing};`)
);

/* ---- 2. animate-pulse stops after 4s and rests still --------------------- */

{
  const decl = /--animate-pulse:\s*pulse\s+(\d+(?:\.\d+)?)s\s+cubic-bezier\([^)]*\)\s+(\d+);/.exec(
    globals
  );
  const seconds = decl ? Number(decl[1]) * Number(decl[2]) : Infinity;
  check(
    "@theme caps animate-pulse at a whole number of cycles",
    decl !== null && enclosing(globals, decl.index).join(" > ") === "@theme",
    decl?.[0] ?? "no --animate-pulse in @theme"
  );
  check(
    `the pulse stops inside WCAG 2.2.2's 5 seconds (${Number.isFinite(seconds) ? `${seconds}s` : "never"})`,
    seconds < 5
  );
  check(
    "globals.css keeps Tailwind's own pulse keyframes",
    !/@keyframes\s+pulse\b/.test(globals)
  );
  const tw = read("node_modules/tailwindcss/theme.css");
  check(
    "Tailwind's pulse keyframes dim only at 50%, so the last frame is full opacity",
    /@keyframes pulse\s*\{\s*50%\s*\{\s*opacity:\s*0?\.5;?\s*\}\s*\}/.test(tw)
  );
}

/* ---- 3. The reduced-motion rule ------------------------------------------ */

{
  const at = globals.indexOf("@media (prefers-reduced-motion: reduce)");
  check("globals.css has a prefers-reduced-motion: reduce rule", at >= 0);
  const body = at >= 0 ? blockBody(globals, at) : "";
  const decls = (/\{([^}]*)\}/.exec(body)?.[1] ?? "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  const weak = decls.filter((d) => !/!important$/.test(d));
  check(
    "every declaration in it is !important, so it beats the utilities and CSS modules",
    decls.length > 0 && weak.length === 0,
    weak.join("; ")
  );
  check(
    "it covers every element and its ::before and ::after",
    /^\s*\*,\s*::before,\s*::after\s*\{/.test(body)
  );
  for (const d of [
    "animation-duration: 1ms !important;",
    "animation-iteration-count: 1 !important;",
    "transition-duration: 1ms !important;",
    "scroll-behavior: auto !important;",
  ]) {
    check(`it sets ${d}`, body.includes(d));
  }
}

/* ---- 4. Nothing else loops ----------------------------------------------- */

function walk(dir: string): string[] {
  return readdirSync(`${ROOT}/${dir}`, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(`${dir}/${e.name}`)
      : /\.(tsx?|css)$/.test(e.name)
        ? [`${dir}/${e.name}`]
        : []
  );
}
const files = walk("src");
{
  /* Tailwind animate-* utilities, including variants and arbitrary values.
     animate-pulse is the capped one; animate-none stops motion. */
  const allowed = new Set(["pulse", "none"]);
  const found = files.flatMap((f) =>
    [...read(f).matchAll(/(?<![\w-])animate-(\[[^\]]*\]|[\w-]+)/g)]
      .filter((m) => !allowed.has(m[1]))
      .map((m) => `${f}: ${m[0]}`)
  );
  check(
    "the only animate-* utility in src is the capped animate-pulse (a new one needs its own cap)",
    found.length === 0,
    found.join(", ")
  );
}
{
  /* Tailwind's important modifier, trailing or leading, on a motion utility,
     with or without a variant or value. Its !important sits in the
     utilities layer, which outranks the unlayered reduced-motion rule. */
  const found = files.flatMap((f) => {
    const src = f.endsWith(".css") ? stripComments(read(f)) : read(f);
    return [
      ...src.matchAll(
        /(?<=^|[\s"'`:])(?:!(?:transition|duration|animate|ease|delay)(?:-[\w.%/,()[\]-]+)?|(?:transition|duration|animate|ease|delay)(?:-[\w.%/,()[\]-]+)?!)(?=$|[\s"'`;])/gm
      ),
    ].map((m) => `${f}: ${m[0]}`);
  });
  check(
    "no motion utility in src carries Tailwind's important modifier",
    found.length === 0,
    found.join(", ")
  );
}
{
  const ungated = files
    .filter((f) => f.endsWith(".css"))
    .flatMap((f) => {
      const css = stripComments(read(f));
      return [...css.matchAll(/\banimation(?:-name)?\s*:(?!\s*none\b)/g)]
        .filter(
          (m) =>
            !enclosing(css, m.index ?? 0).some(
              (p) =>
                /^@media\b.*prefers-reduced-motion:\s*no-preference/.test(p) ||
                /^@variant\s+motion-safe\b/.test(p)
            )
        )
        .map((m) => `${f}@${m.index}`);
    });
  check(
    "every CSS animation in src sits inside a prefers-reduced-motion: no-preference gate",
    ungated.length === 0,
    ungated.join(", ")
  );
}

/* ---- 5. design.md states the rule beside "Art on phones" ----------------- */

{
  const paras = design.split(/\n\n+/);
  const art = paras.findIndex((p) => p.startsWith("**Art on phones"));
  const next = paras[art + 1] ?? "";
  check(
    "design.md has a \"Motion on phones\" paragraph right after \"Art on phones\"",
    art >= 0 && next.startsWith("**Motion on phones.**")
  );
  check(
    "it states the founder's 2026-10-13 reading (D2)",
    next.includes(
      "Below lg nothing moves except colour changes and loading indicators; every fade, rise or slide is lg and up and only under `prefers-reduced-motion: no-preference` (founder, 2026-10-13)."
    )
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-motion: all checks passed.");
