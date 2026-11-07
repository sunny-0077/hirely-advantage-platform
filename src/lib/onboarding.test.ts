import { describe, expect, it } from "vitest";
import { personalSchema, careerSchema, masterResumeSchema, workspaceDestination, authErrorMessage } from "./onboarding";
import { passwordResetRedirectUrl } from "./authNavigation";

describe("onboarding and authentication rules", () => {
  const personal = { full_name: "Alex", country: "India", preferred_currency: "INR", preferred_location: "Pune" };
  it("requires personal information before continuing", () => {
    expect(personalSchema.safeParse({ ...personal, full_name: " " }).success).toBe(false);
    expect(personalSchema.parse(personal).full_name).toBe("Alex");
  });
  it("accepts only the four employment preferences", () => {
    const career = { target_job_role: "Analyst", experience_level: "entry", preferred_job_location: "Remote" };
    for (const employment_preference of ["Full-time", "Internship", "Contract", "Remote"]) expect(careerSchema.safeParse({ ...career, employment_preference }).success).toBe(true);
    expect(careerSchema.safeParse({ ...career, employment_preference: "anything" }).success).toBe(false);
  });
  it("allows empty master resume setup without fabricating content", () => {
    expect(masterResumeSchema.parse(" ")).toBe("");
  });
  it("requires completed onboarding for a workspace redirect", () => {
    expect(workspaceDestination(false, "/app/jobs")).toBe("/onboarding");
    expect(workspaceDestination(true, "/app/jobs")).toBe("/app/jobs");
  });
  it("never includes internal error details in notices", () => {
    expect(authErrorMessage(new Error("secret credentials"))).not.toContain("secret");
  });
  it("sends reset emails to a public reset page rather than the editor", () => {
    expect(passwordResetRedirectUrl("http://localhost:8080")).toBe("https://hirely-advantage-platform.lovable.app/reset-password");
  });
});