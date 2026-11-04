import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PaidAction = "resume_tailor" | "hm_unlock" | "voice_interview" | "salary_audit";

export const MAINTENANCE_MESSAGE =
  "Hirely's AI tools are taking a short break for maintenance. Please try again in a few hours — no credits were used.";

export class PaidActionError extends Error {
  constructor(public code: "maintenance" | "insufficient_credits" | "rate_limited", message: string, public status: number) {
    super(message);
  }
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/**
 * Runs a paid AI action: blocks when the 24h AI spend hits the $10 safety limit,
 * deducts credits, logs estimated cost, and refunds the credits if `work` throws.
 */
export async function runPaidAction<T>(
  opts: { userId: string; action: PaidAction; units?: number; feature: string; provider: string; estimatedCostUsd: number },
  work: () => Promise<T>,
): Promise<T> {
  const db = admin();
  const { data: ledgerId, error } = await db.rpc("spend_credits", {
    _user_id: opts.userId, _action: opts.action, _units: opts.units ?? 1,
  });
  if (error) {
    if (error.message.includes("AI_MAINTENANCE")) throw new PaidActionError("maintenance", MAINTENANCE_MESSAGE, 503);
    if (error.message.includes("RATE_LIMITED"))
      throw new PaidActionError("rate_limited", "You've hit the limit of 5 resume tailorings per hour. Please try again later — no credits were used.", 429);
    if (error.message.includes("INSUFFICIENT_CREDITS"))
      throw new PaidActionError("insufficient_credits", "You don't have enough credits for this action.", 402);
    throw error;
  }
  const log = (status: "success" | "failed") =>
    db.from("api_usage_logs").insert({
      user_id: opts.userId, feature_name: opts.feature, provider: opts.provider,
      estimated_cost_usd: opts.estimatedCostUsd, status,
    });
  try {
    const result = await work();
    await log("success");
    return result;
  } catch (e) {
    await log("failed");
    const { error: refundErr } = await db.rpc("refund_credits", { _ledger_id: ledgerId });
    if (refundErr) console.error("refund failed", ledgerId, refundErr);
    throw e;
  }
}
