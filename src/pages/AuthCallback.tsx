import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isVerifiedSignup, safeReturnPath } from "@/lib/authNavigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [verifiedDestination, setVerifiedDestination] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let stored: string | null = null;
    try { stored = sessionStorage.getItem("auth:returnPath"); } catch { /* optional storage */ }
    const destination = safeReturnPath(params.get("next") ?? stored);
    const finish = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const failure = params.get("error_description") ?? hash.get("error_description");
      if (failure) { toast.error(failure); navigate("/auth", { replace: true }); return; }
      for (let attempt = 0; attempt < 40 && active; attempt++) {
        const { data, error } = await supabase.auth.getUser();
        if (data.user && !error && active) {
          try { sessionStorage.removeItem("auth:returnPath"); } catch { /* optional storage */ }
          if (isVerifiedSignup(params.get("verification"), data.user)) {
            window.history.replaceState(null, "", `${window.location.pathname}?verification=signup`);
            setVerifiedDestination(destination);
          } else {
            navigate(destination, { replace: true });
          }
          return;
        }
        await new Promise(resolve => window.setTimeout(resolve, 250));
      }
      if (active) { toast.error("Sign-in did not finish. Please try again."); navigate(`/auth?next=${encodeURIComponent(destination)}`, { replace: true }); }
    };
    void finish();
    return () => { active = false; };
  }, [navigate, params]);
  return <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
    {verifiedDestination ? <section className="w-full max-w-md text-center space-y-6">
      <p className="text-sm font-semibold">Hirely</p>
      <div role="status" className="verification-success inline-flex items-center gap-2 rounded-md px-5 py-3 font-semibold"><CheckCircle2 aria-hidden="true" />Verified</div>
      <h1 className="text-3xl font-semibold">Your email is verified</h1>
      <Button size="lg" className="w-full" onClick={() => navigate(verifiedDestination, { replace: true })}>Continue to dashboard<ArrowRight /></Button>
    </section> : <p role="status">Finishing sign-in…</p>}
  </main>;
}