// Enhance resume — generates a fully rewritten, optimized resume that fixes
// every issue surfaced by the analyzer. Returns structured JSON via tool calling.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkEntitlement } from "../_shared/entitlements.ts";

import { resolveUserResume, ResumeSourceError, CAREER_FACT_RULE } from "../_shared/resume-source.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `${CAREER_FACT_RULE}
You are a world-class resume writer who has placed senior candidates at FAANG, top consultancies, and unicorn startups.

Your job: take a candidate's existing resume PLUS the prior analysis (issues, weak bullets, missing keywords, score breakdown) and produce a SINGLE, fully rewritten, recruiter-ready resume that fixes every issue.

Hard rules:
- Never invent jobs, companies, schools, degrees, or dates. Keep all factual anchors verbatim.
- Only supplied skills belong in the factual resume. Missing keywords are separate learning suggestions.
- Use strong verbs and supplied outcomes. Never add a metric absent from the source.
- Return verifiable_claims as an empty array; never generate inferred numerical claims.
- Fix every weak bullet, missing section, ATS issue, formatting problem, and grammar issue from the analysis.
- Tone: confident, specific, senior. No fluff, no clichés ("team player", "results-driven", "passionate about").
- Summary: 2-3 sentences, third-person-implied, role-aligned, with a headline achievement only if supplied.
- Group skills into 3-5 logical clusters (e.g. Languages, Frameworks, Cloud, Domain).
- Output a clean changelog so the user understands exactly what changed and why.

Always respond by calling the enhance_resume tool. Never reply with prose.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "enhance_resume",
    description: "Return a fully rewritten, optimized resume.",
    parameters: {
      type: "object",
      properties: {
        contact: {
          type: "object",
          description: "Header / contact block.",
          properties: {
            name: { type: "string" },
            location: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  url: { type: "string" },
                },
                required: ["label", "url"],
                additionalProperties: false,
              },
            },
          },
          required: ["name"],
          additionalProperties: false,
        },
        headline: {
          type: "string",
          description: "One-line professional headline. ≤90 chars.",
        },
        summary: {
          type: "string",
          description: "2-3 sentence professional summary with supplied achievements only. ≤380 chars.",
        },
        skills: {
          type: "array",
          description: "3-5 skill clusters.",
          items: {
            type: "object",
            properties: {
              group: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["group", "items"],
            additionalProperties: false,
          },
        },
        experience: {
          type: "array",
          description: "Work experience, most recent first. Keep all original roles, dates, companies.",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              company: { type: "string" },
              location: { type: "string" },
              dates: { type: "string" },
              bullets: {
                type: "array",
                description: "3-6 rewritten bullets per role. Each starts with a strong verb and preserves original outcomes without adding metrics.",
                items: { type: "string" },
              },
            },
            required: ["role", "company", "dates", "bullets"],
            additionalProperties: false,
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              tech: { type: "array", items: { type: "string" } },
              impact: { type: "string", description: "Quantified outcome if available." },
            },
            required: ["name", "description"],
            additionalProperties: false,
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: {
              degree: { type: "string" },
              school: { type: "string" },
              dates: { type: "string" },
              detail: { type: "string", description: "GPA, honors, or relevant coursework if present in source." },
            },
            required: ["degree", "school"],
            additionalProperties: false,
          },
        },
        achievements: {
          type: "array",
          items: { type: "string" },
        },
        changelog: {
          type: "array",
          description: "Plain-English list of what changed and why. 4-10 items.",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "summary",
                  "metrics_added",
                  "verbs_strengthened",
                  "keyword_injection",
                  "section_added",
                  "ats_fix",
                  "formatting",
                  "grammar",
                  "specificity",
                  "other",
                ],
              },
              title: { type: "string", description: "≤70 chars" },
              detail: { type: "string", description: "≤200 chars. What changed and why it matters." },
            },
            required: ["category", "title", "detail"],
            additionalProperties: false,
          },
        },
        added_keywords: {
          type: "array",
          description: "Separate keyword learning suggestions; never factual skills to inject.",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              reason: { type: "string", description: "≤140 chars" },
            },
            required: ["keyword", "confidence", "reason"],
            additionalProperties: false,
          },
        },
        verifiable_claims: {
          type: "array",
          description:
            "EVERY metric, percentage, count, dollar amount, or quantified outcome you ADDED or INFERRED that was not explicitly stated in the original resume. The user must confirm these before using. Be exhaustive — if you wrote 'improved performance by 30%' and the original didn't say 30%, list it here. Do NOT include numbers that were already in the source resume.",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The exact phrase/bullet sentence containing the inferred metric, as it appears in the rewritten resume. ≤220 chars.",
              },
              metric: {
                type: "string",
                description: "Just the inferred number/claim (e.g. '15%', '$2M ARR', '15 bugs'). ≤40 chars.",
              },
              location: {
                type: "string",
                description: "Where in the resume this appears, e.g. 'Experience · Acme Corp · bullet 2' or 'Summary'. ≤120 chars.",
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How plausible the inferred metric is given the candidate's context.",
              },
              reason: {
                type: "string",
                description: "Why this number is plausible / how the user should sanity-check it. ≤160 chars.",
              },
            },
            required: ["text", "metric", "location", "confidence", "reason"],
            additionalProperties: false,
          },
        },
        estimated_score_before: {
          type: "number",
          description: "0-100 estimate of original resume score.",
        },
        estimated_score_after: {
          type: "number",
          description: "0-100 estimate after applying every change in this rewrite.",
        },
      },
      required: [
        "contact",
        "summary",
        "skills",
        "experience",
        "changelog",
        "added_keywords",
        "verifiable_claims",
        "estimated_score_before",
        "estimated_score_after",
      ],
      additionalProperties: false,
    },
  },
};

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

    const body = await req.json().catch(() => ({}));
    const { resume_id, analysis_id, target_role: requestedRole } = body ?? {};

    const cleanRequestedRole = typeof requestedRole === "string" ? requestedRole.trim().slice(0, 80) : "";
    const resolved = await resolveUserResume(supabase, userId, { resumeId: resume_id, job: cleanRequestedRole });

    const gate = await checkEntitlement(userId, "enhanced_resume");
    if (!gate.ok) return json({ error: gate.error, plan: gate.plan, upgrade_required: true }, gate.status);

    let analysisContext = "";
    let targetRole = "";
    if (analysis_id) {
      const { data: a } = await supabase
        .from("resume_analyses")
        .select(
          "overall_score, ats_score, summary, target_role, weaknesses, issues, score_breakdown, job_match, quick_wins, bullet_rewrites, extracted",
        )
        .eq("id", analysis_id)
        .eq("user_id", userId)
        .single();
      if (a) {
        targetRole = (a.target_role as string) ?? "";
        analysisContext = `\n\n--- PRIOR ANALYSIS (fix EVERY issue listed) ---\n${JSON.stringify(
          {
            overall_score: a.overall_score,
            ats_score: a.ats_score,
            summary: a.summary,
            target_role: a.target_role,
            weaknesses: a.weaknesses,
            issues: a.issues,
            score_breakdown: a.score_breakdown,
            job_match: a.job_match,
            quick_wins: a.quick_wins,
            bullet_rewrites: a.bullet_rewrites,
            top_skills: (a.extracted as any)?.skills?.slice?.(0, 30),
          },
        ).slice(0, 8000)}`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const effectiveRole = cleanRequestedRole || targetRole;
    const truncated = resolved.text;
    const pageGuidance = `LENGTH TARGET: ONE printed page (≈450–550 words total).\n- Summary: 2 sentences max.\n- Skills: 3–4 tight clusters, ~6–10 items each.\n- Experience: 3–4 bullets per role, each ≤1 line when printed.\n- Projects: at most 2, one line each.\n- Trim ruthlessly — keep only the highest-impact content.`;

    const userPrompt = `Rewrite this resume into a single recruiter-ready version that fixes every issue from the analysis.${
      effectiveRole ? ` Optimize specifically for the role: "${effectiveRole}". Tailor the summary, skill clusters, keyword choice, and bullet emphasis to what recruiters and ATS systems screen for in "${effectiveRole}" applications.` : ""
    }

${pageGuidance}
${analysisContext}

--- ORIGINAL RESUME TEXT ---
${truncated}

Now call enhance_resume.`;

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
        tool_choice: { type: "function", function: { name: "enhance_resume" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI credits exhausted. Add credits in workspace usage." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI rewrite failed" }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call", JSON.stringify(aiData).slice(0, 500));
      return json({ error: "AI did not return structured output" }, 500);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return json({ error: "AI returned invalid JSON" }, 500);
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("resume_enhancements")
      .insert({
        user_id: userId,
        resume_id,
        analysis_id: analysis_id ?? null,
        contact: parsed.contact ?? {},
        headline: parsed.headline ?? null,
        summary: parsed.summary ?? "",
        skills: parsed.skills ?? [],
        experience: parsed.experience ?? [],
        projects: parsed.projects ?? [],
        education: parsed.education ?? [],
        achievements: parsed.achievements ?? [],
        changelog: parsed.changelog ?? [],
        added_keywords: parsed.added_keywords ?? [],
        verifiable_claims: (parsed.verifiable_claims ?? []).map((c: any, i: number) => ({
          id: `claim-${i}-${Math.random().toString(36).slice(2, 8)}`,
          text: String(c.text ?? "").slice(0, 240),
          metric: String(c.metric ?? "").slice(0, 60),
          location: String(c.location ?? "").slice(0, 140),
          confidence: ["high", "medium", "low"].includes(c.confidence) ? c.confidence : "medium",
          reason: String(c.reason ?? "").slice(0, 200),
          status: "pending",
        })),
        estimated_score_before:
          parsed.estimated_score_before != null
            ? Math.round(parsed.estimated_score_before)
            : null,
        estimated_score_after:
          parsed.estimated_score_after != null
            ? Math.round(parsed.estimated_score_after)
            : null,
        model: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error", insertErr);
      return json({ error: "Failed to save enhancement" }, 500);
    }

    return json({ enhancement: inserted });
  } catch (e) {
    if (e instanceof ResumeSourceError) return json({ error: e.message }, e.status);
    console.error("enhance-resume error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
