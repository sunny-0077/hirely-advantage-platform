import { emptyResume, masterResumeSchema, newCertification, newEducation, newExperience, newExtra, newProject, type MasterResume } from "./masterResume";

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export function validateImportFile(file: { name: string; size: number }) {
  if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error("Only PDF and DOCX resumes are supported.");
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > IMPORT_MAX_BYTES) throw new Error("Choose a resume of 5 MB or less.");
}
type Section = "contact" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "language" | "award" | "unknown";
const headings: Record<string, Section> = {
  contact: "contact", "personal information": "contact", summary: "summary", "professional summary": "summary", profile: "summary", "career summary": "summary",
  experience: "experience", "work experience": "experience", "professional experience": "experience", "employment history": "experience",
  education: "education", "academic qualifications": "education", skills: "skills", "technical skills": "skills", "tools and technologies": "skills", "soft skills": "skills",
  projects: "projects", "personal projects": "projects", certifications: "certifications", certificates: "certifications", languages: "language", awards: "award", achievements: "award",
};
const month = (text: string) => {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return text;
  const m = text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i);
  if (!m) return "";
  const n = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
  return `${m[2]}-${String(n).padStart(2, "0")}`;
};

/** Conservative labeled-field mapping. Uncertain lines stay visible; no AI or inferred facts. */
export function mapResumeText(text: string) {
  const resume = emptyResume(), unassigned: string[] = [];
  let section: Section = "contact", skillCategory: keyof MasterResume["skills"] = "other", bulletMode: "responsibilities" | "achievements" | null = null;
  let experience: ReturnType<typeof newExperience> | undefined;
  let education: ReturnType<typeof newEducation> | undefined;
  let project: ReturnType<typeof newProject> | undefined;
  let certification: ReturnType<typeof newCertification> | undefined;
  const push = (list: string[], value: string, max = 500, count = 30) => {
    if (value.length > max || list.length >= count) { unassigned.push(value); return; }
    list.push(value);
  };
  const assign = (obj: object, key: string, value: string, max = 120) => {
    const record = obj as Record<string, unknown>;
    if (value.length > max || record[key]) { unassigned.push(`${key}: ${value}`); return; }
    record[key] = value;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const heading = line.toLowerCase().replace(/:$/, "");
    if (/^(responsibilities|achievements)\s*:$/i.test(line) && (section === "experience" || section === "projects")) { bulletMode = /^responsibilities/i.test(line) ? "responsibilities" : "achievements"; continue; }
    if (headings[heading]) {
      section = headings[heading]; bulletMode = null;
      experience = undefined; education = undefined; project = undefined; certification = undefined;
      skillCategory = heading === "technical skills" ? "technical" : heading === "soft skills" ? "soft" : heading === "tools and technologies" ? "tools" : "other";
      continue;
    }
    const pair = line.match(/^([\w /]+):\s*(.+)$/);
    const label = pair?.[1].trim().toLowerCase(), value = pair?.[2].trim() ?? "";
    if (section === "contact") {
      const keys: Record<string, [keyof MasterResume["personal"], number]> = { name: ["fullName", 100], "full name": ["fullName", 100], email: ["email", 200], phone: ["phone", 30], city: ["city", 100], country: ["country", 100], linkedin: ["linkedinUrl", 300], github: ["githubUrl", 300], portfolio: ["portfolioUrl", 300] };
      if (label && keys[label]) { const [key, max] = keys[label]; assign(resume.personal, key, value, max); continue; }
      const email = line.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      if (email) { assign(resume.personal, "email", line, 200); continue; }
      if (/^\+?[\d ().-]{7,30}$/.test(line)) { assign(resume.personal, "phone", line, 30); continue; }
      if (/^https?:\/\/[^\s]+$/i.test(line)) {
        const key = /linkedin\.com\//i.test(line) ? "linkedinUrl" : /github\.com\//i.test(line) ? "githubUrl" : "portfolioUrl";
        assign(resume.personal, key, line, 300); continue;
      }
      // Names/headlines without labels remain for review, not guessed from arbitrary text.
    } else if (section === "summary") {
      if (label === "headline") assign(resume.summary, "headline", value, 150);
      else if (label === "years of experience" && /^\d{1,2}(\.\d)?$/.test(value)) assign(resume.summary, "yearsExperience", value, 4);
      else {
        const next = [resume.summary.summary, line].filter(Boolean).join("\n");
        if (next.length <= 3000) resume.summary.summary = next; else unassigned.push(line);
      }
      continue;
    } else if (section === "skills") {
      const categories: Record<string, keyof MasterResume["skills"]> = { technical: "technical", "technical skills": "technical", tools: "tools", "tools and technologies": "tools", soft: "soft", "soft skills": "soft", other: "other" };
      const target = label && categories[label] ? categories[label] : skillCategory;
      for (const skill of (label && categories[label] ? value : line).replace(/^[-•]\s*/, "").split(/[,;|]/).map(s => s.trim()).filter(Boolean)) push(resume.skills[target], skill, 60, 60);
      continue;
    } else if (section === "language" || section === "award") {
      const x = newExtra(section); const clean = line.replace(/^[-•]\s*/, "");
      if (clean.length <= 160 && resume.additional.length < 40) { x.title = clean; resume.additional.push(x); } else unassigned.push(line);
      continue;
    } else if (section === "experience" || section === "projects") {
      const start = section === "experience" ? /^(job title|title|role)$/.test(label ?? "") : /^(project name|name)$/.test(label ?? "");
      if (start || (section === "experience" && /\s+at\s+/.test(line) && !/^[-•]/.test(line))) {
        bulletMode = null;
        if (section === "experience") {
          if (resume.experience.length >= 30) { unassigned.push(line); continue; }
          experience = newExperience(); resume.experience.push(experience);
          if (start) assign(experience, "title", value); else { const [title, company] = line.split(/\s+at\s+/); assign(experience, "title", title); assign(experience, "company", company); }
        } else {
          if (resume.projects.length >= 20) { unassigned.push(line); continue; }
          project = newProject(); resume.projects.push(project); assign(project, "name", value);
        }
        continue;
      }
      const entry = section === "experience" ? experience : project;
      if (entry) {
        if ((label === "responsibilities" || label === "achievements") && value) { push(entry[label], value); continue; }
        if (/^[-•]\s*/.test(line) && bulletMode) { push(entry[bulletMode], line.replace(/^[-•]\s*/, "")); continue; }
        if (section === "experience" && experience) {
          const keys: Record<string, string> = { company: "company", "employment type": "employmentType", location: "location" };
          if (label && keys[label]) { assign(experience, keys[label], value, label === "employment type" ? 40 : 120); continue; }
          if (label === "start date" || label === "end date") {
            if (label === "end date" && /^(present|current)$/i.test(value)) { experience.current = true; continue; }
            const d = month(value); if (d) { assign(experience, label === "start date" ? "startDate" : "endDate", d); continue; }
          }
          const dates = line.split(/\s+[–—-]\s+/);
          if (dates.length === 2 && month(dates[0]) && (month(dates[1]) || /^present$/i.test(dates[1]))) {
            experience.startDate = month(dates[0]); experience.endDate = month(dates[1]); experience.current = /^present$/i.test(dates[1]); continue;
          }
        }
        if (section === "projects" && project && label) {
          if (label === "description") { assign(project, "description", value, 1500); continue; }
          if (label === "technologies" || label === "technologies used") { value.split(/[,;|]/).map(s => s.trim()).filter(Boolean).forEach(s => push(project.technologies, s, 60)); continue; }
          if (label === "project url" || label === "github url") { assign(project, label === "project url" ? "url" : "githubUrl", value, 300); continue; }
        }
      }
    } else if (section === "education") {
      if (label === "degree") { if (resume.education.length >= 15) { unassigned.push(line); continue; } education = newEducation(); resume.education.push(education); assign(education, "degree", value); continue; }
      if (education && label) {
        const keys: Record<string, [string, number]> = { institution: ["institution", 160], "field of study": ["field", 120], grade: ["grade", 40], gpa: ["grade", 40] };
        if (keys[label]) { assign(education, keys[label][0], value, keys[label][1]); continue; }
        if ((label === "start date" || label === "end date") && month(value)) { assign(education, label === "start date" ? "startDate" : "endDate", month(value)); continue; }
      }
    } else if (section === "certifications") {
      if (label === "certification name" || label === "name") { if (resume.certifications.length >= 30) { unassigned.push(line); continue; } certification = newCertification(); resume.certifications.push(certification); assign(certification, "name", value, 160); continue; }
      if (certification && label) {
        if (label === "issuer" || label === "issuing organization") { assign(certification, "issuer", value, 160); continue; }
        if (label === "credential url") { assign(certification, "credentialUrl", value, 300); continue; }
        if ((label === "issue date" || label === "expiration date") && month(value)) { assign(certification, label === "issue date" ? "issueDate" : "expiryDate", month(value)); continue; }
      }
    }
    unassigned.push(line);
  }
  return { resume, unassigned };
}

export type ImportField = { path: string; label: string; value: string | boolean; list: boolean };
const titles: Record<string, string> = { personal: "Personal information", fullName: "Full name", linkedinUrl: "LinkedIn URL", githubUrl: "GitHub URL", portfolioUrl: "Portfolio URL", yearsExperience: "Years of experience", experience: "Work experience", education: "Education", projects: "Projects", certifications: "Certifications", additional: "Additional information", employmentType: "Employment type", startDate: "Start date", endDate: "End date", current: "Currently working here", issueDate: "Issue date", expiryDate: "Expiration date", credentialUrl: "Credential URL" };
export function importFields(resume: MasterResume, includeEmpty = false): ImportField[] {
  const fields: ImportField[] = [];
  const visit = (obj: unknown, path: string[], labels: string[]) => {
    if (Array.isArray(obj)) {
      if (obj.length === 0 && path.length === 1 && ["experience", "education", "projects", "certifications", "additional"].includes(path[0])) return;
      if (obj.every(x => typeof x === "string")) { if (obj.length || includeEmpty) fields.push({ path: path.join("."), label: labels.join(" · "), value: obj.join("\n"), list: true }); }
      else obj.forEach((x, i) => visit(x, [...path, String(i)], [...labels, `Entry ${i + 1}`]));
    } else if (obj && typeof obj === "object") {
      Object.entries(obj).forEach(([k, v]) => { if (!["id", "version", "kind"].includes(k)) visit(v, [...path, k], [...labels, titles[k] ?? k[0].toUpperCase() + k.slice(1)]); });
    } else if (obj || includeEmpty) fields.push({ path: path.join("."), label: labels.join(" · "), value: obj as string | boolean, list: false });
  };
  visit(resume, [], []); return fields;
}
export function updateImportField(resume: MasterResume, field: ImportField, value: string | boolean) {
  const next = structuredClone(resume); const keys = field.path.split(".");
  let obj = next as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) obj = obj[key] as Record<string, unknown>;
  obj[keys[keys.length - 1]] = field.list ? String(value).split("\n").map(s => s.trim()).filter(Boolean) : value;
  return next;
}

/** Explicitly chosen scalar replacements and new entries only. Missing fields never erase facts. */
export function confirmImport(existing: MasterResume, imported: MasterResume, selected: Set<string>) {
  let chosen = emptyResume();
  chosen.experience = imported.experience.map(() => newExperience());
  chosen.education = imported.education.map(() => newEducation());
  chosen.projects = imported.projects.map(() => newProject());
  chosen.certifications = imported.certifications.map(() => newCertification());
  chosen.additional = imported.additional.map(x => newExtra(x.kind));
  for (const field of importFields(imported)) if (selected.has(field.path)) chosen = updateImportField(chosen, field, field.value);
  const result = structuredClone(existing);
  for (const group of ["personal", "summary"] as const) {
    for (const [key, value] of Object.entries(chosen[group])) if (value) (result[group] as Record<string, string>)[key] = value;
  }
  // A skill category is replaced only when explicitly selected, never when absent.
  for (const key of Object.keys(chosen.skills) as (keyof MasterResume["skills"])[]) if (chosen.skills[key].length) result.skills[key] = chosen.skills[key];
  const content = (x: object) => Object.entries(x).some(([k, v]) => k !== "id" && k !== "kind" && (Array.isArray(v) ? v.length > 0 : Boolean(v)));
  result.experience.push(...chosen.experience.filter(content)); result.education.push(...chosen.education.filter(content));
  result.projects.push(...chosen.projects.filter(content)); result.certifications.push(...chosen.certifications.filter(content)); result.additional.push(...chosen.additional.filter(content));
  return masterResumeSchema.parse(result);
}