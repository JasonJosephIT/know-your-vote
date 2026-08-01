/* "Keep in mind" list — device-local only (kyv.saved), no accounts, no
   network (FR-008). SSR-safe: every call no-ops off the browser. */

const KEY = "kyv.saved";
const EVENT = "kyv:saved-changed";

/* readSaved doubles as a useSyncExternalStore getSnapshot, which requires a
   referentially stable result while the stored value is unchanged — hence the
   raw-string cache and the shared EMPTY. Callers must not mutate the list. */
const EMPTY: string[] = [];
let cache: { raw: string; list: string[] } | null = null;

export function readSaved(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return EMPTY;
    if (!cache || cache.raw !== raw) {
      const list = JSON.parse(raw);
      cache = {
        raw,
        list: Array.isArray(list)
          ? list.filter((x) => typeof x === "string")
          : EMPTY,
      };
    }
    return cache.list;
  } catch {
    return EMPTY;
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable (private mode) — the toggle simply won't persist */
  }
}

export function isSaved(candidateId: string): boolean {
  return readSaved().includes(candidateId);
}

export function addSaved(candidateId: string) {
  if (typeof window === "undefined") return;
  const list = readSaved();
  if (!list.includes(candidateId)) write([...list, candidateId]);
}

export function removeSaved(candidateId: string) {
  if (typeof window === "undefined") return;
  write(readSaved().filter((id) => id !== candidateId));
}

export function toggleSaved(candidateId: string): boolean {
  const saved = isSaved(candidateId);
  if (saved) removeSaved(candidateId);
  else addSaved(candidateId);
  return !saved;
}

export function onSavedChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
