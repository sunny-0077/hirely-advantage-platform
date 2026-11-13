import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { jobLocationFilter, rankByRole } from "@/lib/jobPreferences";

export function useJobPreferences() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["job-preferences", user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("preferred_locations,work_modes,target_job_role").eq("user_id", user!.id).single();
    if (error) throw error;
    return { locations: data.preferred_locations ?? [], modes: data.work_modes ?? [], role: data.target_job_role ?? "" };
  } });
}

/** Loads catalogue openings for the given places and work modes, ordered by fit with the target role. */
export async function fetchPreferredJobs(locations: string[], modes: string[], role: string, limit = 60) {
  let q = supabase.from("jobs_catalog").select("*").order("fetched_at", { ascending: false }).limit(limit * 2);
  const filter = jobLocationFilter(locations, modes);
  if (filter) q = q.or(filter);
  if (modes.length && modes.length < 3) q = q.in("work_mode", modes);
  const { data, error } = await q;
  if (error) throw error;
  return rankByRole(data ?? [], role).slice(0, limit);
}
