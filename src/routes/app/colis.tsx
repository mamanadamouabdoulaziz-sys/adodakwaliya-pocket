import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { GpsCapture, gmapsLink, type Coords } from "@/components/LiveMap";

export const Route = createFileRoute("/app/colis")({ component: ColisPage });

type Gare = { id: string; name: string; color: string; initials: string };

const GARES: Gare[] = [
  { id: "stm", name: "STM", color: "#0ea5e9", initials: "STM" },
  { id: "salim", name: "SALIM", color: "#10b981", initials: "SL" },
  { id: "nizar", name: "NIZAR", color: "#f59e0b", initials: "NZ" },
  { id: "sonef", name: "SONEF", color: "#ef4444", initials: "SF" },
  { id: "rtv", name: "RTV", color: "#8b5cf6", initials: "RTV" },
  { id: "3stv", name: "3STV", color: "#06b6d4", initials: "3ST" },
  { id: "amana", name: "AMANA VIP", color: "#facc15", initials: "AV" },
];

function ColisPage() {
  const { user, profile } = useAuth();
  const [provenance, setProvenance] = useState("");
  const [destination, setDestination] = useState("");
  const [phoneColis, setPhoneColis] = useState("");
  const [nature, setNature] = useState("");
  const [gareId, setGareId] = useState<string>("");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!provenance.trim() || !destination.trim()) return toast.error("Provenance et destination requises");
    if (!phoneColis.trim()) return toast.error("Téléphone sur le colis requis");
    if (!nature.trim()) return toast.error("Nature du colis requise");
    if (!gareId) return toast.error("Sélectionnez une gare");

    const gare = GARES.find((g) => g.id === gareId)!;
    setLoading(true);
    try {
      const subject = `Livraison colis - ${gare.name}`;
      const message =
        `Client: ${profile?.first_name ?? ""} ${profile?.last_name ?? ""}\n` +
        `Compte: ${profile?.account_number ?? "—"}\n` +
        `Téléphone client: ${profile?.phone ?? "—"}\n` +
        `\n— Colis —\n` +
        `Gare: ${gare.name}\n` +
        `Provenance: ${provenance}\n` +
        `Destination: ${destination}\n` +
        `Téléphone sur le colis: ${phoneColis}\n` +
        `Nature: ${nature}\n` +
        `Note: ${note || "—"}\n` +
        `\nPosition GPS: ${coords ? gmapsLink(coords) : "non partagée"}`;
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user.id,
        subject,
        message,
      });
      if (error) throw error;
      toast.success("Demande envoyée. Un administrateur vous contactera.");
      setProvenance("");
      setDestination("");
      setPhoneColis("");
      setNature("");
      setGareId("");
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500" style={{ boxShadow: "0 0 20px #facc1580" }}>
          <Truck className="h-7 w-7 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Livraison de colis</h1>
          <p className="text-xs text-muted-foreground">Envoi via les gares partenaires</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <div className="text-xs font-semibold mb-2">Choisir la gare</div>
          <div className="grid grid-cols-3 gap-2">
            {GARES.map((g) => {
              const active = gareId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGareId(g.id)}
                  className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all"
                  style={{
                    border: `2px solid ${active ? g.color : g.color + "40"}`,
                    backgroundColor: active ? `${g.color}25` : "transparent",
                    boxShadow: active ? `0 0 15px ${g.color}80` : undefined,
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{
                      background: `linear-gradient(135deg, ${g.color}, ${g.color}cc)`,
                      boxShadow: `0 2px 8px ${g.color}80`,
                    }}
                  >
                    {g.initials}
                  </div>
                  <div className="text-[10px] font-bold text-center" style={{ color: g.color }}>
                    {g.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs">Provenance</label>
          <Input value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder="Ville / point de départ" maxLength={120} />
          <label className="text-xs">Destination</label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ville / point d'arrivée" maxLength={120} />
          <label className="text-xs">Téléphone inscrit sur le colis</label>
          <Input value={phoneColis} onChange={(e) => setPhoneColis(e.target.value)} placeholder="Numéro du destinataire" maxLength={30} />
          <label className="text-xs">Nature du colis</label>
          <Input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex: documents, vêtements, électronique…" maxLength={120} />
          <label className="text-xs">Note (optionnel)</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
        </div>

        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Package className="h-3 w-3" /> Position GPS (temps réel)
          </div>
          <GpsCapture coords={coords} setCoords={setCoords} />
        </div>

        <Button onClick={submit} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
          {loading ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </Card>
    </AppShell>
  );
}
