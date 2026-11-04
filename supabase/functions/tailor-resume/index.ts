// Tailor resume — generates a role-specific optimized version via Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runPaidAction, PaidActionError } from "../_shared/credits.ts";
import { checkEntitlement } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior resume writer and recruiter who has placed candidates at top tech, finance, and consulting firms.

Your job: take a candidate's existing resume and produce a TAILORED version optimized for a specific target role (and optional job description).

Hard rules:
- Never invent jobs, companies, schools, or credentials.
- You MAY add tools/skills the candidate plausibly used given their context (e.g. a Data Analyst with "dashboards" almost certainly used SQL — call that out as a recommended addition, not as an outright claim).
- Every rewritten bullet must keep the original meaning but make it sharper, quantified, and aligned with the target role's keywords.
- Use realistic, plausible metrics if the original was unquantified. Mark these clearly as suggestions in 'why'.
- The tone should be confident, specific, and senior-level for the target role.

Always respond by calling the tailor_resume tool. Never reply with prose.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "tailor_resume",
    description: "Return a tailored, role-optimized version of the candidate's resume.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Rewritten 2–3 sentence professional summary aligned with the target role. ≤320 chars.",
        },
        cover_note: {
          type: "string",
          description: "≤200 chars. Plain-English note: 'Here's what we changed and why.'",
        },
        skills: {
          type: "array",
          description: "Optimized skill list, grouped (e.g. 'Languages', 'Tools', 'Domain'). 3–6 groups.",
          items: {
            type: "object",
            properties: {
              group: { type: "string", description: "≤22 chars" },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["group", "items"],
            additionalProperties: false,
          },
        },
        keywords_to_add: {
          type: "array",
          description: "Job-specific keywords/tools missing from the resume that should be injected.",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              reason: {
                type: "string",
                description: "≤140 chars. Why this keyword matters for the target role.",
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How confident we are that the candidate can plausibly claim this.",
              },
            },
            required: ["keyword", "reason", "confidence"],
            additionalProperties: false,
          },
        },
        bullets: {
          type: "array",
          description: "Rewritten experience bullets, grouped by role. Cover the candidate's most recent 1–3 roles.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", description: "Job title" },
              company: { type: "string" },
              rewrites: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    before: { type: "string", description: "Original bullet (verbatim if possible)." },
                    after: { type: "string", description: "Rewritten bullet, quantified, role-aligned." },
                    why: {
                      type: "string",
                      description: "≤140 chars. What changed and how it helps for the target role.",
                    },
                  },
                  required: ["before", "after", "why"],
                  additionalProperties: false,
                },
              },
            },
            required: ["role", "company", "rewrites"],
            additionalProperties: false,
          },
        },
        match_before: {
          type: "number",
          description: "0–100. Estimated job match before tailoring.",
        },
        match_after: {
          type: "number",
          description: "0–100. Estimated job match after applying the tailored edits.",
        },
      },
      required: [
        "summary",
        "cover_note",
        "skills",
        "keywords_to_add",
        "bullets",
        "match_before",
        "match_after",
      ],
      additionalProperties: false,
    },
  },
};

class HttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { resume_id, analysis_id, target_role, job_description } = body ?? {};

    if (!resume_id || !target_role || typeof target_role !== "string" || target_role.trim().length < 2) {
      return json({ error: "resume_id and target_role are required" }, 400);
    }

    // Confirm resume ownership and pull text
    const { data: resumeRow, error: resumeErr } = await supabase
      .from("resumes")
      .select("id, user_id, raw_text")
      .eq("id", resume_id)
      .single();
    if (resumeErr || !resumeRow || resumeRow.user_id !== userId) {
      return json({ error: "Resume not found" }, 404);
    }

    if (!resumeRow.raw_text || resumeRow.raw_text.trim().length < 80) {
      return json({ error: "Resume text is empty or too short to tailor" }, 400);
    }


    // Optional analysis context
    let analysisContext = "";
    if (analysis_id) {
      const { data: a } = await supabase
        .from("resume_analyses")
        .select("overall_score, ats_score, weaknesses, score_breakdown, job_match, extracted")
        .eq("id", analysis_id)
        .eq("user_id", userId)
        .single();
      if (a) {
        analysisContext = `\n\n--- PRIOR ANALYSIS (use to focus the rewrite) ---\n${JSON.stringify(
          {
            overall_score: a.overall_score,
            ats_score: a.ats_score,
            weaknesses: a.weaknesses,
            score_breakdown: a.score_breakdown,
            job_match: a.job_match,
            top_skills: (a.extracted as any)?.skills?.slice?.(0, 30),
          },
        ).slice(0, 6000)}`;
      }
    }

    const inserted = await runPaidAction(
      { userId, action: "resume_tailor", feature: "tailor-resume", provider: "google/gemini-2.5-flash", estimatedCostUsd: 0.003 },
      async () => {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new HttpError("AI key not configured", 500);
  
      const truncated = resumeRow.raw_text.slice(0, 15000);
      const jdText = (job_description ?? "").toString().slice(0, 6000);
  
      const userPrompt = `Tailor this resume for the role: "${target_role}".
  
  ${jdText ? `--- JOB DESCRIPTION ---\n${jdText}\n` : "(No job description pasted — infer typical requirements for this role.)"}
  ${analysisContext}
  
  --- RESUME TEXT ---
  ${truncated}
  
  Now call tailor_resume.`;
  
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "tailor_resume" } },
        }),
      });
  
      if (!aiResp.ok) {
        if (aiResp.status === 429)
          throw new HttpError("Rate limit exceeded. Try again in a moment.", 429);
        if (aiResp.status === 402)
          throw new HttpError("AI is temporarily unavailable. Try again later.", 503);
        const t = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, t);
        throw new HttpError("AI tailoring failed", 500);
      }
  
      const aiData = await aiResp.json();
      const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("No tool call", JSON.stringify(aiData).slice(0, 500));
        throw new HttpError("AI did not return structured output", 500);
      }
  
      let parsed: any;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool args", e);
        throw new HttpError("AI returned invalid JSON", 500);
      }
  
      const { data: inserted, error: insertErr } = await supabase
        .from("resume_tailorings")
        .insert({
          user_id: userId,
          resume_id,
          analysis_id: analysis_id ?? null,
          target_role: target_role.trim(),
          job_description: jdText || null,
          summary: parsed.summary ?? "",
          skills: parsed.skills ?? [],
          bullets: parsed.bullets ?? [],
          keywords_to_add: parsed.keywords_to_add ?? [],
          cover_note: parsed.cover_note ?? "",
          match_before:
            parsed.match_before != null ? Math.round(parsed.match_before) : null,
          match_after:
            parsed.match_after != null ? Math.round(parsed.match_after) : null,
          model: "google/gemini-2.5-flash",
        })
        .select()
        .single();
  
      if (insertErr) {
        console.error("Insert error", insertErr);
        throw new HttpError("Failed to save tailoring", 500);
      }
        return inserted;
      },
    );
    return json({ tailoring: inserted });
  } catch (e) {
    if (e instanceof PaidActionError) return json({ error: e.message, code: e.code }, e.status);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("tailor-resume error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
