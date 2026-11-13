import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { locationKey } from "../../supabase/functions/_shared/global-jobs";
import { jobLocationFilter, jobRoleFilter, rankByRole } from "@/lib/jobPreferences";

export function useJobPreferences() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["job-preferences", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) throw new Error("Please sign in");
    const { data, error } = await supabase.from("profiles").select("preferred_locations,work_modes,target_job_role").eq("user_id", user.id).single();
    if (error) throw error;
    return { locations: data.preferred_locations ?? [], modes: data.work_modes ?? [], role: data.target_job_role ?? "" };
  } });
}

/** Loads catalogue openings for the given places and work modes, ordered by fit with the target role. */
export async function fetchPreferredJobs(locations: string[], modes: string[], role: string, limit = 60) {
  let q = supabase.from("jobs_catalog").select("*").gte("last_seen_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("fetched_at", { ascending: false }).limit(limit * 3);
  const filter = jobLocationFilter(locations, modes);
  if (filter) q = q.or(filter);
  if (modes.length && modes.length < 3) q = q.in("work_mode", modes);
  const roleFilter = jobRoleFilter(role);
  const { data, error } = await (roleFilter ? q.or(roleFilter) : q);
  if (error) throw error;
  let rows = data ?? [];
  // No role match in these places yet: show other real openings there instead of an empty page.
  if (!rows.length && roleFilter) { const r = await q; if (r.error) throw r.error; rows = r.data ?? []; }
  const cities = locations.map(l => locationKey(l.split(",")[0] ?? ""));
  const inCity = (j: { location_keys?: string[] | null }) => (j.location_keys ?? []).some(k => cities.includes(k)) ? 1 : 0;
  return rankByRole(rows, role).map((j, i) => ({ j, i })).sort((a, b) => inCity(b.j) - inCity(a.j) || a.i - b.i).map(x => x.j).slice(0, limit);
}
