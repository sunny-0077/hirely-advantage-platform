import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authRedirectUrl, safeReturnPath } from "@/lib/authNavigation";
import { signupOutcome } from "@/lib/signupOutcome";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { authErrorMessage, workspaceDestination } from "@/lib/onboarding";
import { passwordResetRedirectUrl } from "@/lib/authNavigation";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email")
  .max(255, "Email too long");
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Too long");

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuth();
  const workspace = useWorkspace();
  const [forgot, setForgot] = useState(params.get("reset") === "1");
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const pendingSignup = useRef<{ email: string; password: string } | null>(null);
  const checkingConfirmation = useRef(false);
  const [existingEmail, setExistingEmail] = useState("");
  const [resendUntil, setResendUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [resendNotice, setResendNotice] = useState("");
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const returnPath = safeReturnPath(params.get("next"));
  const resendSeconds = Math.max(0, Math.ceil((resendUntil - now) / 1000));

  useEffect(() => {
    if (!resendUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendUntil]);

  useLayoutEffect(() => {
    const el = cardInnerRef.current;
    if (!el) return;
    const measure = () => setCardHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);


  useEffect(() => {
    if (auth.loading || !auth.user) return;
    if (auth.recovering) { navigate("/reset-password", { replace: true }); return; }
    if (workspace.isSuccess) navigate(workspaceDestination(workspace.data?.onboarding_completed, returnPath), { replace: true });
  }, [auth.loading, auth.user, auth.recovering, workspace.isSuccess, workspace.data, navigate, returnPath]);

  const checkConfirmation = async () => {
    const pending = pendingSignup.current;
    if (!pending || checkingConfirmation.current) return;
    checkingConfirmation.current = true;
    try {
      // Credentials remain only in this tab's memory, never browser storage.
      const { error } = await supabase.auth.signInWithPassword(pending);
      if (!error) {
        const { data, error: validationError } = await supabase.auth.getUser();
        if (data.user?.email_confirmed_at && !validationError) {
          pendingSignup.current = null;
          navigate(returnPath, { replace: true });
        }
      }
    } finally {
      checkingConfirmation.current = false;
    }
  };

  useEffect(() => {
    if (!confirmationEmail) { pendingSignup.current = null; return; }
    const onFocus = () => { void checkConfirmation(); };
    const onVisible = () => { if (document.visibilityState === "visible") onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [confirmationEmail, returnPath, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const emailParsed = emailSchema.safeParse(email);
      if (!emailParsed.success) throw new Error(emailParsed.error.issues[0].message);
      const passParsed = passwordSchema.safeParse(password);
      if (!passParsed.success) throw new Error(passParsed.error.issues[0].message);

      if (mode === "signup") {
        const validName = z.string().trim().min(1, "Enter your full name").max(100).parse(name);
        const { data, error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: {
            emailRedirectTo: authRedirectUrl(),
            data: { full_name: validName },
          },
        });
        if (error) throw error;
        const outcome = signupOutcome(data);
        setPassword("");
        if (outcome === "sign-in") {
          setExistingEmail(emailParsed.data);
        } else if (outcome === "confirmation") {
          pendingSignup.current = { email: emailParsed.data, password: passParsed.data };
          setConfirmationEmail(emailParsed.data);
          setResendUntil(Date.now() + 60000);
          setNow(Date.now());
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error && ["Enter a valid email", "Email too long", "At least 8 characters", "Too long"].includes(err.message) ? err.message : authErrorMessage(err);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!confirmationEmail || loading || resendSeconds > 0) return;
    setLoading(true);
    setResendNotice("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      setResendNotice("Confirmation requested. Check your inbox and spam folder.");
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setResendUntil(Date.now() + 60000);
      setNow(Date.now());
      setLoading(false);
    }
  };

  const handleSocial = async (provider: "google" | "lovable") => {
    setLoading(true);
    try {
      try {
        sessionStorage.setItem("auth:returnPath", returnPath);
      } catch {
        /* ignore */
      }

      const redirectUrl = new URL("/auth/callback", window.location.origin);
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectUrl.toString(),
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast.error("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        navigate(returnPath, { replace: true });
        return;
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Sign-in failed. Please try again.");
    }
  };

  async function requestReset(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setAuthError("");
    try {
      const parsed = emailSchema.parse(email);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed, { redirectTo: passwordResetRedirectUrl() });
      if (error) throw error;
      setResetSent(true);
    } catch (error) { setAuthError(authErrorMessage(error)); }
    finally { setLoading(false); }
  }

  if (auth.loading || (auth.user && workspace.isPending)) return <main className="min-h-screen flex items-center justify-center bg-background" role="status">Checking your account…</main>;
  if (auth.user && workspace.error) return <main className="min-h-screen flex flex-col items-center justify-center gap-4"><p role="alert">Couldn't load your account.</p><Button onClick={() => workspace.refetch()}>Retry</Button></main>;

  return (
    <div
      className="auth-page min-h-screen bg-background flex items-center justify-center px-5 py-24"
    >
      <Link
        to="/"
        className="group absolute top-6 left-6 z-20 inline-flex items-center gap-3 text-muted-foreground hover:text-foreground"
      >
        <span className="grid place-items-center w-9 h-9 rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-0.5">
          <ArrowLeft className="w-[17px] h-[17px] transition-transform duration-300 group-hover:-translate-x-0.5" />
        </span>
        <span className="flex flex-col leading-none text-left">
          <span className="text-[9.5px] tracking-[0.2em] uppercase text-foreground/45 font-semibold">
            Hirely
          </span>
          <span className="mt-1 text-[13.5px] font-semibold text-foreground/85">Back to home</span>
        </span>
      </Link>

      <div className="w-full max-w-[460px]">

        <div className="text-center mb-9">
          <p
            key={`k-${mode}`}
            className="text-[11px] tracking-[0.22em] uppercase text-foreground/50 font-semibold animate-fade-in"
          >
            {mode === "signin" ? "Welcome back" : "Get started"}
          </p>
          <h1
            key={`h-${mode}`}
            className="mt-2.5 text-[30px] leading-[1.25] font-semibold tracking-[-0.035em] animate-fade-in"
          >
            {forgot ? "Forgot your password?" : mode === "signin" ? "Sign in to continue." : "Create your account."}
          </h1>
        </div>

        <div className="rounded-lg bg-card border border-border shadow-subtle p-6 sm:p-8">
          <div
            className="overflow-hidden motion-safe:transition-[height] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={cardHeight ? { height: cardHeight } : undefined}
          >
          <div ref={cardInnerRef}>

          <div
            className="grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              gridTemplateRows: mode === "signin" ? "1fr" : "0fr",
              opacity: mode === "signin" ? 1 : 0,
            }}
            aria-hidden={mode !== "signin"}
          >
            <div className="overflow-hidden min-h-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleSocial("google")}
                disabled={loading || mode !== "signin"}
                tabIndex={mode === "signin" ? 0 : -1}
                className="w-full h-11 gap-2.5"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              <Button variant="outline" className="w-full mt-3 rounded-full" disabled={loading || mode !== "signin"} tabIndex={mode === "signin" ? 0 : -1} onClick={() => handleSocial("lovable")}>
                Continue with Lovable
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] tracking-[0.18em] uppercase text-foreground/50 font-medium">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          </div>

          {forgot ? <form onSubmit={requestReset} className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your email to request a secure password reset link.</p>
            <input aria-label="Email" type="email" autoComplete="email" placeholder="Email" maxLength={255} required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3" />
            {resetSent && <p role="status" className="text-sm">If this email has an account, a reset link has been requested. Check your inbox and spam folder.</p>}
            {authError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
            <Button type="submit" className="w-full" disabled={loading || resetSent}>{loading ? "Sending…" : "Send reset link"}</Button>
            <Button type="button" variant="link" onClick={() => { setForgot(false); setResetSent(false); setAuthError(""); }}>Back to sign in</Button>
          </form> : existingEmail ? (
            <div role="alert" className="space-y-4 py-6 text-center">
              <h2 className="text-xl font-semibold">You already have an account</h2>
              <p className="text-muted-foreground break-words">
                <span className="font-medium text-foreground">{existingEmail}</span> is already registered on Hirely, so no confirmation email is sent. Accounts made with Google sign in with Google.
              </p>
              <Button className="w-full rounded-full" disabled={loading} onClick={() => handleSocial("google")}>Continue with Google</Button>
              <Button variant="outline" className="w-full rounded-full" onClick={() => { setExistingEmail(""); setMode("signin"); }}>Sign in with password instead</Button>
              <Button variant="link" onClick={() => { setExistingEmail(""); setEmail(""); setMode("signup"); }}>Use a different email</Button>
            </div>
          ) : confirmationEmail ? (
            <div role="status" className="space-y-4 py-6 text-center">
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground break-words">We sent a confirmation link to {confirmationEmail}. Check your spam and promotions folders too.</p>
              <Button className="w-full" disabled={loading || resendSeconds > 0} onClick={resendConfirmation}>{loading ? "Requesting…" : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend confirmation email"}</Button>
              {resendNotice && <p className="text-sm text-muted-foreground">{resendNotice}</p>}
              <Button variant="outline" className="w-full" onClick={() => void checkConfirmation()}>I've verified my email</Button>
              <Button variant="link" onClick={() => { setConfirmationEmail(""); setResendNotice(""); }}>Use a different email</Button>
              <Button variant="outline" onClick={() => { setConfirmationEmail(""); setMode("signin"); }}>Back to sign in</Button>
            </div>
          ) : <form onSubmit={handleEmail} className="space-y-3.5">
            <div
              className="grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                gridTemplateRows: mode === "signup" ? "1fr" : "0fr",
                opacity: mode === "signup" ? 1 : 0,
              }}
              aria-hidden={mode !== "signup"}
            >
              <div className="overflow-hidden min-h-0">
                <input
                  type="text"
                  aria-label="Full name"
                  autoComplete="name"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  tabIndex={mode === "signup" ? 0 : -1}
                  className="w-full px-4 py-4 mb-3.5 rounded-md bg-card border border-input text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <input
              type="email"
              aria-label="Email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
              className="w-full px-4 py-4 rounded-md bg-card border border-input text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                aria-label="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                required
                className="w-full px-4 py-4 pr-14 rounded-md bg-card border border-input text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Button variant="ghost" size="icon"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-foreground/55 hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </Button>
            </div>

            {authError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
            {mode === "signin" && <Button variant="link" type="button" className="px-0" onClick={() => { setForgot(true); setAuthError(""); }}>Forgot password?</Button>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>}

          <p className="text-center text-[13.5px] text-foreground/60 mt-6">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <Button variant="link"
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setConfirmationEmail(""); setExistingEmail(""); setForgot(false); setAuthError(""); }}
              className="text-foreground font-semibold hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </Button>
          </p>
          </div>
          </div>
        </div>



      </div>
    </div>
  );
};

export default Auth;
