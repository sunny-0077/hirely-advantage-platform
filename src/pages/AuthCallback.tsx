import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeReturnPath } from "@/lib/authNavigation";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
          navigate(destination, { replace: true });
          return;
        }
        await new Promise(resolve => window.setTimeout(resolve, 250));
      }
      if (active) { toast.error("Sign-in did not finish. Please try again."); navigate(`/auth?next=${encodeURIComponent(destination)}`, { replace: true }); }
    };
    void finish();
    return () => { active = false; };
  }, [navigate, params]);
  return <main className="min-h-screen flex items-center justify-center bg-background text-foreground"><p role="status">Finishing sign-in…</p></main>;
}