import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isVerifiedSignup, safeReturnPath } from "@/lib/authNavigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { establishCallbackSession } from "@/lib/oauthCallback";
import { useAuth } from "@/hooks/useAuth";

const WAIT_MS = 15000;

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuth();
  const [established, setEstablished] = useState(false);
  const [verifiedDestination, setVerifiedDestination] = useState<string | null>(null);
  const done = useRef(false);
  const destination = useRef<string>("/app");

  // Step 1: turn any returned credentials into a stored session.
  useEffect(() => {
    let active = true;
    let stored: string | null = null;
    try { stored = sessionStorage.getItem("auth:returnPath"); } catch { /* optional storage */ }
    destination.current = safeReturnPath(params.get("next") ?? stored);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const failure = params.get("error_description") ?? hash.get("error_description");
    if (failure) {
      done.current = true;
      toast.error("This sign-in link is invalid or expired. Please request a new one.");
      navigate("/auth", { replace: true });
      return;
    }
    establishCallbackSession()
      .then(() => { if (active) setEstablished(true); })
      .catch(() => {
        if (!active || done.current) return;
        done.current = true;
        toast.error("Google sign-in could not finish. Please try again.");
        navigate("/auth", { replace: true });
      });
    return () => { active = false; };
  }, [navigate, params]);

  // Step 2: leave only once the app-wide sign-in state has validated the user,
  // so the dashboard guard never sees a transient signed-out state.
  useEffect(() => {
    if (!established || done.current || auth.loading || !auth.user) return;
    done.current = true;
    try { sessionStorage.removeItem("auth:returnPath"); } catch { /* optional storage */ }
    if (isVerifiedSignup(params.get("verification"), auth.user)) {
      window.history.replaceState(null, "", `${window.location.pathname}?verification=signup`);
      setVerifiedDestination(destination.current);
    } else {
      navigate(destination.current, { replace: true });
    }
  }, [established, auth.loading, auth.user, navigate, params]);

  // Safety net: never leave the visitor waiting forever.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (done.current) return;
      done.current = true;
      toast.error("Sign-in did not finish. Please try again.");
      navigate(`/auth?next=${encodeURIComponent(destination.current)}`, { replace: true });
    }, WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
    {verifiedDestination ? <section className="w-full max-w-md text-center space-y-6">
      <p className="text-sm font-semibold">Hirely</p>
      <div role="status" className="verification-success inline-flex items-center gap-2 rounded-md px-5 py-3 font-semibold"><CheckCircle2 aria-hidden="true" />Verified</div>
      <h1 className="text-3xl font-semibold">Your email is verified</h1>
      <Button size="lg" className="w-full" onClick={() => navigate(verifiedDestination, { replace: true })}>Continue to dashboard<ArrowRight /></Button>
    </section> : <p role="status">Finishing sign-in…</p>}
  </main>;
}
