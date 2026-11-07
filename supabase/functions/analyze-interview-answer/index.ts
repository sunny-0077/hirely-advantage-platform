// Live answer analysis for interview prep — scores an answer across six axes,
// returns structured feedback and a rewritten sample answer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPlan } from "../_shared/entitlements.ts";

import { resolveUserResume, ResumeSourceError, CAREER_FACT_RULE } from "../_shared/resume-source.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `${CAREER_FACT_RULE}
You are an elite interview coach who has prepped candidates for FAANG, top consulting, and senior product roles. You analyze interview answers honestly — never sugarcoat — but always give actionable next steps.

You score the candidate's answer on SIX axes, each 0–100:

1. clarity_score        — Is the message easy to follow? Logical flow? No rambling?
2. confidence_score     — Active voice, decisive verbs, no hedging ("kind of", "I think maybe", "I tried to"). Lower = lots of hedging.
3. length_score         — For behavioral answers, ideal is 90–180 seconds spoken (~150–300 words). Penalize too short OR too long.
4. metrics_score        — Are there CONCRETE numbers? %, $, time saved, users, scale. No metrics = low score.
5. star_score           — Does it follow Situation → Task → Action → Result? Missing parts hurt the score.
6. keyword_score        — Does the answer use language relevant to the question/role? (skills, domain terms)

Then return:
- overall_score (weighted: clarity 20%, confidence 15%, star 25%, metrics 20%, keyword 10%, length 10%)
- strengths      — 2–4 specific things the candidate did WELL. Quote phrases when useful.
- gaps           — 2–4 specific gaps. Each is concrete and tells them what to add. Example: "Add a measurable performance result if you have one."
- matched_keywords / missing_keywords — keywords relevant to the question/role
- star_breakdown — { situation, task, action, result } each with { present: bool, note: string }
- improved_answer — A REWRITTEN sample answer (≤220 words) that fixes the gaps while staying believable based on what the candidate already said. Use STAR structure. Never add metrics. If facts are missing, supply an answer structure labeled as a structure, not a completed personal story; put verification suggestions in gaps, outside improved_answer.
- coaching_note  — ≤180 chars. The single most important thing to fix next time.

NEVER invent a different story than what the candidate told. Stay faithful to their experience; just sharpen it.

ALWAYS respond by calling the analyze_answer tool.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "analyze_answer",
    description: "Score and critique an interview answer.",
    parameters: {
      type: "object",
      properties: {
        clarity_score: { type: "integer", minimum: 0, maximum: 100 },
        confidence_score: { type: "integer", minimum: 0, maximum: 100 },
        length_score: { type: "integer", minimum: 0, maximum: 100 },
        metrics_score: { type: "integer", minimum: 0, maximum: 100 },
        star_score: { type: "integer", minimum: 0, maximum: 100 },
        keyword_score: { type: "integer", minimum: 0, maximum: 100 },
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        strengths: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 5,
        },
        gaps: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 5,
        },
        matched_keywords: { type: "array", items: { type: "string" } },
        missing_keywords: { type: "array", items: { type: "string" } },
        star_breakdown: {
          type: "object",
          properties: {
            situation: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                note: { type: "string" },
              },
              required: ["present", "note"],
              additionalProperties: false,
            },
            task: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                note: { type: "string" },
              },
              required: ["present", "note"],
              additionalProperties: false,
            },
            action: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                note: { type: "string" },
              },
              required: ["present", "note"],
              additionalProperties: false,
            },
            result: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                note: { type: "string" },
              },
              required: ["present", "note"],
              additionalProperties: false,
            },
          },
          required: ["situation", "task", "action", "result"],
          additionalProperties: false,
        },
        improved_answer: { type: "string" },
        coaching_note: { type: "string" },
      },
      required: [
        "clarity_score",
        "confidence_score",
        "length_score",
        "metrics_score",
        "star_score",
        "keyword_score",
        "overall_score",
        "strengths",
        "gaps",
        "matched_keywords",
        "missing_keywords",
        "star_breakdown",
        "improved_answer",
        "coaching_note",
      ],
      additionalProperties: false,
    },
  },
};

const ALLOWED_QUESTION_TYPES = new Set(["behavioral", "technical", "case", "general"]);

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
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
    const {
      question,
      answer,
      question_type = "behavioral",
      target_role,
      resume_id,
      persist = true,
    } = body ?? {};

    if (typeof question !== "string" || question.trim().length < 5) {
      return json({ error: "question is required" }, 400);
    }
    if (typeof answer !== "string" || answer.trim().length < 10) {
      return json({ error: "answer must be at least 10 characters" }, 400);
    }
    const safeQType = ALLOWED_QUESTION_TYPES.has(question_type) ? question_type : "behavioral";

    const resolved = await resolveUserResume(supabase, userId, { resumeId: resume_id, job: typeof target_role === "string" ? target_role : "" });
    const resumeText = resolved.text;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const wc = wordCount(answer);

    const userPrompt = `Question type: ${safeQType}
Target role: ${target_role || "(not specified)"}
Word count of answer: ${wc}

QUESTION:
${question.trim()}

CANDIDATE ANSWER:
${answer.trim()}

${resumeText ? `RESUME CONTEXT (for grounding the rewrite):\n${resumeText}\n` : ""}

Score this answer rigorously and call analyze_answer.`;

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
        tool_choice: { type: "function", function: { name: "analyze_answer" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI credits exhausted. Add credits in workspace usage." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI analysis failed" }, 500);
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

    // Free plan: hide improved_answer and coaching_note (locked feature).
    const plan = await getPlan(userId);
    const improvedLocked = plan === "free";

    const record = {
      user_id: userId,
      resume_id: resume_id ?? null,
      target_role: typeof target_role === "string" ? target_role.trim() || null : null,
      question: question.trim(),
      question_type: safeQType,
      answer: answer.trim(),
      clarity_score: parsed.clarity_score ?? null,
      confidence_score: parsed.confidence_score ?? null,
      length_score: parsed.length_score ?? null,
      metrics_score: parsed.metrics_score ?? null,
      star_score: parsed.star_score ?? null,
      keyword_score: parsed.keyword_score ?? null,
      overall_score: parsed.overall_score ?? null,
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      matched_keywords: parsed.matched_keywords ?? [],
      missing_keywords: parsed.missing_keywords ?? [],
      star_breakdown: parsed.star_breakdown ?? {},
      improved_answer: improvedLocked ? "" : (parsed.improved_answer ?? ""),
      coaching_note: improvedLocked ? "" : (parsed.coaching_note ?? ""),
      word_count: wc,
      model: "google/gemini-2.5-flash",
    };

    if (persist) {
      const { data: inserted, error: insertErr } = await supabase
        .from("interview_answers")
        .insert(record)
        .select()
        .single();
      if (insertErr) {
        console.error("Insert error", insertErr);
        return json({ error: "Failed to save analysis" }, 500);
      }
      return json({ analysis: inserted, improved_locked: improvedLocked });
    }

    return json({ analysis: record, improved_locked: improvedLocked });
  } catch (e) {
    if (e instanceof ResumeSourceError) return json({ error: e.message }, e.status);
    console.error("analyze-interview-answer error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
