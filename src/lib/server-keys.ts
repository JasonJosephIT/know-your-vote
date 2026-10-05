import "server-only";

/* The two server secrets, read under either name. Vercel production stores
   the Supabase service-role key as SUPABASE and the Resend API key as
   RESEND (the founder's names, confirmed 2026-10-05). The code was written
   for SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY, and reading only those
   left the service client, the email signup, both crons, the deadline
   banner and the calendar file failing in production.

   These are read at the call site, not mapped once at startup. A mapping
   in the root instrumentation.ts never took effect on Vercel: with a src/
   folder, next build looks for the hook only under src/ (it searches the
   app folder's parent), so the compiled root hook is left out of
   required-server-files.json and never deployed.

   An empty canonical variable counts as unset and falls through to the
   production name (`||`, not `??`): every caller already treats an empty
   key as missing, and .env.example ships both canonical names blank.

   To retire the fallbacks, add the canonical names in Vercel, redeploy, and
   reduce each function to its first operand. */
export function serviceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE;
}

export function resendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY || process.env.RESEND;
}
