import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoLockup } from "@/components/landing/Logo";
import { toast } from "sonner";

const CITY_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Remote"] as const;

export default function Onboarding() {
  const { user, loading } = useAuth();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.user_metadata.full_name ?? "");
  const [city, setCity] = useState<string>("Bengaluru");
  const [busy, setBusy] = useState(false);
  if (loading || (user && workspace.isPending)) return <main className="p-10" role="status">Loading account…</main>;
  if (!user) return <Navigate to="/auth?mode=signup" replace />;
  if (workspace.data) return <Navigate to="/app" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("profiles")
        .update({ full_name: name.trim(), display_name: name.trim(), city_hub: city })
        .eq("user_id", user.id).select("user_id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your profile isn't ready yet. Refresh and try again.");
      await queryClient.invalidateQueries({ queryKey: ["workspace", user.id] });
      navigate("/app/home", { replace: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save your account. Try again."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-6 py-16 flex justify-center items-center">
    <div className="w-full max-w-lg space-y-8">
      <LogoLockup size="text-2xl" />
      <div><p className="text-sm text-muted-foreground">Your workspace</p><h1 className="text-3xl font-semibold mt-2">Welcome to Hirely.</h1></div>
      {workspace.error && <p role="alert" className="text-destructive">Couldn't load your account. <Button variant="link" onClick={() => workspace.refetch()}>Retry</Button></p>}
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="city-hub">City</Label>
          <Select value={city} onValueChange={setCity}><SelectTrigger id="city-hub"><SelectValue /></SelectTrigger>
            <SelectContent>{CITY_HUBS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        </div>
        <Button type="submit" className="w-full" disabled={busy || Boolean(workspace.error)}>{busy ? "Saving…" : "Open my workspace"}<ArrowRight /></Button>
      </form>
    </div>
  </main>;
}
