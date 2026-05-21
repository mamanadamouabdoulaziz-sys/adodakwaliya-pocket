import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "login") as "signup" | "login",
  }),
  component: AuthPage,
});

const phoneSchema = z.string().trim().min(6, "Numéro trop court").max(20).regex(/^[0-9+ ]+$/, "Numéro invalide");
const passwordSchema = z.string().min(6, "Mot de passe trop court").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { mode } = Route.useSearch();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="text-xs tracking-widest uppercase opacity-80">ETS ADO DA KWALIYA</div>
          <div className="text-2xl font-bold">MONEY</div>
        </div>
        <div className="bg-card rounded-2xl shadow-elegant p-6">
          <Tabs defaultValue={mode}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            <TabsContent value="login"><LoginForm /></TabsContent>
            <TabsContent value="signup"><SignupForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(phone);
      passwordSchema.parse(password);
    } catch (err) {
      const m = err instanceof z.ZodError ? err.errors[0].message : "Données invalides";
      toast.error(m); return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone), password,
    });
    setBusy(false);
    if (error) toast.error("Identifiants incorrects ou compte suspendu");
    else toast.success("Connexion réussie");
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Numéro de téléphone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+227 90 00 00 00" inputMode="tel" />
      </div>
      <div className="space-y-2">
        <Label>Mot de passe</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground">
        {busy ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      z.string().trim().min(1, "Prénom requis").max(60).parse(firstName);
      z.string().trim().min(1, "Nom requis").max(60).parse(lastName);
      phoneSchema.parse(phone);
      passwordSchema.parse(password);
    } catch (err) {
      const m = err instanceof z.ZodError ? err.errors[0].message : "Données invalides";
      toast.error(m); return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName, phone },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Compte créé ! Vous êtes connecté.");
  };

  return (
    <form onSubmit={submit} className="space-y-3 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input value={firstName} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input value={lastName} onChange={(e) => setLast(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Numéro de téléphone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+227 90 00 00 00" inputMode="tel" />
      </div>
      <div className="space-y-2">
        <Label>Mot de passe</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">Minimum 6 caractères.</p>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        {busy ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
