import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Wallet, BarChart3, Pause, Play, Send, Pencil } from "lucide-react";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

type UserRow = { id: string; first_name: string; last_name: string; phone: string; account_number: string; balance: number; suspended: boolean };

function AdminPage() {
  const { isAdmin, refresh } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState({ users: 0, tx: 0, volume: 0 });

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as UserRow[]) ?? []);
    const { data: txs } = await supabase.from("transactions").select("amount");
    const volume = (txs ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
    setStats({ users: data?.length ?? 0, tx: txs?.length ?? 0, volume });
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const toggleSuspend = async (u: UserRow) => {
    const { error } = await supabase.rpc("admin_set_suspended", { _user_id: u.id, _suspended: !u.suspended });
    if (error) toast.error(error.message);
    else { toast.success(u.suspended ? "Compte réactivé" : "Compte suspendu"); load(); }
  };

  return (
    <AppShell requireAdmin>
      <h1 className="text-xl font-bold mb-4">Panneau administrateur</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={<Users className="h-5 w-5" />} label="Utilisateurs" value={String(stats.users)} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Transactions" value={String(stats.tx)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Volume" value={formatXOF(stats.volume)} />
      </div>

      <h2 className="font-semibold mb-3">Utilisateurs</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold">{u.first_name} {u.last_name}</div>
                <div className="text-xs text-muted-foreground">{u.phone}</div>
                <div className="text-xs font-mono mt-1">{u.account_number}</div>
                <div className="text-sm mt-1">Solde : <span className="font-semibold">{formatXOF(u.balance)}</span></div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge variant={u.suspended ? "destructive" : "secondary"}>
                  {u.suspended ? "Suspendu" : "Actif"}
                </Badge>
                <div className="flex gap-1 flex-wrap">
                  <SendDialog user={u} onDone={() => { refresh(); load(); }} />
                  <EditDialog user={u} onDone={load} />
                  <Button size="sm" variant="outline" onClick={() => toggleSuspend(u)} className="gap-1">
                    {u.suspended ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {u.suspended ? "Réactiver" : "Suspendre"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-accent">{icon}</div>
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </Card>
  );
}

function SendDialog({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Montant invalide"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_send_to_user", { _amount: n, _user_id: user.id, _note: note || null });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Recharge envoyée"); setOpen(false); setAmount(""); setNote(""); onDone(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
          <Send className="h-3.5 w-3.5" /> Envoyer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer à {user.first_name} {user.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Montant (XOF)</Label>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {busy ? "Envoi…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(user.first_name);
  const [last, setLast] = useState(user.last_name);
  const [phone, setPhone] = useState(user.phone);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .update({ first_name: first, last_name: last, phone })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Mis à jour"); setOpen(false); onDone(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifier l'utilisateur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Prénom</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
          <div className="space-y-2"><Label>Nom</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
          <div className="space-y-2"><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
