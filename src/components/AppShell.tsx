import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Home, Send, History, Package, Bell, Shield, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { session, loading, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
    if (!loading && requireAdmin && !isAdmin) navigate({ to: "/app/dashboard" });
  }, [loading, session, isAdmin, requireAdmin, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  const tabs = [
    { to: "/app/dashboard", icon: Home, label: "Accueil" },
    { to: "/app/send", icon: Send, label: "Envoyer" },
    { to: "/app/history", icon: History, label: "Historique" },
    { to: "/app/products", icon: Package, label: "Produits" },
    { to: "/app/contact", icon: Mail, label: "Contact" },
    { to: "/app/notifications", icon: Bell, label: "Alertes" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-brand-gradient text-primary-foreground shadow-elegant sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary-foreground/70">ETS ADO DA KWALIYA</div>
            <div className="text-base font-semibold">
              {profile ? `${profile.first_name} ${profile.last_name}` : "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/app/admin">
                <Button size="sm" variant="secondary" className="gap-1">
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <Button size="sm" variant="ghost" onClick={() => signOut()} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {tabs.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center py-2.5 text-xs gap-1 transition-colors ${
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function formatXOF(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
