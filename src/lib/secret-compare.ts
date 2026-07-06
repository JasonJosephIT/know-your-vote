import { createHash, timingSafeEqual } from "node:crypto";

/* Constant-time secret comparison (plan A7a). Hashing both sides first
   equalizes lengths, so timingSafeEqual never throws and the comparison
   leaks neither content nor length. Use for every header-vs-env secret
   check (cron auth, webhook auth) — never `===`. */
export function secretEquals(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
