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
  name: "send_contact_message",
  title: "Envoyer un message à l'équipe",
  description:
    "Envoie un message (sujet + contenu) aux administrateurs au nom de l'utilisateur connecté.",
  inputSchema: {
    subject: z.string().trim().min(1).max(200).describe("Sujet du message."),
    message: z.string().trim().min(1).max(5000).describe("Contenu du message."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ subject, message }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("contact_messages")
      .insert({ user_id: ctx.getUserId(), subject, message })
      .select("id,subject,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Message envoyé (id ${data.id}).` }],
      structuredContent: { message: data },
    };
  },
});
