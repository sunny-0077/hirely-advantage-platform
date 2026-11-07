// Mock Interview engine — runs a multi-turn simulated interview with dynamic
// follow-ups, brief coaching after each answer, and a final summary.
// Actions: start | respond | end
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkEntitlement, incrementUsage } from "../_shared/entitlements.ts";

import { resolveUserResume, ResumeSourceError, CAREER_FACT_RULE } from "../_shared/resume-source.ts";
import { UNTRUSTED_INPUT_RULE } from "../_shared/ai-input.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_FOCUS = new Set(["behavioral", "technical", "case", "mixed"]);
const ALLOWED_DIFFICULTY = new Set(["easy", "medium", "hard", "stress"]);
const ALLOWED_DURATIONS = new Set([5, 10, 15, 20, 30]);

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy:
    "Friendly, encouraging tone. Ask one clear question at a time. Avoid pile-on follow-ups. Pace: relaxed.",
  medium:
    "Professional, neutral tone. Probe one layer deeper when answers are vague. Pace: steady.",
  hard:
    "Sharp, senior-interviewer tone. Push back on vague claims. Demand metrics, tradeoffs, ownership. Pace: fast.",
  stress:
    "STRESS MODE. Be skeptical and direct. Interrupt-style follow-ups: 'But why specifically you?', 'That's not really a result — what changed?'. Time-pressure cues. NEVER abusive, just intense like a tough Director-level loop.",
};

const FOCUS_GUIDE: Record<string, string> = {
  behavioral: "Behavioral / leadership questions. Look for STAR structure and concrete impact.",
  technical: "Technical questions for the role. System design, debugging, tradeoffs.",
  case: "Case / product / analytical questions. Test structured thinking and quantitative reasoning.",
  mixed: "Mix behavioral, technical, and case as a real loop would.",
};

const SYSTEM_PROMPT = `${CAREER_FACT_RULE}
${UNTRUSTED_INPUT_RULE}
You are an elite interview simulator running a live mock interview.

Your job each turn:
1. Read the full conversation so far.
2. If the candidate just answered, give SHORT coaching (1–3 sentences). Be concrete. Example:
   "That's a good start. Try Present → Past → Future to give it shape, and add one number to the result."
3. Then ask ONE next question. Either:
   - a follow-up that drills into something they just said (preferred when their answer was vague, lacked metrics, or skipped STAR), OR
   - a fresh question if they nailed it.
4. Track question kind: 'opening' (turn 1), 'follow_up' (drills in), 'new_topic' (fresh), 'curveball' (stress), 'wrap_up' (last turn), 'nonsense' (when the candidate's answer is gibberish/irrelevant and you re-ask).

NONSENSE / IRRELEVANT ANSWER HANDLING (very important):
- If the candidate's last answer is gibberish (random characters like "asdf", "olbujnbkn67f"), empty-of-meaning ("idk", "lol", "nothing", "test"), wildly off-topic, joking, abusive, or under ~5 real words with zero substance, you MUST:
  1. Set score to a low number (0–15).
  2. In feedback, kindly but firmly tell them their answer doesn't address the question and ask for a real, relevant response. Mention 1 concrete thing they should include (e.g. "give a specific situation you were in, what you did, and the outcome").
  3. Set question_kind to 'nonsense' and RE-ASK the SAME question (rephrased slightly is fine). Do NOT move on to a new question.
- Only move on once they give a real attempt, even if imperfect. An imperfect-but-genuine answer should get normal coaching + follow-up, NOT the nonsense path.

Hard rules:
- Never produce more than ONE question per turn.
- Never break character. You are the interviewer.
- Keep coaching CRISP. No essays. No lists.
- Score the candidate's last answer 0–100 (skip on the very first turn since there's no answer yet — return null).
- Respect the difficulty and focus settings.
- When the user ends the interview or hits the time limit, if asked to summarize, give an honest overall score, 2–3 strengths, 2–3 improvements, and a one-line takeaway.

ALWAYS respond by calling the interview_turn tool (or interview_summary when asked for a final summary).`;

const TURN_TOOL = {
  type: "function",
  function: {
    name: "interview_turn",
    description: "Return coaching for the previous answer (if any) plus the next question.",
    parameters: {
      type: "object",
      properties: {
        feedback: {
          type: "string",
          description: "Short coaching on the candidate's last answer. Empty string on the first turn.",
        },
        score: {
          type: ["integer", "null"],
          description: "0-100 score for the last answer. Null on the first turn.",
        },
        question: { type: "string", description: "The next interview question. One question only." },
        question_kind: {
          type: "string",
          enum: ["opening", "follow_up", "new_topic", "curveball", "wrap_up", "nonsense"],
        },
        follow_up_hint: {
          type: "string",
          description: "Optional one-line hint about what you'll probe next if they're vague.",
        },
      },
      required: ["feedback", "score", "question", "question_kind", "follow_up_hint"],
      additionalProperties: false,
    },
  },
};

const SUMMARY_TOOL = {
  type: "function",
  function: {
    name: "interview_summary",
    description: "Return a final summary of the mock interview.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        summary: { type: "string", description: "≤220 chars overall takeaway." },
        strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        improvements: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
      },
      required: ["overall_score", "summary", "strengths", "improvements"],
      additionalProperties: false,
    },
  },
};

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

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

    const body = await req.json();
    const action = body?.action;

    if (action === "start") return await handleStart(body, supabase, userId, LOVABLE_API_KEY);
    if (action === "respond") return await handleRespond(body, supabase, userId, LOVABLE_API_KEY);
    if (action === "end") return await handleEnd(body, supabase, userId, LOVABLE_API_KEY);

    return json({ error: "Unknown action. Use start | respond | end." }, 400);
  } catch (e) {
    if(e instanceof ResumeSourceError) return json({error:e.message},e.status);
    console.error("mock-interview error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function handleStart(
  body: any,
  supabase: any,
  userId: string,
  apiKey: string,
) {
  const {
    target_role,
    focus = "behavioral",
    difficulty = "medium",
    duration_minutes = 15,
    resume_id,
  } = body ?? {};

  if (!target_role || typeof target_role !== "string" || target_role.trim().length < 2) {
    return json({ error: "target_role is required" }, 400);
  }
  const safeFocus = ALLOWED_FOCUS.has(focus) ? focus : "behavioral";
  const safeDiff = ALLOWED_DIFFICULTY.has(difficulty) ? difficulty : "medium";
  const safeDur = ALLOWED_DURATIONS.has(duration_minutes) ? duration_minutes : 15;

  const gate = await checkEntitlement(userId, "mock_interviews");
  if (!gate.ok) return json({ error: gate.error, plan: gate.plan, upgrade_required: true, code: "OVER_QUOTA", feature: "mock_interviews" }, gate.status);

  const resolved = await resolveUserResume(supabase, userId, {resumeId:resume_id,job:target_role});
  const resumeText = resolved.text;

  const { data: session, error: sErr } = await supabase
    .from("mock_interview_sessions")
    .insert({
      user_id: userId,
      resume_id: resume_id ?? null,
      target_role: target_role.trim(),
      focus: safeFocus,
      difficulty: safeDiff,
      duration_minutes: safeDur,
      status: "active",
      model: "google/gemini-2.5-flash",
    })
    .select()
    .single();
  if (sErr || !session) {
    console.error("start session error", sErr);
    return json({ error: "Failed to start session" }, 500);
  }

  await incrementUsage(userId, "mock_interviews");

  // Ask the AI for the opening question.
  const messages: ChatMsg[] = [
    { role: "system", content: buildSystem(session, resumeText) },
    {
      role: "user",
      content:
        "Begin the interview. This is turn 1, the candidate hasn't answered anything yet. Set feedback to an empty string and score to null. Ask the opening question (question_kind: 'opening').",
    },
  ];

  const turn = await callTurn(apiKey, messages);
  if ("error" in turn) return json({ error: turn.error }, turn.status);

  const { data: turnRow, error: tErr } = await supabase
    .from("mock_interview_turns")
    .insert({
      session_id: session.id,
      user_id: userId,
      turn_index: 0,
      question: turn.question,
      question_kind: turn.question_kind ?? "opening",
      follow_up_hint: turn.follow_up_hint ?? null,
    })
    .select()
    .single();
  if (tErr) {
    console.error("insert opening turn error", tErr);
    return json({ error: "Failed to save opening turn" }, 500);
  }

  return json({ session, turn: turnRow });
}

async function handleRespond(
  body: any,
  supabase: any,
  userId: string,
  apiKey: string,
) {
  const { session_id, answer } = body ?? {};
  if (!session_id || typeof answer !== "string" || answer.trim().length < 2) {
    return json({ error: "session_id and a non-empty answer are required" }, 400);
  }

  const { data: session } = await supabase
    .from("mock_interview_sessions")
    .select("*")
    .eq("id", session_id)
    .single();
  if (!session || session.user_id !== userId) return json({ error: "Session not found" }, 404);
  if (session.status !== "active") return json({ error: "Session already ended" }, 400);

  const { data: turns } = await supabase
    .from("mock_interview_turns")
    .select("*")
    .eq("session_id", session_id)
    .order("turn_index", { ascending: true });
  if (!turns || !turns.length) return json({ error: "No turns yet" }, 400);

  const lastTurn = turns[turns.length - 1];
  if (lastTurn.answer) return json({ error: "Last turn already answered" }, 400);

  // Save the user's answer on the last turn first.
  await supabase
    .from("mock_interview_turns")
    .update({ answer: answer.trim() })
    .eq("id", lastTurn.id);

  const resolved = await resolveUserResume(supabase, userId, {resumeId:session.resume_id,job:session.target_role});
  const resumeText = resolved.text;

  // Build chat history.
  const chatMessages: ChatMsg[] = [{ role: "system", content: buildSystem(session, resumeText) }];
  for (const t of turns) {
    chatMessages.push({ role: "assistant", content: t.question });
    if (t.id === lastTurn.id) {
      chatMessages.push({ role: "user", content: answer.trim() });
    } else if (t.answer) {
      chatMessages.push({ role: "user", content: t.answer });
    }
  }

  // Time check — if we're past duration, instruct the model to wrap up.
  const startedAt = new Date(session.started_at).getTime();
  const elapsedMin = (Date.now() - startedAt) / 60000;
  const remaining = session.duration_minutes - elapsedMin;
  const turnIndex = turns.length; // next turn will be this index

  const wrap = remaining <= 0.5 || turnIndex >= 12;
  const suspect = looksLikeNonsense(answer.trim());
  chatMessages.push({
    role: "user",
    content: wrap
      ? "Time is nearly up. Coach on the last answer briefly and ask ONE final wrap-up question (question_kind: 'wrap_up'). If the last answer is gibberish/irrelevant, still wrap up but call it out honestly."
      : suspect
        ? `The candidate's last answer looks like gibberish, off-topic, or has no real substance. DO NOT move on. Set question_kind to 'nonsense', score it low (0–15), tell them in feedback that the answer doesn't address the question and what a real answer needs (e.g. specific situation, action, outcome with a number), and RE-ASK the same question they were just asked. About ${Math.max(0, Math.round(remaining))} minutes left.`
        : `Coach on the last answer in 1–3 sentences, then ask the next question. About ${Math.max(
            0,
            Math.round(remaining),
          )} minutes left. Use 'follow_up' if their last answer was vague or missing metrics; 'new_topic' if they nailed it; 'curveball' only in stress mode and sparingly. If the answer is genuinely gibberish/irrelevant use 'nonsense' and re-ask the same question.`,
  });

  const turn = await callTurn(apiKey, chatMessages);
  if ("error" in turn) return json({ error: turn.error }, turn.status);

  // Update last turn with feedback/score.
  await supabase
    .from("mock_interview_turns")
    .update({
      feedback: turn.feedback ?? null,
      score: turn.score ?? null,
    })
    .eq("id", lastTurn.id);

  // Insert the next question.
  const { data: nextTurn, error: nErr } = await supabase
    .from("mock_interview_turns")
    .insert({
      session_id: session.id,
      user_id: userId,
      turn_index: turnIndex,
      question: turn.question,
      question_kind: turn.question_kind ?? (wrap ? "wrap_up" : "follow_up"),
      follow_up_hint: turn.follow_up_hint ?? null,
    })
    .select()
    .single();
  if (nErr) {
    console.error("insert next turn error", nErr);
    return json({ error: "Failed to save next turn" }, 500);
  }

  return json({
    previous_feedback: turn.feedback,
    previous_score: turn.score,
    turn: nextTurn,
    wrap_up: wrap,
  });
}

async function handleEnd(
  body: any,
  supabase: any,
  userId: string,
  apiKey: string,
) {
  const { session_id, final_answer } = body ?? {};
  if (!session_id) return json({ error: "session_id is required" }, 400);

  const { data: session } = await supabase
    .from("mock_interview_sessions")
    .select("*")
    .eq("id", session_id)
    .single();
  if (!session || session.user_id !== userId) return json({ error: "Session not found" }, 404);

  const { data: turns } = await supabase
    .from("mock_interview_turns")
    .select("*")
    .eq("session_id", session_id)
    .order("turn_index", { ascending: true });

  // If a final answer was provided for the last unanswered turn, persist it.
  if (final_answer && typeof final_answer === "string" && turns?.length) {
    const last = turns[turns.length - 1];
    if (!last.answer) {
      await supabase
        .from("mock_interview_turns")
        .update({ answer: final_answer.trim() })
        .eq("id", last.id);
      last.answer = final_answer.trim();
    }
  }

  const resolved = await resolveUserResume(supabase, userId, {resumeId:session.resume_id,job:session.target_role});
  const resumeText = resolved.text;

  const chatMessages: ChatMsg[] = [{ role: "system", content: buildSystem(session, resumeText) }];
  for (const t of turns ?? []) {
    chatMessages.push({ role: "assistant", content: t.question });
    if (t.answer) chatMessages.push({ role: "user", content: t.answer });
  }
  chatMessages.push({
    role: "user",
    content:
      "The interview is over. Call interview_summary with an honest overall_score (0-100), 2–3 strengths, 2–3 improvements, and a one-line summary.",
  });

  const summary = await callSummary(apiKey, chatMessages);
  if ("error" in summary) return json({ error: summary.error }, summary.status);

  const { data: updated, error: uErr } = await supabase
    .from("mock_interview_sessions")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
      overall_score: summary.overall_score,
      summary: summary.summary,
      strengths: summary.strengths,
      improvements: summary.improvements,
    })
    .eq("id", session_id)
    .select()
    .single();
  if (uErr) {
    console.error("end session error", uErr);
    return json({ error: "Failed to finalize session" }, 500);
  }

  return json({ session: updated });
}

function buildSystem(session: any, resumeText: string) {
  return `${SYSTEM_PROMPT}

INTERVIEW SETTINGS
- Target role: ${session.target_role}
- Focus: ${session.focus} — ${FOCUS_GUIDE[session.focus] ?? ""}
- Difficulty: ${session.difficulty} — ${DIFFICULTY_GUIDE[session.difficulty] ?? ""}
- Time budget: ${session.duration_minutes} minutes total. Plan ~6–10 turns.

GROUNDING RULE (STRICT):
Every question (including the opening one) MUST be grounded in something concrete from the CANDIDATE RESUME below — a specific project, role, technology, achievement, metric, education, certification, or claim. Do NOT ask generic interview questions ("Tell me about yourself", "What's your biggest weakness", "Why this company") unless they are tied to a specific resume detail. If the resume mentions Project X, ask about Project X. If it lists a tech stack, drill into that stack. Reference the resume detail naturally inside the question itself (e.g. "On the Stress Recognition ML project at Rooman, …").

CANDIDATE RESUME (sole grounding source — use this and only this for question content):
"""
${resumeText}
"""`;
}

async function callTurn(apiKey: string, messages: ChatMsg[]) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [TURN_TOOL],
      tool_choice: { type: "function", function: { name: "interview_turn" } },
    }),
  });
  if (!resp.ok) return aiError(resp);
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { error: "No tool call from AI", status: 500 as const };
  try {
    return JSON.parse(args) as {
      feedback: string;
      score: number | null;
      question: string;
      question_kind: string;
      follow_up_hint: string;
    };
  } catch {
    return { error: "AI returned invalid JSON", status: 500 as const };
  }
}

async function callSummary(apiKey: string, messages: ChatMsg[]) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "function", function: { name: "interview_summary" } },
    }),
  });
  if (!resp.ok) return aiError(resp);
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { error: "No tool call from AI", status: 500 as const };
  try {
    return JSON.parse(args) as {
      overall_score: number;
      summary: string;
      strengths: string[];
      improvements: string[];
    };
  } catch {
    return { error: "AI returned invalid JSON", status: 500 as const };
  }
}

async function aiError(resp: Response) {
  if (resp.status === 429) return { error: "Rate limit exceeded. Try again in a moment.", status: 429 as const };
  if (resp.status === 402) return { error: "AI credits exhausted. Add credits in workspace usage.", status: 503 as const };
  const t = await resp.text();
  console.error("AI gateway error:", resp.status, t);
  return { error: "AI request failed", status: 500 as const };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Heuristic: does this answer look like gibberish / non-attempt?
// Conservative — only flags clear cases. The model still makes the final call.
function looksLikeNonsense(text: string): boolean {
  const t = (text || "").trim().toLowerCase();
  if (!t) return true;
  const words = t.split(/\s+/).filter(Boolean);
  // Very short answers (< 5 words) with no real content.
  if (words.length < 5) {
    const lowEffort = /^(idk|dunno|nothing|n\/a|na|none|lol|lmao|test|asdf+|hi|hello|ok|okay|yes|no|maybe|skip|pass)\.?$/i;
    if (words.every((w) => lowEffort.test(w))) return true;
    if (words.length < 3) return true;
  }
  // Detect keyboard-mash tokens: long-ish words with no vowels or absurd consonant runs.
  const mashy = words.filter((w) => {
    if (w.length < 5) return false;
    if (!/[aeiou]/i.test(w)) return true; // no vowels at all
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(w)) return true; // 5+ consonants in a row
    if (/^[a-z0-9]{6,}$/i.test(w) && !/[aeiou].*[aeiou]/i.test(w)) return true; // alphanumeric, ≤1 vowel
    return false;
  });
  if (words.length > 0 && mashy.length / words.length >= 0.5) return true;
  // Single long token with digits mixed in and no spaces (e.g. "olbujnbkn67f").
  if (words.length === 1 && words[0].length >= 6 && /\d/.test(words[0]) && /[a-z]/.test(words[0])) return true;
  return false;
}
