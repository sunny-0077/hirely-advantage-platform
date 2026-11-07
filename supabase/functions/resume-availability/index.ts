import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveUserResume, ResumeSourceError } from "../_shared/resume-source.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version", "Content-Type": "application/json" };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers});
Deno.serve(async req => {
  if(req.method==="OPTIONS") return new Response(null,{headers});
  const authorization=req.headers.get("Authorization");
  if(!authorization) return json({error:"Please sign in."},401);
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if(!url || !key) return json({error:"Couldn't check your resume. Please try again."},503);
  const db=createClient(url,key,{global:{headers:{Authorization:authorization}}});
  const {data,error}=await db.auth.getUser();
  if(error || !data.user) return json({error:"Please sign in."},401);
  try {
    const result=await resolveUserResume(db,data.user.id);
    // Availability never returns private resume text to a caller.
    return json({available:true,source:result.source,label:result.label});
  } catch(e) {
    if(e instanceof ResumeSourceError && e.status===400) return json({available:false,source:null,label:"No usable saved resume",reason:e.message});
    return json({error:"Couldn't check your resume. Please try again."},503);
  }
});