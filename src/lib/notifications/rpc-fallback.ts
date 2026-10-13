/* Subscriber lookups go through SQL functions, so an address or an
   unsubscribe token travels in a request body rather than a URL.

   Supabase's API gateway logs every PostgREST request URL, query string
   and all, and a filter puts its value there: .eq("email", email) is
   ?email=eq.ana%40example.com in the log, and .eq("unsubscribe_token", t)
   puts the one credential that unsubscribes a voter beside it. A function
   call, service.rpc(name, args), is a POST to /rest/v1/rpc/<name> with the
   arguments in the body, and bodies are not logged. Migration
   0058_subscription_lookups.sql defines one function for each query that
   used to filter on an address or a token.

   That migration is pasted into the Supabase SQL editor by hand, and the
   code may deploy before it is. So each caller asks the function first
   and, only when PostgREST answers that no such function exists
   (PGRST202), runs the query it ran before. Any other error is a database
   error and is handled as it always was: it never falls back, so a
   failure cannot quietly turn into a different query. Once 0058 is
   applied the fallbacks never run, and they can go.

   PGRST202 is also PostgREST's answer to a call whose argument names match
   no function, so a misspelt name would fall back for ever and still work,
   with the value back in the URL. Three things guard against that:
   scripts/verify-migrations.mjs calls every 0058 function with the names
   the code sends, the verify scripts for each caller pin those names, and
   a fallback says so in the server log (once per function per instance,
   naming only the function) so a fallback still running after 0058 is
   applied shows there.

   No server-only and no @/ imports, so the verify scripts can load it, and
   the modules that use it, in plain Node. */

/* PostgREST: "Could not find the function ... in the schema cache". */
export const NO_SUCH_FUNCTION = "PGRST202";

const reported = new Set<string>();

/* Whether an .rpc() error means "this function is not there yet", in which
   case the caller runs its old query. */
export function functionMissing(
  fn: string,
  error: { code?: string | null } | null | undefined
): boolean {
  if (error?.code !== NO_SUCH_FUNCTION) return false;
  if (!reported.has(fn)) {
    reported.add(fn);
    console.warn(
      `${fn}: not in the database yet (migration 0058), so this lookup ran its old query`
    );
  }
  return true;
}
