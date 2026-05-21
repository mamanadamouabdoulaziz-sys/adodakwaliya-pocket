import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-brand-gradient text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        <header className="flex items-center justify-between">
          <div className="font-extrabold tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">ADO DA KWALIYA</div>
          <Button variant="secondary" onClick={() => navigate({ to: "/auth" })}>Se connecter</Button>
        </header>

        <div className="flex-1 flex flex-col justify-center py-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-black/40 border border-white/20 px-3 py-1 text-xs uppercase tracking-widest mb-6 text-white">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Plateforme financière interne
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.8)]">
            ADO DA KWALIYA <span className="text-primary">MONEY</span>
          </h1>
          <p className="mt-4 text-white/90 max-w-xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            Créez votre compte, recevez vos recharges et envoyez de l'argent à l'administration —
            sans aucun frais.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-semibold"
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}>
              Créer mon compte
            </Button>
            <Button size="lg" variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20 font-semibold"
              onClick={() => navigate({ to: "/auth" })}>
              J'ai déjà un compte
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-12">
            {[
              { icon: Wallet, t: "Compte unique", d: "Numéro de compte généré automatiquement." },
              { icon: Zap, t: "Transferts gratuits", d: "Aucun frais d'envoi ni de réception." },
              { icon: ShieldCheck, t: "Sécurisé", d: "Authentification, chiffrement, protection anti-fraude." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl bg-black/40 backdrop-blur-sm p-5 border border-white/15">
                <Icon className="h-6 w-6 text-primary" />
                <div className="mt-3 font-semibold text-white">{t}</div>
                <div className="text-sm text-white/80 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-xs text-white/70 pt-6">
          © {new Date().getFullYear()} ADO DA KWALIYA — Tous droits réservés.
        </footer>
      </div>
    </div>
  );
}
