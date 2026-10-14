-- 0058_subscription_lookups.sql
-- Six SQL functions for the lookups and updates that find a subscriber by
-- address or unsubscribe token, so the address or token travels in the
-- body of a POST to /rest/v1/rpc/<name> instead of in a request URL.
--
-- WHY. Supabase's API gateway logs every PostgREST request URL, query
-- string included, and keeps it for the log retention period. A filter
-- such as .eq("email", email) is ?email=eq.ana%40example.com in that URL,
-- and .eq("unsubscribe_token", token) puts the credential that unsubscribes
-- a voter there too. Request bodies are not logged. Hashing the value in
-- the URL would not help: a hashed address is still the same identifier
-- in every log line, and anyone holding a list of addresses can hash them
-- to match. The founder asked (2026-10-13) that what voters give us not
-- sit readable in request logs. The ZIP and census-block reads were fixed
-- in code alone, by reading their public tables whole and filtering in
-- memory (src/lib/resolve.ts); voting_info_subscription is private and
-- grows with every signup, so it cannot be read whole on every request,
-- and needs these functions instead.
--
-- One function per call site, each doing exactly what the PostgREST query
-- it replaces did (src/lib/notifications/welcome-throttle.ts,
-- unsubscribe.ts and rehearsal.ts):
--
--   subscription_welcomed_zips   the 24-hour welcome throttle's read
--   subscription_mark_welcomed   the welcome email's last_sent_at stamp
--   subscription_email_for_token the unsubscribe link's token lookup
--   subscription_is_active       "is any row for this address still on?"
--   subscription_unsubscribe     active = false on the address's active rows
--   subscription_for_rehearsal   the cron rehearsals' one active row
--
-- Exact matches throughout, as the queries were: the signup stores the
-- address trimmed and lower-cased, and ILIKE would read "_" as a wildcard.
--
-- SECURITY INVOKER: each runs with the caller's rights, so the function
-- grants nothing the caller does not already hold. The only caller is
-- service_role (src/lib/supabase/service.ts), which already reads and
-- writes the table. EXECUTE is revoked by name from PUBLIC, anon and
-- authenticated, because Supabase's default privileges grant every new
-- function to anon and authenticated explicitly and REVOKE ... FROM PUBLIC
-- alone leaves those grants standing (0020 has the post-mortem). An empty
-- search_path, with every table named by schema, means no object a caller
-- creates can stand in for one these functions use.
--
-- SAFE BEFORE AND AFTER. The code calls each function first and, when
-- PostgREST answers PGRST202 ("no such function"), falls back to the query
-- it used before (src/lib/notifications/rpc-fallback.ts). So the code can
-- deploy before this file is applied, and nothing breaks if it never is;
-- until it is, the addresses and tokens are still in those URLs.
--
-- Apply: paste the whole file into the Supabase SQL editor. Idempotent
-- (CREATE OR REPLACE, then the grants again); one transaction. Read back
-- (read-only):
--   SELECT p.proname, p.prosecdef, p.proconfig,
--          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname LIKE 'subscription\_%'
--    ORDER BY 1;
--   -> six rows, prosecdef false, proconfig {search_path=""},
--      anon_exec false, service_exec true.
-- Rollback: DROP FUNCTION each of the six; the code falls back on its own.

BEGIN;

-- welcome-throttle.ts welcomeSentWithinWindow: the ZIPs this address was
-- sent a welcome for since p_since, up to p_limit of them. A NULL
-- last_sent_at (never mailed, or the send failed) never matches.
CREATE OR REPLACE FUNCTION public.subscription_welcomed_zips(
  p_email TEXT,
  p_since TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS TABLE (zip5 CHAR(5))
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT s.zip5
    FROM public.voting_info_subscription s
   WHERE s.email = p_email
     AND s.last_sent_at >= p_since
   LIMIT p_limit;
$$;

-- POST /api/voting-info: stamp the row once Resend accepted its welcome.
CREATE OR REPLACE FUNCTION public.subscription_mark_welcomed(
  p_token TEXT,
  p_sent_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.voting_info_subscription
     SET last_sent_at = p_sent_at
   WHERE unsubscribe_token = p_token;
$$;

-- unsubscribe.ts addressFor: the address on the token's row, or NULL.
-- unsubscribe_token is UNIQUE, so there is one row at most.
CREATE OR REPLACE FUNCTION public.subscription_email_for_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT s.email
    FROM public.voting_info_subscription s
   WHERE s.unsubscribe_token = p_token;
$$;

-- unsubscribe.ts subscribed: whether any row for the address is active.
CREATE OR REPLACE FUNCTION public.subscription_is_active(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.voting_info_subscription s
     WHERE s.email = p_email
       AND s.active
  );
$$;

-- unsubscribe.ts unsubscribe: active = false on every active row for the
-- address, in one statement, and how many it turned off.
CREATE OR REPLACE FUNCTION public.subscription_unsubscribe(p_email TEXT)
RETURNS INTEGER
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH turned_off AS (
    UPDATE public.voting_info_subscription
       SET active = false
     WHERE email = p_email
       AND active
    RETURNING 1
  )
  SELECT count(*)::INTEGER FROM turned_off;
$$;

-- rehearsal.ts rehearsalSubscription: one active row for any of the given
-- spellings of an address. First in token order, the row the scheduled
-- send mails when an address holds two (cohort.ts reads in token order).
CREATE OR REPLACE FUNCTION public.subscription_for_rehearsal(p_emails TEXT[])
RETURNS TABLE (email TEXT, unsubscribe_token TEXT, zip5 CHAR(5))
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT s.email, s.unsubscribe_token, s.zip5
    FROM public.voting_info_subscription s
   WHERE s.email = ANY (p_emails)
     AND s.active
   ORDER BY s.unsubscribe_token
   LIMIT 1;
$$;

-- By name: FROM PUBLIC alone leaves Supabase's explicit grants to anon and
-- authenticated in place (0020).
REVOKE ALL ON FUNCTION public.subscription_welcomed_zips(TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_mark_welcomed(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_email_for_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_is_active(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_unsubscribe(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_for_rehearsal(TEXT[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.subscription_welcomed_zips(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_mark_welcomed(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_email_for_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_is_active(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_unsubscribe(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_for_rehearsal(TEXT[]) TO service_role;

COMMIT;

-- PostgREST reads functions from its schema cache. Supabase reloads it on
-- DDL by itself; this asks once more, so the first call after the paste
-- does not answer PGRST202 (which would only mean one more fallback).
NOTIFY pgrst, 'reload schema';
