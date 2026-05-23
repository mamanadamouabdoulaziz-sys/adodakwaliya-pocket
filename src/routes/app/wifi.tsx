import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, formatXOF } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Check } from "lucide-react";
import { toast } from "sonner";
import wifiLogo from "@/assets/wifi-logo.jpg";

export const Route = createFileRoute("/app/wifi")({ component: WifiPage });

type Plan = { label: string; price: number };
type Provider = { id: string; name: string; color: string; plans: Plan[] };

const PROVIDERS: Provider[] = [
  {
    id: "h-kaka",
    name: "WIFI H KAKA",
    color: "#3b82f6",
    plans: [
      { label: "24H", price: 100 },
      { label: "7 Jours", price: 500 },
      { label: "1 Mois", price: 2000 },
    ],
  },
  {
    id: "uba",
    name: "WIFI UBA",
    color: "#10b981",
    plans: [
      { label: "8H", price: 100 },
      { label: "7 Jours", price: 500 },
      { label: "1 Mois", price: 2000 },
    ],
  },
  {
    id: "abdallah-ne",
    name: "WIFI ABDALLAH NE",
    color: "#f59e0b",
    plans: [
      { label: "24H", price: 100 },
      { label: "7 Jours", price: 500 },
      { label: "1 Mois", price: 2000 },
    ],
  },
  {
    id: "al-ihssane",
    name: "WIFI AL IHSSANE",
    color: "#a855f7",
    plans: [
      { label: "12H", price: 100 },
      { label: "24H", price: 200 },
    ],
  },
];

function WifiPage() {
  const { user, profile } = useAuth();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const buy = async (provider: Provider, plan: Plan) => {
    if (!user) { toast.error("Connectez-vous"); return; }
    if (profile && plan.price > profile.balance) { toast.error("Solde insuffisant"); return; }
    const key = `${provider.id}-${plan.label}`;
    setBusyKey(key);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user.id,
      subject: `Achat Ticket WIFI — ${provider.name}`,
      message: `Forfait: ${plan.label} • Montant: ${formatXOF(plan.price)}`,
    });
    setBusyKey(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée. Votre ticket sera transmis après validation.");
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <img src={wifiLogo} alt="WIFI" className="h-14 w-14 rounded-xl object-cover shadow-md" />
        <div>
          <h1 className="text-xl font-bold">Achat Tickets WIFI</h1>
          <p className="text-sm text-muted-foreground">Sélectionnez un fournisseur et un forfait</p>
        </div>
      </div>

      <Card className="p-4 mb-4 bg-card-gradient text-primary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-90">Solde disponible</div>
        <div className="text-2xl font-bold">{formatXOF(profile?.balance ?? 0)}</div>
      </Card>

      <div className="space-y-4">
        {PROVIDERS.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${p.color}20`, color: p.color }}
              >
                <Wifi className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: p.color }}>{p.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {p.plans.map((pl) => {
                const key = `${p.id}-${pl.label}`;
                const busy = busyKey === key;
                return (
                  <Button
                    key={pl.label}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => buy(p, pl)}
                    disabled={busy}
                    style={{ borderColor: `${p.color}60` }}
                  >
                    <span className="text-xs text-muted-foreground">{pl.label}</span>
                    <span className="font-bold" style={{ color: p.color }}>{formatXOF(pl.price)}</span>
                    {busy ? <span className="text-xs">Envoi…</span> : <Check className="h-3 w-3 opacity-60" />}
                  </Button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
