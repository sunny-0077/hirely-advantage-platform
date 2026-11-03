import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, UserRound, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/landing/Logo";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [type, setType] = useState<"candidate" | "employer">("candidate");
  const [name, setName] = useState(user?.user_metadata.full_name ?? "");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading || (user && workspace.isPending)) return <main className="p-10" role="status">Loading account…</main>;
  if (!user) return <Navigate to="/auth?mode=signup" replace />;
  if (workspace.data) return <Navigate to="/app" replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !name.trim() || (type === "employer" && !company.trim())) return;
    setBusy(true);
    try {
      const profile = await supabase.from("profiles").update({ display_name: name.trim() }).eq("user_id", user.id).select("id").maybeSingle();
      if (profile.error) throw profile.error;
      if (!profile.data) {
        const created = await supabase.from("profiles").insert({ user_id: user.id, display_name: name.trim() });
        if (created.error) throw created.error;
      }
      const { error } = await supabase.from("hiring_accounts").insert({ user_id: user.id, account_type: type, company_name: type === "employer" ? company.trim() : "" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["workspace", user.id] });
      navigate(type === "employer" ? "/app/hiring" : "/app/home", { replace: true });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save your account. Try again."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-6 py-16 flex justify-center items-center">
    <div className="w-full max-w-lg space-y-8">
      <LogoLockup size="text-2xl" />
      <div><p className="text-sm text-muted-foreground">Your workspace</p><h1 className="text-3xl font-semibold mt-2">Welcome to Hirely.</h1></div>
      {workspace.error && <p role="alert" className="text-destructive">Couldn't load your account. <Button variant="link" onClick={() => workspace.refetch()}>Retry</Button></p>}
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant={type === "candidate" ? "default" : "outline"} aria-pressed={type === "candidate"} className="h-20 flex-col" onClick={() => setType("candidate")}><UserRound />I'm job seeking</Button>
          <Button type="button" variant={type === "employer" ? "default" : "outline"} aria-pressed={type === "employer"} className="h-20 flex-col" onClick={() => setType("employer")}><Briefcase />I'm hiring</Button>
        </div>
        <div className="space-y-2"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></div>
        {type === "employer" && <div className="space-y-2"><Label htmlFor="company-name">Company name</Label><Input id="company-name" required maxLength={200} value={company} onChange={e => setCompany(e.target.value)} /></div>}
        <Button type="submit" className="w-full" disabled={busy || Boolean(workspace.error)}>{busy ? "Saving…" : "Open my workspace"}<ArrowRight /></Button>
      </form>
    </div>
  </main>;
}