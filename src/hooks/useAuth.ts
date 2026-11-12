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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(() => window.location.pathname === "/reset-password" && new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");

  useEffect(() => {
    let active = true;
    let generation = 0;
    const syncSession = async () => {
      const request = ++generation;
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const result = currentSession ? await supabase.auth.getUser() : null;
        if (!active || request !== generation) return;
        const validated = result?.error ? null : result?.data.user;
        setSession(validated ? currentSession : null);
        setUser(validated ?? null);
      } catch {
        if (!active || request !== generation) return;
        setSession(null);
        setUser(null);
      } finally {
        if (active && request === generation) setLoading(false);
      }
    };

    // Listener FIRST so OAuth/session callbacks cannot race the initial read.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!active) return;
      ++generation;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (!sess) {
        setSession(null); setUser(null); setLoading(false); setRecovering(false);
        return;
      }
      // Never expose an event's unvalidated user to private routes.
      setLoading(true);
      window.setTimeout(() => {
        // A queued sign-in check must not supersede a later logout.
        if (active && sess && eventGeneration === generation) void syncSession();
      }, 0);
    });

    // Then hydrate the existing session. Never leave the UI blank if this fails.
    void syncSession();

    const onFocus = () => void syncSession();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncSession();
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
