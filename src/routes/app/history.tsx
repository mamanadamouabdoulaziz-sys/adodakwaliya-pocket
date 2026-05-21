import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

type Tx = { id: string; reference: string; type: string; amount: number; created_at: string; from_user: string | null; to_user: string | null; status: string; note: string | null };

function HistoryPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setTxs((data as Tx[]) ?? []));
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Historique des transactions</h1>
      {txs.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Aucune transaction.</Card>
      )}
      <div className="space-y-2">
        {txs.map((tx) => {
          const incoming = tx.to_user === user?.id;
          const d = new Date(tx.created_at);
          return (
            <Card key={tx.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${incoming ? "bg-success/15 text-success" : "bg-accent/15 text-accent"}`}>
                  {incoming ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {tx.type === "admin_to_user" ? "Recharge reçue" : "Envoi à l'administration"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{tx.reference}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.toLocaleDateString("fr-FR")} • {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {tx.note && <div className="text-xs mt-1 text-muted-foreground">« {tx.note} »</div>}
                </div>
                <div className="text-right">
                  <div className={`font-bold ${incoming ? "text-success" : ""}`}>
                    {incoming ? "+" : "-"}{formatXOF(tx.amount)}
                  </div>
                  <Badge variant={tx.status === "completed" ? "secondary" : "destructive"} className="mt-1 text-[10px]">
                    {tx.status === "completed" ? "Succès" : tx.status}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
