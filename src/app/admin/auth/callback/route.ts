import { NextResponse, type NextRequest } from "next/server";
import { createAdminServerClient, isAllowlisted } from "@/lib/admin/guard";

/* Magic-link return (design.md § 5). Exchange the one-time PKCE code for a
   session, then re-verify the allowlist server-side — defense in depth: the
   login action already refuses non-allowlisted emails, but this is the actual
   boundary. A non-allowlisted sign-in is signed straight back out so it can
   never yield a usable session. Route handlers can write cookies, so the
   exchange persists the session through createAdminServerClient's setAll. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`);
  }

  const supabase = await createAdminServerClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/admin/login?error=exchange_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowlisted(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?denied=1`);
  }

  return NextResponse.redirect(`${origin}/admin`);
}
