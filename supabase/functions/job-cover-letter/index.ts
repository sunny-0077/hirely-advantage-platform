// Job feed cover letter: master resume + job description -> cover letter (1 credit).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runPaidAction, PaidActionError } from "../_shared/credits.ts";
import { sanitizeAiInput, buildTailoringInput, UNTRUSTED_INPUT_RULE } from "../_shared/ai-input.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const MODEL = "google/gemini-3.8-flash";

const SYSTEM_PROMPT = `You are an expert career writer. Write a compelling, professional, customized cover letter for the candidate applying to the target role.
Rules:
- 250-380 words, 4 short paragraphs: hook, relevant experience with concrete proof from the resume, fit with the role/company, confident closing.
- Never invent employers, degrees, numbers or credentials not in the resume.
- Refer to the position by its actual title (e.g. "the Data Analyst role"); never write placeholder phrases in quotation marks such as "this role".
- Start with "Dear Hiring Manager," and end with "Sincerely," followed by the candidate's name if it appears in the resume.
- Plain text only, no markdown.
${UNTRUSTED_INPUT_RULE}
The user message is a JSON object with target_role, job_description, prior_analysis and resume_text.
Always respond by calling the write_cover_letter tool.`;

const TOOL = {
  type: "function",
  function: {
    name: "write_cover_letter",
    description: "Return the finished cover letter.",
    parameters: {
      type: "object",
      properties: {
        full_letter: { type: "string", description: "Complete plain-text cover letter." },
        hook: { type: "string", description: "Opening sentence." },
      },
      required: ["full_letter", "hook"],
      additionalProperties: false,
    },
  },
};

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
    let job: { id: string | null; title: string; company_name: string; raw_description: string | null } | null = null;
    if (typeof jobId === "string" && /^[0-9a-f-]{36}$/i.test(jobId)) {
      const { data } = await supabase.from("jobs_catalog").select("id, title, company_name, raw_description").eq("id", jobId).maybeSingle();
      if (!data) return json({ error: "Job not found" }, 404);
      job = data;
    } else if (custom && typeof custom === "object") {
      // Custom Job Studio: a pasted external job.
      const title = sanitizeAiInput(String(custom.title ?? ""), 200);
      const company = sanitizeAiInput(String(custom.company ?? ""), 200);
      const desc = typeof custom.description === "string" ? custom.description : "";
      if (title.length < 2) return json({ error: "Please enter a job title." }, 400);
      if (company.length < 1) return json({ error: "Please enter a company name." }, 400);
      if (desc.trim().length < 50) return json({ error: "Please paste the job description (at least 50 characters)." }, 400);
      job = { id: null, title, company_name: company, raw_description: desc };
    } else return json({ error: "job_id or custom job is required" }, 400);
    const { data: prof } = await supabase.from("profiles").select("master_resume_text").eq("user_id", userId).maybeSingle();
    const resume = sanitizeAiInput(prof?.master_resume_text ?? "");
    if (resume.length < 80) return json({ error: "Add your master resume on My profile before generating a cover letter." }, 400);
    const jd = sanitizeAiInput(job.raw_description ?? "");

    const letter = await runPaidAction(
      { userId, action: "cover_letter", feature: "job-cover-letter", provider: MODEL, estimatedCostUsd: 0.002 },
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
              tool_choice: { type: "function", function: { name: "write_cover_letter" } },
            }),
          });
        } catch { throw new HttpError("The AI took too long to respond. Your credit was refunded — please try again.", 504); }
        if (!r.ok) {
          console.error("AI error", r.status, await r.text());
          if (r.status === 429) throw new HttpError("Too many requests right now. Your credit was refunded — try again in a moment.", 429);
          throw new HttpError("The AI couldn't write the letter. Your credit was refunded — please try again.", 502);
        }
        let parsed: { full_letter?: string; hook?: string };
        try {
          const d = await r.json();
          parsed = JSON.parse(d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments);
        } catch { throw new HttpError("The AI sent back an unreadable result. Your credit was refunded — please try again.", 502); }
        const full = (parsed.full_letter ?? "").replace(/\*\*|__|`|^#+\s*/gm, "").trim();
        if (full.length < 200) throw new HttpError("The AI sent back an incomplete letter. Your credit was refunded — please try again.", 502);

        const { data: row, error } = await supabase.from("cover_letters").insert({
          user_id: userId, job_id: job.id, company: job.company_name, role: job.title,
          job_description: jd || null, tone: "professional", hook: parsed.hook ?? null,
          full_letter: full, model: MODEL,
        }).select("id, company, role, full_letter, created_at").single();
        if (error) { console.error(error); throw new HttpError("Couldn't save the letter. Your credit was refunded.", 500); }
        return row;
      },
    );
    return json({ letter });
  } catch (e) {
    if (e instanceof PaidActionError) return json({ error: e.message, code: e.code }, e.status);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("job-cover-letter", e);
    return json({ error: "Something went wrong. Any credit used was refunded — please try again." }, 500);
  }
});
