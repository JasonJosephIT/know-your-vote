/* The PWA manifest (src/app/manifest.ts) points only at files that exist,
   and carries no store screenshots until real ones are made (launch fixes,
   2026-10-05).

   The two screenshots it listed rendered as empty phone frames under
   captions that overclaimed, and their SVG sources showed fact-check
   verdicts, a "verified record" and an uncovered State Senate race. They
   were removed with the field. docs/brand-assets-roadmap.md sets the bar for
   bringing them back: a real UI crop, no fake data.

   Run: node scripts/verify-manifest.ts */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import manifest from "../src/app/manifest.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const m = manifest();
const files = [...(m.icons ?? []), ...(m.screenshots ?? [])].map((i) => i.src);
const missing = files.filter((src) => !existsSync(path.join(root, "public", src)));
check(`every icon the manifest names exists in public/ (${files.length})`, files.length > 0 && missing.length === 0, missing.join(", "));
check("no store screenshots until real UI crops exist", (m.screenshots ?? []).length === 0);

/* Nothing in the app still links the removed files. */
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return sourceFiles(rel);
    return /\.(tsx?|css|json)$/.test(e.name) ? [rel] : [];
  });
}
const linking = sourceFiles("src").filter((rel) =>
  /screenshot-[12]-(ballot|race)\./.test(readFileSync(path.join(root, rel), "utf8"))
);
check("no source file references the removed screenshots", linking.length === 0, linking.join(", "));
check(
  "the removed screenshot files are gone from public/brand/mobile",
  !readdirSync(path.join(root, "public/brand/mobile")).some((f) => /^screenshot-/.test(f))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nManifest checks passed.");
