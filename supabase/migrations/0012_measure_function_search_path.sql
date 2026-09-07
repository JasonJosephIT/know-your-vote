-- Pin search_path on the three measure functions from 0010.
--
-- Supabase's database linter flags them as `function_search_path_mutable`:
-- a SECURITY INVOKER function with an unset search_path resolves its table
-- references against whatever the *caller's* search_path happens to be, so a
-- role that can create a table in an earlier schema can shadow
-- `measure_argument` and make the balance check read rows we never wrote.
--
-- These three are the neutrality gate for ballot measures — the one part of
-- the ballot where no campaign is checking our work — so "low severity in
-- practice" is not a good enough reason to leave the hole open.
--
-- Setting search_path = '' means nothing resolves implicitly, so every
-- reference below is schema-qualified. Bodies are otherwise identical to
-- 0010; this migration changes resolution, not behaviour.

CREATE OR REPLACE FUNCTION public.measure_sides_balanced(m_id TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT COUNT(*) FILTER (WHERE side = 'support') > 0
     AND COUNT(*) FILTER (WHERE side = 'oppose')  > 0
     AND ABS(
           COUNT(*) FILTER (WHERE side = 'support')
         - COUNT(*) FILTER (WHERE side = 'oppose')
         ) <= 1
  FROM public.measure_argument WHERE measure_id = m_id;
$$;

CREATE OR REPLACE FUNCTION public.enforce_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND NOT public.measure_sides_balanced(NEW.measure_id) THEN
    RAISE EXCEPTION
      'measure % cannot be published: support and oppose arguments must both exist and differ by at most one',
      NEW.measure_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_published_measure_balance()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target TEXT := COALESCE(NEW.measure_id, OLD.measure_id);
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.measure_publication
    WHERE measure_id = target AND status = 'published'
  ) AND NOT public.measure_sides_balanced(target) THEN
    RAISE EXCEPTION
      'measure % is published: support and oppose arguments must both exist and differ by at most one',
      target;
  END IF;
  RETURN NULL;
END;
$$;
