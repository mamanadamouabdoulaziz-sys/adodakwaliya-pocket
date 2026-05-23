import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF, NairaHint } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/send")({ component: SendPage });

type Admin = { id: string; first_name: string; last_name: string; account_number: string };

function SendPage() {
  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminId, setAdminId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) return;
      const { data: profs } = await supabase.from("profiles")
        .select("id, first_name, last_name, account_number").in("id", ids);
      setAdmins((profs as Admin[]) ?? []);
      if (profs && profs.length > 0) setAdminId(profs[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("amount, from_user, to_user, status")
      .then(({ data }) => {
        const rows = (data ?? []) as { amount: number; from_user: string | null; to_user: string | null; status: string }[];
        setTotalReceived(rows.filter((t) => t.to_user === user.id && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0));
        setTotalSent(rows.filter((t) => t.from_user === user.id && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0));
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Montant invalide"); return; }
    if (!adminId) { toast.error("Sélectionnez un administrateur"); return; }
    if (profile && n > profile.balance) { toast.error("Solde insuffisant"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("transfer_to_admin", {
      _amount: n, _admin_id: adminId, _note: note || undefined,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Transfert effectué");
    await refresh();
    navigate({ to: "/app/history" });
  };

  const amountNum = Number(amount) || 0;
  const newBalance = (profile?.balance ?? 0) - amountNum;

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Envoyer à l'administration</h1>
      <Card className="p-4 mb-3 bg-secondary/50">
        <div className="text-sm text-muted-foreground">Solde disponible</div>
        <div className="text-2xl font-bold break-all">{formatXOF(profile?.balance ?? 0)}</div>
        <div className="text-xs text-muted-foreground mt-1">Aucun frais — transfert gratuit.</div>
      </Card>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card className="p-3 bg-success/10 border-success/30">
          <div className="text-[11px] uppercase tracking-wider text-success">Solde reçu</div>
          <div className="text-base font-bold text-success mt-1 break-all">+{formatXOF(totalReceived)}</div>
        </Card>
        <Card className="p-3 bg-accent/10 border-accent/30">
          <div className="text-[11px] uppercase tracking-wider text-accent">Solde envoyé</div>
          <div className="text-base font-bold text-accent mt-1 break-all">-{formatXOF(totalSent)}</div>
        </Card>
      </div>
      {amountNum > 0 && (
        <Card className="p-3 mb-4 border-dashed">
          <div className="text-xs text-muted-foreground mb-2">Aperçu après envoi</div>
          <div className="flex justify-between text-sm"><span>Montant à déduire</span><span className="font-semibold text-accent">-{formatXOF(amountNum)}</span></div>
          <div className="flex justify-between text-sm mt-1 pt-2 border-t border-border"><span>Nouveau solde</span><span className={`font-bold break-all ${newBalance < 0 ? "text-destructive" : "text-primary"}`}>{formatXOF(newBalance)}</span></div>
        </Card>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Administrateur destinataire</Label>
          <select
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={admins.length === 0}
          >
            <option value="">Sélectionnez</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.first_name} {a.last_name} — {a.account_number}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Montant (XOF)</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>Note (optionnel)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow">
          {busy ? "Envoi…" : "Confirmer l'envoi"}
        </Button>
      </form>
    </AppShell>
  );
}
