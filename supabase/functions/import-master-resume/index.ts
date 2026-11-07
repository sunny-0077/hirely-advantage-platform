import { createClient } from "npm:@supabase/supabase-js@2";
import { importHandler } from "./handler.ts";

Deno.serve(importHandler(authorization => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Unavailable configuration");
  return createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
}));