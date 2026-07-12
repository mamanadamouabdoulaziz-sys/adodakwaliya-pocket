import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import listNotificationsTool from "./tools/list-notifications";
import listMessagesTool from "./tools/list-messages";
import sendMessageTool from "./tools/send-message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ado-da-kwaliya-mcp",
  title: "Ado Da Kwaliya",
  version: "0.1.0",
  instructions:
    "Outils pour l'application Ado Da Kwaliya. Consultez le profil, les notifications et l'historique des messages de l'utilisateur, ou envoyez un message aux administrateurs (commandes de repas, colis, contact).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, listNotificationsTool, listMessagesTool, sendMessageTool],
});
