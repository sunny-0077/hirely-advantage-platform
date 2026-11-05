import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** UI-only hint; admin data is still enforced server-side by the admin_* database functions. */
export function useIsAdmin() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["is-admin", user?.id], enabled: Boolean(user), staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return Boolean(data);
    },
  });
  return q.data === true;
}
