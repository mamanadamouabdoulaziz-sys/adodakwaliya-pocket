import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF, NairaHint } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Wallet, BarChart3, Pause, Play, Send, Pencil, Mail, ShoppingCart, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

type UserRow = { id: string; first_name: string; last_name: string; phone: string; account_number: string; balance: number; suspended: boolean };
type MsgRow = { id: string; user_id: string; subject: string; message: string; read: boolean; created_at: string };
type PRRow = { id: string; user_id: string; product_id: string; quantity: number; note: string | null; status: string; admin_reply: string | null; created_at: string; products: { name: string; price: number } | null };

function AdminPage() {
  const { isAdmin, refresh } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [requests, setRequests] = useState<PRRow[]>([]);
  const [stats, setStats] = useState({ users: 0, tx: 0, volume: 0 });

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as UserRow[]) ?? []);
    const { data: txs } = await supabase.from("transactions").select("amount");
    const volume = (txs ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
    setStats({ users: data?.length ?? 0, tx: txs?.length ?? 0, volume });
    const { data: msgs } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setMessages((msgs as MsgRow[]) ?? []);
    const { data: prs } = await supabase
      .from("purchase_requests")
      .select("*, products(name, price)")
      .order("created_at", { ascending: false });
    setRequests((prs as unknown as PRRow[]) ?? []);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const markRead = async (m: MsgRow) => {
    if (m.read) return;
    await supabase.from("contact_messages").update({ read: true }).eq("id", m.id);
    load();
  };

  const deleteMessage = async (m: MsgRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Message supprimé"); load(); }
  };

  const deleteAllRead = async () => {
    if (!confirm("Supprimer tous les messages lus ?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("read", true);
    if (error) toast.error(error.message);
    else { toast.success("Messages lus supprimés"); load(); }
  };

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

      <h2 className="font-semibold mt-8 mb-3 flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" /> Demandes d'achat
        {requests.some((r) => r.status === "pending") && (
          <Badge variant="destructive" className="ml-1">
            {requests.filter((r) => r.status === "pending").length} en attente
          </Badge>
        )}
      </h2>
      <div className="space-y-2">
        {requests.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Aucune demande.</Card>
        )}
        {requests.map((r) => {
          const sender = users.find((u) => u.id === r.user_id);
          return (
            <Card key={r.id} className={`p-4 ${r.status === "pending" ? "border-accent" : ""}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {r.products?.name ?? "Produit"} × {r.quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sender ? `${sender.first_name} ${sender.last_name} • ${sender.phone}` : r.user_id}
                  </div>
                  {r.products && (
                    <div className="text-xs mt-1">
                      Total estimé : <span className="font-semibold">{formatXOF(r.products.price * r.quantity)}</span>
                    </div>
                  )}
                </div>
                <Badge variant={r.status === "pending" ? "secondary" : r.status === "rejected" ? "destructive" : "outline"}>
                  {r.status}
                </Badge>
              </div>
              {r.note && <p className="text-sm mt-2 whitespace-pre-wrap">Note : {r.note}</p>}
              {r.admin_reply && <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">Réponse : {r.admin_reply}</p>}
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(r.created_at).toLocaleString("fr-FR")}
              </div>
              {r.status === "pending" && (
                <div className="mt-3">
                  <ReplyDialog request={r} onDone={load} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8 mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" /> Messages des utilisateurs
          {messages.some((m) => !m.read) && (
            <Badge variant="destructive" className="ml-1">
              {messages.filter((m) => !m.read).length} non lus
            </Badge>
          )}
        </h2>
        {messages.some((m) => m.read) && (
          <Button size="sm" variant="outline" onClick={deleteAllRead}>
            <Trash2 className="h-4 w-4 mr-1" /> Supprimer lus
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {messages.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Aucun message reçu.</Card>
        )}
        {messages.map((m) => {
          const sender = users.find((u) => u.id === m.user_id);
          return (
            <Card key={m.id} className={`p-4 ${!m.read ? "border-accent" : ""}`} onClick={() => markRead(m)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{m.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {sender ? `${sender.first_name} ${sender.last_name} • ${sender.phone}` : m.user_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!m.read && <Badge variant="secondary">Nouveau</Badge>}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => deleteMessage(m, e)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(m.created_at).toLocaleString("fr-FR")}
              </div>
            </Card>
          );
        })}
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
    const { error } = await supabase.rpc("admin_send_to_user", { _amount: n, _user_id: user.id, _note: note || undefined });
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

function ReplyDialog({ request, onDone }: { request: PRRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async (status: "approved" | "rejected" | "fulfilled") => {
    setBusy(true);
    let error: { message: string } | null = null;
    if (status === "approved") {
      const res = await supabase.rpc("approve_purchase_request", {
        _request_id: request.id,
        _reply: reply || undefined,
      });
      error = res.error;
    } else {
      const res = await supabase
        .from("purchase_requests")
        .update({ status, admin_reply: reply || null })
        .eq("id", request.id);
      error = res.error;
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(
        status === "approved"
          ? "Commande approuvée — paiement effectué"
          : status === "rejected"
          ? "Commande refusée"
          : "Commande livrée"
      );
      setOpen(false);
      setReply("");
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Répondre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Répondre à la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Message (facultatif)</Label>
            <Input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={300} />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => update("rejected")} disabled={busy}>Refuser</Button>
          <Button onClick={() => update("approved")} disabled={busy}>Approuver</Button>
          <Button onClick={() => update("fulfilled")} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">Livrée</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
