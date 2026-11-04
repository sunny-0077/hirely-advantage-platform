import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { Briefcase, FileText, Mail, Trash2, Eye, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function MyDocuments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [letter, setLetter] = useState<{ company: string; role: string; full_letter: string } | null>(null);
  const q = useQuery({ queryKey: ["my-documents", user?.id], enabled: Boolean(user), queryFn: async () => {
    const [r, c] = await Promise.all([
      supabase.from("resumes").select("id,file_name,file_path,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("cover_letters").select("id,company,role,full_letter,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (r.error || c.error) throw r.error ?? c.error;
    return { resumes: r.data, letters: c.data };
  } });
  async function del(kind: "resumes" | "cover_letters", id: string, path?: string) {
    if (!confirm("Delete this document? Applications you already sent keep their copy.")) return;
    const { error } = await supabase.from(kind).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (path) await supabase.storage.from("resumes").remove([path]);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["my-documents"] });
  }
  async function openResume(path: string) {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Couldn't open file");
    window.open(data.signedUrl, "_blank", "noopener");
  }
  return <div className="max-w-5xl mx-auto">
    <PageHeader eyebrow="Candidate portal" title="My documents" />
    {q.error && <p role="alert" className="text-destructive mb-5">Couldn't load documents. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
    {q.isPending ? <p role="status">Loading documents…</p> : <div className="grid gap-8 lg:grid-cols-2">
      <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Resumes</h2><Button asChild size="sm" variant="outline"><Link to="/app/resume">Upload</Link></Button></div>
        <div className="divide-y divide-border border border-border rounded-lg bg-card">{q.data?.resumes.length ? q.data.resumes.map(r => <div key={r.id} className="p-4 flex items-center gap-3"><FileText className="size-4 text-muted-foreground" /><div className="flex-1 min-w-0"><p className="break-all text-sm font-medium">{r.file_name}</p><p className="text-xs text-muted-foreground">{fmt(r.created_at)}</p></div><Button size="icon" variant="ghost" aria-label="Open resume" onClick={() => openResume(r.file_path)}><Eye /></Button><Button size="icon" variant="ghost" aria-label="Delete resume" onClick={() => del("resumes", r.id, r.file_path)}><Trash2 /></Button></div>) : <p className="p-4 text-sm text-muted-foreground">No resumes yet.</p>}</div>
      </section>
      <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Cover letters</h2><Button asChild size="sm" variant="outline"><Link to="/app/cover-letter">Create</Link></Button></div>
        <div className="divide-y divide-border border border-border rounded-lg bg-card">{q.data?.letters.length ? q.data.letters.map(l => <div key={l.id} className="p-4 flex items-center gap-3"><Mail className="size-4 text-muted-foreground" /><div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{l.role} · {l.company}</p><p className="text-xs text-muted-foreground">{fmt(l.created_at)}</p></div><Button size="icon" variant="ghost" aria-label="View cover letter" onClick={() => setLetter(l)}><Eye /></Button><Button size="icon" variant="ghost" aria-label="Delete cover letter" onClick={() => del("cover_letters", l.id)}><Trash2 /></Button></div>) : <p className="p-4 text-sm text-muted-foreground">No cover letters yet.</p>}</div>
      </section>
    </div>}
    <Dialog open={Boolean(letter)} onOpenChange={o => !o && setLetter(null)}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{letter?.role} · {letter?.company}</DialogTitle></DialogHeader><p className="whitespace-pre-wrap text-sm leading-relaxed">{letter?.full_letter}</p></DialogContent></Dialog>
  </div>;
}

type Edu = { school: string; degree: string; year: string };
type Exp = { company: string; title: string; period: string; summary: string };

export function MyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [education, setEducation] = useState<Edu[]>([]);
  const [experience, setExperience] = useState<Exp[]>([]);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["my-profile", user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("display_name,plan,headline,skills,education,experience").eq("user_id", user!.id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  useEffect(() => {
    if (!q.data) return;
    setName(q.data.display_name ?? "");
    setHeadline(q.data.headline ?? "");
    setSkills(q.data.skills ?? []);
    setEducation(Array.isArray(q.data.education) ? (q.data.education as unknown as Edu[]) : []);
    setExperience(Array.isArray(q.data.experience) ? (q.data.experience as unknown as Exp[]) : []);
  }, [q.data]);
  function addSkill() {
    const parts = skillDraft.split(",").map(s => s.trim().slice(0, 50)).filter(Boolean);
    const next = [...skills];
    for (const p of parts) if (!next.some(s => s.toLowerCase() === p.toLowerCase()) && next.length < 50) next.push(p);
    setSkills(next); setSkillDraft("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().slice(0, 100);
    if (!clean || !user) return;
    const payload = {
      display_name: clean,
      headline: headline.trim().slice(0, 150) || null,
      skills,
      education: education.filter(x => x.school.trim() || x.degree.trim()).slice(0, 10),
      experience: experience.filter(x => x.company.trim() || x.title.trim()).slice(0, 15).map(x => ({ ...x, summary: x.summary.slice(0, 1500) })),
    };
    setBusy(true);
    const { error } = q.data
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert({ user_id: user.id, ...payload });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  }
  const section = "bg-card border border-border rounded-lg p-6 space-y-4";
  return <div className="max-w-2xl mx-auto">
    <PageHeader eyebrow="Candidate portal" title="My profile" description="Your skills, experience and education help Hirely tailor your resume and prep." />
    {q.isPending ? <p role="status">Loading profile…</p> : <form onSubmit={save} className="space-y-5">
      <div className={section}>
        <div className="space-y-2"><Label htmlFor="pf-name">Full name</Label><Input id="pf-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pf-headline">Headline</Label><Input id="pf-headline" maxLength={150} placeholder="e.g. Data Analyst with 3 years in retail analytics" value={headline} onChange={e => setHeadline(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pf-email">Email</Label><Input id="pf-email" value={user?.email ?? ""} disabled /></div>
        <div className="space-y-2"><Label>Plan</Label><p className="text-sm capitalize">{q.data?.plan ?? "free"}</p></div>
      </div>

      <div className={section}>
        <h2 className="font-semibold">Skills</h2>
        <div className="flex gap-2">
          <Input aria-label="Add skill" placeholder="SQL, Python, Tableau" value={skillDraft} onChange={e => setSkillDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
          <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills yet.</p>}
          {skills.map(s => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-sm">
            {s}<button type="button" aria-label={`Remove ${s}`} className="text-muted-foreground hover:text-foreground" onClick={() => setSkills(skills.filter(x => x !== s))}>×</button>
          </span>)}
        </div>
      </div>

      <div className={section}>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Work experience</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setExperience([...experience, { company: "", title: "", period: "", summary: "" }])}>Add role</Button></div>
        {experience.length === 0 && <p className="text-sm text-muted-foreground">No roles added.</p>}
        {experience.map((x, i) => {
          const set = (k: keyof Exp, v: string) => setExperience(experience.map((y, j) => j === i ? { ...y, [k]: v } : y));
          return <div key={i} className="border border-border rounded-md p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input aria-label="Job title" placeholder="Job title" maxLength={100} value={x.title} onChange={e => set("title", e.target.value)} />
              <Input aria-label="Company" placeholder="Company" maxLength={100} value={x.company} onChange={e => set("company", e.target.value)} />
              <Input aria-label="Period" placeholder="2022 – Present" maxLength={50} value={x.period} onChange={e => set("period", e.target.value)} />
            </div>
            <textarea aria-label="What you did" placeholder="Key responsibilities, tools and results" maxLength={1500} rows={3} value={x.summary} onChange={e => set("summary", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setExperience(experience.filter((_, j) => j !== i))}>Remove</Button>
          </div>;
        })}
      </div>

      <div className={section}>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Education</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setEducation([...education, { school: "", degree: "", year: "" }])}>Add education</Button></div>
        {education.length === 0 && <p className="text-sm text-muted-foreground">No education added.</p>}
        {education.map((x, i) => {
          const set = (k: keyof Edu, v: string) => setEducation(education.map((y, j) => j === i ? { ...y, [k]: v } : y));
          return <div key={i} className="border border-border rounded-md p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input aria-label="School" placeholder="School" maxLength={120} value={x.school} onChange={e => set("school", e.target.value)} />
              <Input aria-label="Degree" placeholder="B.Sc. Statistics" maxLength={120} value={x.degree} onChange={e => set("degree", e.target.value)} />
              <Input aria-label="Year" placeholder="2021" maxLength={20} value={x.year} onChange={e => set("year", e.target.value)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEducation(education.filter((_, j) => j !== i))}>Remove</Button>
          </div>;
        })}
      </div>

      <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save profile"}</Button>
    </form>}
  </div>;
}
