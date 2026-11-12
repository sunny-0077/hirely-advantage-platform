import { z } from "zod";
import { loadResume } from "@/lib/masterResume";
import { emptyDocument, newId } from "./templates";
import { APPROVED_SECTION_NAMES, DEFAULT_SECTION_NAME, type ResumeDocument, type ResumeSettings, type SectionType } from "./types";

export type Blueprint = { id: string; label: string; version: number; definition: { order: SectionType[]; guidance: string[]; summaryPrompt: string } };
export type Design = { id: string; label: string; version: number; definition: ResumeSettings & { headerAlign: "left" | "center"; headingRule: boolean } };
export type LibrarySelection = { titleId: string; title: string; occupationId: string; levelId: string; blueprint: Blueprint; design: Design };

const str = z.string().max(10000);
const entry = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
export const documentSchema = z.object({
  templateId: str,
  sections: z.array(z.object({ id: str, type: z.enum(["summary", "skills", "experience", "projects", "education", "certifications", "achievements", "publications", "additional"]), name: str, enabled: z.boolean() })).max(30),
  content: z.object({
    personal: z.object({ name: str, headline: str, email: str, phone: str, location: str, links: z.array(z.object({ label: str, url: str })).max(50) }),
    summary: str,
    skills: z.array(entry({ id: str, name: str, items: z.array(str).max(250) })).max(50),
    experience: z.array(entry({ id: str, company: str, role: str, location: str, start: str, end: str, bullets: z.array(str).max(100) })).max(50),
    projects: z.array(entry({ id: str, name: str, link: str, description: str, bullets: z.array(str).max(100) })).max(50),
    education: z.array(entry({ id: str, school: str, degree: str, location: str, start: str, end: str, details: str })).max(30),
    certifications: z.array(entry({ id: str, name: str, issuer: str, date: str, expiry: str.optional(), url: str.optional() })).max(50),
    achievements: z.array(str).max(100),
    publications: z.array(entry({ id: str, title: str, details: str })).max(50).optional(),
    additional: z.array(entry({ id: str, kind: str, title: str, details: str })).max(50).optional(),
  }).passthrough(),
  settings: z.object({ fontFamily: z.enum(["Inter", "Arial", "Georgia", "Times"]), fontSize: z.union([z.literal(10),z.literal(10.5),z.literal(11),z.literal(11.5),z.literal(12)]), spacing: z.enum(["compact", "normal", "relaxed"]), accent: z.string().regex(/^#[0-9a-f]{6}$/i) }),
  presentation: z.object({ headerAlign: z.enum(["left", "center"]), headingRule: z.boolean() }).optional(),
  sourceSnapshot: z.unknown().optional(),
}).passthrough();

export function validateDocument(raw: unknown): ResumeDocument {
  return documentSchema.parse(raw) as ResumeDocument;
}

export function mapMasterResume(raw: unknown): ResumeDocument {
  const master = loadResume(raw); const doc = emptyDocument("classic-ats"); const p = master.personal;
  doc.sourceSnapshot = structuredClone(master);
  doc.content = {
    personal: { name: p.fullName, headline: master.summary.headline, email: p.email, phone: p.phone, location: [p.city,p.country].filter(Boolean).join(", "), links: [["LinkedIn",p.linkedinUrl],["GitHub",p.githubUrl],["Portfolio",p.portfolioUrl]].filter(([,url]) => url).map(([label,url]) => ({label,url})) },
    summary: [master.summary.summary, master.summary.yearsExperience ? `Years of experience: ${master.summary.yearsExperience}` : ""].filter(Boolean).join("\n"),
    skills: Object.entries(master.skills).map(([name,items]) => ({ id:newId(), name, items:[...items] })),
    experience: master.experience.map(e => ({ id:e.id, company:e.company, role:e.title, location:e.location, start:e.startDate, end:e.current?"Present":e.endDate, bullets:[...e.responsibilities,...e.achievements], employmentType:e.employmentType })),
    projects: master.projects.map(p => ({ id:p.id,name:p.name,link:[p.url,p.githubUrl].filter(Boolean).join(" | "),description:[p.description,p.technologies.length?`Technologies: ${p.technologies.join(", ")}`:""].filter(Boolean).join("\n"),bullets:[...p.responsibilities,...p.achievements] })),
    education: master.education.map(e => ({id:e.id,school:e.institution,degree:[e.degree,e.field].filter(Boolean).join(", "),location:"",start:e.startDate,end:e.endDate,details:e.grade})),
    certifications: master.certifications.map(c => ({id:c.id,name:c.name,issuer:c.issuer,date:c.issueDate,expiry:c.expiryDate,url:c.credentialUrl})),
    achievements: [],
    publications: master.additional.filter(a=>a.kind==="publication").map(a=>({id:a.id,title:a.title,details:a.details})),
    additional: master.additional.filter(a=>a.kind!=="publication").map(a=>({id:a.id??newId(),kind:a.kind??"other",title:a.title??"",details:a.details??""})),
  };
  for (const type of ["publications","additional"] as const) doc.sections.push({id:newId(),type,name:DEFAULT_SECTION_NAME[type],enabled:true});
  return doc;
}

export function applyLibraryTemplate(doc: ResumeDocument, selection: LibrarySelection): ResumeDocument {
  let order = [...selection.blueprint.definition.order];
  if (["student","internship","graduate","fresher","entry-level"].includes(selection.levelId)) order = ["summary","education","skills","projects",...order.filter(t => !["summary","education","skills","projects"].includes(t))];
  const sections = order.map(type => {
    const existing = doc.sections.find(s=>s.type===type);
    return existing ? {...existing} : {id:newId(),type,name:DEFAULT_SECTION_NAME[type],enabled:true};
  });
  for (const s of doc.sections) if (!sections.some(x=>x.type===s.type)) sections.push({...s});
  // Preserve factual content and the import snapshot exactly; only presentation changes.
  return {...doc,templateId:selection.design.id,sections,settings:{fontFamily:selection.design.definition.fontFamily,fontSize:selection.design.definition.fontSize,spacing:selection.design.definition.spacing,accent:selection.design.definition.accent},presentation:{headerAlign:selection.design.definition.headerAlign,headingRule:selection.design.definition.headingRule}};
}

export function validBlueprint(raw: Blueprint): boolean {
  return raw.definition.order.every(type => type in APPROVED_SECTION_NAMES) && new Set(raw.definition.order).size===raw.definition.order.length;
}