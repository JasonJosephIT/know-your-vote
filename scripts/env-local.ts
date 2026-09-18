/* Load .env.local for a script, the way the rest of scripts/ does
   (`process.loadEnvFile`, as in verify-news-neutrality.ts) — with one addition
   that matters in this repo: A WORKTREE FALLBACK.

   Work here happens in git worktrees under .claude/worktrees/<name>/, and a
   worktree does NOT share .env.local with the main checkout — it is a separate
   working directory, and .env* is gitignored so nothing carries it across.
   Every worktree session therefore rediscovers the same confusion: the key is
   "added", but the script cannot see it.

   So: prefer this working directory's .env.local, and fall back to the main
   checkout's if there is none here. Which file was used is always printed to
   stderr, because silently reading credentials from a directory the caller
   did not name is worse than the confusion it fixes. */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Load .env.local and report which one. Returns the path used, or null. */
export function loadEnvLocal(scriptUrl: string): string | null {
  const root = path.dirname(path.dirname(fileURLToPath(scriptUrl)));
  const candidates = [path.join(root, ".env.local")];

  /* .claude/worktrees/<name>/ → up three to the main checkout. Only added when
     this really is a worktree path, so a normal checkout gets one candidate. */
  const marker = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  const i = root.indexOf(marker);
  if (i !== -1) candidates.push(path.join(root.slice(0, i), ".env.local"));

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    process.loadEnvFile(file);
    if (file !== candidates[0]) {
      console.error(`note: loaded ${file} (no .env.local in this worktree)`);
    }
    return file;
  }
  return null;
}
