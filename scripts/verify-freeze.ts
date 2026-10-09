/* The content freeze's code tripwire, run by verify-all.mjs in CI
   (ballot-content-completion §3.6.3, founder decision BC10; the rules live
   in scripts/freeze-manifest.ts).

   - No manifest yet (until the freeze-copy PR writes it): prints
       "  ok  no freeze manifest yet (docs/general-election/freeze-2026-10-18.json); nothing to compare"
     and exits 0. It never claims SKIPPED, which verify-all.mjs keeps for a
     missing environment variable.
   - With the manifest, inside its window: fails when a frozen file's sha256
     differs from its entry, a frozen file is missing, or the frozen-file
     list and the manifest disagree. Outside the window it prints those and
     passes.
   - At any time: fails when an entry names a correction file that does not
     exist.

   Usage:
     node scripts/verify-freeze.ts                 check
     node scripts/verify-freeze.ts --write         write the manifest (refused
                                                   inside the window)
     --root <dir>  check or write another tree (tests)
     --now <iso>   use this time instead of the clock (tests)

   Run: node scripts/verify-freeze.ts */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  FREEZE_WINDOW,
  FROZEN_FILES,
  MANIFEST_PATH,
  buildManifest,
  checkManifest,
  inWindow,
  parseManifest,
  type FreezeManifest,
} from "./freeze-manifest.ts";

const argv = process.argv.slice(2);
function option(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

const root = path.resolve(option("--root") ?? path.join(import.meta.dirname, ".."));
const nowOption = option("--now");
const now = nowOption === undefined ? new Date() : new Date(nowOption);
if (Number.isNaN(now.getTime())) {
  console.error(`FAIL  --now ${nowOption} is not a date`);
  process.exit(1);
}

const abs = (p: string) => path.join(root, p);
const hashOf = (p: string): string | null =>
  existsSync(abs(p))
    ? createHash("sha256").update(readFileSync(abs(p))).digest("hex")
    : null;

if (argv.includes("--write")) {
  if (inWindow(FREEZE_WINDOW, now)) {
    console.error(
      `FAIL  --write refused inside the freeze window (${FREEZE_WINDOW.starts_at} to ${FREEZE_WINDOW.ends_at}). ` +
        `A correction edits its own entry in ${MANIFEST_PATH} (docs/general-election/corrections/README.md).`
    );
    process.exit(1);
  }
  const missing = FROZEN_FILES.filter((f) => hashOf(f) === null);
  if (missing.length > 0) {
    console.error(`FAIL  frozen files not found: ${missing.join(", ")}`);
    process.exit(1);
  }
  const manifest = buildManifest((p) => hashOf(p) ?? "");
  mkdirSync(path.dirname(abs(MANIFEST_PATH)), { recursive: true });
  writeFileSync(abs(MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`  ok  wrote ${MANIFEST_PATH} (${manifest.files.length} frozen files)`);
  process.exit(0);
}

if (!existsSync(abs(MANIFEST_PATH))) {
  console.log(`  ok  no freeze manifest yet (${MANIFEST_PATH}); nothing to compare`);
  process.exit(0);
}

let manifest: FreezeManifest;
try {
  manifest = parseManifest(readFileSync(abs(MANIFEST_PATH), "utf8"));
} catch (err) {
  console.error(`FAIL  ${(err as Error).message}`);
  process.exit(1);
}

const result = checkManifest(manifest, {
  now,
  hashOf,
  exists: (p) => existsSync(abs(p)),
});
for (const line of result.lines) {
  if (line.startsWith("FAIL")) console.error(line);
  else console.log(line);
}
process.exit(result.ok ? 0 : 1);
