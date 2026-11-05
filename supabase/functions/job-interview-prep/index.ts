// Job feed interview prep: master resume + job description -> structured prep guide (1 credit).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runPaidAction, PaidActionError } from "../_shared/credits.ts";
import { upsertApplication } from "../_shared/applications.ts";
import { sanitizeAiInput, buildTailoringInput, UNTRUSTED_INPUT_RULE } from "../_shared/ai-input.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const MODEL = "google/gemini-3.8-flash";

const SYSTEM_PROMPT = `You are an expert interview coach. Build a structured interview prep guide for the candidate applying to the target role, grounded in the job description and the candidate's resume.
Rules:
- 6-8 technical questions specific to the job's stack and responsibilities, each with a concise answer approach that references the candidate's real experience.
- 4-5 behavioral scenarios likely for this role, each with a STAR answer (situation, task, action, result) built only from facts in the resume. If the resume lacks a fitting example, say what kind of example to prepare instead of inventing one.
- 5-7 key talking points that would impress the hiring manager.
- 3-4 smart questions the candidate can ask the interviewer.
- Never invent employers, degrees, numbers or credentials not in the resume. Plain text only, no markdown.
${UNTRUSTED_INPUT_RULE}
The user message is a JSON object with target_role, job_description, prior_analysis and resume_text.
Always respond by calling the write_interview_prep tool.`;

const TOOL = {
  type: "function",
  function: {
    name: "write_interview_prep",
    description: "Return the interview prep guide.",
    parameters: {
      type: "object",
      properties: {
        technical: { type: "array", items: { type: "object", properties: { question: { type: "string" }, approach: { type: "string" } }, required: ["question", "approach"], additionalProperties: false } },
        behavioral: { type: "array", items: { type: "object", properties: {
          question: { type: "string" }, situation: { type: "string" }, task: { type: "string" }, action: { type: "string" }, result: { type: "string" },
        }, required: ["question", "situation", "task", "action", "result"], additionalProperties: false } },
        talking_points: { type: "array", items: { type: "string" } },
        questions_to_ask: { type: "array", items: { type: "string" } },
      },
      required: ["technical", "behavioral", "talking_points", "questions_to_ask"],
      additionalProperties: false,
    },
  },
};

type Guide = {
  technical?: { question: string; approach: string }[];
  behavioral?: { question: string; situation: string; task: string; action: string; result: string }[];
  talking_points?: string[];
  questions_to_ask?: string[];
};
const clean = (s: unknown) => String(s ?? "").replace(/\*\*|__|`|^#+\s*/gm, "").trim();
export function guideToText(role: string, company: string, g: Guide): string {
  const out: string[] = [`Interview Prep Guide`, `${role} at ${company}`, ""];
  out.push("TECHNICAL QUESTIONS");
  (g.technical ?? []).forEach((t, i) => { out.push(`- Q${i + 1}. ${clean(t.question)}`, `  How to answer: ${clean(t.approach)}`); });
  out.push("", "BEHAVIORAL SCENARIOS (STAR METHOD)");
  (g.behavioral ?? []).forEach((b, i) => {
    out.push(`- Q${i + 1}. ${clean(b.question)}`, `  Situation: ${clean(b.situation)}`, `  Task: ${clean(b.task)}`, `  Action: ${clean(b.action)}`, `  Result: ${clean(b.result)}`);
  });
  out.push("", "KEY TALKING POINTS");
  (g.talking_points ?? []).forEach((p) => out.push(`- ${clean(p)}`));
  out.push("", "QUESTIONS TO ASK THE INTERVIEWER");
  (g.questions_to_ask ?? []).forEach((p) => out.push(`- ${clean(p)}`));
  return out.join("\n");
}

class HttpError extends Error { constructor(m: string, public status: number) { super(m); } }
const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => null);
    const jobId = body?.job_id;
    const custom = body?.custom;
    let found: { id: string | null; title: string; company_name: string; raw_description: string | null } | null = null;
    if (typeof jobId === "string" && /^[0-9a-f-]{36}$/i.test(jobId)) {
      const { data } = await supabase.from("jobs_catalog").select("id, title, company_name, raw_description").eq("id", jobId).maybeSingle();
      if (!data) return json({ error: "Job not found" }, 404);
      found = data;
    } else if (custom && typeof custom === "object") {
      // Custom Job Studio: a pasted external job.
      const title = sanitizeAiInput(String(custom.title ?? ""), 200);
      const company = sanitizeAiInput(String(custom.company ?? ""), 200);
      const desc = typeof custom.description === "string" ? custom.description : "";
      if (title.length < 2) return json({ error: "Please enter a job title." }, 400);
      if (company.length < 1) return json({ error: "Please enter a company name." }, 400);
      if (desc.trim().length < 50) return json({ error: "Please paste the job description (at least 50 characters)." }, 400);
      found = { id: null, title, company_name: company, raw_description: desc };
    } else return json({ error: "job_id or custom job is required" }, 400);
    const job = found;
    const { data: prof } = await supabase.from("profiles").select("master_resume_text").eq("user_id", userId).maybeSingle();
    const resume = sanitizeAiInput(prof?.master_resume_text ?? "");
    if (resume.length < 80) return json({ error: "Add your master resume on My profile before generating interview prep." }, 400);
    const jd = sanitizeAiInput(job.raw_description ?? "");

    const letter = await runPaidAction(
      { userId, action: "interview_prep", feature: "job-interview-prep", provider: MODEL, estimatedCostUsd: 0.003 },
      async () => {
        const key = Deno.env.get("LOVABLE_API_KEY");
        if (!key) throw new HttpError("AI key not configured", 500);
        let r: Response;
        try {
          r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST", signal: AbortSignal.timeout(60_000),
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: buildTailoringInput(resume, jd, job.title) },
              ],
              tools: [TOOL],
              tool_choice: { type: "function", function: { name: "write_interview_prep" } },
            }),
          });
        } catch { throw new HttpError("The AI took too long to respond. Your credit was refunded — please try again.", 504); }
        if (!r.ok) {
          console.error("AI error", r.status, await r.text());
          if (r.status === 429) throw new HttpError("Too many requests right now. Your credit was refunded — try again in a moment.", 429);
          throw new HttpError("The AI couldn't write the guide. Your credit was refunded — please try again.", 502);
        }
        let parsed: Guide;
        try {
          const d = await r.json();
          parsed = JSON.parse(d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments);
        } catch { throw new HttpError("The AI sent back an unreadable result. Your credit was refunded — please try again.", 502); }
        if (!parsed?.technical?.length || !parsed?.behavioral?.length) throw new HttpError("The AI sent back an incomplete guide. Your credit was refunded — please try again.", 502);
        const text = guideToText(job.title, job.company_name, parsed);

        const { data: row, error } = await supabase.from("interview_prep_guides").insert({
          user_id: userId, job_id: job.id, company: job.company_name, role: job.title,
          guide_json: parsed, guide_text: text, model: MODEL,
        }).select("id, company, role, guide_text, created_at").single();
        if (error) { console.error(error); throw new HttpError("Couldn't save the guide. Your credit was refunded.", 500); }
        return row;
      },
    );
    if (letter?.id) await upsertApplication(supabase, userId, { role: job.title, company: job.company_name, job_id: job.id }, { interview_prep_id: letter.id });
    return json({ guide: letter });
  } catch (e) {
    if (e instanceof PaidActionError) return json({ error: e.message, code: e.code }, e.status);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("job-interview-prep", e);
    return json({ error: "Something went wrong. Any credit used was refunded — please try again." }, 500);
  }
});
