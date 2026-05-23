import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF, NairaHint } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Package, Plus, ShoppingCart, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/products")({ component: ProductsPage });

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  in_stock: boolean;
};

function ProductsPage() {
  const { isAdmin, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setProducts((data as Product[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Produits de l'agence</h1>
        {isAdmin && <AddProductDialog onDone={load} />}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {isAdmin
          ? "Gérez les prix et ajoutez de nouveaux produits."
          : "Sélectionnez un produit pour envoyer une demande d'achat."}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="h-32 bg-card-gradient flex items-center justify-center text-primary-foreground">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-10 w-10 opacity-70" />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{p.name}</div>
                {p.category && <Badge variant="secondary">{p.category}</Badge>}
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-primary">{formatXOF(p.price)}</div>
                  <NairaHint amount={p.price} />
                </div>
                <Badge variant={p.in_stock ? "secondary" : "outline"}>
                  {p.in_stock ? "Disponible" : "Rupture"}
                </Badge>
              </div>
              <div className="mt-3">
                {isAdmin ? (
                  <EditPriceDialog product={p} onDone={load} />
                ) : (
                  <RequestDialog product={p} userId={user?.id} />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function RequestDialog({ product, userId }: { product: Product; userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!userId) {
      toast.error("Connectez-vous d'abord");
      return;
    }
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("purchase_requests").insert({
      user_id: userId,
      product_id: product.id,
      quantity: Math.floor(q),
      note: note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Demande envoyée à l'administration");
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setQty("1");
        setNote("");
      }, 1200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!product.in_stock} className="w-full gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          Demander
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander : {product.name}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="py-6 text-center text-sm">
            <Check className="h-10 w-10 mx-auto text-primary mb-2" />
            Votre demande a été transmise à l'administration.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message (facultatif)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Précisions, adresse de livraison, etc."
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Prix unitaire : <span className="font-semibold">{formatXOF(product.price)}</span>
                <NairaHint amount={product.price * (Number(qty) || 1)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={busy}>
                {busy ? "Envoi…" : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditPriceDialog({ product, onDone }: { product: Product; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(product.price));
  const [inStock, setInStock] = useState(product.in_stock);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Prix invalide");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({ price: n, in_stock: inStock })
      .eq("id", product.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Produit mis à jour");
      setOpen(false);
      onDone();
    }
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Produit supprimé");
      setOpen(false);
      setConfirmDelete(false);
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmDelete(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          Modifier le prix
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier : {product.name}</DialogTitle>
        </DialogHeader>
        {confirmDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirmez-vous la suppression de <strong>{product.name}</strong> ? Cette action est irréversible.
            </p>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>Annuler</Button>
              <Button variant="destructive" onClick={remove} disabled={busy}>
                {busy ? "Suppression…" : "Confirmer la suppression"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Prix (XOF)</Label>
                <Input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                />
                Disponible en stock
              </label>
            </div>
            <DialogFooter className="flex-wrap gap-2 justify-between">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddProductDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Prix invalide");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      category: category.trim() || null,
      price: n,
      description: description.trim() || null,
      in_stock: true,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Produit ajouté");
      setOpen(false);
      setName("");
      setCategory("");
      setPrice("0");
      setDescription("");
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
              placeholder="Bazin, Pagne, Tissu…"
            />
          </div>
          <div className="space-y-2">
            <Label>Prix (XOF)</Label>
            <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description (facultatif)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Ajout…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
