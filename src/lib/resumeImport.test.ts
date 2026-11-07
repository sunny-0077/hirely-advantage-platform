import { describe, it, expect } from "vitest";
import { confirmImport, importFields, mapResumeText, updateImportField, validateImportFile } from "./resumeImport";
import { emptyResume, newExperience } from "./masterResume";
import { resolveSavedResume, resolveUserResume } from "../../supabase/functions/_shared/resume-source";
const text = `Name: Resume Owner\nEmail: owner@example.com\nSummary\nWorks with SQL.\nExperience\nJob title: Analyst\nCompany: Example Co\nStart date: January 2023\nEnd date: Present\nResponsibilities:\n- Prepared reports\nAchievements:\n- Published a dashboard\nEducation\nDegree: BSc\nInstitution: Example University\nSkills\nTechnical: SQL, Python\nProjects\nProject name: Dashboard\nResponsibilities: Built queries\nAchievements: Shipped reports\nCertifications\nCertification name: SQL Certificate\nIssuer: Example\nLanguages\nEnglish\nAwards\nTeam award`;
describe("resume import mapping and preservation", () => {
  it("maps existing fields without inventing facts", () => {
    const { resume } = mapResumeText(text);
    expect(resume.personal.fullName).toBe("Resume Owner"); expect(resume.experience[0].company).toBe("Example Co");
    expect(resume.experience[0].startDate).toBe("2023-01"); expect(resume.experience[0].current).toBe(true);
    expect(resume.education[0].degree).toBe("BSc"); expect(resume.certifications[0].issuer).toBe("Example");
    expect(resume.skills.technical).toEqual(["SQL", "Python"]); expect(resume.additional.map(x => x.kind)).toEqual(["language", "award"]);
  });
  it("keeps responsibilities separate from achievements", () => {
    const { resume } = mapResumeText(text);
    expect(resume.experience[0].responsibilities).toEqual(["Prepared reports"]); expect(resume.experience[0].achievements).toEqual(["Published a dashboard"]);
    expect(resume.projects[0].responsibilities).toEqual(["Built queries"]); expect(resume.projects[0].achievements).toEqual(["Shipped reports"]);
  });
  it("missing fields remain empty and unlabeled/ambiguous facts stay for manual assignment", () => {
    const result = mapResumeText("Some Person\nExperience\nUnknown employer\n2020 - 2022\n- Increased revenue");
    expect(result.resume.personal.fullName).toBe(""); expect(result.resume.experience).toEqual([]);
    expect(result.unassigned).toEqual(["Some Person", "Unknown employer", "2020 - 2022", "- Increased revenue"]);
  });
  it("extraction, review and cancellation do not mutate existing facts", () => {
    const existing = emptyResume(); existing.personal.fullName = "Original";
    const snapshot = JSON.stringify(existing); const draft = mapResumeText(text).resume;
    updateImportField(draft, importFields(draft)[0], "Edited");
    expect(JSON.stringify(existing)).toBe(snapshot); // Dropping this draft (cancel) performs no write.
    expect(confirmImport(existing, draft, new Set())).toEqual(existing);
  });
  it("confirmation changes selected fields only and preserves missing fields/existing entries", () => {
    const existing = emptyResume(); existing.personal.fullName = "Original"; existing.personal.phone = "123456789"; existing.skills.tools = ["Excel"];
    existing.experience = [{ ...newExperience(), title: "Previous", company: "Retained" }];
    const imported = mapResumeText(text).resume;
    const result = confirmImport(existing, imported, new Set(["personal.fullName", "skills.technical", "experience.0.title", "experience.0.company"]));
    expect(result.personal.fullName).toBe("Resume Owner"); expect(result.personal.phone).toBe("123456789"); expect(result.skills.tools).toEqual(["Excel"]);
    expect(result.experience.map(x => x.title)).toEqual(["Previous", "Analyst"]); expect(result.experience[1].responsibilities).toEqual([]);
    expect(existing.personal.fullName).toBe("Original");
  });
  it("updated structured facts reach resolver without combining legacy or modifying billing", () => {
    const profile = { master_resume_json: emptyResume(), master_resume_text: "Legacy Java resume from another role and employer with extensive original information that remains unchanged.", credits_balance: 5, plan_tier: "scout_free" };
    const before = JSON.stringify(profile); const imported = mapResumeText(text).resume;
    const confirmed = confirmImport(profile.master_resume_json, imported, new Set(["skills.technical"]));
    const source = resolveSavedResume({ ...profile, master_resume_json: confirmed });
    expect(source.source).toBe("structured"); expect(source.text).toContain("SQL"); expect(source.text).not.toContain("Java"); expect(JSON.stringify(profile)).toBe(before);
  });
  it("explicit upload workflow and owner constraints remain unchanged", async () => {
    const calls: string[] = []; const chain = { select: () => chain, eq: (k: string, v: string) => { calls.push(`${k}:${v}`); return chain; }, maybeSingle: async () => ({ data: { user_id: "owner", raw_text: "Explicit uploaded Java developer resume with application engineering and deployment experience at User Company." }, error: null }) };
    const result = await resolveUserResume({ from: () => chain }, "owner", { resumeId: "upload" });
    expect(result.source).toBe("upload"); expect(calls).toEqual(["id:upload", "user_id:owner"]);
  });
  it("validates PDF/DOCX only, empty files and exactly 5 MB limit", () => {
    expect(() => validateImportFile({ name: "resume.docx", size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => validateImportFile({ name: "resume.pdf", size: 5 * 1024 * 1024 + 1 })).toThrow("5 MB");
    expect(() => validateImportFile({ name: "resume.txt", size: 10 })).toThrow("Only PDF");
    expect(() => validateImportFile({ name: "resume.pdf", size: 0 })).toThrow("empty");
  });
});