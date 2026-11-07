import { z } from "zod";

/** Structured Master Resume stored in profiles.master_resume_json (version 1). */
const s = (max: number) => z.string().trim().max(max).default("");
const month = z.string().trim().regex(/^(\d{4}-(0[1-9]|1[0-2]))?$/, "Use a valid month.").default("");
const url = z.string().trim().max(300).refine(v => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Enter a full link starting with https://").default("");
const bullets = z.array(z.string().trim().max(500)).max(30).default([]);
const id = z.string().max(40).default(() => crypto.randomUUID());
const range = <T extends z.ZodRawShape>(shape: T) => z.object(shape);

export const experienceSchema = range({ id, title: s(120), company: s(120), employmentType: s(40), location: s(120), startDate: month, endDate: month, current: z.boolean().default(false), responsibilities: bullets, achievements: bullets });
export const educationSchema = range({ id, degree: s(120), institution: s(160), field: s(120), startDate: month, endDate: month, grade: s(40) });
export const projectSchema = range({ id, name: s(120), description: s(1500), technologies: z.array(s(60)).max(30).default([]), url, githubUrl: url, responsibilities: bullets, achievements: bullets });
export const certificationSchema = range({ id, name: s(160), issuer: s(160), issueDate: month, expiryDate: month, credentialUrl: url });
export const extraSchema = range({ id, kind: z.enum(["language", "volunteer", "award", "publication", "other"]).default("other"), title: s(160), details: s(1000) });

export const masterResumeSchema = z.object({
  version: z.literal(1).default(1),
  personal: z.object({ fullName: s(100), email: s(200), phone: z.string().trim().max(30).regex(/^[+\d\s().-]*$/, "Use digits, spaces and + ( ) - only.").default(""), city: s(100), country: s(100), linkedinUrl: url, githubUrl: url, portfolioUrl: url }).default({}),
  summary: z.object({ headline: s(150), summary: s(3000), yearsExperience: z.string().trim().regex(/^(\d{1,2}(\.\d)?)?$/, "Enter a number like 3 or 2.5.").default("") }).default({}),
  experience: z.array(experienceSchema).max(30).default([]),
  education: z.array(educationSchema).max(15).default([]),
  skills: z.object({ technical: z.array(s(60)).max(60).default([]), tools: z.array(s(60)).max(60).default([]), soft: z.array(s(60)).max(60).default([]), other: z.array(s(60)).max(60).default([]) }).default({}),
  projects: z.array(projectSchema).max(20).default([]),
  certifications: z.array(certificationSchema).max(30).default([]),
  additional: z.array(extraSchema).max(40).default([]),
}).superRefine((r, ctx) => {
  const check = (list: { startDate?: string; endDate?: string; current?: boolean }[], key: string) => list.forEach((e, i) => {
    if (e.startDate && e.endDate && !e.current && e.endDate < e.startDate) ctx.addIssue({ code: "custom", path: [key, i, "endDate"], message: "End date must be after the start date." });
  });
  check(r.experience, "experience"); check(r.education, "education");
  r.certifications.forEach((c, i) => { if (c.issueDate && c.expiryDate && c.expiryDate < c.issueDate) ctx.addIssue({ code: "custom", path: ["certifications", i, "expiryDate"], message: "Expiry must be after the issue date." }); });
});

export type MasterResume = z.infer<typeof masterResumeSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Extra = z.infer<typeof extraSchema>;

export const emptyResume = (): MasterResume => masterResumeSchema.parse({});
export const newExperience = (): Experience => experienceSchema.parse({});
export const newEducation = (): Education => educationSchema.parse({});
export const newProject = (): Project => projectSchema.parse({});
export const newCertification = (): Certification => certificationSchema.parse({});
export const newExtra = (kind: Extra["kind"]): Extra => extraSchema.parse({ kind });

/** Loads stored JSON safely: malformed parts fall back to empty values instead of crashing. */
export function loadResume(raw: unknown): MasterResume {
  const r = masterResumeSchema.safeParse(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
  if (r.success) return r.data;
  const o = raw as Record<string, unknown>;
  const base = emptyResume();
  for (const key of Object.keys(base) as (keyof MasterResume)[]) {
    const part = masterResumeSchema.safeParse({ [key]: o[key] });
    if (part.success) (base as Record<string, unknown>)[key] = part.data[key];
  }
  return base;
}

export const hasContent = (r: MasterResume) => toPlainText(r).replace(/\s/g, "").length > 0;

type Profile = { full_name?: string | null; display_name?: string | null; country?: string | null; preferred_location?: string | null; headline?: string | null; skills?: string[] | null; experience?: unknown; education?: unknown };
/** First-open seed from what the user already typed in onboarding/My profile. Never invents data. */
export function seedFromProfile(p: Profile, email: string): MasterResume {
  const r = emptyResume();
  r.personal.fullName = (p.full_name || p.display_name || "").slice(0, 100);
  r.personal.email = email; r.personal.country = p.country ?? ""; r.personal.city = (p.preferred_location ?? "").slice(0, 100);
  r.summary.headline = (p.headline ?? "").slice(0, 150);
  r.skills.other = (p.skills ?? []).slice(0, 60);
  if (Array.isArray(p.experience)) r.experience = p.experience.slice(0, 30).map((x: Record<string, string>) => ({ ...newExperience(), title: x?.title ?? "", company: x?.company ?? "", responsibilities: x?.summary ? [String(x.summary).slice(0, 500)] : [] })).filter(x => x.title || x.company);
  if (Array.isArray(p.education)) r.education = p.education.slice(0, 15).map((x: Record<string, string>) => ({ ...newEducation(), institution: x?.school ?? "", degree: x?.degree ?? "", endDate: /^\d{4}$/.test(x?.year ?? "") ? `${x.year}-01` : "" })).filter(x => x.institution || x.degree);
  return loadResume(r);
}

export type Completion = { label: "Not started" | "In progress" | "Core complete"; done: string[]; missing: string[] };
/** Qualitative completion of the five core sections; optional sections never block. */
export function completion(r: MasterResume): Completion {
  const checks: [string, boolean][] = [
    ["Personal information", Boolean(r.personal.fullName && r.personal.email && (r.personal.city || r.personal.country))],
    ["Professional summary", Boolean(r.summary.headline || r.summary.summary)],
    ["Work experience", r.experience.some(e => e.title && e.company)],
    ["Education", r.education.some(e => e.degree || e.institution)],
    ["Skills", Object.values(r.skills).some(l => l.length > 0)],
  ];
  const done = checks.filter(c => c[1]).map(c => c[0]);
  const missing = checks.filter(c => !c[1]).map(c => c[0]);
  return { label: missing.length === 0 ? "Core complete" : done.length === 0 ? "Not started" : "In progress", done, missing };
}

const span = (a: string, b: string, cur?: boolean) => [a, cur ? "Present" : b].filter(Boolean).join(" – ");
/** Plain-text rendering consumed by tailoring, cover letters and interview prep. */
export function toPlainText(r: MasterResume): string {
  const out: string[] = []; const p = r.personal;
  const sec = (t: string, lines: string[]) => { const l = lines.filter(Boolean); if (l.length) out.push(`${t.toUpperCase()}\n${l.join("\n")}`); };
  sec("Contact", [p.fullName, [p.email, p.phone, [p.city, p.country].filter(Boolean).join(", ")].filter(Boolean).join(" | "), p.linkedinUrl, p.githubUrl, p.portfolioUrl]);
  sec("Summary", [r.summary.headline, r.summary.yearsExperience ? `Years of experience: ${r.summary.yearsExperience}` : "", r.summary.summary]);
  sec("Experience", r.experience.map(e => [[e.title, e.company].filter(Boolean).join(" — "), [e.employmentType, e.location, span(e.startDate, e.endDate, e.current)].filter(Boolean).join(" | "), ...e.responsibilities.map(b => `- ${b}`), ...e.achievements.map(b => `- ${b}`)].filter(Boolean).join("\n")));
  sec("Education", r.education.map(e => [[e.degree, e.field].filter(Boolean).join(", "), e.institution, span(e.startDate, e.endDate), e.grade ? `Grade: ${e.grade}` : ""].filter(Boolean).join(" | ")));
  sec("Skills", [["Technical", r.skills.technical], ["Tools", r.skills.tools], ["Soft", r.skills.soft], ["Other", r.skills.other]].filter(([, l]) => (l as string[]).length).map(([k, l]) => `${k}: ${(l as string[]).join(", ")}`));
  sec("Projects", r.projects.map(x => [x.name, x.description, x.technologies.length ? `Technologies: ${x.technologies.join(", ")}` : "", x.url, x.githubUrl, ...x.responsibilities.map(b => `- ${b}`), ...x.achievements.map(b => `- ${b}`)].filter(Boolean).join("\n")));
  sec("Certifications", r.certifications.map(c => [c.name, c.issuer, span(c.issueDate, c.expiryDate), c.credentialUrl].filter(Boolean).join(" | ")));
  sec("Additional", r.additional.map(a => [a.title, a.details].filter(Boolean).join(": ")));
  return out.join("\n\n").trim();
}
