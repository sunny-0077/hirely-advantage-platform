// Resume Builder AI assistant — small, focused text rewrites for the editor.
// Actions: rewrite_summary, improve_bullet, atsify_bullet, add_keywords,
// shorten, remove_weak, add_impact (only when explicitly confirmed by user).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPlan } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action =
  | "rewrite_summary"
  | "improve_bullet"
  | "atsify_bullet"
  | "add_keywords"
  | "shorten"
  | "remove_weak"
  | "add_impact";

const ACTION_PROMPTS: Record<Action, string> = {
  rewrite_summary:
    "Rewrite the candidate's professional summary in 3–4 tight sentences. Plain text, no buzzword soup. Keep facts true to the input. Focus on role identity, top 2–3 skills, and one differentiator.",
  improve_bullet:
    "Rewrite this resume bullet to be sharper and more specific. Strong action verb at the start, concrete scope, keep facts true. One sentence. No emojis.",
  atsify_bullet:
    "Rewrite this resume bullet to be ATS-friendly: plain text, common keywords for the role/industry, simple sentence structure, strong action verb, no special characters or symbols. Keep all numbers the user already included.",
  add_keywords:
    "Naturally weave the supplied job keywords into the text WITHOUT keyword-stuffing. Only include keywords that fit truthfully — drop ones that don't. Preserve voice and length within ~10%.",
  shorten:
    "Rewrite the text to be ~30% shorter while keeping every concrete fact, number, and key keyword. Plain text. No fluff.",
  remove_weak:
    "Rewrite the text to remove weak, vague, or hedging wording (\"helped with\", \"responsible for\", \"various\", \"a lot of\"). Replace with strong, specific action verbs. Keep facts intact.",
  add_impact:
    "Emphasize a measurable impact only when the exact metric is explicitly supplied in the input. Otherwise return the original unchanged. Never infer numbers.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    // Resume Builder AI is a paid feature.
    const plan = await getPlan(userData.user.id);
    if (plan === "free") {
      return json(
        { error: "Resume Builder AI is a Pro feature. Upgrade to unlock.", locked: true },
        402,
      );
    }

    const body = (await req.json()) ?? {};
    const action = body.action as Action;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const keywords: string[] = Array.isArray(body.keywords) ? body.keywords.slice(0, 20) : [];

    if (!ACTION_PROMPTS[action]) return json({ error: "Unknown action" }, 400);
    if (!text || text.length < 3) return json({ error: "Text required" }, 400);
    if (text.length > 4000) return json({ error: "Text too long" }, 400);
    if (action === "add_keywords" && keywords.length === 0) {
      return json({ error: "keywords array required for add_keywords" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const sys =
      "You are an elite resume coach. You rewrite resume text WITHOUT inventing facts, fake metrics, or fake employers. Output plain text only — no markdown, no quotes around the answer, no labels, no preamble. Keep professional tone, US English.";

    const userMsg = [
      ACTION_PROMPTS[action],
      role ? `\nTARGET ROLE: ${role}` : "",
      action === "add_keywords" ? `\nJOB KEYWORDS TO WEAVE IN: ${keywords.join(", ")}` : "",
      `\nINPUT TEXT:\n${text}`,
      `\nReturn only the rewritten text.`,
    ].join("");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit. Try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI rewrite failed" }, 500);
    }
    const data = await aiResp.json();
    let out: string = data?.choices?.[0]?.message?.content ?? "";
    out = out.trim().replace(/^["“”']+|["“”']+$/g, "");
    if (!out) return json({ error: "Empty response" }, 500);
    return json({ text: out });
  } catch (e) {
    console.error("resume-builder-ai error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
