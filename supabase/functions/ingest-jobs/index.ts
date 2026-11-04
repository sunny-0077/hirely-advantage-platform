// Ingests fresh Indian tech-hub jobs from public Greenhouse/Lever feeds,
// extracts a Truth Card with Gemini Flash, and upserts into jobs_catalog.
// Callable only by admins (JWT) or the service role (scheduled runs).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GREENHOUSE = ["razorpaysoftwareprivatelimited", "groww", "databricks", "mongodb", "gitlab"];
const LEVER = ["cred", "meesho", "zeta", "paytm"];
const MAX_NEW_PER_RUN = 25;
const EST_COST_PER_JOB = 0.0006;

type City = "Bengaluru" | "Hyderabad" | "Pune" | "Mumbai" | "Delhi NCR" | "Remote";
type RawJob = { source: string; sourceId: string; title: string; company: string; location: string; applyUrl: string; description: string };

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function cityHub(location: string): City | null {
  const l = location.toLowerCase();
  if (/bengaluru|bangalore/.test(l)) return "Bengaluru";
  if (/hyderabad/.test(l)) return "Hyderabad";
  if (/pune/.test(l)) return "Pune";
  if (/mumbai|bombay|navi mumbai/.test(l)) return "Mumbai";
  if (/delhi|gurgaon|gurugram|noida|ncr/.test(l)) return "Delhi NCR";
  if (/remote/.test(l) && /india|apac|asia/.test(l)) return "Remote";
  return null;
}

function workMode(location: string, text: string): string {
  const s = `${location} ${text.slice(0, 3000)}`.toLowerCase();
  if (/remote/.test(location.toLowerCase())) return "Remote";
  if (/hybrid/.test(s)) return "Hybrid";
  return "On-site";
}

const stripHtml = (h: string) =>
  h.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchGreenhouse(token: string): Promise<RawJob[]> {
  const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.jobs ?? []).map((j: any) => ({
    source: "greenhouse", sourceId: String(j.id), title: j.title ?? "",
    company: j.company_name ?? token, location: j.location?.name ?? "",
    applyUrl: j.absolute_url ?? "", description: stripHtml(j.content ?? ""),
  }));
}

async function fetchLever(company: string): Promise<RawJob[]> {
  const r = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`);
  if (!r.ok) return [];
  const d = await r.json();
  if (!Array.isArray(d)) return [];
  return d.map((j: any) => ({
    source: "lever", sourceId: String(j.id), title: j.text ?? "",
    company: company.charAt(0).toUpperCase() + company.slice(1),
    location: [j.categories?.location, ...(j.categories?.allLocations ?? []), j.workplaceType === "remote" ? "Remote India" : ""].filter(Boolean).join(", "),
    applyUrl: j.applyUrl ?? j.hostedUrl ?? "", description: stripHtml(j.descriptionPlain ?? j.description ?? ""),
  }));
}

const TRUTH_TOOL = {
  type: "function",
  function: {
    name: "truth_card",
    description: "Return the 3-second truth card for this job posting.",
    parameters: {
      type: "object",
      properties: {
        true_tech_stack: { type: "array", items: { type: "string" }, description: "Up to 6 concrete tools/languages actually required. No soft skills." },
        estimated_ctc_range: { type: "string", description: "Realistic annual CTC in India for this role/level, e.g. '₹18–28 LPA'. Use 'Not enough info' if unclear." },
        is_ghost_job: { type: "boolean", description: "True if the posting looks evergreen, vague, or not a real open seat." },
        is_corporate_fluff: { type: "boolean", description: "True if the description is mostly buzzwords with little concrete scope." },
        red_flags: { type: "array", items: { type: "string" }, description: "Up to 3 short, specific red flags. Empty if none." },
      },
      required: ["true_tech_stack", "estimated_ctc_range", "is_ghost_job", "is_corporate_fluff", "red_flags"],
      additionalProperties: false,
    },
  },
};

async function extractTruthCard(job: RawJob, apiKey: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a blunt Indian tech recruiter. Read job posts and extract an honest truth card. Always call the truth_card tool." },
        { role: "user", content: `TITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location}\n\nDESCRIPTION:\n${job.description.slice(0, 6000)}` },
      ],
      tools: [TRUTH_TOOL],
      tool_choice: { type: "function", function: { name: "truth_card" } },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}`);
  const d = await r.json();
  const args = d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No truth card");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (token !== serviceKey) {
      const { data: u } = await db.auth.getUser(token);
      if (!u?.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await db.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admins only" }, 403);
    }

    const { data: paused } = await db.rpc("ai_actions_paused");
    if (paused) return json({ error: "AI spend limit reached; ingestion paused" }, 503);

    const feeds = await Promise.allSettled([...GREENHOUSE.map(fetchGreenhouse), ...LEVER.map(fetchLever)]);
    const raw = feeds.flatMap((f) => (f.status === "fulfilled" ? f.value : []));

    const candidates: (RawJob & { hash: string; city: City })[] = [];
    const seen = new Set<string>();
    for (const j of raw) {
      const city = cityHub(j.location);
      if (!city || !j.title || !j.applyUrl || j.description.length < 200) continue;
      const hash = await sha256(`${j.source}|${j.company.toLowerCase()}|${j.sourceId}|${j.title.toLowerCase().trim()}`);
      if (seen.has(hash)) continue;
      seen.add(hash);
      candidates.push({ ...j, hash, city });
    }

    const { data: existing } = await db.from("jobs_catalog").select("external_job_id").in("external_job_id", candidates.map((c) => c.hash));
    const have = new Set((existing ?? []).map((e) => e.external_job_id));
    // Round-robin across cities so each hub gets fresh jobs.
    const byCity = new Map<City, typeof candidates>();
    for (const c of candidates.filter((c) => !have.has(c.hash))) byCity.set(c.city, [...(byCity.get(c.city) ?? []), c]);
    const queue: typeof candidates = [];
    while (queue.length < MAX_NEW_PER_RUN && [...byCity.values()].some((l) => l.length)) {
      for (const l of byCity.values()) if (l.length && queue.length < MAX_NEW_PER_RUN) queue.push(l.shift()!);
    }

    let inserted = 0, failed = 0;
    for (const j of queue) {
      try {
        const truth = await extractTruthCard(j, apiKey);
        const { error } = await db.from("jobs_catalog").upsert({
          external_job_id: j.hash, title: j.title.slice(0, 200), company_name: j.company.slice(0, 120),
          city_hub: j.city, work_mode: workMode(j.location, j.description), apply_url: j.applyUrl,
          raw_description: j.description.slice(0, 20000), truth_card_json: truth, fetched_at: new Date().toISOString(),
        }, { onConflict: "external_job_id" });
        if (error) throw error;
        inserted++;
        await db.from("api_usage_logs").insert({ user_id: null, feature_name: "ingest-jobs", provider: "lovable-ai", estimated_cost_usd: EST_COST_PER_JOB, status: "success" });
      } catch (e) {
        failed++;
        console.error("ingest failed", j.title, e);
        await db.from("api_usage_logs").insert({ user_id: null, feature_name: "ingest-jobs", provider: "lovable-ai", estimated_cost_usd: 0, status: "failed" });
      }
    }
    return json({ scanned: raw.length, eligible: candidates.length, inserted, failed, skipped_existing: have.size });
  } catch (e) {
    console.error("ingest-jobs error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
