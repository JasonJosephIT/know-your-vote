/* The bars on short screens (home readability spec 2026-10-12, PR C;
   founder decision 4 (a), 2026-10-13).

   On a window 500px tall or less (a landscape phone, or a desktop at 200%
   or 400% zoom) the phone top bar and the section nav are static, at the top
   of the page, and scroll away with it. On every taller window they stay
   fixed, and at no size do they hide or slide on scroll. What goes with
   that, each pinned here:

   1. globals.css defines the `short:` variant once, at 31.25rem, and the
      root scroll padding on a short screen clears only the insets and the
      cookie banner. The phone and md padding for the fixed bars is unchanged.
   2. SectionNav: the header and the nav are fixed, and static under short:;
      the nav drops its shadow there and takes a bottom border. No scroll
      listener, no transform, no transition on either bar.
   3. layout.tsx: the body's padding for the bars goes under short:, and the
      cookie banner's --kyv-overlay-bottom term stays in every bottom value.
   4. SitePrompts: the cookie banner stays fixed, and on a short screen sits
      as far above the bottom edge as the short scroll padding expects.
   5. Compiled by Tailwind itself (@tailwindcss/node, which
      @tailwindcss/postcss builds the site with): `short:` is the max-height
      media query, and each short: class comes after the md: class it has to
      beat on a landscape phone, which is md wide and short.

   Source checks with comments stripped, plus one compile of globals.css.
   Run: node scripts/verify-short-screens.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";

const ROOT = resolve(import.meta.dirname, "..");
const read = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");
const code = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const flat = (s: string) => s.replace(/\s+/g, " ");

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const classesOf = (src: string, re: RegExp) =>
  (src.match(re)?.[1] ?? "").split(/\s+/).filter(Boolean);
const hasAll = (classes: string[], want: string[]) =>
  want.filter((c) => !classes.includes(c));

const OVERLAY = "var(--kyv-overlay-bottom,0px)";

/* ---- 1. the variant and the scroll padding ------------------------------ */
const cssPath = "src/app/globals.css";
const css = flat(code(cssPath));
check(
  "globals.css defines short: once, as max-height 31.25rem (500px)",
  css.split("@custom-variant short (@media (max-height: 31.25rem));").length === 2 &&
    (css.match(/@custom-variant short\b/g) ?? []).length === 1
);
check(
  "on a short screen the root scroll padding clears only the insets and the banner",
  css.includes(
    "@layer base { :root { @variant short { scroll-padding-top: calc(8px + env(safe-area-inset-top)); scroll-padding-bottom: calc( 8px + env(safe-area-inset-bottom) + var(--kyv-overlay-bottom, 0px) ); } } }"
  )
);
check(
  "the short padding is on :root, so it outranks the later html rule",
  !/html \{[^}]*@variant short/.test(css)
);
check(
  "the fixed bars' phone and md scroll padding is unchanged",
  css.includes("scroll-padding-top: calc(56px + env(safe-area-inset-top));") &&
    css.includes(
      "scroll-padding-bottom: calc( 96px + env(safe-area-inset-bottom) + var(--kyv-overlay-bottom, 0px) );"
    ) &&
    css.includes(
      "@variant md { scroll-padding-top: 88px; scroll-padding-bottom: calc(24px + var(--kyv-overlay-bottom, 0px)); }"
    )
);

/* ---- 2. the bars ---------------------------------------------------------- */
const navPath = "src/components/nav/SectionNav.tsx";
const nav = code(navPath);
const header = classesOf(nav, /<header\s+className="([^"]+)"/);
const bar = classesOf(nav, /<nav\s+aria-label="Sections"\s+className="([^"]+)"/);
{
  const missing = hasAll(header, ["fixed", "top-0", "md:hidden", "short:static"]);
  check("the phone top bar is fixed, and static on a short screen", missing.length === 0, missing.join(" "));
}
{
  const missing = hasAll(bar, [
    "fixed",
    "bottom-0",
    "shadow-elevation-2",
    "md:top-0",
    "short:static",
    "short:shadow-none",
    "short:border-t-0",
    "short:border-b",
  ]);
  check(
    "the section nav is fixed, and static with a bottom edge and no shadow on a short screen",
    missing.length === 0,
    missing.join(" ")
  );
}
check(
  "neither bar is sticky (short screens get static, not a bar that follows)",
  ![...header, ...bar].some((c) => /(^|:)sticky$/.test(c))
);
check(
  "no hide-on-scroll: no transform or transition on either bar",
  ![...header, ...bar].some((c) => /translate|transition|duration|animate/.test(c))
);
check(
  "no hide-on-scroll: SectionNav reads no scroll position",
  !/addEventListener\(\s*["']scroll|onScroll|scrollY|pageYOffset|IntersectionObserver|useScroll/.test(nav)
);

/* ---- 3. the body padding ---------------------------------------------------- */
const layoutPath = "src/app/layout.tsx";
const body = classesOf(code(layoutPath), /<body className="([^"]+)"/);
{
  const missing = hasAll(body, [
    `min-h-[calc(100%+${OVERLAY})]`,
    "pt-[calc(45px+env(safe-area-inset-top))]",
    `pb-[calc(88px+env(safe-area-inset-bottom)+${OVERLAY})]`,
    "md:pt-[72px]",
    `md:pb-[${OVERLAY}]`,
  ]);
  check("on taller screens the body still clears the fixed bars", missing.length === 0, missing.join(" "));
}
{
  const missing = hasAll(body, [
    "short:pt-0",
    `short:pb-[calc(env(safe-area-inset-bottom)+${OVERLAY})]`,
  ]);
  check(
    "on a short screen the body drops the bars' padding and keeps the bottom inset",
    missing.length === 0,
    missing.join(" ")
  );
}
{
  const pb = body.filter((c) => /(^|:)pb-/.test(c));
  check(
    "every bottom padding keeps the cookie banner's term",
    pb.length === 3 && pb.every((c) => c.includes(OVERLAY)),
    pb.join(" ")
  );
}

/* ---- 4. the cookie banner ------------------------------------------------- */
const promptsPath = "src/components/features/SitePrompts.tsx";
const prompts = code(promptsPath);
const banner = classesOf(prompts, /aria-label="Cookie choice"\s+className="([^"]+)"/);
{
  const missing = hasAll(banner, [
    "fixed",
    "bottom-[calc(96px+env(safe-area-inset-bottom))]",
    "md:bottom-5",
    "short:bottom-[calc(8px+env(safe-area-inset-bottom))]",
  ]);
  check(
    "the cookie banner stays fixed, above the nav on phones and 8px up on a short screen",
    missing.length === 0,
    missing.join(" ")
  );
}
{
  const bannerGap = banner.find((c) => c.startsWith("short:bottom-"))?.match(/calc\((\d+)px/)?.[1];
  const paddingGap = css.match(/@variant short \{[^}]*scroll-padding-bottom: calc\( (\d+)px/)?.[1];
  check(
    "the banner's short offset matches the short scroll padding, so focus stops above it",
    Boolean(bannerGap) && bannerGap === paddingGap,
    `${bannerGap} vs ${paddingGap}`
  );
}
check(
  "the banner still publishes its height as --kyv-overlay-bottom",
  /root\.style\.setProperty\(\s*"--kyv-overlay-bottom"/.test(prompts)
);

/* ---- 5. compiled order ------------------------------------------------------ */
{
  const compiler = await compile(read(cssPath), {
    base: `${ROOT}/src/app`,
    onDependency() {},
  });
  const all = [...header, ...bar, ...body, ...banner];
  const out = compiler.build(all);
  /* Tailwind's selector for a class: every character but letters, digits,
     - and _ backslash-escaped. */
  const at = (cls: string) =>
    out.indexOf(`.${cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)} {`);
  const missing = all.filter((c) => at(c) < 0);
  check("Tailwind emits every class the bars, body and banner use", missing.length === 0, missing.join(" "));
  const shortRule = out.slice(at("short:static"), at("short:static") + 200);
  check(
    "short: compiles to the max-height 31.25rem media query",
    /@media \(max-height: 31\.25rem\)\s*\{\s*position: static;/.test(shortRule),
    shortRule
  );
  check(
    "the short scroll padding compiles under the same query",
    /:root \{\s*@media \(max-height: 31\.25rem\) \{\s*scroll-padding-top: calc\(8px \+ env\(safe-area-inset-top\)\);/.test(out)
  );
  /* Each short: class against the md: class it must beat on a landscape
     phone (md wide, short): later in the stylesheet wins. */
  for (const [md, short] of [
    ["md:pt-[72px]", "short:pt-0"],
    [`md:pb-[${OVERLAY}]`, `short:pb-[calc(env(safe-area-inset-bottom)+${OVERLAY})]`],
    ["md:bottom-5", "short:bottom-[calc(8px+env(safe-area-inset-bottom))]"],
  ]) {
    check(`${short} comes after ${md}`, at(md) >= 0 && at(short) > at(md), `${at(md)} vs ${at(short)}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-short-screens: all checks passed.");
