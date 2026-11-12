import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const tables = ["resume_catalogue_sources", "resume_industries", "resume_categories", "resume_role_blueprints", "resume_occupations", "resume_occupation_categories", "resume_job_titles", "resume_title_aliases", "resume_career_levels", "resume_occupation_levels", "resume_template_designs", "resume_template_assignments"];
Deno.serve(async req => {
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return reply({});
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return reply({ error: "Configuration unavailable" }, 503);
    const db = createClient(url, key);
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) return reply({ error: "Sign in required" }, 401);
    const { data: identity, error } = await db.auth.getUser(token);
    if (error || !identity.user) return reply({ error: "Sign in required" }, 401);
    const { data: admin } = await db.from("user_roles").select("role").eq("user_id", identity.user.id).eq("role", "admin").maybeSingle();
    if (!admin) return reply({ error: "Not authorized" }, 403);
    const body = await req.json();
    if (!tables.includes(body.table) || !Array.isArray(body.rows) || body.rows.length > 1000 || JSON.stringify(body.rows).length > 1000000 || body.rows.some((row: unknown) => !row || typeof row !== "object" || Array.isArray(row))) return reply({ error: "Invalid import batch" }, 400);
    const batch = body.rows;
    if (batch.length) {
      const { error: saveError } = await db.from(body.table).upsert(batch);
      if (saveError) return reply({ error: "Import failed", detail: saveError.message }, 500);
    }
    return reply({ table: body.table, inserted: batch.length });
  } catch { return reply({ error: "Import could not complete" }, 500); }
});