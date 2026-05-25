import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminContacts = createServerFn({ method: "GET" }).handler(async () => {
  const { data: roles, error: rErr } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (rErr) throw new Error(rErr.message);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return { admins: [] as Array<{ first_name: string; last_name: string; phone: string }> };
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name, phone")
    .in("id", ids);
  if (pErr) throw new Error(pErr.message);
  return { admins: profiles ?? [] };
});
