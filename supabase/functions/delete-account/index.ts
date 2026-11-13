import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
// Child tables first so foreign keys never block removal.
const TABLES: [string, string][] = [
  ["mock_interview_turns", "user_id"], ["mock_interview_sessions", "user_id"], ["resume_analyses", "user_id"],
  ["resume_enhancements", "user_id"], ["resume_tailorings", "user_id"], ["cover_letters", "user_id"], ["applications", "user_id"],
  ["interview_answers", "user_id"], ["interview_questions", "user_id"], ["interview_prep_guides", "user_id"], ["resume_versions", "user_id"],
  ["document_feedback", "user_id"], ["platform_feedback", "user_id"], ["pricing_interest", "user_id"], ["usage_counters", "user_id"],
  ["credit_ledger", "user_id"], ["api_usage_logs", "user_id"], ["job_submissions", "candidate_id"], ["resumes", "user_id"],
  ["hiring_accounts", "user_id"], ["user_roles", "user_id"], ["profiles", "user_id"],
];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Please sign in." }, 401);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userDb = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data, error } = await userDb.auth.getUser();
  if (error || !data.user) return json({ error: "Please sign in." }, 401);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400);
  const id = data.user.id;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    for (const bucket of ["resumes"]) {
      const { data: files } = await admin.storage.from(bucket).list(id, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
    }
    for (const [table, col] of TABLES) {
      const { error: e } = await admin.from(table).delete().eq(col, id);
      if (e) throw new Error(`${table}: ${e.message}`);
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) throw delErr;
    return json({ deleted: true });
  } catch (e) {
    console.error("delete-account failed", e);
    return json({ error: "Couldn't delete your account. Please try again." }, 500);
  }
});
