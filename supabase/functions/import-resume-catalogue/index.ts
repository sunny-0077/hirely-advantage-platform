import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import asset from "./catalogue.asset.json" with { type: "json" };

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
    if (!tables.includes(body.table) || !Number.isInteger(body.offset) || body.offset < 0 || body.offset > 100000) return reply({ error: "Invalid import batch" }, 400);
    const response = await fetch("https://hirely-advantage-platform.lovable.app" + asset.url);
    if (!response.ok) return reply({ error: "Catalogue source unavailable" }, 502);
    const catalogue = await response.json();
    const rows = catalogue[body.table];
    if (!Array.isArray(rows)) return reply({ error: "Invalid catalogue" }, 502);
    const batch = rows.slice(body.offset, body.offset + 1000);
    if (batch.length) {
      const { error: saveError } = await db.from(body.table).upsert(batch);
      if (saveError) return reply({ error: "Import failed", detail: saveError.message }, 500);
    }
    return reply({ table: body.table, inserted: batch.length, total: rows.length, next: body.offset + batch.length });
  } catch { return reply({ error: "Import could not complete" }, 500); }
});