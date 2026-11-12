import { z } from "zod";

/** Read the submitted controls, including credentials filled by mobile password managers. */
export function emailCredentials(form: FormData, signup: boolean) {
  return z.object({
    email: z.string().trim().email("Enter a valid email").max(255, "Email too long"),
    password: z.string().min(signup ? 8 : 1, signup ? "At least 8 characters" : "Enter your password").max(72, "Too long"),
  }).parse({ email: form.get("email"), password: form.get("password") });
}