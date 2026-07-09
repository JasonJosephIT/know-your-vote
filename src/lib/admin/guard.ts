import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

/* The admin authorization model, in one place (design.md § 5). The voter app
   has no accounts — `authenticated` has zero policies — so this allowlist is
   the ENTIRE authorization surface: a Supabase Auth session whose email is in
   ADMIN_EMAILS is an operator; everyone else is not.
   requireAdmin()/checkAdmin() are used by BOTH the proxy and every admin RSC /
   route handler; the proxy is UX, the in-handler check is the boundary
   (CVE-2025-29927 — Next.js middleware/proxy is a known bypass class). */

/* ADMIN_EMAILS: comma-separated, compared case-folded. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/* Honest-degradation gate: sign-in is only possible once the founder sets
   ADMIN_EMAILS (roadmap TASK-A00b). The login screen names this when unset. */
export function isAdminAuthConfigured(): boolean {
  return adminEmails().length > 0;
}

export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/* Session-aware Supabase client bound to the request cookies. Unlike
   createAnonServerClient (deliberately session-less for the voter app), this
   reads and refreshes the operator's Supabase Auth session. setAll is wrapped
   because Server Components cannot mutate cookies mid-render — the proxy
   refreshes them instead (the standard @supabase/ssr pattern). Route handlers
   and Server Actions CAN write, so exchange/sign-out through this client work. */
export async function createAdminServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* invoked from a Server Component render — the proxy owns refresh */
          }
        },
      },
    }
  );
}

export type AdminGate =
  | { ok: true; user: User; email: string }
  | { ok: false; status: 401 | 403; error: string };

/* The single authorization boundary. getUser() revalidates the JWT against
   Supabase Auth (not just a cookie decode), so this is a real check, not an
   optimistic one. 401 = no valid session; 403 = valid session, email not on
   the allowlist. Wrapped in React cache() so a layout and its page dedupe the
   check within one server render. */
export const checkAdmin = cache(async (): Promise<AdminGate> => {
  const supabase = await createAdminServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "Not signed in." };
  }
  if (!isAllowlisted(user.email)) {
    return { ok: false, status: 403, error: "Not an authorized operator." };
  }
  return { ok: true, user, email: (user.email ?? "").toLowerCase() };
});

/* RSC/layout convenience: redirect to the sign-in screen on any failure and
   return the operator on success. Next.js auth guidance: layouts do not
   re-render on client navigation, so each admin PAGE calls this too — the
   layout call renders the shell, the per-page call is the security boundary. */
export async function requireAdmin(): Promise<{ user: User; email: string }> {
  const gate = await checkAdmin();
  if (!gate.ok) {
    redirect(gate.status === 403 ? "/admin/login?denied=1" : "/admin/login");
  }
  return { user: gate.user, email: gate.email };
}
