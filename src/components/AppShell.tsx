import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Home, Send, History, Package, Bell, Shield, LogOut, Mail, ShoppingCart } from "lucide-react";
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

  const navTabs = [
    { to: "/app/send", icon: Send, label: "Envoyer", color: "#fb923c" },
    { to: "/app/history", icon: History, label: "Historique", color: "#a78bfa" },
    { to: "/app/order", icon: ShoppingCart, label: "Commande", color: "#fbbf24" },
    { to: "/app/products", icon: Package, label: "Produits", color: "#34d399" },
    { to: "/app/notifications", icon: Bell, label: "Alertes", color: "#ef4444" },
    { to: "/app/contact", icon: Mail, label: "Contact", color: "#f472b6" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-brand-gradient text-primary-foreground shadow-elegant sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-widest text-white">ADO DA KWALIYA</div>
            <div className="text-lg font-semibold text-white">
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {children}
        <nav className="mt-6 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-2 bg-card/80 border border-border rounded-2xl px-3 py-2 shadow-md">
            {navTabs.map(({ to, icon: Icon, label, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center px-2 py-1 gap-1 transition-all duration-200"
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all duration-200 ${
                      active ? "scale-110 shadow-lg" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: active ? `${color}30` : "transparent",
                      boxShadow: active ? `0 0 12px ${color}60` : "none",
                    }}
                  >
                    <Icon
                      className="h-5 w-5 transition-colors"
                      style={{ color: active ? color : "#9ca3af" }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-medium transition-colors"
                    style={{ color: active ? color : "#9ca3af" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}

export function formatXOF(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
