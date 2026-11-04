import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** The signed-in job seeker's profile; `data` is null until onboarding sets a full name. */
export function useWorkspace() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workspace", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      // Releases due 90-Day Pass credits and downgrades expired passes before reading.
      await supabase.rpc("sync_my_pass");
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, city_hub, plan_tier, pass_expires_at, credits_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.full_name?.trim() ? data : null;
    },
  });
}
