import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthNS = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

const oauthClient = (supabase.auth as unknown as { oauth: OAuthNS }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("authorization_id manquant");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { mode: "login", next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-bold">Impossible de charger cette demande</h1>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthClient.approveAuthorization(authorization_id)
      : await oauthClient.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune redirection reçue du serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "Cette application";

  return (
    <main className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Connecter {clientName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            à votre compte Ado Da Kwaliya
          </p>
        </div>
        <p className="text-sm">
          {clientName} pourra utiliser les outils de cette application en votre nom (consulter votre
          profil, vos notifications, vos messages et envoyer des messages à l'équipe).
        </p>
        <p className="text-xs text-muted-foreground">
          Vos règles d'accès (RLS) continuent de s'appliquer : {clientName} ne verra que vos propres
          données.
        </p>
        {error && (
          <div role="alert" className="text-sm text-destructive border border-destructive/40 rounded-md p-2">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
            {busy ? "…" : "Autoriser"}
          </Button>
          <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
            Refuser
          </Button>
        </div>
      </div>
    </main>
  );
}
