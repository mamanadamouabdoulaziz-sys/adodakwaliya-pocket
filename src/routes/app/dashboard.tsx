import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, formatXOF, NairaHint, XOF_TO_NGN } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Send, History, ArrowRightLeft } from "lucide-react";

import sbnLogo from "@/assets/sbn-logo.png";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile } = useAuth();
  const [hidden, setHidden] = useState(false);

  return (
    <AppShell>
      <div className="flex justify-center mb-4">
        <div className="h-32 w-32 rounded-full p-1 ring-2 ring-white/30 shadow-[0_0_20px_rgba(201,168,76,1),0_0_60px_rgba(201,168,76,0.4)]">
          <img src={sbnLogo} alt="SBN ADO DA KWALIYA Money" className="h-full w-full rounded-full object-cover" />
        </div>
      </div>
      <Card className="bg-card-gradient text-primary-foreground p-6 rounded-2xl shadow-elegant border-0">
        <div className="text-xs uppercase tracking-widest text-primary">Solde disponible</div>
        <div className="flex items-end justify-between mt-1">
          <div>
            <div className="text-3xl font-bold text-primary">
              {hidden ? "•••••• XOF" : formatXOF(profile?.balance ?? 0)}
            </div>
            {!hidden && <NairaHint amount={profile?.balance ?? 0} className="mt-1" />}
          </div>
          <button onClick={() => setHidden(!hidden)} className="opacity-80 hover:opacity-100">
            {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-primary">Numéro de compte</div>
            <div className="font-mono font-semibold tracking-wider text-primary">{profile?.account_number ?? "—"}</div>
          </div>
          <div>
            <div className="text-primary">Statut</div>
            <div className="font-semibold text-primary">
              {profile?.suspended ? <span className="text-destructive">Suspendu</span> : "Actif"}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/app/send">
          <Button className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow gap-2">
            <Send className="h-5 w-5" /> Envoyer
          </Button>
        </Link>
        <Link to="/app/history">
          <Button variant="outline" className="w-full h-16 gap-2">
            <History className="h-5 w-5" /> Historique
          </Button>
        </Link>
      </div>

    </AppShell>
  );
}
