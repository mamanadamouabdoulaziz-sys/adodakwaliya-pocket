-- 1) Column-level UPDATE restriction on profiles (defense-in-depth)
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (first_name, last_name) ON public.profiles TO authenticated;

-- 2) Fix mutable search_path on generate_account_number
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  n text;
  exists_count int;
BEGIN
  LOOP
    n := 'SBN-' || lpad((floor(random()*100000000))::text, 8, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE account_number = n;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN n;
END;
$function$;