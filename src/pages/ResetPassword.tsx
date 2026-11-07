import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/landing/Logo";
import { authErrorMessage } from "@/lib/onboarding";

const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");

export default function ResetPassword() {
  const { user, loading, recovering } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check your password."); return; }
    if (password !== confirmation) { setMessage("Passwords don't match."); return; }
    if (!user || !recovering) { setMessage("Request a new password reset link."); return; }
    setBusy(true);
    try {
      const { data, error: validationError } = await supabase.auth.getUser();
      if (validationError || !data.user) { setMessage("This link has expired. Request a new password reset link."); return; }
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) { setMessage(authErrorMessage(error)); return; }
      setPassword(""); setConfirmation(""); setDone(true);
      await supabase.auth.signOut({ scope: "local" });
    } catch { setMessage("Couldn't update your password. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-6 py-16 flex justify-center items-center"><section className="w-full max-w-lg space-y-6">
    <LogoLockup size="text-2xl" /><h1 className="text-3xl font-semibold">Reset your password</h1>
    {loading ? <p role="status">Checking your reset link…</p> : done ? <><p role="status">Your password has been updated. Sign in with your new password.</p><Button asChild><Link to="/auth">Back to sign in</Link></Button></> : !user || !recovering ? <><p role="alert">This reset link is missing, expired, or already used. Request a new one.</p><Button asChild><Link to="/auth?reset=1">Request new link</Link></Button></> : <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="new-password">New password</Label><div className="relative"><Input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className="pr-12" /><Button type="button" variant="ghost" size="icon" aria-label={visible ? "Hide password" : "Show password"} className="absolute right-0 top-0" onClick={() => setVisible(value => !value)}>{visible ? <EyeOff /> : <Eye />}</Button></div></div>
      <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" required maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
      {message && <p role="alert" className="text-destructive">{message}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? "Updating…" : "Update password"}</Button>
    </form>}
  </section></main>;
}