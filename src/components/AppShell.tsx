import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Send, Package, Bell, Shield, LogOut, ShoppingCart, Wifi, Car } from "lucide-react";
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
    { to: "/app/order", icon: ShoppingCart, label: "Commande", color: "#fbbf24" },
    { to: "/app/products", icon: Package, label: "Produits", color: "#34d399" },
    { to: "/app/wifi", icon: Wifi, label: "WIFI", color: "#3b82f6" },
    { to: "/app/adedeta", icon: Car, label: "ADEDETA", color: "#facc15" },
    { to: "/app/notifications", icon: Bell, label: "Alertes", color: "#ef4444" },
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
        <nav className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-3 bg-card/80 border border-border rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm">
            {navTabs.map(({ to, icon: Icon, label, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center px-3 py-2 gap-1.5 transition-all duration-300 hover:scale-105"
                >
                  <div
                    className={`p-2.5 rounded-2xl transition-all duration-300 ${
                      active ? "scale-110" : "hover:bg-white/5"
                    }`}
                    style={{
                      backgroundColor: active ? `${color}35` : "transparent",
                      boxShadow: active ? `0 0 20px ${color}80, 0 0 40px ${color}40, inset 0 0 12px ${color}30` : "none",
                      border: active ? `1.5px solid ${color}90` : "1.5px solid transparent",
                    }}
                  >
                    <Icon
                      className="h-6 w-6 transition-colors"
                      style={{ color: active ? color : "#9ca3af", filter: active ? `drop-shadow(0 0 6px ${color})` : "none" }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold transition-colors"
                    style={{ color: active ? color : "#9ca3af", textShadow: active ? `0 0 8px ${color}60` : "none" }}
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
