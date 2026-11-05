// Auto-create or update the user's "My Applications" entry for a job (keyed by role + company).
// deno-lint-ignore no-explicit-any
type Client = any;

export type AppDocLink = { tailoring_id?: string; cover_letter_id?: string; interview_prep_id?: string };

export async function upsertApplication(
  supabase: Client,
  userId: string,
  job: { role: string; company: string; job_id?: string | null; job_url?: string | null; location?: string | null },
  link: AppDocLink,
) {
  const role = job.role.trim().slice(0, 200);
  const company = job.company.trim().slice(0, 200);
  if (!role || !company) return;
  const row: Record<string, unknown> = { user_id: userId, role, company, source: "hirely", ...link };
  if (job.job_id) row.job_id = job.job_id;
  if (job.job_url) row.job_url = job.job_url;
  if (job.location) row.location = job.location;
  const { error } = await supabase.from("applications").upsert(row, { onConflict: "user_id,app_key" });
  // Never fail the paid action because of tracker bookkeeping.
  if (error) console.error("upsertApplication", error);
}
