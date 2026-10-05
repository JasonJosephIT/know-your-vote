/* Vercel production keeps two secrets under the founder's own names:
   SUPABASE is the Supabase service-role key, and RESEND is the Resend API
   key (confirmed by the founder, 2026-10-05). The code reads
   SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY, so until this mapping
   existed the service client, the email signup, both crons, the deadline
   banner and the calendar file all failed in production.

   register() runs once, before the server handles any request (Next.js
   instrumentation docs), so mapping the names here covers every call site
   without any of them knowing.

   A correctly named variable always wins, including an empty one:
   scripts/verify-all.mjs withholds the service key from scripts by
   setting it to "". The copy happens only when the old name holds a
   value, because assigning undefined to process.env stores the string
   "undefined", which would read as a key.

   JEV, the TypeSafe key, is not mapped: no deployed code reads
   TYPESAFE_API_KEY, only local scripts do.

   To retire this, add SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY in
   Vercel, redeploy, and delete mapProductionEnvNames(). */
function mapProductionEnvNames() {
  const aliases: [canonical: string, productionName: string][] = [
    ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE"],
    ["RESEND_API_KEY", "RESEND"],
  ];
  for (const [canonical, productionName] of aliases) {
    const value = process.env[productionName];
    if (process.env[canonical] === undefined && value) {
      process.env[canonical] = value;
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    mapProductionEnvNames();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.server.config");
  }
}

export async function onRequestError(...args: unknown[]) {
  const Sentry = await import("@sentry/nextjs");
  return (
    Sentry.captureRequestError as (...a: unknown[]) => unknown
  )(...args);
}
