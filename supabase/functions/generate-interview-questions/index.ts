// Generates personalized interview questions grounded in the user's resume.
// Each call returns ONE fresh question (or up to `count`) that has not been
// shown to this user before — so 20 shuffles = 20 different questions, 100 = 100.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkEntitlement, incrementUsage } from "../_shared/entitlements.ts";

import { resolveUserResume, ResumeSourceError, CAREER_FACT_RULE } from "../_shared/resume-source.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TYPES = new Set(["behavioral", "technical", "case"]);

const SYSTEM_PROMPT = `${CAREER_FACT_RULE}
You generate personalized interview questions for a specific candidate.

You receive the candidate's resume, a target role (optional), a question type, and a list of question STEMS the candidate has already seen. Your job is to invent a NEW question that:
- Is concretely grounded in something on the resume (a specific project, technology, role, achievement, gap, education, certification, or claim) — never generic.
- Does NOT duplicate or paraphrase any "already_seen" stem. Vary topic, focus area, angle, and phrasing.
- Sounds like a real interviewer at a top company would ask it.
- Is one question, 1–3 sentences max. No multi-part stacks.

For TYPE:
- behavioral: probe leadership, conflict, ownership, decisions, failure, growth — anchored to a real experience on the resume.
- technical: probe technical depth, system design, debugging, tradeoffs — anchored to a real technology, project, or domain on the resume.
- case: probe structured problem-solving, product/PM/analyst thinking, metrics — relevant to the candidate's domain and target role.

Difficulty should reflect the candidate's seniority shown on the resume.

ALWAYS respond by calling the propose_question tool.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "propose_question",
    description: "Return one personalized interview question for the candidate.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "The interview question. 1–3 sentences." },
        rationale: {
          type: "string",
          description: "≤200 chars — what on the resume this question targets and why.",
        },
        focus_area: {
          type: "string",
          description: "Short tag like 'system design', 'stakeholder mgmt', 'failure', 'metrics'.",
        },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      },
      required: ["question", "rationale", "focus_area", "difficulty"],
      additionalProperties: false,
    },
  },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha1(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const {
      resume_id,
      question_type = "behavioral",
      target_role,
      count = 1,
    } = body ?? {};

    const safeType = ALLOWED_TYPES.has(question_type) ? question_type : "behavioral";
    const safeCount = Math.max(1, Math.min(5, Number(count) || 1));
    const resolved = await resolveUserResume(supabase, userId, { resumeId: resume_id, job: typeof target_role === "string" ? target_role : "" });
    const resumeText = resolved.text;
    const gate = await checkEntitlement(userId, "interview_questions");
    if (!gate.ok) return json({ error: gate.error, plan: gate.plan, upgrade_required: true }, gate.status);

    // Pull all previously-seen questions for this user (any resume / type) so we
    // can avoid repeats globally. Cap to the most recent 200 to keep prompts small.
    const { data: prior } = await supabase
      .from("interview_questions")
      .select("question, question_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const seen = (prior ?? []).map((p) => p.question);

    const generated: any[] = [];

    // Generate one at a time so the model can see each newly-added question and
    // diversify. Each insert is unique by (user_id, question_hash).
    for (let i = 0; i < safeCount; i++) {
      const userPrompt = `QUESTION TYPE: ${safeType}
TARGET ROLE: ${target_role?.toString().trim() || "(not specified — infer from resume)"}

CANDIDATE RESUME:
"""
${resumeText}
"""

ALREADY_SEEN QUESTIONS (do NOT repeat or paraphrase any of these — pick a different angle, project, or skill):
${seen.length ? seen.map((q, idx) => `${idx + 1}. ${q}`).join("\n") : "(none yet)"}

Now propose ONE new ${safeType} question grounded in this resume. Vary the focus area from the seen list. Call propose_question.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.95,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "propose_question" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429)
          return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
        if (aiResp.status === 402)
          return json({ error: "AI credits exhausted. Add credits in workspace usage." }, 402);
        const t = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, t);
        return json({ error: "AI request failed" }, 500);
      }

      const aiData = await aiResp.json();
      const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) {
        console.error("No tool call", JSON.stringify(aiData).slice(0, 500));
        continue;
      }
      let parsed: {
        question: string;
        rationale: string;
        focus_area: string;
        difficulty: string;
      };
      try {
        parsed = JSON.parse(args);
      } catch {
        continue;
      }

      const cleanQ = parsed.question?.trim();
      if (!cleanQ || cleanQ.length < 10) continue;

      const hash = await sha1(`${userId}:${normalize(cleanQ)}`);

      // Insert; on duplicate hash, retry the loop iteration (skip).
      const { data: inserted, error: insErr } = await supabase
        .from("interview_questions")
        .insert({
          user_id: userId,
          resume_id: resume_id ?? null,
          question_type: safeType,
          target_role: target_role?.toString().trim() || null,
          question: cleanQ,
          rationale: parsed.rationale ?? null,
          focus_area: parsed.focus_area ?? null,
          difficulty: parsed.difficulty ?? null,
          question_hash: hash,
        })
        .select()
        .single();

      if (insErr) {
        // Likely a duplicate — push the question into seen list and let the next
        // iteration try a different angle.
        console.warn("insert dup or err", insErr.message);
        seen.push(cleanQ);
        // give it one extra attempt by extending the loop budget
        if (i < safeCount && safeCount === 1) {
          // single-question request: try once more
          continue;
        }
        continue;
      }

      generated.push(inserted);
      seen.push(cleanQ);
    }

    if (!generated.length) {
      return json(
        { error: "Couldn't generate a new question. Try a different question type or upload a more detailed resume." },
        500,
      );
    }

    for (let i = 0; i < generated.length; i++) {
      await incrementUsage(userId, "interview_questions");
    }

    return json({ questions: generated, resume_source: resolved });
  } catch (e) {
    if (e instanceof ResumeSourceError) return json({ error: e.message }, e.status);
    console.error("generate-interview-questions error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
