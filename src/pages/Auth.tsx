import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email")
  .max(255, "Email too long");
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Too long");

const getSafeReturnPath = (value: string | null) => {
  if (!value) return "/app/resume";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app/resume";
  if (value.startsWith("/auth")) return "/app/resume";
  return value;
};

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const returnPath = getSafeReturnPath(params.get("next"));

  useEffect(() => {
    const applyPendingAndGo = async (userId: string) => {
      let pending: string | null = null;
      try {
        pending = localStorage.getItem("pending_plan");
      } catch {
        /* ignore */
      }
      if (pending && ["free", "pro", "advanced"].includes(pending)) {
        await supabase
          .from("profiles")
          .update({ plan: pending as "free" | "pro" | "advanced" })
          .eq("user_id", userId);
        try {
          localStorage.removeItem("pending_plan");
        } catch {
          /* ignore */
        }
        toast.success(
          pending === "free"
            ? "You're on the Free plan."
            : `You're now on ${pending[0].toUpperCase()}${pending.slice(1)}.`,
        );
      }
      navigate(returnPath, { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) applyPendingAndGo(session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (sess) applyPendingAndGo(sess.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, returnPath]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emailParsed = emailSchema.safeParse(email);
      if (!emailParsed.success) throw new Error(emailParsed.error.issues[0].message);
      const passParsed = passwordSchema.safeParse(password);
      if (!passParsed.success) throw new Error(passParsed.error.issues[0].message);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(returnPath)}`,
            data: { full_name: name.trim() || emailParsed.data },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      try {
        sessionStorage.setItem("auth:returnPath", returnPath);
      } catch {
        /* ignore */
      }

      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", returnPath);

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUrl.toString(),
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(returnPath, { replace: true });
        return;
      }
      setLoading(false);
    } catch {
      setLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background:
          "radial-gradient(1100px 520px at 50% -12%, hsl(258 55% 87%), transparent 70%), linear-gradient(180deg, hsl(250 24% 94%), hsl(250 18% 90%))",
      }}
    >
      <Link
        to="/"
        className="group fixed top-6 left-6 z-20 inline-flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full bg-[hsl(0_0%_100%/0.72)] backdrop-blur-xl border border-[hsl(0_0%_100%/0.9)] shadow-[0_12px_30px_-12px_hsl(252_46%_8%/0.28)] hover:shadow-[0_18px_40px_-14px_hsl(252_46%_8%/0.35)] hover:bg-[hsl(0_0%_100%/0.92)] transition-all duration-300"
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

      <div className="w-full max-w-[520px]">

        <div className="text-center mb-9">
          <p className="text-[11px] tracking-[0.22em] uppercase text-foreground/50 font-semibold">
            {mode === "signin" ? "Welcome back" : "Get started"}
          </p>
          <h1 className="mt-2.5 text-[38px] leading-[1.05] font-semibold tracking-[-0.035em]">
            {mode === "signin" ? "Sign in to continue." : "Create your account."}
          </h1>
        </div>

        <div className="rounded-[28px] bg-[hsl(0_0%_100%)] border border-[hsl(250_16%_86%)] shadow-[0_50px_90px_-30px_hsl(252_46%_8%/0.35),0_4px_14px_-4px_hsl(252_46%_8%/0.14)] p-8 sm:p-10">
          {mode === "signin" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-full border border-[hsl(250_14%_80%)] text-[15.5px] font-semibold hover:bg-[hsl(250_20%_96%)] transition-colors disabled:opacity-50"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[hsl(250_14%_84%)]" />
                <span className="text-[11px] tracking-[0.18em] uppercase text-foreground/50 font-medium">or</span>
                <div className="h-px flex-1 bg-[hsl(250_14%_84%)]" />
              </div>
            </>
          )}


          <form onSubmit={handleEmail} className="space-y-3.5">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-4 rounded-2xl bg-[hsl(250_25%_97.5%)] border border-[hsl(250_14%_80%)] text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-4 focus:ring-foreground/10 focus:border-foreground/40 transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
              className="w-full px-4 py-4 rounded-2xl bg-[hsl(250_25%_97.5%)] border border-[hsl(250_14%_80%)] text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-4 focus:ring-foreground/10 focus:border-foreground/40 transition-colors"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                required
                className="w-full px-4 py-4 pr-14 rounded-2xl bg-[hsl(250_25%_97.5%)] border border-[hsl(250_14%_80%)] text-[15.5px] placeholder:text-foreground/55 outline-none focus:ring-4 focus:ring-foreground/10 focus:border-foreground/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-foreground/55 hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-foreground text-background text-[15px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-foreground/60 mt-6">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-foreground font-semibold hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Auth;
