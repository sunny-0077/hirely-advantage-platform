import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Loader2, ChevronLeft, ChevronRight, FileText, LayoutTemplate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FittedResumePreview } from "./ResumePreview";
import { applyLibraryTemplate, roleStyleDesigns, type Blueprint, type Design, type LibrarySelection } from "@/lib/resumeBuilder/library";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { applyVisualLayout, classifyRole, hasResumeFacts, recommendedStyle, RESUME_STYLES } from "@/lib/resumeBuilder/visual";
import { roleExample } from "@/lib/resumeBuilder/examples";
import { loadOccupationExample } from "@/lib/resumeBuilder/occupationExamples";

const CATALOG_CATEGORIES = ["All", "Tech & Software", "Healthcare", "Business & Finance", "Creative & Marketing", "Product & Sales", "Students & Entry-Level"] as const;
type CatalogCategory = typeof CATALOG_CATEGORIES[number];
const CURATED: { title: string; category: Exclude<CatalogCategory, "All">; level?: string }[] = [
  { title: "Software Engineer", category: "Tech & Software" }, { title: "Data Scientist", category: "Tech & Software" }, { title: "DevOps Engineer", category: "Tech & Software" }, { title: "Web Developer", category: "Tech & Software" }, { title: "Cybersecurity Analyst", category: "Tech & Software" }, { title: "Database Administrator", category: "Tech & Software" },
  { title: "Registered Nurse", category: "Healthcare" }, { title: "Pharmacist", category: "Healthcare" }, { title: "Physical Therapist", category: "Healthcare" }, { title: "Medical Assistant", category: "Healthcare" },
  { title: "Financial Analyst", category: "Business & Finance" }, { title: "Accountant", category: "Business & Finance" }, { title: "Management Consultant", category: "Business & Finance" }, { title: "Human Resources Manager", category: "Business & Finance" }, { title: "Operations Manager", category: "Business & Finance" },
  { title: "UI/UX Designer", category: "Creative & Marketing" }, { title: "Graphic Designer", category: "Creative & Marketing" }, { title: "Marketing Director", category: "Creative & Marketing" }, { title: "Content Writer", category: "Creative & Marketing" }, { title: "Video Editor", category: "Creative & Marketing" },
  { title: "Product Manager", category: "Product & Sales" }, { title: "Sales Representative", category: "Product & Sales" }, { title: "Account Manager", category: "Product & Sales" }, { title: "Customer Success Manager", category: "Product & Sales" },
  { title: "Software Engineering Intern", category: "Students & Entry-Level", level: "student" }, { title: "Graduate Data Analyst", category: "Students & Entry-Level", level: "student" }, { title: "Marketing Intern", category: "Students & Entry-Level", level: "student" }, { title: "Teacher", category: "Students & Entry-Level", level: "student" },
];
function LazyPreview({ build }: { build: () => ResumeDocument }) {
  const ref = useRef<HTMLDivElement>(null); const [visible, setVisible] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); o.disconnect(); } }, { rootMargin: "300px" }); o.observe(el); return () => o.disconnect(); }, []);
  return <div ref={ref} className="aspect-[794/1123] overflow-hidden">{visible && <FittedResumePreview doc={build()} firstPageOnly />}</div>;
}
type Title = {id:string;occupation_id:string;title:string;industry_id:string;category_id:string;total_count:number};
export function ResumeLibrary({onUse,current,onContinue}:{onUse:(selection:LibrarySelection,useMaster:boolean,example?:boolean)=>void;current:ResumeDocument|null;onContinue?:()=>void}) {
  const [search,setSearch]=useState(""); const [debounced,setDebounced]=useState(""); const [industry,setIndustry]=useState(""); const [category,setCategory]=useState(""); const [level,setLevel]=useState(""); const [sort,setSort]=useState("popular"); const [offset,setOffset]=useState(0); const [selected,setSelected]=useState<Title|null>(null); const [preview,setPreview]=useState<Design|null>(null);
  useEffect(()=>{const t=setTimeout(()=>{setDebounced(search);setOffset(0);},250);return()=>clearTimeout(t);},[search]);
  const meta=useQuery({queryKey:["resume-library-meta"],queryFn:async()=>{
    const [i,c,l,d,b]=await Promise.all([supabase.from("resume_industries").select("*").order("sort_order"),supabase.from("resume_categories").select("*"),supabase.from("resume_career_levels").select("*").order("sort_order"),supabase.from("resume_template_designs").select("*"),supabase.from("resume_role_blueprints").select("*")]);
    if(i.error||c.error||l.error||d.error||b.error)throw i.error??c.error??l.error??d.error??b.error;
    return {industries:i.data,categories:c.data,levels:l.data,designs:d.data as unknown as Design[],blueprints:b.data as unknown as Blueprint[]};
  }});
  const results=useQuery({queryKey:["resume-library-search",debounced,industry,category,level,sort,offset],queryFn:async()=>{
    const {data,error}=await supabase.rpc("search_resume_titles",{p_search:debounced,p_industry:industry,p_category:category,p_level:level,p_sort:sort,p_offset:offset});if(error)throw error;return data as Title[];
  }});
  const roleData=useQuery({queryKey:["resume-library-role",selected?.occupation_id],enabled:!!selected,queryFn:async()=>{
    if(!selected)throw new Error("Select a title");
    const [o,l,t]=await Promise.all([supabase.from("resume_occupations").select("*").eq("id",selected.occupation_id).single(),supabase.from("resume_occupation_levels").select("level_id").eq("occupation_id",selected.occupation_id),supabase.from("resume_job_titles").select("id,occupation_id,title,industry_id,category_id").eq("occupation_id",selected.occupation_id).order("popular_rank").limit(8)]);
    if(o.error||l.error||t.error)throw o.error??l.error??t.error;
    // Examples only enrich samples; designs must still open if the example file is unavailable.
    const example = await loadOccupationExample(selected.occupation_id).catch(() => undefined);
    return {occupation:o.data,levels:l.data.map(x=>x.level_id),related:t.data,example};
  }});
  const [roleLevel,setRoleLevel]=useState("");
  const [catalogCategory,setCatalogCategory]=useState<CatalogCategory>("All"); const [opening,setOpening]=useState<string|null>(null);
  const openRole=async(title:string)=>{
    setOpening(title);
    try{const {data,error}=await supabase.rpc("search_resume_titles",{p_search:title,p_industry:"",p_category:"",p_level:"",p_sort:"popular",p_offset:0});if(error)throw error;const rows=(data??[]) as Title[];const q=title.toLowerCase();const pick=rows.find(r=>r.title.toLowerCase()===q)??[...rows].filter(r=>r.title.toLowerCase().includes(q)).sort((a,b)=>a.title.length-b.title.length)[0]??rows[0];if(pick)setSelected(pick);else setSearch(title);}
    catch{setSearch(title);}finally{setOpening(null);}
  };
  useEffect(()=>{if(roleData.data)setRoleLevel(roleData.data.levels.includes(level)?level:roleData.data.levels.includes("experienced")?"experienced":roleData.data.levels[0]??"");},[roleData.data,level]);
  const assignments=useQuery({queryKey:["resume-library-assignments",selected?.occupation_id,roleLevel],enabled:!!selected&&!!roleLevel,queryFn:async()=>{
    if(!selected)return [];
    const {data,error}=await supabase.from("resume_template_assignments").select("design_id,blueprint_id").eq("occupation_id",selected.occupation_id).eq("level_id",roleLevel);if(error)throw error;return data;
  }});
  const blueprint=meta.data?.blueprints.find(b=>b.id===roleData.data?.occupation.blueprint_id);
  const roleContext = {title:selected?.title,occupationTitle:roleData.data?.occupation.title,industryId:selected?.industry_id,blueprintId:blueprint?.id,levelId:roleLevel};
  const archetype = classifyRole(roleContext);
  const recommended = recommendedStyle(archetype);
  const baseDesign=meta.data?.designs.find(d=>assignments.data?.some(a=>a.design_id===d.id))??meta.data?.designs[0];
  // All styles share the selected occupation and retain valid catalogue design IDs.
  const designs=baseDesign?roleStyleDesigns(baseDesign,roleContext):[];
  const selection=(design:Design):LibrarySelection|null=>selected&&blueprint&&roleLevel?{titleId:selected.id,title:selected.title,occupationId:selected.occupation_id,occupationTitle:roleData.data?.occupation.title,industryId:selected.industry_id,levelId:roleLevel,blueprint,design}:null;
  const previewSource=current&&hasResumeFacts(current)?current:roleExample(selected?.title??"Professional",archetype,roleData.data?.occupation.title,roleData.data?.example);
  const previewDoc=(design:Design)=>{const s=selection(design);return s?applyLibraryTemplate(previewSource,s):previewSource;};
  const selectClass="h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const reset=()=>{setSearch("");setIndustry("");setCategory("");setLevel("");setOffset(0);setSelected(null);};
  return <div className="w-full min-w-0 space-y-6">
    <header className="flex items-start justify-between gap-4 flex-wrap"><div><h1 className="text-2xl font-bold">Resume Templates</h1></div>{current&&onContinue&&<Button variant="outline" onClick={onContinue}><FileText className="size-4"/>Continue draft</Button>}</header>
    {!selected&&<section aria-label="Template catalog" className="space-y-4 border-b border-border pb-8">
      <div className="flex items-end justify-between gap-3 flex-wrap"><div><h2 className="text-lg font-semibold flex items-center gap-2"><LayoutTemplate className="size-4 text-primary"/>Curated role templates</h2><p className="text-sm text-muted-foreground">Pick a role to see it in all five designs, or search any of {(results.data?.[0]?.total_count ?? 45808).toLocaleString()} titles below.</p></div><span className="text-xs text-muted-foreground">Illustrative samples</span></div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Template categories">{CATALOG_CATEGORIES.map(c=><Button key={c} size="sm" role="tab" aria-selected={catalogCategory===c} variant={catalogCategory===c?"default":"outline"} className="rounded-full shrink-0" onClick={()=>setCatalogCategory(c)}>{c}</Button>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{CURATED.filter(r=>catalogCategory==="All"||r.category===catalogCategory).map(r=>{const arch=classifyRole({title:r.title,levelId:r.level});return <button type="button" key={r.title} onClick={()=>openRole(r.title)} disabled={!!opening} className="group text-left min-w-0 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="rounded-md bg-secondary p-2"><LazyPreview build={()=>applyVisualLayout(roleExample(r.title,arch),recommendedStyle(arch),true)}/></div>
        <div className="px-1 pt-2 pb-1 flex items-center justify-between gap-2"><span className="min-w-0"><span className="block text-sm font-semibold truncate">{r.title}</span><span className="block text-xs text-muted-foreground">{r.category}</span></span>{opening===r.title?<Loader2 className="size-4 animate-spin shrink-0"/>:<ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"/>}</div>
      </button>;})}</div>
    </section>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
      <div className="space-y-2"><Label htmlFor="library-search">Job title</Label><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input id="library-search" className="pl-10 h-11" value={search} maxLength={200} onChange={e=>{setSearch(e.target.value);setSelected(null);}} placeholder="Search a title or synonym"/></div></div>
      <div className="space-y-2"><Label htmlFor="library-industry">Industry</Label><select id="library-industry" className={selectClass} value={industry} onChange={e=>{setIndustry(e.target.value);setCategory("");setOffset(0);setSelected(null);}}><option value="">All industries</option>{meta.data?.industries.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="library-category">Professional category</Label><select id="library-category" className={selectClass} value={category} onChange={e=>{setCategory(e.target.value);setOffset(0);setSelected(null);}}><option value="">All categories</option>{meta.data?.categories.filter(c=>!industry||c.industry_id===industry).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="library-level">Career level</Label><select id="library-level" className={selectClass} value={level} onChange={e=>{setLevel(e.target.value);setOffset(0);}}><option value="">All levels</option>{meta.data?.levels.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
    </div>
    {(meta.error||results.error)&&<p role="alert" className="text-destructive">Couldn't load the library. <Button variant="link" onClick={()=>{meta.refetch();results.refetch();}}>Retry</Button></p>}
    {!selected?<>
      <div className="flex justify-between gap-3 items-center flex-wrap"><div className="flex gap-2"><Button size="sm" variant={sort==="popular"?"default":"outline"} onClick={()=>{setSort("popular");setOffset(0);}}>Popular titles</Button><Button size="sm" variant={sort==="recent"?"default":"outline"} onClick={()=>{setSort("recent");setOffset(0);}}>Recently added</Button></div><p className="text-sm text-muted-foreground">{results.data?.[0]?.total_count?.toLocaleString()??0} titles</p></div>
      {results.isPending?<p role="status">Loading titles…</p>:results.data?.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{results.data.map(t=><Button key={t.id} variant="outline" className="h-auto min-h-24 p-4 rounded-lg justify-between text-left whitespace-normal" onClick={()=>setSelected(t)}><span className="min-w-0"><span className="block text-base font-semibold break-words">{t.title}</span><span className="block text-sm font-normal text-muted-foreground mt-2">{meta.data?.industries.find(i=>i.id===t.industry_id)?.label}</span></span><ArrowRight className="size-4 shrink-0 ml-3"/></Button>)}</div>:!results.error&&<div className="py-12 text-center"><h2 className="text-lg font-semibold">No matching titles</h2><Button variant="link" onClick={reset}>Clear filters</Button></div>}
      <div className="flex justify-end gap-3 items-center"><Button variant="outline" size="icon" aria-label="Previous titles" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-24))}><ChevronLeft/></Button><span className="text-sm">Page {Math.floor(offset/24)+1}</span><Button variant="outline" size="icon" aria-label="Next titles" disabled={offset+24>=(results.data?.[0]?.total_count??0)} onClick={()=>setOffset(offset+24)}><ChevronRight/></Button></div>
    </>:<>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><Button size="sm" variant="ghost" onClick={()=>setSelected(null)}><ChevronLeft className="size-4"/>All titles</Button><h2 className="text-xl font-bold mt-2">{selected.title}</h2></div><div className="space-y-2 w-full sm:w-60"><Label htmlFor="role-level">Relevant career level</Label><select id="role-level" className={selectClass} value={roleLevel} onChange={e=>setRoleLevel(e.target.value)}>{meta.data?.levels.filter(l=>roleData.data?.levels.includes(l.id)).map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div></div>
      {roleData.isPending||assignments.isPending?<p role="status">Loading templates…</p>:roleData.error||assignments.error?<p role="alert">Couldn't load these templates. <Button variant="link" onClick={()=>{roleData.refetch();assignments.refetch();}}>Retry</Button></p>:!designs.length?<p>No published templates for this combination yet.</p>:<section aria-label={`Designs for ${selected.title}`}><div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-semibold">Designs for {selected.title}</h3><span className="text-sm text-muted-foreground">5 styles</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{designs.map(d=><article key={d.definition.layout} aria-label={d.label} className="border border-border rounded-lg overflow-hidden min-w-0"><div className="bg-secondary p-4"><FittedResumePreview doc={previewDoc(d)} firstPageOnly/></div><div className="p-4 space-y-3"><div className="flex justify-between gap-2 items-center flex-wrap"><h3 className="text-lg font-semibold">{d.label}</h3>{d.definition.layout===recommended&&<span className="text-xs text-primary">Role match</span>}</div><p className="text-xs text-muted-foreground">{current&&hasResumeFacts(current)?"Your current career facts":"Illustrative sample · not your career facts"}</p><div className="flex gap-2 flex-wrap"><Button variant="outline" size="sm" onClick={()=>setPreview(d)}>Preview</Button><Button size="sm" onClick={()=>{const s=selection(d);if(s)onUse(s,!current);}}>{current?"Switch template":"Use Master Resume"}<ArrowRight className="size-4"/></Button></div>{!current&&<div className="flex gap-3 flex-wrap"><Button variant="link" size="sm" className="px-0" onClick={()=>{const s=selection(d);if(s)onUse(s,false);}}>Start blank</Button><Button variant="link" size="sm" className="px-0" onClick={()=>{const s=selection(d);if(s)onUse(s,false,true);}}>Edit example</Button></div>}</div></article>)}</div></section>}
      {blueprint&&<section className="border-t border-border pt-5"><h3 className="font-semibold">Professional focus</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{blueprint.definition.guidance.map(g=><li key={g}>{g}</li>)}</ul></section>}
      <section className="border-t border-border pt-5"><h3 className="font-semibold mb-3">Related titles</h3><div className="flex flex-wrap gap-2">{roleData.data?.related.filter(t=>t.id!==selected.id).map(t=><Button key={t.id} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={()=>setSelected({...t,total_count:0})}>{t.title}</Button>)}</div></section>
    </>}
    <footer className="border-t border-border pt-4 text-xs text-muted-foreground">Occupation names, sample duties and skills adapted from O*NET® 31.0, USDOL/ETA, <a className="underline" href="https://www.onetcenter.org/license_db.html" target="_blank" rel="noreferrer">CC BY 4.0</a>. Hirely classifications and templates are not endorsed by USDOL/ETA. Sample achievements are illustrative.</footer>
    <Dialog open={!!preview} onOpenChange={o=>!o&&setPreview(null)}><DialogContent className="max-w-3xl max-h-[90vh] overflow-auto"><DialogHeader><DialogTitle>{preview?.label} · {selected?.title}</DialogTitle></DialogHeader>{preview&&<><p className="text-xs text-muted-foreground">{current&&hasResumeFacts(current)?"Your career facts":"Illustrative sample · not your career facts"}</p><FittedResumePreview doc={previewDoc(preview)}/></>}{preview&&<Button onClick={()=>{const s=selection(preview);if(s){onUse(s,!current);setPreview(null);}}}>{current?"Switch template":"Use Master Resume"}</Button>}</DialogContent></Dialog>
  </div>;
}