import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_notifications",
  title: "Lister mes notifications",
  description: "Retourne les notifications récentes de l'utilisateur connecté.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Nombre maximum (défaut 20)."),
    unread_only: z.boolean().optional().describe("Ne renvoyer que les non lues."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, unread_only }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("notifications")
      .select("id,title,body,read,created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (unread_only) q = q.eq("read", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
