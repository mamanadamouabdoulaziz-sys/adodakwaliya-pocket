import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({ component: NotifsPage });

type Notif = { id: string; title: string; body: string | null; read: boolean; created_at: string };

function NotifsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").order("created_at", { ascending: false })
      .then(async ({ data }) => {
        setNotifs((data as Notif[]) ?? []);
        await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      });
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Notifications</h1>
      {notifs.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Aucune notification.</Card>
      )}
      <div className="space-y-2">
        {notifs.map((n) => (
          <Card key={n.id} className={`p-4 flex gap-3 ${!n.read ? "border-accent" : ""}`}>
            <div className="h-10 w-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString("fr-FR")}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
