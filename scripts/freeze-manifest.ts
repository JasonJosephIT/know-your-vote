/* The code tripwire for the content freeze
   (docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md
   §3.6.3; founder decision BC10, recommended pending founder confirmation).

   The frozen files are what renders ballot content: the race, race-issues,
   candidate, measure and methodology pages and what they import that shapes
   a brief, a roster, a party or incumbency label, a contact block or a
   measure. From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC a change to one
   of them is a correction, and it has to show in the diff with its
   correction note beside it.

   The manifest, docs/general-election/freeze-2026-10-18.json, holds the
   window and each frozen file's sha256. It is written last in the
   freeze-copy PR by `node scripts/verify-freeze.ts --write`, after every
   other frozen-file change has merged. A correction pull request changes
   the file, sets that entry's sha256 to the new hash and adds
   "correction": "docs/general-election/corrections/<file>.md" to it.

   This module is pure (no fs, no clock): scripts/verify-freeze.ts hands it
   the hashes and the time, and scripts/verify-freeze-rules.ts drives it
   with fixtures. It is a tripwire, not a lock: anyone can edit the
   manifest. It blocks a merge only once main requires the CI checks
   (docs/ci.md §1, founder checklist D6). */

export const MANIFEST_PATH = "docs/general-election/freeze-2026-10-18.json";
export const CORRECTIONS_DIR = "docs/general-election/corrections/";

/* The same two instants as 0050's content_freeze row (Sun 2026-10-18 00:00
   EDT, Wed 2026-11-04 00:00 EST). verify-freeze-rules.ts checks that the
   migration and this constant agree. */
export const FREEZE_WINDOW = {
  starts_at: "2026-10-18T04:00:00.000Z",
  ends_at: "2026-11-04T05:00:00.000Z",
} as const;

/* §3.6.3, in its order. Add a file here in the same PR that adds it to the
   render path (roster-completeness's code PR does this for its files). */
export const FROZEN_FILES: readonly string[] = [
  "src/app/(public)/races/[raceId]/page.tsx",
  "src/app/(public)/races/[raceId]/issues/page.tsx",
  "src/app/(public)/candidates/[candidateId]/page.tsx",
  "src/app/(public)/measures/[measureId]/page.tsx",
  "src/app/(public)/methodology/page.tsx",
  "src/components/features/RaceCompare.tsx",
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/IssueSection.tsx",
  "src/components/features/IssueRows.tsx",
  "src/components/features/IssueFilter.tsx",
  "src/components/features/ClaimList.tsx",
  "src/components/features/SourceLinks.tsx",
  "src/components/features/RaceHeader.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/CandidateListing.tsx",
  "src/components/features/CandidateContact.tsx",
  "src/components/features/CandidateBrowser.tsx",
  "src/components/features/CountyRaces.tsx",
  "src/components/features/YourRaces.tsx",
  "src/components/features/SharedBallot.tsx",
  "src/components/features/SavedCandidates.tsx",
  "src/components/features/JudicialRetentionNote.tsx",
  "src/components/features/MeasureResourceLadder.tsx",
  "src/components/features/MeasureResourceRow.tsx",
  "src/components/features/MeasureVoteMeaning.tsx",
  "src/components/features/MeasureThreshold.tsx",
  "src/components/ui/PartyChip.tsx",
  "src/components/ui/PolicyAreaChip.tsx",
  "src/components/ui/VerdictBadge.tsx",
  "src/lib/listing-copy.ts",
  "src/lib/measure-held-copy.ts",
  "src/lib/listing.ts",
  "src/lib/briefs.ts",
  "src/lib/races.ts",
  "src/lib/race-rows.ts",
  "src/lib/resolve.ts",
  "src/lib/measures.ts",
  "src/lib/measure-ladder.ts",
  "src/lib/ballot-order.ts",
  "src/lib/judicial-retention.ts",
  "src/lib/incumbency.ts",
  "src/lib/party-label.ts",
  "src/lib/contact.ts",
  "src/lib/issue-pick.ts",
  "src/lib/office-title.ts",
];

export interface FreezeWindow {
  starts_at: string;
  ends_at: string;
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  correction?: string;
}

export interface FreezeManifest {
  about: string;
  window: FreezeWindow;
  files: ManifestEntry[];
}

export interface CheckResult {
  ok: boolean;
  lines: string[];
}

const ABOUT =
  "Content-freeze manifest (ballot-content-completion §3.6.3). From window.starts_at to window.ends_at, " +
  "scripts/verify-freeze.ts fails when a frozen file's sha256 differs from its entry here. A correction PR " +
  "changes the file, sets the entry's sha256 to the new hash and adds " +
  '"correction": "docs/general-election/corrections/<file>.md" (a file that must exist).';

export function inWindow(window: FreezeWindow, now: Date): boolean {
  const t = now.getTime();
  return t >= Date.parse(window.starts_at) && t < Date.parse(window.ends_at);
}

export function buildManifest(
  hashOf: (path: string) => string,
  files: readonly string[] = FROZEN_FILES
): FreezeManifest {
  return {
    about: ABOUT,
    window: { starts_at: FREEZE_WINDOW.starts_at, ends_at: FREEZE_WINDOW.ends_at },
    files: files.map((path) => ({ path, sha256: hashOf(path) })),
  };
}

/* JSON from disk, checked for the shape checkManifest relies on. Throws
   with a reason a person can act on. */
export function parseManifest(text: string): FreezeManifest {
  const raw: unknown = JSON.parse(text);
  const fail = (why: string): never => {
    throw new Error(`${MANIFEST_PATH} ${why}`);
  };
  if (typeof raw !== "object" || raw === null) return fail("is not a JSON object");
  const m = raw as Record<string, unknown>;
  const w = m.window as Record<string, unknown> | undefined;
  if (
    typeof w !== "object" || w === null ||
    typeof w.starts_at !== "string" || typeof w.ends_at !== "string" ||
    Number.isNaN(Date.parse(w.starts_at)) || Number.isNaN(Date.parse(w.ends_at)) ||
    Date.parse(w.ends_at) <= Date.parse(w.starts_at)
  ) {
    return fail("has no valid window (starts_at < ends_at, both ISO dates)");
  }
  if (!Array.isArray(m.files)) return fail("has no files array");
  const files: ManifestEntry[] = m.files.map((e: unknown, i: number) => {
    const entry = e as Record<string, unknown>;
    if (typeof entry?.path !== "string" || typeof entry?.sha256 !== "string") {
      return fail(`files[${i}] needs a string path and sha256`);
    }
    if (entry.correction !== undefined && typeof entry.correction !== "string") {
      return fail(`files[${i}].correction must be a string`);
    }
    return entry.correction === undefined
      ? { path: entry.path, sha256: entry.sha256 }
      : { path: entry.path, sha256: entry.sha256, correction: entry.correction };
  });
  return {
    about: typeof m.about === "string" ? m.about : "",
    window: { starts_at: w.starts_at, ends_at: w.ends_at },
    files,
  };
}

/* A correction note is one file directly in CORRECTIONS_DIR, named like
   2026-10-25-<slug>.md: no "..", no subfolder, no backslash, and not the
   README. So a named path cannot resolve to some other existing file. */
const CORRECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
export function isCorrectionPath(named: string): boolean {
  if (!named.startsWith(CORRECTIONS_DIR)) return false;
  const name = named.slice(CORRECTIONS_DIR.length);
  return CORRECTION_NAME.test(name) && name.toLowerCase() !== "readme.md";
}

/* The check. Inside the manifest's window a hash difference, a missing
   file or a frozen-file list that no longer matches the manifest fails;
   outside it they are printed and pass. A named correction file that does
   not exist fails at any time. Lines start "  ok  ", "  note  " or
   "FAIL  ", as every verify script's do. */
export function checkManifest(
  manifest: FreezeManifest,
  opts: {
    now: Date;
    hashOf: (path: string) => string | null;
    exists: (path: string) => boolean;
    frozenFiles?: readonly string[];
  }
): CheckResult {
  const frozen = opts.frozenFiles ?? FROZEN_FILES;
  const inside = inWindow(manifest.window, opts.now);
  const differences: string[] = [];
  const failures: string[] = [];
  const listed = new Set(manifest.files.map((f) => f.path));

  for (const entry of manifest.files) {
    const actual = opts.hashOf(entry.path);
    if (actual === null) {
      differences.push(`${entry.path} is missing`);
    } else if (actual !== entry.sha256) {
      differences.push(
        `${entry.path} differs from the manifest (manifest ${entry.sha256}, file ${actual})`
      );
    }
    if (entry.correction !== undefined) {
      const named = entry.correction;
      if (!isCorrectionPath(named)) {
        failures.push(`${entry.path} names "${named}", which is not a ${CORRECTIONS_DIR}*.md file`);
      } else if (!opts.exists(named)) {
        failures.push(`${entry.path} names correction ${named}, which does not exist`);
      }
    }
  }
  for (const path of frozen) {
    if (!listed.has(path)) differences.push(`${path} is frozen but not in the manifest`);
  }
  for (const path of listed) {
    if (!frozen.includes(path)) differences.push(`${path} is in the manifest but no longer frozen`);
  }

  const lines: string[] = [];
  const where = inside
    ? `inside the freeze window (${manifest.window.starts_at} to ${manifest.window.ends_at})`
    : `outside the freeze window (${manifest.window.starts_at} to ${manifest.window.ends_at})`;
  if (inside) {
    for (const d of differences) {
      lines.push(
        `FAIL  ${d}. In the freeze a frozen file changes only as a correction: set its sha256 to the file's hash and add "correction": "${CORRECTIONS_DIR}<file>.md".`
      );
    }
  } else {
    for (const d of differences) lines.push(`  note  ${d} (${where}: not a failure)`);
  }
  for (const f of failures) lines.push(`FAIL  ${f}`);
  const ok = failures.length === 0 && (!inside || differences.length === 0);
  if (ok) {
    lines.push(
      `  ok  ${manifest.files.length} frozen files checked ${where}` +
        (differences.length ? `; ${differences.length} differ` : "; all match the manifest")
    );
  }
  return { ok, lines };
}
