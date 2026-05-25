import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Send, Package, Bell, Shield, LogOut, ShoppingCart, Wifi, Car, Home, Utensils } from "lucide-react";
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
    { to: "/app/dashboard", icon: Home, label: "Accueil", color: "#3b82f6" },
    { to: "/app/send", icon: Send, label: "Envoyer", color: "#fb923c" },
    { to: "/app/order", icon: ShoppingCart, label: "Commande", color: "#fbbf24" },
    { to: "/app/products", icon: Package, label: "Produits", color: "#34d399" },
    { to: "/app/wifi", icon: Wifi, label: "WIFI", color: "#8b5cf6" },
    { to: "/app/adedeta", icon: Car, label: "ADEDETA", color: "#facc15" },
    { to: "/app/livraison", icon: Utensils, label: "Livraison", color: "#f97316" },
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
            <Link to="/app/notifications">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1"
                style={{
                  backgroundColor: location.pathname === "/app/notifications" ? "#ef444445" : undefined,
                  boxShadow: "0 0 15px #ef444480",
                  border: "1.5px solid #ef4444",
                  color: "#ef4444",
                }}
              >
                <Bell className="h-4 w-4" /> Alertes
              </Button>
            </Link>
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
          <div className="grid grid-cols-3 gap-4 bg-card/80 border border-border rounded-2xl px-6 py-6 shadow-lg backdrop-blur-sm w-full">
            {navTabs.map(({ to, icon: Icon, label, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center py-6 gap-3 transition-all duration-300 hover:scale-105"
                >
                  <div
                    className={`p-5 rounded-2xl transition-all duration-300 ${
                      active ? "scale-110" : "hover:bg-white/5"
                    }`}
                    style={{
                      backgroundColor: active ? `${color}45` : "transparent",
                      boxShadow: active ? `0 0 30px ${color}AA, 0 0 60px ${color}60, inset 0 0 18px ${color}50` : `0 0 15px ${color}20`,
                      border: active ? `2px solid ${color}` : `2px solid ${color}40`,
                    }}
                  >
                    <Icon
                      className="h-9 w-9 transition-colors"
                      style={{ color, filter: active ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 0 4px ${color}60)` }}
                    />
                  </div>
                  <span
                    className="text-sm font-bold transition-colors"
                    style={{ color, textShadow: active ? `0 0 12px ${color}AA` : `0 0 6px ${color}60` }}
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

// Taux indicatif XOF -> NGN (1 XOF ≈ 2.53 NGN)
export const XOF_TO_NGN = 2.53;

export function formatNGN(n: number) {
  return "₦ " + new Intl.NumberFormat("fr-FR").format(Math.round((n || 0) * XOF_TO_NGN));
}

export function NairaHint({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <div className={`text-[11px] font-semibold text-emerald-500/90 leading-tight ${className}`}>
      ≈ {formatNGN(amount)}
    </div>
  );
}
