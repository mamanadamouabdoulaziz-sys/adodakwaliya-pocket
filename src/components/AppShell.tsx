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

  const topTabs = [
    { to: "/app/dashboard", icon: Home, label: "Accueil", color: "#60a5fa" },
    { to: "/app/order", icon: ShoppingCart, label: "Commande", color: "#fbbf24" },
    { to: "/app/history", icon: History, label: "Historique", color: "#a78bfa" },
    { to: "/app/products", icon: Package, label: "Produits", color: "#34d399" },
  ];

  const bottomTabs = [
    { to: "/app/contact", icon: Mail, label: "Contact", color: "#f472b6" },
    { to: "/app/send", icon: Send, label: "Envoyer", color: "#fb923c", highlight: true },
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-36">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border z-30 pb-safe">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Ligne 1 : Contact, Envoyer, Alertes */}
          <div className="grid grid-cols-5 border-b border-border/50">
            <div className="col-span-1" />
            {bottomTabs.map(({ to, icon: Icon, label, color, highlight }) => {
              const active = location.pathname === to;
              const isSend = highlight;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center py-1.5 gap-0.5 transition-all duration-200 col-span-1"
                >
                  <div
                    className={`rounded-xl transition-all duration-200 flex items-center justify-center ${
                      isSend
                        ? active
                          ? "p-2 scale-110"
                          : "p-1.5 hover:scale-105"
                        : active
                        ? "p-1.5 scale-110"
                        : "p-1.5"
                    }`}
                    style={{
                      backgroundColor: active ? `${color}35` : isSend ? `${color}20` : "transparent",
                      boxShadow: active
                        ? `0 0 16px ${color}70`
                        : isSend
                        ? `0 0 8px ${color}40`
                        : "none",
                      border: isSend ? `1.5px solid ${color}50` : "none",
                    }}
                  >
                    <Icon
                      className="transition-colors"
                      style={{
                        color: active ? color : isSend ? color : "#9ca3af",
                        width: isSend ? "18px" : "20px",
                        height: isSend ? "18px" : "20px",
                      }}
                    />
                  </div>
                  <span
                    className="font-medium transition-colors"
                    style={{
                      color: active ? color : isSend ? color : "#9ca3af",
                      fontSize: isSend ? "9px" : "10px",
                    }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
            <div className="col-span-1" />
          </div>

          {/* Ligne 2 : Accueil, Commande, Historique, Produits */}
          <div className="grid grid-cols-4">
            {topTabs.map(({ to, icon: Icon, label, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center py-2 gap-1 transition-all duration-200"
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all duration-200 ${
                      active ? "scale-110 shadow-lg" : "opacity-70 hover:opacity-100"
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
        </div>
      </nav>
    </div>
  );
}

export function formatXOF(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
