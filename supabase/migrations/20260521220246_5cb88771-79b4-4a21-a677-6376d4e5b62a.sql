
REVOKE EXECUTE ON FUNCTION public.transfer_to_admin(numeric, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_send_to_user(numeric, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_to_admin(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_to_user(numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
