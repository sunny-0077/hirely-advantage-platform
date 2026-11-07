import { sanitizeAiInput, sanitizeDocumentText, MAX_AI_INPUT_CHARS } from "./ai-input.ts";

export const CAREER_FACT_RULE = `Use only career facts explicitly present in resume_text. Never infer or invent skills, experience, qualifications, employers, education, projects, achievements, metrics or percentages. Job requirements and prior analysis are not evidence of candidate experience. Preserve supplied numbers exactly. Omit missing facts. Keep improvement suggestions outside factual resume/letter/answer text (for example: Add a measurable performance result if you have one). For interviews, use answer structures when evidence is missing; label any hypothetical example "Hypothetical example — not your experience" and never present it as personal history. This rule overrides style, length, keyword and quantification requests.`;
export type ResumeSource = "structured" | "legacy" | "upload";
export type ResumeResolution = { available: boolean; source: ResumeSource | null; label: string; text: string; omitted: Record<string, number>; reason?: string };
export class ResumeSourceError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Section = { name: string; facts: string[] };
type Obj = Record<string, unknown>;
const object = (x: unknown): x is Obj => Boolean(x && typeof x === "object" && !Array.isArray(x));
const str = (x: unknown) => typeof x === "string" ? x.trim() : "";
const join = (xs: unknown[]) => xs.map(str).filter(Boolean).join(" | ");
const labels: Record<ResumeSource, string> = { structured: "Saved Master Resume", legacy: "Legacy pasted resume (fallback)", upload: "Selected uploaded resume" };

/** Strict known-field validation; no repairing malformed saved facts or profile seeding. */
function structuredSections(raw: unknown): Section[] | null {
  if (!object(raw) || (raw.version !== undefined && raw.version !== 1) || JSON.stringify(raw).length > 200000) return null;
  const specs: Record<string, Record<string, number | string[]>> = {
    personal: { fullName:100,email:200,phone:30,city:100,country:100,linkedinUrl:300,githubUrl:300,portfolioUrl:300 },
    summary: { headline:150,summary:3000,yearsExperience:4 },
    experience: { id:40,title:120,company:120,employmentType:40,location:120,startDate:7,endDate:7,responsibilities:["500","30"],achievements:["500","30"] },
    education: { id:40,degree:120,institution:160,field:120,startDate:7,endDate:7,grade:40 },
    projects: { id:40,name:120,description:1500,technologies:["60","30"],url:300,githubUrl:300,responsibilities:["500","30"],achievements:["500","30"] },
    certifications: { id:40,name:160,issuer:160,issueDate:7,expiryDate:7,credentialUrl:300 },
    additional: { id:40,kind:20,title:160,details:1000 },
    skills: { technical:["60","60"],tools:["60","60"],soft:["60","60"],other:["60","60"] },
  };
  const validate = (o: Obj, spec: typeof specs[string]) => Object.entries(spec).every(([k, bound]) => {
    const v = o[k]; if (v === undefined) return true;
    if (Array.isArray(bound)) return Array.isArray(v) && v.length <= Number(bound[1]) && v.every(s => typeof s === "string" && s.length <= Number(bound[0]));
    if (typeof v !== "string" || v.length > bound) return false;
    if (/Date$/.test(k) && v && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return false;
    if (/Url$|^url$/.test(k) && v && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v)) return false;
    if (k === "yearsExperience" && v && !/^\d{1,2}(\.\d)?$/.test(v)) return false;
    return true;
  });
  for (const k of ["personal","summary","skills"]) if (raw[k] !== undefined && (!object(raw[k]) || !validate(raw[k] as Obj, specs[k]))) return null;
  const limits: Record<string, number> = { experience:30,education:15,projects:20,certifications:30,additional:40 };
  for (const [k,max] of Object.entries(limits)) {
    const rows = raw[k]; if (rows === undefined) continue;
    if (!Array.isArray(rows) || rows.length > max || !rows.every(e => object(e) && validate(e, specs[k]) && (e.current === undefined || typeof e.current === "boolean") && !(str(e.startDate) && str(e.endDate) && !e.current && str(e.endDate) < str(e.startDate)) && !(str(e.issueDate) && str(e.expiryDate) && str(e.expiryDate) < str(e.issueDate)) && (k !== "additional" || e.kind === undefined || ["language","volunteer","award","publication","other"].includes(str(e.kind))))) return null;
  }
  const sections: Section[] = [];
  const add = (name: string, facts: string[]) => { const clean = facts.map(f => sanitizeDocumentText(f)).filter(Boolean); if (clean.length) sections.push({ name, facts: clean }); };
  const p = (raw.personal ?? {}) as Obj, s = (raw.summary ?? {}) as Obj, sk = (raw.skills ?? {}) as Obj;
  add("Contact", [join([p.fullName,p.email,p.phone,p.city,p.country]),join([p.linkedinUrl,p.githubUrl,p.portfolioUrl])]);
  add("Summary", [str(s.headline),str(s.yearsExperience) ? `Years of experience: ${s.yearsExperience}` : "",str(s.summary)]);
  for (const e of (raw.experience ?? []) as Obj[]) {
    const anchor = join([e.title,e.company,e.employmentType,e.location,e.startDate,e.current ? "Present" : e.endDate]);
    add("Experience", [anchor,...((e.responsibilities ?? []) as string[]).filter(Boolean).map(b => `${anchor}\nResponsibility: ${b}`),...((e.achievements ?? []) as string[]).filter(Boolean).map(b => `${anchor}\nAchievement: ${b}`)]);
  }
  add("Education", ((raw.education ?? []) as Obj[]).map(e => join([e.degree,e.field,e.institution,e.startDate,e.endDate,e.grade ? `Grade: ${e.grade}` : ""])));
  for (const [key,name] of Object.entries({ technical:"Technical skills",tools:"Tools and technologies",soft:"Soft skills",other:"Other skills" })) add(name, (sk[key] ?? []) as string[]);
  for (const e of (raw.projects ?? []) as Obj[]) {
    const anchor = str(e.name);
    add("Projects", [join([anchor,e.description]),join([anchor,((e.technologies ?? []) as string[]).length ? `Technologies: ${((e.technologies ?? []) as string[]).join(", ")}` : "",e.url,e.githubUrl]),...((e.responsibilities ?? []) as string[]).filter(Boolean).map(b => `${anchor}\nResponsibility: ${b}`),...((e.achievements ?? []) as string[]).filter(Boolean).map(b => `${anchor}\nAchievement: ${b}`)]);
  }
  add("Certifications", ((raw.certifications ?? []) as Obj[]).map(e => join([e.name,e.issuer,e.issueDate,e.expiryDate,e.credentialUrl])));
  const kinds: Record<string,string> = { language:"Languages",volunteer:"Volunteer experience",award:"Awards",publication:"Publications",other:"Other information" };
  for (const e of (raw.additional ?? []) as Obj[]) add(kinds[str(e.kind)] ?? "Other information", [join([e.title,e.details])]);
  return sections;
}

/** Keep whole facts, one job-relevant fact per section first, then ranked remaining facts. */
export function selectResumeFacts(sections: Section[], job = ""): { text: string; omitted: Record<string,number> } {
  const merged = new Map<string,string[]>();
  for (const s of sections) merged.set(s.name,[...(merged.get(s.name) ?? []),...s.facts]);
  const terms = new Set(sanitizeAiInput(job).toLowerCase().match(/[a-z0-9+#.]{2,}/g) ?? []);
  const score = (text:string) => [...new Set(text.toLowerCase().match(/[a-z0-9+#.]{2,}/g) ?? [])].filter(t => terms.has(t)).length;
  const ranked = [...merged].map(([name,facts]) => ({ name, facts:facts.map((text,i) => ({text,i,score:score(text)})).sort((a,b) => b.score-a.score || a.i-b.i), chosen:[] as {text:string;i:number}[] }));
  // Reserve space for the omission manifest; never splice an oversized fact into a false claim.
  let budget = MAX_AI_INPUT_CHARS - 600;
  const take = (s:typeof ranked[number], f:typeof s.facts[number]) => { const cost=f.text.length+2+(s.chosen.length ? 0 : s.name.length+2); if(cost<=budget) { s.chosen.push(f); budget-=cost; return true; } return false; };
  ranked.forEach(s => { const f=s.facts.find(f => f.text.length+s.name.length+4<=Math.floor(3400/Math.max(1,ranked.length))); if(f) take(s,f); });
  const remaining=ranked.flatMap(s => s.facts.filter(f => !s.chosen.includes(f)).map(f=>({s,f}))).sort((a,b)=>b.f.score-a.f.score || a.f.i-b.f.i);
  remaining.forEach(({s,f})=>take(s,f));
  const omitted:Record<string,number>={};
  for(const s of ranked) if(s.chosen.length<s.facts.length) omitted[s.name]=s.facts.length-s.chosen.length;
  const text=ranked.filter(s=>s.chosen.length).map(s=>`${s.name.toUpperCase()}\n${s.chosen.sort((a,b)=>a.i-b.i).map(f=>f.text).join("\n")}`).join("\n\n");
  return { text: text ? text+(Object.keys(omitted).length ? `\n\nCONTEXT SELECTION (whole facts omitted; not missing qualifications):\n${Object.entries(omitted).map(([k,n])=>`${k}: ${n}`).join("; ")}` : "") : "", omitted };
}

export function resolveSavedResume(profile: { master_resume_json?:unknown; master_resume_text?:unknown }, job=""): ResumeResolution {
  const sections=structuredSections(profile.master_resume_json);
  const career=sections?.some(s=>s.name!=="Contact" && s.facts.some(f=>f.replace(/\s/g,"").length>=2));
  if(career && sections) return {available:true,source:"structured",label:labels.structured,...selectResumeFacts(sections,job)};
  const legacy=str(profile.master_resume_text);
  if(sanitizeAiInput(legacy).length>=80) return resolveTextResume(legacy,"legacy",job);
  return { available:false,source:null,label:"No usable saved resume",text:"",omitted:{},reason: sections===null ? "Saved Master Resume is invalid. Review and save it again." : "Add career information to your Master Resume before generating. Optional sections can stay empty." };
}
function resolveTextResume(text:string,source:ResumeSource,job:string):ResumeResolution {
  const sections:Section[]=[]; let name="Resume";
  for(const line of text.split(/\r?\n/)) {
    const clean=sanitizeDocumentText(line); if(!clean) continue;
    if(/^(summary|professional summary|experience|work experience|education|skills|technical skills|tools(?: and technologies)?|projects|certifications|languages|awards|publications|volunteer(?: experience)?|contact)\s*:?$/i.test(clean)) { name=clean.replace(/:$/,""); continue; }
    sections.push({name,facts:[clean]});
  }
  return {available:true,source,label:labels[source],...selectResumeFacts(sections,job)};
}
export async function resolveUserResume(db: { from:(table:string)=>any }, userId:string, options:{resumeId?:unknown;job?:string}={}):Promise<ResumeResolution> {
  if(options.resumeId) {
    if(typeof options.resumeId!=="string") throw new ResumeSourceError("Choose a valid uploaded resume.");
    const {data,error}=await db.from("resumes").select("user_id,raw_text").eq("id",options.resumeId).eq("user_id",userId).maybeSingle();
    if(error || !data || data.user_id!==userId) throw new ResumeSourceError("Selected resume not found.",404);
    if(sanitizeAiInput(str(data.raw_text)).length<80) throw new ResumeSourceError("Selected uploaded resume has too little readable text. Choose another source.");
    const result=resolveTextResume(str(data.raw_text),"upload",options.job ?? "");
    if(!result.text) throw new ResumeSourceError("Selected resume has no usable facts within the input limit.");
    return result;
  }
  const {data,error}=await db.from("profiles").select("master_resume_json,master_resume_text").eq("user_id",userId).maybeSingle();
  if(error) throw new ResumeSourceError("Couldn't load your saved resume. Please try again.",503);
  const result=resolveSavedResume(data ?? {},options.job);
  if(!result.available || !result.text) throw new ResumeSourceError(result.reason ?? "No usable resume information.");
  return result;
}