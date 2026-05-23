import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, formatXOF, NairaHint } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/order")({ component: OrderPage });

type Product = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  in_stock: boolean;
};

function OrderPage() {
  const { user, profile, refresh } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, category, in_stock")
      .eq("in_stock", true)
      .order("name", { ascending: true })
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, []);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const total = product ? product.price * qty : 0;
  const insufficient = !!profile && total > profile.balance;

  const submit = async () => {
    if (!user) { toast.error("Connectez-vous"); return; }
    if (!product) { toast.error("Sélectionnez un produit"); return; }
    if (qty <= 0) { toast.error("Quantité invalide"); return; }
    if (insufficient) { toast.error("Solde insuffisant pour cette commande"); return; }
    setBusy(true);
    const { error } = await supabase.from("purchase_requests").insert({
      user_id: user.id,
      product_id: product.id,
      quantity: qty,
      note: note || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Commande envoyée. En attente de validation.");
    setDone(true);
    refresh();
    setTimeout(() => {
      setDone(false);
      setProductId("");
      setQty(1);
      setNote("");
    }, 1800);
  };

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-1">Passer une commande</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Sélectionnez un produit, choisissez la quantité et envoyez votre commande.
        Le paiement est prélevé automatiquement sur votre solde dès validation par l'administration.
      </p>

      <Card className="p-4 mb-4 bg-card-gradient text-primary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-90">Solde disponible</div>
        <div className="text-2xl font-bold">{formatXOF(profile?.balance ?? 0)}</div>
      </Card>

      {done ? (
        <Card className="p-8 text-center">
          <Check className="h-12 w-12 mx-auto text-primary mb-3" />
          <div className="font-semibold">Commande envoyée</div>
          <p className="text-sm text-muted-foreground mt-1">
            Vous recevrez une notification dès l'approbation et le débit du paiement.
          </p>
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatXOF(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantité</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                inputMode="numeric"
                className="text-center"
                value={qty}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setQty(Number.isFinite(n) && n > 0 ? n : 1);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message (facultatif)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Précisions, adresse de livraison…"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prix unitaire</span>
              <span className="font-medium">{formatXOF(product?.price ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-medium">{qty}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-semibold">Total à payer</span>
              <span className="text-lg font-bold text-primary">{formatXOF(total)}</span>
            </div>
            {insufficient && (
              <p className="text-xs text-destructive pt-2">
                Solde insuffisant. Rechargez votre compte avant d'envoyer la commande.
              </p>
            )}
          </div>

          <Button
            onClick={submit}
            disabled={busy || !product || insufficient}
            className="w-full gap-2"
            size="lg"
          >
            <ShoppingCart className="h-4 w-4" />
            {busy ? "Envoi…" : "Envoyer la commande"}
          </Button>
        </Card>
      )}
    </AppShell>
  );
}
