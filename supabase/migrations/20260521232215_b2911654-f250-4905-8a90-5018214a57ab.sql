
-- Fix mutable search_path on generate_account_number
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
    n := 'ETS-' || lpad((floor(random()*100000000))::text, 8, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE account_number = n;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN n;
END;
$function$;

-- Revoke EXECUTE from anon (and public) on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_send_to_user(numeric, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_to_admin(numeric, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_to_user(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_to_admin(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
