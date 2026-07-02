/* "Keep in mind" list — device-local only (kyv.saved), no accounts, no
   network (FR-008). SSR-safe: every call no-ops off the browser. */

const KEY = "kyv.saved";
const EVENT = "kyv:saved-changed";

export function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
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
