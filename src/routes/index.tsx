import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-brand-gradient text-primary-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        <header className="flex items-center justify-between">
          <div className="font-bold tracking-widest">ADO DA KWALIYA</div>
          <Button variant="secondary" onClick={() => navigate({ to: "/auth" })}>Se connecter</Button>
        </header>

        <div className="flex-1 flex flex-col justify-center py-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest mb-6">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Plateforme financière interne
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            ADO DA KWALIYA <span className="text-accent">MONEY</span>
          </h1>
          <p className="mt-4 text-primary-foreground/80 max-w-xl">
            Créez votre compte, recevez vos recharges et envoyez de l'argent à l'administration —
            sans aucun frais.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow"
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}>
              Créer mon compte
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10"
              onClick={() => navigate({ to: "/auth" })}>
              J'ai déjà un compte
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-12">
            {[
              { icon: Wallet, t: "Compte unique", d: "Numéro ETS-XXXXXXXX généré automatiquement." },
              { icon: Zap, t: "Transferts gratuits", d: "Aucun frais d'envoi ni de réception." },
              { icon: ShieldCheck, t: "Sécurisé", d: "Authentification, chiffrement, protection anti-fraude." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl bg-white/10 backdrop-blur-sm p-5 border border-white/10">
                <Icon className="h-6 w-6 text-accent" />
                <div className="mt-3 font-semibold">{t}</div>
                <div className="text-sm text-primary-foreground/70 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-xs text-primary-foreground/60 pt-6">
          © {new Date().getFullYear()} ETS ADO DA KWALIYA — Tous droits réservés.
        </footer>
      </div>
    </div>
  );
}
