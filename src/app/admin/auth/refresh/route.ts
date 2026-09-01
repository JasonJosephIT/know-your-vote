import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/admin/guard";

/* Keeps the operator's Supabase session alive without a proxy.

   Server Components cannot write cookies, which is why session refresh used
   to live in proxy.ts. Next 16's Proxy is Node-runtime-only and OpenNext
   does not support Node middleware on workerd, so the proxy is gone (see
   docs/cloudflare-deploy.md). Route handlers CAN write cookies — the
   magic-link callback next door already relies on that — so the refresh
   moves here and SessionRefresh pings it from the console shell.

   getUser() revalidates the JWT against Supabase Auth and, when the access
   token has aged out, rotates it; createAdminServerClient's setAll then
   persists the new cookies because this is a route handler. Answers 204
   either way: it refreshes only the caller's own session and returns no
   data, so there is nothing to leak to an unauthenticated caller. */
export async function POST() {
  const supabase = await createAdminServerClient();
  await supabase.auth.getUser();
  return new NextResponse(null, { status: 204 });
}
