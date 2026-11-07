// Cover letter generator — produces a structured, personalized 5-part cover letter via Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sanitizeAiInput, UNTRUSTED_INPUT_RULE } from "../_shared/ai-input.ts";
import { checkEntitlement, incrementUsage } from "../_shared/entitlements.ts";

import { resolveUserResume, ResumeSourceError, CAREER_FACT_RULE } from "../_shared/resume-source.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `${CAREER_FACT_RULE}
${UNTRUSTED_INPUT_RULE}
You are an elite cover letter writer who has helped candidates land roles at top tech, finance, and consulting firms. You write letters that sound like a real, confident, specific human — never like generic AI fluff.

HARD BANS — never use any of these openings or phrases:
- "I am writing to apply for…"
- "I am excited to apply…"
- "Please find attached…"
- "I would like to express my interest…"
- "I am a passionate / motivated / hardworking…"
- "To Whom It May Concern"
- Any vague, philosophical, or trend-y opener like "The rapid growth of…", "In today's fast-paced world…", "As the industry evolves…", "Data is the new oil…", or any sentence that talks about the industry/market before the candidate.
- NEVER use the generic phrase "the company", "the company's", "the team at the company", or any variant. Always refer to the employer by their actual name (e.g. "Acme", "Acme's mission", "the Acme team"). If you must vary phrasing, use "your organization", "your team", "this opportunity", or the specific team/role name (e.g. "the Data Analyst team") — but NEVER "the company".

VAGUE-LANGUAGE BAN — these words/phrases are FORBIDDEN because they sound like AI fluff. Never use any of them, in any tense or variation:
- "immense opportunity", "incredible opportunity", "exciting opportunity", "great opportunity" (when used as filler)
- "budding" (e.g. "budding professional", "budding analyst", "budding engineer")
- "deeply resonates", "truly resonates", "resonates with me", "resonates deeply"
- "continued success", "continued growth", "ongoing success"
- "innovative solutions", "innovative data solutions", "cutting-edge solutions", "state-of-the-art solutions"
- "passionate about", "deeply passionate", "extremely passionate"
- "thrive in", "thrive on" (as filler)
- "dynamic environment", "fast-paced environment", "dynamic team"
- "synergy", "synergies", "leverage" (as a verb), "spearhead", "spearheaded"
- "I am eager to contribute", "eager to learn", "eager to grow"
- "make a meaningful impact", "make a real difference", "drive impact"
- "strong fit", "perfect fit", "ideal candidate", "uniquely positioned"
- "robust", "holistic", "seamless" (as filler adjectives)
- "wealth of experience", "proven track record" (replace with actual achievements)
- "industry-leading", "best-in-class", "world-class"
- "especially compelling", "particularly compelling", "compelling opportunity", "this role opportunity", "the role opportunity"
- NEVER wrap "this role", "the role", "this position", "the position", or "this opportunity" in quotation marks. These phrases must NEVER appear in quotes — that looks like an unfilled template placeholder. If you don't know the exact role title, say "this opportunity", "the job description", or refer to the team by name (e.g. "the Data Analyst team") — without quotes.
- Any sentence that is pure adjective stacking with no concrete fact, tool, or number.

Replace vague claims with concrete specifics: a tool, a number, a project, or a measurable outcome. If you can't make a sentence specific, DELETE IT.

HOOK RULES — the FIRST sentence must be DIRECT, SPECIFIC, and CANDIDATE-FIRST. It must immediately name (a) the exact role being applied for and (b) 3–4 concrete tools/skills from the candidate's resume that map to the JD. No abstractions, no industry commentary, no metaphors.

Use ONE of these proven opener templates (rotate naturally — pick whichever fits best, vary wording so it doesn't feel templated):
1. "I'm applying for the {ROLE} position because my experience with {SKILL_1}, {SKILL_2}, {SKILL_3}, and {SKILL_4} directly matches the {JD_FOCUS_1}, {JD_FOCUS_2}, and {JD_FOCUS_3} work described in the posting."
2. "My background in {SKILL_1}, {SKILL_2}, and {SKILL_3} lines up directly with what the {ROLE} role at {COMPANY} is asking for — particularly the {JD_FOCUS_1} and {JD_FOCUS_2} responsibilities."
3. "After reading the {ROLE} job description at {COMPANY}, the overlap with my work in {SKILL_1}, {SKILL_2}, and {SKILL_3} stood out — especially around {JD_FOCUS_1} and {JD_FOCUS_2}."
4. "The {ROLE} opening at {COMPANY} maps closely to what I've been doing for the past {X years/months}: {SKILL_1}, {SKILL_2}, and {SKILL_3} applied to {JD_FOCUS_1}."
5. "{COMPANY}'s {ROLE} role calls for {JD_FOCUS_1}, {JD_FOCUS_2}, and {JD_FOCUS_3} — the same areas where I've built depth through {SKILL_1}, {SKILL_2}, and {SKILL_3}."

Starting the letter with "I" IS ALLOWED when using templates above. What's banned is the weak "I am writing/excited/applying to express interest" filler — not direct, substantive "I" openers that lead with skills.

ROLE ANCHORING — the exact role title (as provided, e.g. "Junior Data Analyst", "Data Analyst Intern", "Entry-Level Data Analyst", "Business Analyst") MUST appear by name AT LEAST 3 TIMES across the letter — once in the hook, once in alignment or proof, and once in the closing. NEVER substitute "this role", "the role", "this position", or "the position" when you can name the actual title. Vague references like "this role" are only allowed AFTER the title has already been used at least twice in that paragraph.

FORMATTING — the letter must be SCANNABLE (recruiters spend 10–15 seconds). Structure 'full_letter' as 4 short, distinct paragraphs separated by ONE BLANK LINE between each. NEVER produce one wall of text. Each paragraph has ONE clear job and a LOAD-BEARING TOPIC SENTENCE (the first sentence must carry the point so a recruiter skimming only the openers still gets the case):
  • Para 1 — HOOK (2–3 sentences). Topic sentence names the exact role + 3–4 concrete tools/skills from the resume that map to the JD. No mission talk, no industry commentary.
  • Para 2 — SKILLS MATCH (3–4 sentences). Topic sentence: "Three things in the {ROLE} JD line up with what I already do:" (or a natural variant). Then map 2–3 specific JD requirements to specific resume tools/skills — pair them tightly (JD ask → my proof). One concrete artifact (a reusable template, a dashboard, a script, a dataset size).
  • Para 3 — PROOF (3–4 sentences). ONE specific story from the resume — name the employer/project, the tools used, what was built, and a supplied outcome, if available. No second example. No vague "various projects".
  • Para 4 — CLOSE (2–3 sentences). Names the exact role title once, gives ONE specific reason this employer (not a generic compliment), and a clear next step ("Happy to walk through the {project} in a quick call.").
RECRUITER-FLOW RULES:
- Each paragraph must START with a substantive sentence — NEVER with a transition word ("Furthermore", "Moreover", "Additionally", "In addition", "What's more").
- Vary sentence length: mix one short punchy sentence (≤8 words) with longer specific ones in every paragraph.
- Every paragraph must contain at least ONE concrete noun from the resume (a tool, a project name, a number, an employer, a dataset). If a sentence has no concrete noun, DELETE or REWRITE it.
- No paragraph may begin with "I am" or "I'm a/an". Lead with the work, the skill, or the role.
- Never repeat the same opener verb across paragraphs (e.g. don't start two paragraphs with "My …").
- ANTI-REPETITION (CRITICAL): No two paragraphs may start with the same first 2 words. Specifically, the phrase "My background" may appear AT MOST ONCE in the entire letter. If Para 1 uses "My background…", Para 2 MUST start with a different construction (e.g. "Three things in the JD line up…", "On the proof side…", "At {employer}, I…").
- SKILL-LIST DEDUPE: Do NOT list the same stack (e.g. "Python, SQL, Excel") in more than one paragraph. Para 1 lists the headline tools; Para 2 must reference DIFFERENT specifics (artifacts, libraries like Pandas/NumPy, dashboards, templates, dataset sizes) rather than re-listing the same core tools. If a tool was already named in Para 1, Para 2 should mention it only in the context of a concrete artifact, not as part of a fresh list.
- Each paragraph must add NEW information. If Para 2 only restates Para 1 with synonyms, REWRITE Para 2 around a JD requirement → resume artifact mapping instead.
For longer length targets (two_page, three_page) keep the same 4-bucket logic but split paras 2 and 3 into 2–3 paragraphs each, each with its own topic sentence and concrete artifact. Always preserve blank lines between paragraphs in 'full_letter'.

Return both as separate fields and assembled into 'full_letter' (greeting + paragraphs + sign-off, blank line between each):
1. hook            — Para 1. Direct opener using one of the templates above. Names exact role title + 3+ concrete skills.
2. alignment       — Para 2. Map 2–3 of the candidate's most relevant skills directly to JD requirements. Reference the role by name at least once.
3. proof           — Para 3. One concrete internship/project/achievement with a metric only if supplied in the resume, framed for the {ROLE}.
4. culture_fit     — Optional. Only include as its own block when there's a SPECIFIC, non-generic reason rooted in the company. Otherwise leave brief or fold into para 2/4. NEVER write generic mission-statement filler.
5. closing         — Para 4. Confident close. MUST reference the exact role title by name.

PERSONALIZATION ENGINE — you will be given: (a) extracted JD keywords, (b) candidate skills from resume, (c) the company mission. You MUST:
- Naturally weave AT LEAST 70% of the provided "must_use_keywords" into the letter using their exact wording (case-insensitive). Don't list them — embed them.
- Reference the company mission specifically only if non-empty AND specific. Otherwise skip culture_fit rather than invent.
- Only use skills the candidate actually has from their resume.
- HIGHLIGHT resume-based achievements with real numbers/outcomes — never invent metrics.

COMPANY NAME FALLBACK — if the user did NOT provide a real company name (you'll see "(company name not provided)" in the prompt), NEVER write "the company", "your company", or any placeholder. Instead refer to the employer as "your team", "your organization", or by the specific team/role (e.g. "the Data Analyst team"). Do not fabricate a company name.

Tone parameter changes voice but never breaks the rules:
- confident: clear, direct, slightly bold
- warm:     personable, human, conversational
- direct:   short sentences, no fluff
- formal:   polished, executive

Length: ALWAYS follow the exact word target given in the user prompt. Do not impose your own cap. If the target asks for a two-page letter, expand each section with deeper, specific detail — never pad with fluff.

ALWAYS respond by calling the generate_cover_letter tool.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_cover_letter",
    description: "Return a structured, personalized cover letter.",
    parameters: {
      type: "object",
      properties: {
        hook: { type: "string" },
        alignment: { type: "string" },
        proof: { type: "string" },
        culture_fit: { type: "string" },
        closing: { type: "string" },
        full_letter: { type: "string", description: "Assembled letter. Match the requested word target exactly." },
        notes: { type: "string", description: "≤180 chars on why this letter works for this role." },
      },
      required: ["hook", "alignment", "proof", "culture_fit", "closing", "full_letter", "notes"],
      additionalProperties: false,
    },
  },
};

const KEYWORD_TOOL = {
  type: "function",
  function: {
    name: "extract_personalization",
    description: "Extract keywords from a job description and skills from a resume.",
    parameters: {
      type: "object",
      properties: {
        jd_keywords: {
          type: "array",
          description: "10–18 most important hard skills, tools, methodologies, and role-specific terms from the JD. Lowercase, deduped, no generic words like 'team' or 'communication'.",
          items: { type: "string" },
        },
        resume_skills: {
          type: "array",
          description: "10–25 concrete skills/tools the candidate demonstrably has based on resume. Lowercase.",
          items: { type: "string" },
        },
      },
      required: ["jd_keywords", "resume_skills"],
      additionalProperties: false,
    },
  },
};

const ALLOWED_TONES = new Set(["confident", "warm", "direct", "formal"]);

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","to","for","in","on","at","by","with","from","as","is","are","be","this","that","we","you","our","your","their","they","it","its",
]);

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+#./\- ]+/g, " ").replace(/\s+/g, " ").trim();
}

function fallbackKeywords(text: string, n = 14): string[] {
  const t = normalize(text);
  if (!t) return [];
  const counts = new Map<string, number>();
  for (const w of t.split(" ")) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

// Common abbreviation ↔ expansion pairs (both directions).
const ABBREVIATIONS: Record<string, string[]> = {
  "js": ["javascript"], "javascript": ["js"],
  "ts": ["typescript"], "typescript": ["ts"],
  "py": ["python"],
  "k8s": ["kubernetes"], "kubernetes": ["k8s"],
  "ml": ["machine learning"], "machine learning": ["ml"],
  "ai": ["artificial intelligence"], "artificial intelligence": ["ai"],
  "nlp": ["natural language processing"],
  "cv": ["computer vision"],
  "ds": ["data science"], "data science": ["ds"],
  "da": ["data analysis", "data analyst"],
  "pm": ["product manager", "product management", "project manager"],
  "ux": ["user experience"], "ui": ["user interface"],
  "qa": ["quality assurance"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  "cicd": ["ci/cd", "ci cd"],
  "aws": ["amazon web services"],
  "gcp": ["google cloud platform", "google cloud"],
  "kpi": ["kpis", "key performance indicator", "key performance indicators"],
  "sql": ["mysql", "postgresql", "postgres"],
  "postgres": ["postgresql"], "postgresql": ["postgres"],
  "node": ["nodejs", "node.js"], "nodejs": ["node", "node.js"],
  "react": ["reactjs", "react.js"],
  "vue": ["vuejs", "vue.js"],
  "next": ["nextjs", "next.js"],
  "rest": ["restful", "rest api", "rest apis"],
  "api": ["apis"],
  "saas": ["software as a service"],
  "b2b": ["business to business"],
  "b2c": ["business to consumer"],
  "etl": ["extract transform load"],
  "oop": ["object oriented programming", "object-oriented programming"],
  "tdd": ["test driven development", "test-driven development"],
  "ab testing": ["a/b testing", "a b testing", "ab tests"],
  "a/b testing": ["ab testing", "ab tests"],
};

// Lightweight stemmer: collapse common English suffixes so plurals/verb-forms
// share a stem. Not Porter-perfect, but good enough for keyword coverage.
function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 3) return w;
  const suffixes = [
    "ization","izations","isation","isations",
    "ingly","ation","ations","ments","ness",
    "ities","ying","ies","ied",
    "ment","able","ible",
    "ing","edly","ed",
    "ly","es","s",
  ];
  for (const suf of suffixes) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

function phraseStem(phrase: string): string {
  return tokenize(phrase).map(stem).join(" ");
}

// Variants we'll consider equivalent to a given keyword.
function expandKeyword(kw: string): string[] {
  const base = normalize(kw);
  if (!base) return [];
  const variants = new Set<string>([base]);
  if (ABBREVIATIONS[base]) {
    for (const v of ABBREVIATIONS[base]) variants.add(normalize(v));
  }
  variants.add(base.replace(/[-/.]/g, " "));
  variants.add(base.replace(/[-/. ]/g, ""));
  return [...variants].filter(Boolean);
}

function findMatches(letter: string, keywords: string[]) {
  const letterTokens = tokenize(letter);
  const stemmedLetter = " " + letterTokens.map(stem).join(" ") + " ";
  const rawLetter = " " + letterTokens.join(" ") + " ";

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    const variants = expandKeyword(kw);
    let hit = false;
    for (const v of variants) {
      if (!v) continue;
      // Exact phrase (handles abbreviations and short tokens).
      if (rawLetter.includes(" " + v + " ")) { hit = true; break; }
      // Stemmed phrase (handles plurals + verb forms).
      const vStem = phraseStem(v);
      if (vStem && stemmedLetter.includes(" " + vStem + " ")) { hit = true; break; }
    }
    if (hit) matched.push(kw);
    else missing.push(kw);
  }
  return { matched, missing };
}

async function fetchCompanyMission(url: string): Promise<string> {
  try {
    const u = new URL(url);
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CoverLetterBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags, scripts, styles
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Prefer meta description if present
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
    const meta = metaMatch?.[1] ?? "";
    return (meta + " " + text).slice(0, 4000);
  } catch (e) {
    console.warn("fetchCompanyMission failed", e);
    return "";
  }
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

    const gate = await checkEntitlement(userId, "cover_letters");
    if (!gate.ok) return json({ error: gate.error, plan: gate.plan, upgrade_required: true, code: "OVER_QUOTA", feature: "cover_letters" }, gate.status);

    const body = await req.json();
    let {
      company,
      role,
      job_description,
      tone = "confident",
      resume_id,
      company_url,
      hiring_manager,
      strongest_achievement,
      length = "medium",
      experience_level = "junior",
      letter_style = "modern",
      include_salary = false,
      salary_expectation,
      mention_relocation = false,
      relocation_preference,
    } = body ?? {};

    // Role is optional from the client — default to a neutral phrase the prompt can use safely.
    if (typeof role !== "string") {
      return json({ error: "role must be a string" }, 400);
    }
    if (!role.trim()) role = "";
    // Company is OPTIONAL — if missing or a placeholder, treat as "no company".
    const PLACEHOLDER_COMPANY = /^(the\s+company|company|n\/a|none|tbd|unknown)$/i;
    const rawCompany = typeof company === "string" ? company.trim() : "";
    const hasCompany = rawCompany.length >= 1 && !PLACEHOLDER_COMPANY.test(rawCompany);
    const companyForPrompt = hasCompany ? rawCompany : "(company name not provided)";
    const safeTone = ALLOWED_TONES.has(tone) ? tone : "confident";
    const ALLOWED_LENGTHS = new Set(["short", "medium", "detailed", "one_page", "two_page", "three_page"]);
    const ALLOWED_LEVELS = new Set(["fresher", "intern", "junior", "experienced"]);
    const ALLOWED_STYLES = new Set(["modern", "formal", "startup", "corporate"]);
    const ALLOWED_RELOC = new Set(["remote", "hybrid", "onsite", "relocate"]);
    const safeLength = ALLOWED_LENGTHS.has(length) ? length : "medium";
    const safeLevel = ALLOWED_LEVELS.has(experience_level) ? experience_level : "junior";
    const safeStyle = ALLOWED_STYLES.has(letter_style) ? letter_style : "modern";
    const safeReloc = ALLOWED_RELOC.has(relocation_preference) ? relocation_preference : null;
    const safeHiringManager = typeof hiring_manager === "string" ? hiring_manager.trim().slice(0, 120) : "";
    const safeAchievement = ""; // Career proof is resolved from saved facts, not a client claim.
    const safeSalary = typeof salary_expectation === "string" ? salary_expectation.trim().slice(0, 80) : "";

    // Page-aware targets. A standard cover letter page (Times/Georgia 11pt,
    // 1.4–1.6 line height, 1" margins) holds ~330–380 words. Two pages ≈ 700–780.
    const wordTargets: Record<string, string> = {
      short: "≤170 words",
      medium: "200–270 words",
      detailed: "300–360 words",
      one_page: "300–370 words (must fit on a SINGLE printed page — never overflow)",
      two_page: "640–780 words (must fill ~TWO printed pages — write 6–8 substantive paragraphs)",
      three_page: "980–1150 words (must fill ~THREE printed pages — write 9–11 substantive paragraphs with deep specifics)",
    };

    const jd = sanitizeAiInput(typeof job_description === "string" ? job_description : "");
    const resolved = await resolveUserResume(supabase, userId, { resumeId: resume_id, job: `${role}
${jd}` });
    const resumeText = resolved.text;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI key not configured" }, 500);

    // ---- Personalization step 1: company mission from URL (best-effort) ----
    let companyMission = "";
    let safeCompanyUrl: string | null = null;
    if (typeof company_url === "string" && company_url.trim()) {
      const raw = company_url.trim();
      const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        new URL(withProto);
        safeCompanyUrl = withProto;
        companyMission = sanitizeAiInput(await fetchCompanyMission(withProto));
      } catch {
        safeCompanyUrl = null;
      }
    }

    // ---- Personalization step 2: extract JD keywords + resume skills via AI ----
    let jdKeywords: string[] = [];
    let resumeSkills: string[] = [];
    if (jd || resumeText) {
      try {
        const kwResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  "Extract job keywords and resume skills. Be precise — only concrete tools, technologies, methodologies, and role-specific terms. Skip soft generics. Always lowercase. Always call the tool. " + CAREER_FACT_RULE + " " + UNTRUSTED_INPUT_RULE,
              },
              {
                role: "user",
                content: `JOB DESCRIPTION:\n${jd || "(none provided)"}\n\nRESUME:\n${resumeText || "(none provided)"}`,
              },
            ],
            tools: [KEYWORD_TOOL],
            tool_choice: { type: "function", function: { name: "extract_personalization" } },
          }),
        });
        if (kwResp.ok) {
          const kwData = await kwResp.json();
          const kwArgs = kwData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (kwArgs) {
            const parsed = JSON.parse(kwArgs);
            jdKeywords = Array.isArray(parsed.jd_keywords)
              ? parsed.jd_keywords.map((s: string) => s.toLowerCase().trim()).filter(Boolean).slice(0, 18)
              : [];
            resumeSkills = Array.isArray(parsed.resume_skills)
              ? parsed.resume_skills.map((s: string) => s.toLowerCase().trim()).filter(Boolean).slice(0, 25)
              : [];
          }
        }
      } catch (e) {
        console.warn("Keyword extraction failed, falling back", e);
      }
    }
    resumeSkills = resumeSkills.filter(k => normalize(resumeText).includes(normalize(k)));
    if (!jdKeywords.length && jd) jdKeywords = fallbackKeywords(jd, 12);
    if (!resumeSkills.length && resumeText) resumeSkills = fallbackKeywords(resumeText, 18);

    // Keywords the candidate genuinely has (intersection) — these are MUST-USE
    const skillSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
    const mustUse = jdKeywords.filter((k) => skillSet.has(k.toLowerCase())).slice(0, 10);

    // ---- Personalization step 3: generate the letter with all context ----
    const relocLine = mention_relocation && safeReloc
      ? (safeReloc === "relocate"
          ? "Mention candidate is open to relocating for this role."
          : `Mention candidate's work-location preference: ${safeReloc}.`)
      : "Do NOT mention relocation or remote/onsite preferences.";

    const salaryLine = include_salary && safeSalary
      ? `Mention salary expectation gracefully (not as the focus): ${safeSalary}.`
      : include_salary
        ? "Mention that the candidate is open to discussing compensation, briefly and gracefully."
        : "Do NOT mention salary or compensation.";

    const styleGuide: Record<string, string> = {
      modern: "Voice: Modern — clean, current, conversational but sharp. Avoid stuffy phrases.",
      formal: "Voice: Formal — polished, traditional, respectful. Slightly more structured sentences.",
      startup: "Voice: Startup — scrappy, punchy, outcome-obsessed. Short sentences. Energy without hype.",
      corporate: "Voice: Corporate — buttoned-up, measured, professional. Avoid slang.",
    };

    const levelGuide: Record<string, string> = {
      fresher: "Target tone: fresher; do not override actual saved experience. Lean on coursework, projects, internships, and learning velocity. Never invent jobs.",
      intern: "Candidate is targeting an INTERNSHIP. Emphasize curiosity, projects, and ability to ship. Keep tone humble and eager but confident.",
      junior: "Target tone: junior. Actual seniority must come only from resume facts.",
      experienced: "Target tone: experienced. Do not infer seniority or impact absent from resume facts.",
    };

    const userPrompt = `Write a cover letter for:
Company: ${companyForPrompt}${hasCompany ? "" : " — IMPORTANT: do NOT use \"the company\" or invent a name. Use \"your team\" / \"your organization\" / the team name instead."}
Role: ${role.trim() || "(role title not provided — refer to it as \"this opportunity\" or by the team name; NEVER write the literal phrase \"this role\" in quotes or as a placeholder)"}
Tone: ${safeTone}
Letter style: ${safeStyle}
Length target: ${wordTargets[safeLength]} (this is a HARD cap — do not exceed)
Experience level: ${safeLevel}
${safeHiringManager ? `Hiring manager: ${safeHiringManager} (address them by name in the greeting, e.g. "Dear ${safeHiringManager},")` : "No hiring manager name provided — open with a strong hook, no \"To Whom It May Concern\"."}

${styleGuide[safeStyle]}
${levelGuide[safeLevel]}
${salaryLine}
${relocLine}

${safeAchievement ? `--- CANDIDATE'S STRONGEST ACHIEVEMENT (use this as the basis for the 'proof' paragraph, polish wording but keep numbers exact) ---\n${safeAchievement}\n` : ""}

${jd ? `--- JOB DESCRIPTION ---\n${jd}\n` : "(No JD pasted — infer typical expectations.)"}

${companyMission ? `--- COMPANY MISSION / CONTEXT (from ${safeCompanyUrl}) ---\n${companyMission}\n` : ""}

${resumeText ? `--- CANDIDATE'S RESUME ---\n${resumeText}` : "(No resume — keep proof generic, never fabricate employers.)"}

--- PERSONALIZATION HINTS ---
JD keywords: ${jdKeywords.join(", ") || "(none)"}
Candidate's real skills: ${resumeSkills.join(", ") || "(none)"}
must_use_keywords (use ≥70%, exact wording, naturally embedded): ${mustUse.join(", ") || "(none)"}

Now call generate_cover_letter. The hook must NOT start with "I". Respect the length target strictly.

STRUCTURE CHECKLIST (must pass before you return):
[ ] Exactly 4 paragraphs (or 5–7 for two_page / 8–10 for three_page), separated by ONE blank line.
[ ] Para 1 = Hook. Para 2 = Skills-match (JD ask → my proof pairs). Para 3 = ONE supplied proof story; a number only if supplied. Para 4 = Close with a specific reason + next step.
[ ] No paragraph starts with a transition word ("Furthermore", "Moreover", "Additionally") or "I am/I'm a".
[ ] Every paragraph contains at least one concrete noun from the resume (tool, project, number, employer).
[ ] Para 2 contains at least 2 explicit JD-requirement → resume-skill pairs.
[ ] Para 3 names the employer/project and includes a metric only if present in the resume.
[ ] Para 4 references the exact role title and proposes a concrete next step.
If any box fails, REWRITE before returning.`;

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
        tool_choice: { type: "function", function: { name: "generate_cover_letter" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI credits exhausted. Add credits in workspace usage.", code: "AI_CREDITS_EXHAUSTED" }, 503);
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "AI generation failed" }, 500);
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

    // ---- Personalization step 4: compute keyword coverage of the final letter ----
    let fullLetter: string = parsed.full_letter ?? "";
    const rawRole = role.trim();
    // Treat generic placeholders as "no real role title" — never anchor with them.
    const PLACEHOLDER_ROLE = /^(this\s+role|the\s+role|this\s+position|the\s+position|role|position|n\/a|tbd|unknown)$/i;
    const hasRoleTitle = rawRole.length >= 2 && !PLACEHOLDER_ROLE.test(rawRole);
    const roleTitle = hasRoleTitle ? rawRole : "";
    const companyName = hasCompany ? rawCompany : "";
    // Safety net: scrub any "the company" / placeholder phrasing the model slipped through.
    const scrubCompany = (text: string) => {
      if (hasCompany) {
        return text
          .replace(/\bthe team at the company\b/gi, `the ${companyName} team`)
          .replace(/\bteam at the company\b/gi, `${companyName} team`)
          .replace(/\bthe company['’]s\b/gi, `${companyName}'s`)
          .replace(/\bthe company\b/gi, companyName)
          .replace(/\byour company['’]s\b/gi, `${companyName}'s`)
          .replace(/\byour company\b/gi, companyName);
      }
      return text
        .replace(/\bthe team at the company\b/gi, "your team")
        .replace(/\bteam at the company\b/gi, "your team")
        .replace(/\bthe company['’]s\b/gi, "your team's")
        .replace(/\bthe company\b/gi, "your team")
        .replace(/\byour company['’]s\b/gi, "your team's")
        .replace(/\byour company\b/gi, "your team");
    };

    // Role anchoring: ensure the exact role title appears enough times.
    // Replace generic "this role / the role / this position / the position"
    // with the real title until we hit a healthy count, then leave the rest.
    // CRITICAL: only run when we actually HAVE a real role title — otherwise we'd
    // produce nonsense like "the this role role" by inserting the placeholder back in.
    const ensureRoleAnchored = (text: string, minOccurrences = 2) => {
      if (!roleTitle) return text;
      const escaped = roleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const titleRe = new RegExp(`\\b${escaped}\\b`, "gi");
      let current = (text.match(titleRe) ?? []).length;
      const generics = /\b(?:this|the)\s+(?:role|position|opening|opportunity)\b/gi;
      return text.replace(generics, (match) => {
        if (current >= minOccurrences) return match;
        current += 1;
        return /^[A-Z]/.test(match) ? roleTitle : roleTitle;
      });
    };

    // Cleanup pass — fix any artifact phrasing the AI or our scrubbers may have produced.
    // Examples we've seen in the wild:
    //   "the {ROLE} role"        -> "the {ROLE} role"   (kept; valid English)
    //   "what the {ROLE} role"   -> kept
    //   "the this role role"     -> "this role"
    //   "this {ROLE} role role"  -> "the {ROLE} role"
    //   "{ROLE} role role"       -> "{ROLE} role"
    //   "{ROLE} position role"   -> "{ROLE} role"
    //   immediate duplicate words like "role role" / "position position"
    const fixRoleArtifacts = (text: string) => {
      if (!text) return text;
      let out = text;
      // 0. Strip quotes around placeholder role/position phrases — recruiters
      //    instantly notice when a letter contains literal "this role" in quotes,
      //    as it looks like an unfilled template variable.
      //    Examples we've seen:
      //      what "this role" is asking for      -> what this role is asking for
      //      in the "this role" job description  -> in the job description
      //      The "this role" opening             -> this opportunity
      const quotedPlaceholder =
        /["“”'‘’]\s*(this|the)\s+(role|position|opening|opportunity)\s*["“”'‘’]/gi;
      out = out.replace(quotedPlaceholder, (_m, det, noun) => `${det} ${noun}`);
      // After unquoting, collapse the resulting redundant phrasings:
      //   "the {det} {noun} job description" -> "the job description"
      //   "the {det} {noun} opening"         -> "this opportunity"
      out = out.replace(
        /\b(the|a|an)\s+(this|the)\s+(role|position|opening|opportunity)\s+(job\s+description|posting|listing|JD)\b/gi,
        (_m, _art, _det, _noun, tail) => `the ${tail}`,
      );
      out = out.replace(
        /\b(this|the)\s+(role|position|opening|opportunity)\s+(job\s+description|posting|listing|JD)\b/gi,
        (_m, _det, _noun, tail) => `the ${tail}`,
      );
      // "The this role opening" -> "this opportunity"
      out = out.replace(
        /\b(the|a|an)\s+(this|the)\s+(role|position)\s+(opening|opportunity)\b/gi,
        () => "this opportunity",
      );
      // 1. Collapse "the this role" / "a this role" produced when the model wrote
      //    "the {ROLE}" while role itself was the placeholder "this role".
      out = out.replace(/\b(the|a|an)\s+(this|the)\s+(role|position|opening|opportunity)\b/gi,
        (_m, _art, det, noun) => `${det} ${noun}`);
      // 2. Collapse immediate duplicate role/position words: "role role" -> "role".
      out = out.replace(/\b(role|position|opening|opportunity)\s+\1\b/gi, "$1");
      // 3. "{ROLE} position role" or "{ROLE} role position" -> "{ROLE} role".
      if (roleTitle) {
        const escaped = roleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        out = out.replace(
          new RegExp(`\\b${escaped}\\s+(role|position)\\s+(role|position)\\b`, "gi"),
          `${roleTitle} role`,
        );
      }
      // 4. "this this" / "the the" stutters anywhere.
      out = out.replace(/\b(this|the|a|an)\s+\1\b/gi, "$1");
      return out;
    };


    // Vague-language scrubber: rewrite filler phrases into more concrete language.
    const scrubVague = (text: string) => {
      if (!text) return text;
      const replacements: Array<[RegExp, string]> = [
        [/\bimmense opportunity\b/gi, "opportunity"],
        [/\bincredible opportunity\b/gi, "opportunity"],
        [/\bexciting opportunity\b/gi, "opportunity"],
        [/\bgreat opportunity\b/gi, "opportunity"],
        [/\bbudding (data professional|professional|analyst|engineer|developer|designer)\b/gi, "$1"],
        [/\b(deeply|truly) resonates with me\b/gi, "matches my focus"],
        [/\b(deeply|truly) resonates\b/gi, "matches my focus"],
        [/\bresonates with me\b/gi, "matches my focus"],
        [/\bresonates deeply\b/gi, "matches my focus"],
        [/\bcontinued success\b/gi, "next stage of growth"],
        [/\bcontinued growth\b/gi, "next stage of growth"],
        [/\bongoing success\b/gi, "next stage of growth"],
        [/\binnovative data solutions\b/gi, "data work"],
        [/\binnovative solutions\b/gi, "the work"],
        [/\bcutting-edge solutions\b/gi, "the work"],
        [/\bstate-of-the-art solutions\b/gi, "the work"],
        [/\b(deeply|extremely|truly) passionate about\b/gi, "focused on"],
        [/\bpassionate about\b/gi, "focused on"],
        [/\bdynamic (environment|team)\b/gi, "$1"],
        [/\bfast-paced environment\b/gi, "environment"],
        [/\bsynergies\b/gi, "overlap"],
        [/\bsynergy\b/gi, "overlap"],
        [/\bleverage\b/gi, "use"],
        [/\bspearheaded\b/gi, "led"],
        [/\bspearhead\b/gi, "lead"],
        [/\bI am eager to contribute\b/gi, "I want to contribute"],
        [/\beager to learn and grow\b/gi, "ready to take on the work"],
        [/\beager to (learn|grow|contribute)\b/gi, "ready to $1"],
        [/\bmake a meaningful impact\b/gi, "deliver measurable results"],
        [/\bmake a real difference\b/gi, "deliver measurable results"],
        [/\bstrong fit\b/gi, "match"],
        [/\bperfect fit\b/gi, "match"],
        [/\bideal candidate\b/gi, "candidate"],
        [/\buniquely positioned\b/gi, "positioned"],
        [/\b(robust|holistic|seamless) /gi, ""],
        [/\bwealth of experience\b/gi, "experience"],
        [/\bproven track record\b/gi, "track record"],
        [/\bindustry-leading\b/gi, ""],
        [/\bbest-in-class\b/gi, ""],
        [/\bworld-class\b/gi, ""],
        // Artifact: model writes "this {role} opportunity" / "the role opportunity" — collapse to "this opportunity".
        [/\b(role|position)\s+(opportunity|opening)\b/gi, "$2"],
        [/\b(opportunity|opening)\s+(role|position)\b/gi, "$1"],
        // "especially/particularly compelling" — vague AI filler.
        [/\b(especially|particularly|truly|really)\s+compelling\b/gi, "a strong fit"],
        [/\bis\s+compelling\b/gi, "is a strong fit"],
        [/\bcompelling\s+opportunity\b/gi, "strong fit"],
      ];
      let out = text;
      for (const [re, rep] of replacements) out = out.replace(re, rep);
      // Collapse double spaces produced by deletions and tidy spacing before punctuation.
      out = out.replace(/ {2,}/g, " ").replace(/ ([,.;:!?])/g, "$1");
      return out;
    };

    const scrub = (text: string, minRole = 1) =>
      fixRoleArtifacts(scrubVague(ensureRoleAnchored(scrubCompany(text), minRole)));

    parsed.hook = scrub(parsed.hook ?? "", 1);
    parsed.alignment = scrub(parsed.alignment ?? "", 1);
    parsed.proof = scrub(parsed.proof ?? "", 1);
    parsed.culture_fit = fixRoleArtifacts(scrubVague(scrubCompany(parsed.culture_fit ?? "")));
    parsed.closing = scrub(parsed.closing ?? "", 1);
    // Reassemble full letter scrub (covers greeting/sign-off too) with broader anchoring.
    fullLetter = fixRoleArtifacts(scrubVague(ensureRoleAnchored(scrubCompany(fullLetter), 3)));

    // Normalize paragraph spacing: collapse 3+ newlines, ensure double-newline between paragraphs.
    fullLetter = fullLetter.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    const { matched, missing } = jdKeywords.length
      ? findMatches(fullLetter, jdKeywords)
      : { matched: [] as string[], missing: [] as string[] };
    const matchScore = jdKeywords.length
      ? Math.round((matched.length / jdKeywords.length) * 100)
      : null;

    const { data: inserted, error: insertErr } = await supabase
      .from("cover_letters")
      .insert({
        user_id: userId,
        resume_id: resume_id ?? null,
        company: companyName,
        role: role.trim(),
        company_url: safeCompanyUrl,
        company_mission: companyMission ? companyMission.slice(0, 2000) : null,
        job_description: jd || null,
        tone: safeTone,
        hook: parsed.hook ?? "",
        alignment: parsed.alignment ?? "",
        proof: parsed.proof ?? "",
        culture_fit: parsed.culture_fit ?? "",
        closing: parsed.closing ?? "",
        full_letter: fullLetter,
        notes: parsed.notes ?? "",
        jd_keywords: jdKeywords,
        resume_skills: resumeSkills,
        matched_keywords: matched,
        missing_keywords: missing,
        match_score: matchScore,
        model: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error", insertErr);
      return json({ error: "Failed to save cover letter" }, 500);
    }

    await incrementUsage(userId, "cover_letters");
    return json({ letter: inserted, resume_source: resolved });
  } catch (e) {
    if (e instanceof ResumeSourceError) return json({ error: e.message }, e.status);
    console.error("generate-cover-letter error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
