// Shared by edge functions. Mirrors src/lib/entitlements.ts. Keep in sync.
// Deno runtime — uses ESM-compatible imports from supabase-js.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AppPlan = "free" | "pro" | "advanced" | "teams";

export type FeatureKey =
  | "resume_uploads"
  | "analyses"
  | "ats_breakdown"
  | "quick_wins"
  | "enhanced_resume"
  | "compare_versions"
  | "tailored_edits"
  | "issues_panel"
  | "cover_letters"
  | "cover_letter_clean"
  | "interview_questions"
  | "improved_answer"
  | "mock_interviews"
  | "voice_mock_interview"
  | "resume_export"
  | "resume_export_watermark"
  | "application_tracker";

type Limit = number | "unlimited" | false;

const LIMITS: Record<AppPlan, Record<FeatureKey, Limit>> = {
  free: {
    resume_uploads: 1,
    analyses: 1,
    ats_breakdown: false,
    quick_wins: 2,
    enhanced_resume: false,
    compare_versions: false,
    tailored_edits: false,
    issues_panel: false,
    cover_letters: 1,
    cover_letter_clean: false,
    interview_questions: 5,
    improved_answer: false,
    mock_interviews: 0,
    voice_mock_interview: false,
    resume_export: false,
    resume_export_watermark: true as unknown as Limit,
    application_tracker: false,
  },
  pro: {
    resume_uploads: 10,
    analyses: 15,
    ats_breakdown: true as unknown as Limit,
    quick_wins: "unlimited",
    enhanced_resume: true as unknown as Limit,
    compare_versions: true as unknown as Limit,
    tailored_edits: true as unknown as Limit,
    issues_panel: true as unknown as Limit,
    cover_letters: 20,
    cover_letter_clean: true as unknown as Limit,
    interview_questions: 30,
    improved_answer: true as unknown as Limit,
    mock_interviews: 5,
    voice_mock_interview: false,
    resume_export: true as unknown as Limit,
    resume_export_watermark: true as unknown as Limit,
    application_tracker: 10,
  },
  advanced: {
    resume_uploads: 50,
    analyses: "unlimited",
    ats_breakdown: true as unknown as Limit,
    quick_wins: "unlimited",
    enhanced_resume: true as unknown as Limit,
    compare_versions: true as unknown as Limit,
    tailored_edits: true as unknown as Limit,
    issues_panel: true as unknown as Limit,
    cover_letters: 100,
    cover_letter_clean: true as unknown as Limit,
    interview_questions: "unlimited",
    improved_answer: true as unknown as Limit,
    mock_interviews: "unlimited",
    voice_mock_interview: true as unknown as Limit,
    resume_export: true as unknown as Limit,
    resume_export_watermark: true as unknown as Limit,
    application_tracker: "unlimited",
  },
  teams: {
    resume_uploads: "unlimited",
    analyses: "unlimited",
    ats_breakdown: true as unknown as Limit,
    quick_wins: "unlimited",
    enhanced_resume: true as unknown as Limit,
    compare_versions: true as unknown as Limit,
    tailored_edits: true as unknown as Limit,
    issues_panel: true as unknown as Limit,
    cover_letters: "unlimited",
    cover_letter_clean: true as unknown as Limit,
    interview_questions: "unlimited",
    improved_answer: true as unknown as Limit,
    mock_interviews: "unlimited",
    voice_mock_interview: true as unknown as Limit,
    resume_export: true as unknown as Limit,
    resume_export_watermark: true as unknown as Limit,
    application_tracker: "unlimited",
  },
};

const COUNTER_COLUMN: Partial<Record<FeatureKey, string>> = {
  resume_uploads: "resume_uploads",
  analyses: "analyses",
  cover_letters: "cover_letters",
  interview_questions: "interview_questions",
  mock_interviews: "mock_interviews",
};

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function periodStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

export async function getPlan(userId: string): Promise<AppPlan> {
  const admin = adminClient();
  const { data } = await admin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.plan as AppPlan) ?? "free";
}

export async function checkEntitlement(
  userId: string,
  feature: FeatureKey,
): Promise<
  | { ok: true; plan: AppPlan }
  | { ok: false; status: number; error: string; plan: AppPlan }
> {
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (profile?.plan as AppPlan) ?? "free";
  const limit = LIMITS[plan][feature];

  if (limit === false || limit === 0) {
    return {
      ok: false,
      status: 402,
      plan,
      error: `Your ${plan} plan does not include this feature. Upgrade to unlock it.`,
    };
  }
  if (limit === "unlimited") return { ok: true, plan };

  const col = COUNTER_COLUMN[feature];
  if (!col) return { ok: true, plan };

  const period = periodStartIso();
  const { data: counter } = await admin
    .from("usage_counters")
    .select(col)
    .eq("user_id", userId)
    .eq("period_start", period)
    .maybeSingle();
  const used = (counter as Record<string, number> | null)?.[col] ?? 0;

  if (used >= (limit as number)) {
    return {
      ok: false,
      status: 402,
      plan,
      error: `You've used your monthly ${feature.replace(/_/g, " ")} on the ${plan} plan (${limit}). Upgrade for more.`,
    };
  }
  return { ok: true, plan };
}

export async function incrementUsage(
  userId: string,
  feature: FeatureKey,
  delta = 1,
): Promise<void> {
  const col = COUNTER_COLUMN[feature];
  if (!col) return;
  const admin = adminClient();
  const { error } = await admin.rpc("increment_usage_counter", {
    _user_id: userId,
    _column: col,
    _delta: delta,
  });
  if (error) {
    // Log but don't fail the user's request over a counter bump.
    console.error("increment_usage_counter failed", feature, error);
  }
}

