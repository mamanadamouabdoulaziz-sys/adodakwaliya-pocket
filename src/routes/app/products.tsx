import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, formatXOF } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export const Route = createFileRoute("/app/products")({ component: ProductsPage });

type Product = { id: string; name: string; description: string | null; price: number; category: string | null; image_url: string | null; in_stock: boolean };

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    supabase.from("products").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, []);

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-1">Produits de l'agence</h1>
      <p className="text-sm text-muted-foreground mb-4">Découvrez notre gamme de produits.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="h-32 bg-card-gradient flex items-center justify-center text-primary-foreground">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                : <Package className="h-10 w-10 opacity-70" />}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{p.name}</div>
                {p.category && <Badge variant="secondary">{p.category}</Badge>}
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-lg font-bold text-primary">{formatXOF(p.price)}</div>
                <Badge variant={p.in_stock ? "secondary" : "outline"}>
                  {p.in_stock ? "Disponible" : "Rupture"}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
