/* The methodology page's snapshot and freeze copy: the "Briefs are a
   snapshot." bullet and the scrutiny summary's "as of" clause
   (docs/superpowers/specs/2026-10-08-ballot-content-completion-design.md
   §3.4 and §3.6.4; founder decisions BC1, BC3 and BC11, recommended pending
   founder confirmation). A frozen file from 2026-10-18 (§3.6.3).

   WHICH PATH SHIPS is the one setting below, SNAPSHOT. The founder has not
   answered BC1 (Gate 0, checklist A7) as of 2026-10-09, so it is built for
   the state today: no refresh. Switching before the freeze-copy PR merges is
   an edit to SNAPSHOT alone; scripts/verify-freeze-copy.ts fails a setting
   that does not match its path. What each path puts on the page, with
   {LABEL} the snapshot date in words and {EMAIL} CONTACT_EMAIL:

   - "no-refresh" (BC1 TO FLIP, or no answer): date "2026-09-29".
       We read the candidates’ sites on {LABEL}. Anything added or changed
       on a site since then isn’t here. From October 18 through Election Day
       we change a brief only to correct an error. To report one, email
       {EMAIL}.
     The scrutiny summary keeps "… quotes, all as of {LABEL}." The 09-29
     figures ("about 45 of every 100", "56 of 90 readable sites") stay.

   - "1c" (only the five re-run): date stays "2026-09-29", because the
     other 92 candidates were not read again. rereadNames lists, in the
     order of rerun-targets-2026-10.tsv, only those of the five whose race
     was re-applied from the 1c run; rereadDate is the UTC date 1c started.
       We read the candidates’ sites on {LABEL}, and read {names} again on
       {rereadDate}, because on September 29 we could not read their sites,
       or a page of them. Anything added … email {EMAIL}.
     With no name the sentence is the no-refresh one. With names, the
     scrutiny summary reads "… quotes, from the sites as read on {LABEL},
     except as listed under “Briefs are a snapshot”." The 09-29 figures
     stay.

   - "full-refresh" (1a and 1b, BC1 as recommended): date becomes the UTC
     date 1a started, if every published race was re-applied or found
     identical (refresh plan, "After the last race" step 2).
     fullRefreshException is the text that follows the date, naming every
     candidate with a kept 7a run and every race left on its 09-29 brief
     (step 3), for example
       " (September 29 for <names>, whose sites, or a page of them, we
       could not read again)"
     or "" when there is none. Then the carry-forward sentence (BC3), which
     only this path has, because only it carried 09-29 results forward:
       We read the candidates’ sites on {LABEL}{exception}. Where a page
       said the same thing as when we read it on September 29, 2026, we kept
       that reading’s result, and we kept reading the same pages as then
       unless a homepage’s links had changed. Anything added … email
       {EMAIL}.
     With an exception the scrutiny summary points to the bullet, as for
     1c. The 09-29 figures in methodology/page.tsx are recomputed from the
     merged runs by hand (§3.4, "The numbers from the 09-29 run").

   "isn't here yet" is gone on every path: nothing more is coming before
   Nov 3. No path names a candidate except as a re-read or an exception,
   and those are named for what we did, not for what they said.

   Why a constant, not a query: no table records the ingest date.
   source.retrieved_at keeps the FIRST time a URL was seen (ON CONFLICT DO
   NOTHING), so it reads 2026-09-27 for FL-GOV's pages. The 09-29 date is
   the Jev-link ingest (brief-runs/ingest-jev-2026-09-29.md), which FL-GOV
   was re-ingested in too (FL-GOV/decisions.md, 2026-09-29).

   Relative import with the extension: scripts/verify-freeze-copy.ts imports
   this with plain Node. */

import { CONTACT_EMAIL } from "./contact.ts";

export type SnapshotPath = "no-refresh" | "1c" | "full-refresh";

export interface SnapshotSettings {
  path: SnapshotPath;
  /** BRIEF_SNAPSHOT_DATE, YYYY-MM-DD: the day behind every "as of" line. */
  date: string;
  /** full-refresh only: the text right after the date, or "". */
  fullRefreshException: string;
  /** 1c only: the re-read candidates whose race was re-applied, in order. */
  rereadNames: readonly string[];
  /** 1c only: YYYY-MM-DD, the UTC date 1c started; "" with no names. */
  rereadDate: string;
}

/* ===== THE SETTING. Change only this block to switch paths. ============ */
export const SNAPSHOT: SnapshotSettings = {
  path: "no-refresh",
  date: "2026-09-29",
  fullRefreshException: "",
  rereadNames: [],
  rereadDate: "",
};
/* ======================================================================== */

export const BRIEF_SNAPSHOT_DATE = SNAPSHOT.date;

function dateLabel(iso: string, style: "long" | "monthDay" = "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { dateStyle: "long", timeZone: "UTC" }
      : { month: "long", day: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-US", options).format(new Date(`${iso}T12:00:00Z`));
}

export const SNAPSHOT_LABEL = dateLabel(BRIEF_SNAPSHOT_DATE);

const NAME_LIST = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });

const CARRY_FORWARD =
  "Where a page said the same thing as when we read it on September 29, 2026, we kept that reading’s result, and we kept reading the same pages as then unless a homepage’s links had changed.";

const FREEZE_TAIL =
  "Anything added or changed on a site since then isn’t here. From October 18 through Election Day we change a brief only to correct an error. To report one, email";

function namesException(s: SnapshotSettings): boolean {
  if (s.path === "1c") return s.rereadNames.length > 0;
  if (s.path === "full-refresh") return s.fullRefreshException !== "";
  return false;
}

/* The bullet after its heading. The page renders beforeEmail, then the
   address as a mailto link, then a full stop. */
export function snapshotBullet(s: SnapshotSettings = SNAPSHOT): {
  beforeEmail: string;
  email: string;
  namesException: boolean;
} {
  let first = `We read the candidates’ sites on ${dateLabel(s.date)}`;
  if (s.path === "1c" && s.rereadNames.length > 0) {
    first += `, and read ${NAME_LIST.format(s.rereadNames)} again on ${dateLabel(
      s.rereadDate
    )}, because on ${dateLabel(s.date, "monthDay")} we could not read their sites, or a page of them`;
  } else if (s.path === "full-refresh") {
    first += s.fullRefreshException;
  }
  const sentences = [`${first}.`];
  if (s.path === "full-refresh") sentences.push(CARRY_FORWARD);
  sentences.push(FREEZE_TAIL);
  return { beforeEmail: sentences.join(" "), email: CONTACT_EMAIL, namesException: namesException(s) };
}

/* The scrutiny summary's clause after "… quotes, " (§3.4). */
export function scrutinyAsOf(s: SnapshotSettings = SNAPSHOT): string {
  const label = dateLabel(s.date);
  return namesException(s)
    ? `from the sites as read on ${label}, except as listed under “Briefs are a snapshot”`
    : `all as of ${label}`;
}
