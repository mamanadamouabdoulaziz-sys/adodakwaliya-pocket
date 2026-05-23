import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, formatXOF, NairaHint, formatNGN } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import adedetaLogo from "@/assets/adedeta-logo.png";

export const Route = createFileRoute("/app/adedeta")({ component: AdedetaPage });

function AdedetaPage() {
  const { user, profile } = useAuth();
  const [driverAccount, setDriverAccount] = useState("");
  const [driverName, setDriverName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Connectez-vous"); return; }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Montant invalide"); return; }
    if (!driverAccount.trim()) { toast.error("N° de compte chauffeur requis"); return; }
    if (profile && n > profile.balance) { toast.error("Solde insuffisant"); return; }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user.id,
      subject: `ADEDETA — Paiement Taxi`,
      message: `Chauffeur: ${driverName || "—"} • Compte: ${driverAccount} • Montant: ${formatXOF(n)}${note ? ` • Note: ${note}` : ""}`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paiement taxi envoyé. En attente de validation.");
    setDriverAccount(""); setDriverName(""); setAmount(""); setNote("");
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <img src={adedetaLogo} alt="ADEDETA" className="h-16 w-16 rounded-xl object-cover shadow-md bg-yellow-400" />
        <div>
          <h1 className="text-xl font-bold">ADEDETA</h1>
          <p className="text-sm text-muted-foreground">Paiement Taxi — compte à compte</p>
        </div>
      </div>

      <Card className="p-4 mb-4 bg-card-gradient text-primary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-90">Solde disponible</div>
        <div className="text-2xl font-bold">{formatXOF(profile?.balance ?? 0)}</div>
      </Card>

      <Card className="p-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du chauffeur (facultatif)</Label>
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ex: Issa" />
          </div>
          <div className="space-y-2">
            <Label>N° de compte chauffeur</Label>
            <Input value={driverAccount} onChange={(e) => setDriverAccount(e.target.value)} placeholder="Numéro de compte" required />
          </div>
          <div className="space-y-2">
            <Label>Montant (XOF)</Label>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
          </div>
          <div className="space-y-2">
            <Label>Note (facultatif)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Trajet, point de départ…" />
          </div>
          <Button type="submit" disabled={busy} className="w-full gap-2" size="lg">
            <Send className="h-4 w-4" />
            {busy ? "Envoi…" : "Payer le taxi"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
