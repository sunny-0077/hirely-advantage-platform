import { describe, expect, it } from "vitest";
import { completion, emptyResume, loadResume, masterResumeSchema, newEducation, newExperience, seedFromProfile, toPlainText } from "./masterResume";

describe("master resume", () => {
  it("empty resume is Not started with all five core sections missing", () => {
    const c = completion(emptyResume());
    expect(c.label).toBe("Not started");
    expect(c.missing).toEqual(["Personal information", "Professional summary", "Work experience", "Education", "Skills"]);
  });
  it("core complete without optional sections", () => {
    const r = emptyResume();
    r.personal = { ...r.personal, fullName: "A", email: "a@b.co", city: "Pune" };
    r.summary.headline = "Analyst";
    r.experience = [{ ...newExperience(), title: "Analyst", company: "X" }];
    r.education = [{ ...newEducation(), degree: "BSc" }];
    r.skills.technical = ["SQL"];
    expect(completion(r).label).toBe("Core complete");
  });
  it("rejects non-http URLs and end before start", () => {
    const r = emptyResume();
    r.personal.linkedinUrl = "javascript:alert(1)";
    r.experience = [{ ...newExperience(), startDate: "2023-05", endDate: "2022-01" }];
    const res = masterResumeSchema.safeParse(r);
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map(i => i.path.join("."));
    expect(paths).toContain("personal.linkedinUrl");
    expect(paths).toContain("experience.0.endDate");
  });
  it("malformed stored data loads safely, keeping valid parts", () => {
    const r = loadResume({ personal: { fullName: "Asha" }, experience: "broken" });
    expect(r.personal.fullName).toBe("Asha");
    expect(r.experience).toEqual([]);
    expect(loadResume(null)).toEqual(emptyResume());
  });
  it("seeds only from existing onboarding data and invents nothing", () => {
    const r = seedFromProfile({ full_name: "Asha", country: "India" }, "a@b.co");
    expect(r.personal.fullName).toBe("Asha");
    expect(r.summary.summary).toBe("");
    expect(r.experience).toEqual([]);
    expect(Object.values(r.skills).flat()).toEqual([]);
  });
  it("plain text includes entered sections", () => {
    const r = emptyResume();
    r.personal.fullName = "Asha"; r.skills.tools = ["Tableau"];
    expect(toPlainText(r)).toContain("Tools: Tableau");
  });
});
