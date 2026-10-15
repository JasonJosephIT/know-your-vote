/* "Mark your ballot": the voter's own choices, device-local only
   (kyv.picks), no accounts, no network. The page renders every name from the
   server and reads this only in the browser, so a choice never leaves the
   device. One entry per contest: race_id → candidate_id, measure_id →
   "yes" | "no". Same shape of store as saved.ts, and SSR-safe the same way. */

const KEY = "kyv.picks";
const EVENT = "kyv:picks-changed";

export type Picks = Readonly<Record<string, string>>;

/* readPicks doubles as a useSyncExternalStore getSnapshot, so it must return
   the same object while the stored value is unchanged (saved.ts). */
const EMPTY: Picks = {};
let cache: { raw: string; picks: Picks } | null = null;

export function readPicks(): Picks {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return EMPTY;
    if (!cache || cache.raw !== raw) {
      const parsed: unknown = JSON.parse(raw);
      cache = {
        raw,
        picks:
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? Object.fromEntries(
                Object.entries(parsed).filter(([, v]) => typeof v === "string")
              )
            : EMPTY,
      };
    }
    return cache.picks;
  } catch {
    return EMPTY;
  }
}

function write(picks: Picks) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(picks));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable (private mode): the mark simply won't persist */
  }
}

/** Mark one choice for a contest, or clear it with null. */
export function setPick(contestId: string, choice: string | null) {
  const next = { ...readPicks() };
  if (choice === null) delete next[contestId];
  else next[contestId] = choice;
  write(next);
}

export function clearPicks() {
  write(EMPTY);
}

export function onPicksChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
