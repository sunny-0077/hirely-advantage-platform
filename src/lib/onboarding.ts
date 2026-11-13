import { z } from "zod";

const requiredText = (max: number) => z.string().trim().min(1, "Please complete this field.").max(max);
export const personalSchema = z.object({
  full_name: requiredText(100), country: requiredText(100),
  preferred_currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
  preferred_location: requiredText(200),
});
export const careerSchema = z.object({
  target_job_role: requiredText(200),
  experience_level: z.enum(["student", "entry", "mid", "senior"]),
  preferred_job_location: requiredText(200),
  employment_preference: z.enum(["Full-time", "Internship", "Contract", "Remote"]),
});
export const masterResumeSchema = z.string().trim().max(50000, "Please keep your resume under 50,000 characters.");

export function workspaceDestination(completed: boolean | undefined, requested = "/app"): string {
  void completed; return requested;
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "invalid_credentials") return "The email or password is incorrect. Please try again.";
  if (code === "email_not_confirmed") return "Please verify your email before signing in. Check your inbox and spam folder.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "weak_password") return "Choose a stronger password with at least 8 characters.";
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check your information.";
  return "We couldn't complete that request. Please try again, or request a new email link.";
}

/** Readable name from an email address, e.g. "john.doe92@mail.com" -> "John Doe". */
export function nameFromEmail(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  return local.replace(/[0-9]+/g, " ").split(/[._\-+\s]+/).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ").slice(0, 100);
}
