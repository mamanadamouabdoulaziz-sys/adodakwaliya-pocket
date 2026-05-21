import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/app/contact")({ component: ContactPage });

function ContactPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Message envoyé à l'administration");
      setSubject("");
      setMessage("");
    }
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nous contacter</h1>
          <p className="text-xs text-muted-foreground">Votre message sera lu uniquement par l'administration.</p>
        </div>
      </div>

      <Card className="p-4 mt-4 space-y-3">
        <div className="space-y-2">
          <Label>Sujet</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Objet du message" />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={6} placeholder="Décrivez votre demande…" />
        </div>
        <Button onClick={submit} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
          {busy ? "Envoi…" : "Envoyer à l'administration"}
        </Button>
      </Card>
    </AppShell>
  );
}
