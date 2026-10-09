/* Shared by the source-scan verify scripts (verify-incumbent-chip.ts,
   verify-running-mate.ts, verify-campaign-website.ts): read and scan src/,
   strip comments, and build mutated copies so each guard is shown to catch
   the change it exists for (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §6,
   "mutation-checked"). Its name does not start with verify-, so verify-all
   does not run it on its own. */

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = resolve(import.meta.dirname, "..");

/** A repo file's text, by its path from the repo root. */
export const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

/* Block comments (JSX ones included, since {/* … *\/} is a block comment
   inside braces), then line comments that start a line or follow
   whitespace, so the "//" inside a URL string survives. */
export const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");

/** Every .ts, .tsx, .js, .jsx and .mjs file under the given folders, as
    paths from the repo root. */
export function sourceFiles(...dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [relative(ROOT, path)] : [];
    });
  return dirs.flatMap((dir) => walk(join(ROOT, dir)));
}

/** `text` with `from` replaced by `to`. Throws unless `from` occurs exactly
    once, so a mutant can never quietly be the original. */
export function edit(text: string, from: string | RegExp, to: string): string {
  const pattern =
    typeof from === "string"
      ? new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      : new RegExp(from.source, from.flags.includes("g") ? from.flags : `${from.flags}g`);
  const count = (text.match(pattern) ?? []).length;
  if (count !== 1) throw new Error(`edit: ${String(from)} occurs ${count} times, want 1`);
  return text.replace(pattern, () => to);
}

let scratch: string | null = null;
let made = 0;

/** Import a copy of a src/ module with `edits` applied. Its relative imports
    are pointed back at the real files, so only this one module differs. The
    copies live in a temp folder that is removed when the process exits. */
export async function importVariant<T>(
  file: string,
  edits: ReadonlyArray<readonly [string | RegExp, string]>,
): Promise<T> {
  let text = read(file);
  for (const [from, to] of edits) text = edit(text, from, to);
  const dir = dirname(join(ROOT, file));
  text = text.replace(
    /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (_all, open: string, spec: string, close: string) => `${open}${pathToFileURL(resolve(dir, spec)).href}${close}`,
  );
  if (!scratch) {
    const folder = mkdtempSync(join(tmpdir(), "kyv-variant-"));
    scratch = folder;
    process.on("exit", () => rmSync(folder, { recursive: true, force: true }));
  }
  const out = join(scratch, `${made++}-${file.replace(/[^\w.-]+/g, "_")}`);
  writeFileSync(out, text);
  return (await import(pathToFileURL(out).href)) as T;
}

/** check() prints one line per check; mutation() builds a mutant and passes
    only when the checks it runs report a problem; done() exits 1 on any
    failure. */
export function checker(label: string) {
  let failures = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) console.log(`  ok  ${name}`);
    else {
      failures++;
      console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };
  const mutation = async (name: string, run: () => string[] | Promise<string[]>) => {
    try {
      const problems = await run();
      check(`mutation caught: ${name}`, problems.length > 0, "the checks did not notice this change");
    } catch (err) {
      check(`mutation caught: ${name}`, false, `could not build the mutant: ${String(err)}`);
    }
  };
  const done = () => {
    if (failures) {
      console.error(`\n${failures} ${label} check(s) failed`);
      process.exit(1);
    }
    console.log(`\nAll ${label} checks passed.`);
  };
  return { check, mutation, done };
}
