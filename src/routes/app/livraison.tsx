import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, formatXOF, NairaHint } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Utensils, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/livraison")({ component: LivraisonPage });

type Dish = { id: string; name: string; desc: string; price: number; emoji: string };

const CATEGORIES: { title: string; color: string; dishes: Dish[] }[] = [
  {
    title: "Riz & Sauces",
    color: "#fb923c",
    dishes: [
      { id: "jollof", name: "Jollof Rice", desc: "Riz épicé à la tomate, style nigérian", price: 1500, emoji: "🍛" },
      { id: "fried-rice", name: "Fried Rice", desc: "Riz sauté aux légumes et crevettes", price: 1800, emoji: "🍚" },
      { id: "ofada", name: "Ofada Rice + Ayamase", desc: "Riz local & sauce piment vert", price: 2000, emoji: "🌶️" },
      { id: "coconut-rice", name: "Coconut Rice", desc: "Riz au lait de coco", price: 1700, emoji: "🥥" },
    ],
  },
  {
    title: "Viandes & Grillades",
    color: "#ef4444",
    dishes: [
      { id: "suya", name: "Suya (Brochette de bœuf)", desc: "Bœuf épicé grillé, yaji", price: 1000, emoji: "🍢" },
      { id: "asun", name: "Asun (Chèvre pimentée)", desc: "Chèvre grillée façon Yoruba", price: 2500, emoji: "🐐" },
      { id: "peppered-chicken", name: "Peppered Chicken", desc: "Poulet frit aux poivrons", price: 2200, emoji: "🍗" },
      { id: "goat-meat", name: "Goat Meat Pepper Soup", desc: "Soupe pimentée à la chèvre", price: 2800, emoji: "🍲" },
    ],
  },
  {
    title: "Soupes & Swallows",
    color: "#10b981",
    dishes: [
      { id: "egusi", name: "Egusi + Pounded Yam", desc: "Soupe de melon & igname pilée", price: 2500, emoji: "🥣" },
      { id: "okra", name: "Okra Soup + Eba", desc: "Gombo & semoule de manioc", price: 2000, emoji: "🌿" },
      { id: "afang", name: "Afang Soup + Fufu", desc: "Soupe de légumes, style Calabar", price: 2700, emoji: "🥬" },
      { id: "banga", name: "Banga Soup + Starch", desc: "Soupe de palme, style Delta", price: 2600, emoji: "🌴" },
    ],
  },
  {
    title: "Snacks & Boissons",
    color: "#8b5cf6",
    dishes: [
      { id: "puff-puff", name: "Puff Puff (×5)", desc: "Beignets sucrés nigérians", price: 500, emoji: "🍩" },
      { id: "meat-pie", name: "Meat Pie", desc: "Chausson à la viande", price: 700, emoji: "🥟" },
      { id: "chin-chin", name: "Chin Chin", desc: "Biscuits croustillants", price: 600, emoji: "🍪" },
      { id: "zobo", name: "Zobo (1L)", desc: "Boisson à l'hibiscus", price: 800, emoji: "🥤" },
    ],
  },
];

function LivraisonPage() {
  const { user, profile, refresh } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const allDishes = useMemo(() => CATEGORIES.flatMap((c) => c.dishes), []);
  const total = useMemo(
    () => Object.entries(cart).reduce((s, [id, q]) => s + (allDishes.find((d) => d.id === id)?.price ?? 0) * q, 0),
    [cart, allDishes]
  );

  const setQty = (id: string, q: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };

  const submit = async () => {
    if (!user) return;
    if (Object.keys(cart).length === 0) return toast.error("Panier vide");
    if (!address.trim()) return toast.error("Adresse de livraison requise");
    if ((profile?.balance ?? 0) < total) return toast.error("Solde insuffisant");

    setLoading(true);
    try {
      const items = Object.entries(cart).map(([id, q]) => {
        const d = allDishes.find((x) => x.id === id)!;
        return `${d.name} ×${q}`;
      }).join(", ");
      const subject = `Livraison repas — ${formatXOF(total)}`;
      const message = `Commande: ${items}\nTotal: ${formatXOF(total)}\nAdresse: ${address}\nTéléphone: ${phone}\nNote: ${note || "—"}`;
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user.id,
        subject,
        message,
      });
      if (error) throw error;
      toast.success("Commande envoyée ! Un administrateur vous contactera.");
      setCart({});
      setAddress("");
      setNote("");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-orange-500/20 border-2 border-orange-500" style={{ boxShadow: "0 0 20px #fb923c80" }}>
          <Utensils className="h-7 w-7 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Livraison Repas</h1>
          <p className="text-xs text-muted-foreground">Cuisine nigériane à domicile</p>
        </div>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.title} className="mt-4">
          <div className="text-sm font-bold mb-2" style={{ color: cat.color }}>{cat.title}</div>
          <div className="grid gap-2">
            {cat.dishes.map((d) => {
              const qty = cart[d.id] ?? 0;
              return (
                <Card key={d.id} className="p-3 flex items-center gap-3" style={{ borderColor: qty > 0 ? cat.color : undefined }}>
                  <div className="text-3xl">{d.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.desc}</div>
                    <div className="text-sm font-bold mt-1" style={{ color: cat.color }}>{formatXOF(d.price)}</div>
                    <NairaHint amount={d.price} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(d.id, qty - 1)} disabled={qty === 0}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{qty}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(d.id, qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="mt-6 p-4 rounded-2xl border-2 border-orange-500/40 bg-orange-500/5">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="h-5 w-5 text-orange-500" />
          <div className="font-bold">Votre commande</div>
        </div>
        <div className="space-y-2 mb-3">
          <label className="text-xs">Adresse de livraison</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, rue, repère…" />
          <label className="text-xs">Téléphone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de contact" />
          <label className="text-xs">Note (optionnel)</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sans piment, bien cuit, etc." rows={2} />
        </div>
        <div className="flex items-center justify-between border-t border-orange-500/20 pt-3">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold text-orange-500">{formatXOF(total)}</div>
            <NairaHint amount={total} />
          </div>
          <Button onClick={submit} disabled={loading || total === 0} className="bg-orange-500 hover:bg-orange-600 text-white">
            {loading ? "Envoi…" : "Commander"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
