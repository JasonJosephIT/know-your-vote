import { createServerClient } from "@supabase/ssr";

/* Anonymous read client for Server Components, route handlers, and cached
   reads. RLS is the security boundary: the anon role can only SELECT
   published read models, news, and zip_district. There are no user sessions,
   so the cookie adapter is deliberately inert — that also keeps this client
   safe inside unstable_cache (no request-time APIs). */
export async function createAnonServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          /* no sessions to persist */
        },
      },
    }
  );
}
