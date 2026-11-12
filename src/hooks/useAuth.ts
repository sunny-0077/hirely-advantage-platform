import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recovering: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

/** Only a definite server rejection may sign the user out; network blips keep the current state. */
const isAuthRejection = (error: unknown) => {
  const status = (error as { status?: number } | null)?.status;
  return status === undefined || status === 401 || status === 403 || (status >= 400 && status < 500);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(() => window.location.pathname === "/reset-password" && new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");

  useEffect(() => {
    let active = true;
    // Bumped by every sign-out: results started before a logout are discarded.
    let signOuts = 0;
    // Bumped by every validation: only the newest validation may apply its result.
    let latestCheck = 0;
    // Newest session announced by the auth client. Mobile tab returns and brokered
    // preview storage can briefly read back empty, so this is the fallback source.
    let known: Session | null = null;
    let validatedUserId: string | null = null;

    const signOutLocally = () => {
      known = null; validatedUserId = null;
      setSession(null); setUser(null); setLoading(false); setRecovering(false);
    };

    const validate = async (candidate: Session | null, logoutMark: number) => {
      const check = ++latestCheck;
      const stillCurrent = () => active && check === latestCheck && logoutMark === signOuts;
      if (!candidate) {
        if (stillCurrent()) signOutLocally();
        return;
      }
      try {
        const { data, error } = await supabase.auth.getUser(candidate.access_token);
        if (!stillCurrent()) return;
        if (data?.user && !error) {
          known = candidate; validatedUserId = data.user.id;
          setSession(candidate); setUser(data.user); setLoading(false);
        } else if (isAuthRejection(error)) {
          // A newer session may have arrived while this one was being checked.
          if (known && known.access_token !== candidate.access_token) return void validate(known, logoutMark);
          signOutLocally();
        } else setLoading(false);
      } catch {
        if (stillCurrent()) setLoading(false);
      }
    };

    const syncFromStorage = async () => {
      const logoutMark = signOuts;
      let stored: Session | null = null;
      try {
        stored = (await supabase.auth.getSession()).data.session;
      } catch { /* fall back to the announced session */ }
      if (!active || logoutMark !== signOuts) return;
      await validate(stored ?? known, logoutMark);
    };

    // Listener FIRST so OAuth/session callbacks cannot race the initial read.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (!sess) {
        signOuts++;
        latestCheck++;
        signOutLocally();
        return;
      }
      known = sess;
      if (sess.user?.id && sess.user.id === validatedUserId) {
        // Token refresh for the already validated user: no loading flash.
        setSession(sess);
        return;
      }
      // Never expose an event's unvalidated user to private routes.
      setLoading(true);
      const logoutMark = signOuts;
      // Defer: auth client calls made inside this callback can deadlock.
      window.setTimeout(() => {
        if (active && logoutMark === signOuts) void validate(sess, logoutMark);
      }, 0);
    });

    // Then hydrate the existing session. Never leave the UI blank if this fails.
    void syncFromStorage();

    const onFocus = () => void syncFromStorage();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncFromStorage();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return createElement(AuthContext.Provider, {
    value: { session, user, loading, recovering },
    children,
  });
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
