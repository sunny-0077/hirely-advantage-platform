import { supabase } from "@/integrations/supabase/client";

let pending: Promise<void> | undefined;

/** Establish a returned session before private-route validation; never persist URL credentials ourselves. */
export function establishCallbackSession(): Promise<void> {
  if (pending) return pending;
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const access = fragment.get("access_token") ?? query.get("access_token");
  const refresh = fragment.get("refresh_token") ?? query.get("refresh_token");
  const code = query.get("code");
  if (fragment.has("error") || query.has("error")) return Promise.reject(new Error("Invalid sign-in link"));
  if (!access && !refresh && !code) return Promise.resolve();
  pending = (async () => {
    try {
      if (access && refresh) {
        const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        if (error) throw error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else throw new Error("Incomplete sign-in link");
    } finally {
      for (const key of ["access_token", "refresh_token", "provider_token", "provider_refresh_token", "expires_in", "expires_at", "token_type", "code"]) {query.delete(key);fragment.delete(key);}
      window.history.replaceState(null, "", window.location.pathname + (query.size ? `?${query}` : "") + (fragment.size ? `#${fragment}` : ""));
    }
  })();
  return pending;
}