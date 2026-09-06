import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* Admin gate (design.md § 5). Next.js 16 renamed the `middleware` convention to
   `proxy` (see node_modules/next/dist/docs/.../proxy.md); this is that file.
   Two jobs, both UX — the real authorization boundary is checkAdmin() inside
   every admin RSC / route handler (CVE-2025-29927: never trust the proxy
   alone):
     1. Refresh the Supabase Auth session cookie, since Server Components can't
        write cookies themselves (standard @supabase/ssr flow).
     2. Bounce unauthenticated visitors of the admin PAGES to the sign-in
        screen, so they never render a broken shell.
   It intentionally does NOT enforce the ADMIN_EMAILS allowlist — a signed-in
   but non-allowlisted user is turned away by requireAdmin() with ?denied=1
   (and the magic-link callback tears down such a session before it forms). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* The sign-in screen and the magic-link callback must stay reachable without
     a session, or sign-in would loop / break. */
  const isPublicAdmin =
    pathname === "/admin/login" || pathname.startsWith("/admin/auth");

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  /* getUser() revalidates the JWT and, as a side effect, writes refreshed
     cookies onto `response` via setAll above. With no session cookie this
     returns null WITHOUT a network round-trip. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isPublicAdmin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  /* Guard only the admin PAGES. /api/admin/* handlers self-verify and answer
     JSON 401/403 — redirecting an API request to an HTML login page would be
     wrong — so they are deliberately outside the matcher. */
  matcher: ["/admin/:path*"],
};
