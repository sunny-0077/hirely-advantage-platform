// ATS parse simulator — reports what an ATS extracts vs. misses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkEntitlement, incrementUsage } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) simulation engine. Your job is to parse a resume exactly as a real ATS system would — with all its limitations, misreadings, and failures — and then report back what was successfully extracted versus what was missed or misread.

You simulate the parsing behavior of the most common ATS platforms including Workday, Greenhouse, Lever, iCIMS, and Taleo.

INPUTS YOU WILL RECEIVE:
- RESUME: The candidate's full resume text (or structured content)

YOUR OUTPUT MUST SIMULATE WHAT AN ATS EXTRACTS. Use markdown with "##" headers for each of the six sections below, in this exact order:

## Section 1: Contact Information Parse
Show exactly what the ATS read for:
- Full Name: [extracted] ✅ or ❌ [issue]
- Email: [extracted] ✅ or ❌
- Phone: [extracted] ✅ or ❌
- Location: [extracted] ✅ or ❌
- LinkedIn URL: [extracted or "not found"] ✅ or ❌
Flag any issues with one-line WHY + HOW to fix.

## Section 2: Work Experience Parse
For each role, list:
- Job Title: [extracted] — ✅ Clean / ⚠️ Unclear / ❌ Failed
- Company: [extracted]
- Start Date: [extracted] — ✅ / ⚠️ / ❌
- End Date: [extracted] — ✅ / ⚠️ / ❌
- Duration calculated: [X years Y months]
- Bullet content: ✅ Parsed / ⚠️ Partially parsed / ❌ Not readable
Flag specific issues like ambiguous abbreviations or date formats with WHY + HOW.

## Section 3: Education Parse
- Degree: [extracted] ✅ / ⚠️ / ❌
- Institution: [extracted]
- Graduation Year: [extracted]
- GPA: [extracted or "not found"]
Flag abbreviation/format issues with WHY + HOW.

## Section 4: Skills Extraction
- List every skill the ATS successfully extracted.
- List skills that appear in the resume but likely weren't extracted (buried in sentences, in tables, in images).
- Note any context lost (e.g., proficiency descriptors collapsed).

## Section 5: Parse Failure Report
List every element that likely failed to parse with WHY (tables, headers/footers, graphics, columns, icons, non-standard headings).

## Section 6: Overall Parseability Score
- ATS Readability Score: X/100
- Breakdown: Structure: X/100 — Dates: X/100 — Skills: X/100 — Contact: X/100 — Overall: X/100
- One-sentence verdict on parser reliability.
- Top 3 fixes that would most improve parseability, ranked by impact.

TONE: Technical and precise. Like a system log — clear, specific, unemotional. Every flagged issue must explain WHY it's a problem and HOW to fix it in one line.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const gate = await checkEntitlement(userId, "analyses");
    if (!gate.ok) {
      return new Response(JSON.stringify({
        error: gate.error, plan: gate.plan, upgrade_required: true, code: "OVER_QUOTA", feature: "analyses",
      }), { status: gate.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { resume_text } = await req.json();
    if (!resume_text || typeof resume_text !== "string" || resume_text.length < 80) {
      return new Response(JSON.stringify({ error: "resume_text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resume_text.length > 50000) {
      return new Response(JSON.stringify({ error: "resume_text too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");


    const userPrompt = `RESUME:\n${resume_text}\n\nSimulate the ATS parse and return the full report as instructed.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("Gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const markdown = data?.choices?.[0]?.message?.content ?? "";

    await incrementUsage(userId, "analyses");

    return new Response(JSON.stringify({ markdown }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ats-parse-sim error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
