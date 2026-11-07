import { describe, expect, it } from "vitest";
import { emptyResume, newExperience, newProject, newExtra } from "./masterResume";
import { resolveSavedResume, resolveUserResume, selectResumeFacts } from "../../supabase/functions/_shared/resume-source";

const legacy="Legacy Engineer at Old Company. Worked with Java and maintained applications, documentation and release processes.";
function dbFor(profile:unknown, upload?:unknown) {
  const calls:string[][]=[];
  const db={from:(table:string)=>{
    const keys=[table]; calls.push(keys);
    const chain={select:()=>chain,eq:(k:string,v:string)=>{keys.push(`${k}=${v}`);return chain;},maybeSingle:async()=>({data:table==="profiles" ? profile : upload,error:null})};return chain;
  }}; return {db,calls};
}
describe("server resume source",()=>{
  it("prefers saved structured facts without mixing legacy",()=>{
    const r=emptyResume(); r.skills.technical=["SQL"];
    const source=resolveSavedResume({master_resume_json:r,master_resume_text:legacy});
    expect(source.source).toBe("structured"); expect(source.text).toContain("SQL"); expect(source.text).not.toContain("Java");
  });
  it.each(["tailoring","cover letter","interview prep"])("%s resolves latest saved title and skills each time",async()=>{
    const r=emptyResume();r.experience=[{...newExperience(),title:"Analyst",company:"User Company"}];r.skills.tools=["Excel"];
    const profile={master_resume_json:r}; const {db}=dbFor(profile);
    expect((await resolveUserResume(db,"owner")).text).toContain("Analyst");
    r.experience[0].title="Senior Analyst";r.skills.tools=["Tableau"];
    const latest=await resolveUserResume(db,"owner");expect(latest.text).toContain("Senior Analyst");expect(latest.text).toContain("Tableau");expect(latest.text).not.toContain("Excel");
  });
  it("supports legacy fallback and does not mutate onboarding/profile data",async()=>{
    const profile={master_resume_json:{},master_resume_text:legacy,onboarding_completed:false,target_role:"Saved Preference"};
    const original=JSON.stringify(profile); const {db}=dbFor(profile);
    expect((await resolveUserResume(db,"owner")).source).toBe("legacy");expect(JSON.stringify(profile)).toBe(original);
  });
  it("contact-only data is missing, optional career sections aren't required",()=>{
    const r=emptyResume();r.personal.fullName="User";r.personal.email="u@example.com";
    expect(resolveSavedResume({master_resume_json:r}).available).toBe(false);
    r.skills.tools=["SQL"];expect(resolveSavedResume({master_resume_json:r}).available).toBe(true);
  });
  it("rejects malformed saved structure unless usable legacy fallback exists",()=>{
    expect(resolveSavedResume({master_resume_json:{skills:{technical:"SQL"}}}).available).toBe(false);
    expect(resolveSavedResume({master_resume_json:{skills:{technical:"SQL"}},master_resume_text:legacy}).source).toBe("legacy");
  });
  it("explicit uploads are separate and ownership is enforced",async()=>{
    const {db,calls}=dbFor({master_resume_text:"Do not use this"},{user_id:"owner",raw_text:legacy});
    const result=await resolveUserResume(db,"owner",{resumeId:"upload-id"});expect(result.source).toBe("upload");expect(calls).toEqual([["resumes","id=upload-id","user_id=owner"]]);
    const foreign=dbFor({}, {user_id:"other",raw_text:legacy});await expect(resolveUserResume(foreign.db,"owner",{resumeId:"foreign"})).rejects.toThrow("not found");
  });
  it("missing upload doesn't silently fall back",async()=>{
    const {db}=dbFor({master_resume_text:legacy},null);await expect(resolveUserResume(db,"owner",{resumeId:"missing"})).rejects.toThrow("not found");
  });
  it("profile lookup is scoped to the authenticated owner",async()=>{
    const {db,calls}=dbFor({master_resume_text:legacy});await resolveUserResume(db,"owner");expect(calls).toEqual([["profiles","user_id=owner"]]);
  });
  it("long resumes retain later relevant sections and account for whole omitted facts within 4000 chars",()=>{
    const r=emptyResume();r.summary.summary="irrelevant context ".repeat(150);
    r.experience=Array.from({length:20},()=>({...newExperience(),title:"Old Role",company:"Company",responsibilities:["Maintained records ".repeat(20)]}));
    r.projects=[{...newProject(),name:"Relevant PostgreSQL Project",technologies:["PostgreSQL"],achievements:["Created SQL reports"]}];r.skills.tools=["PostgreSQL"];
    r.additional=[{...newExtra("language"),title:"Hindi"},{...newExtra("award"),title:"User award"}];
    const source=resolveSavedResume({master_resume_json:r},"PostgreSQL SQL reports");
    expect(source.text.length).toBeLessThanOrEqual(4000);expect(source.text).toContain("Relevant PostgreSQL Project");expect(source.text).toContain("LANGUAGES\nHindi");expect(source.text).toContain("AWARDS\nUser award");expect(Object.keys(source.omitted).length).toBeGreaterThan(0);
  });
  it("keeps responsibilities and achievements distinguishable, without manufacturing metrics",()=>{
    const r=emptyResume();r.experience=[{...newExperience(),title:"Analyst",responsibilities:["Prepared reports"],achievements:["Published dashboard"]}];
    const text=resolveSavedResume({master_resume_json:r}).text;expect(text).toContain("Responsibility: Prepared reports");expect(text).toContain("Achievement: Published dashboard");expect(text).not.toMatch(/\d+%/);
  });
  it("skips oversized facts whole, never produces broken career claims",()=>{
    const result=selectResumeFacts([{name:"Projects",facts:["x".repeat(5000),"SQL project"]}],"SQL");expect(result.text).toContain("SQL project");expect(result.omitted).toEqual({Projects:1});expect(result.text).not.toContain("xxxxx");
  });
});