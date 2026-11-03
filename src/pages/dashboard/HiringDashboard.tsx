import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, Users, Search, FileText, Mail, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function HiringDashboard() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"jobs" | "applications">("jobs");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tables<"job_submissions"> | null>(null);
  const [jobFilter, setJobFilter] = useState("all");
  const jobs = useQuery({ queryKey: ["employer-jobs", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return [];
    const { data, error } = await supabase.from("job_listings").select("*").eq("employer_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  const applications = useQuery({ queryKey: ["employer-applications", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return [];
    const { data, error } = await supabase.from("job_submissions").select("*").eq("employer_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  if (workspace.data?.account_type !== "employer") return <Navigate to="/app/jobs" replace />;
  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") ?? "").trim();
    if (description.length < 20) { toast.error("Add a job description of at least 20 characters."); return; }
    setBusy(true);
    try {
      const keywords = [...new Set(String(form.get("keywords") ?? "").split(",").map(k => k.trim()).filter(Boolean))].slice(0, 50);
      const { error } = await supabase.from("job_listings").insert({ employer_id: user.id, company_name: workspace.data?.company_name ?? "", title: String(form.get("title")).trim(), location: String(form.get("location")).trim(), employment_type: String(form.get("employment_type")), description, keywords });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["employer-jobs"] });
      setCreating(false); toast.success("Job posted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't post this job."); }
    finally { setBusy(false); }
  }
  async function toggleJob(job: Tables<"job_listings">) {
    setBusy(true);
    const { error } = await supabase.from("job_listings").update({ status: job.status === "open" ? "closed" : "open" }).eq("id", job.id);
    if (error) toast.error(error.message);
    else await qc.invalidateQueries({ queryKey: ["employer-jobs"] });
    setBusy(false);
  }
  async function updateStatus(value: string) {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.from("job_submissions").update({ status: value }).eq("id", selected.id);
    if (error) toast.error(error.message);
    else { setSelected({ ...selected, status: value }); await qc.invalidateQueries({ queryKey: ["employer-applications"] }); }
    setBusy(false);
  }
  const filtered = (applications.data ?? []).filter(a => (jobFilter === "all" || a.job_id === jobFilter) && `${a.candidate_name} ${a.candidate_email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="max-w-6xl mx-auto">
    <div className="flex flex-wrap justify-between gap-4"><PageHeader eyebrow={workspace.data?.company_name} title="Hiring dashboard" /><Button onClick={() => setCreating(true)}><Plus />Post a job</Button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {[{ label: "Open jobs", value: jobs.data?.filter(j => j.status === "open").length ?? 0, icon: Briefcase }, { label: "Applications", value: applications.data?.length ?? 0, icon: Users }, { label: "Shortlisted", value: applications.data?.filter(a => a.status === "shortlisted").length ?? 0, icon: FileText }].map(stat => <div key={stat.label} className="border border-border bg-card rounded-lg p-5"><div className="flex justify-between text-muted-foreground text-sm"><span>{stat.label}</span><stat.icon className="size-4" /></div><p className="text-3xl font-semibold mt-3">{jobs.isPending || applications.isPending ? "—" : stat.value}</p></div>)}
    </div>
    <div className="flex gap-3 border-b border-border pb-4 mb-6"><Button variant={tab === "jobs" ? "default" : "ghost"} onClick={() => setTab("jobs")}><Briefcase />Job listings</Button><Button variant={tab === "applications" ? "default" : "ghost"} onClick={() => setTab("applications")}><Users />Applications</Button></div>
    {(jobs.error || applications.error) && <p role="alert" className="text-destructive mb-5">Couldn't load hiring data. <Button variant="link" onClick={() => { void jobs.refetch(); void applications.refetch(); }}>Retry</Button></p>}
    {tab === "jobs" ? jobs.isPending ? <p role="status">Loading jobs…</p> : jobs.data?.length ? <div className="divide-y divide-border">{jobs.data.map(job => <article key={job.id} className="py-5 flex flex-wrap items-start gap-4 justify-between"><div className="min-w-0"><h2 className="text-lg font-semibold break-words">{job.title}</h2><p className="text-sm text-muted-foreground mt-1">{job.location || "Location not specified"} · {job.employment_type} · {job.status}</p><p className="text-sm mt-3">{applications.data?.filter(a => a.job_id === job.id).length ?? 0} applications</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { setJobFilter(job.id); setTab("applications"); }}>View applications</Button><Button disabled={busy} variant="ghost" onClick={() => toggleJob(job)}>{job.status === "open" ? "Close job" : "Reopen job"}</Button></div></article>)}</div> : <div className="py-14 text-center"><Briefcase className="mx-auto size-8 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">No job listings yet</h2><Button className="mt-5" onClick={() => setCreating(true)}><Plus />Post your first job</Button></div> : <>
      <div className="flex flex-wrap gap-3 mb-5"><div className="relative flex-1 min-w-48"><Search className="size-4 absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Search applications" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates" /></div><select aria-label="Filter by job" className="bg-background border border-input rounded-md px-3 py-2 max-w-full" value={jobFilter} onChange={e => setJobFilter(e.target.value)}><option value="all">All jobs</option>{jobs.data?.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
      {applications.isPending ? <p role="status">Loading applications…</p> : filtered.length ? <div className="divide-y divide-border">{filtered.map(a => <div key={a.id} className="py-5 flex flex-wrap items-center gap-4"><div className="flex-1 min-w-48"><h3 className="font-semibold break-words">{a.candidate_name}</h3><p className="text-sm text-muted-foreground">{jobs.data?.find(j => j.id === a.job_id)?.title}</p></div><div className="text-right"><p className="font-semibold">{a.match_score === null ? "Not scored" : `${a.match_score}% keyword match`}</p><p className="text-xs text-muted-foreground capitalize">{a.status}</p></div><Button variant="outline" onClick={() => setSelected(a)}>Review</Button></div>)}</div> : <p className="py-12 text-center text-muted-foreground">No applications found</p>}
    </>}
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Post a job</DialogTitle></DialogHeader><form onSubmit={createJob} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="job-title">Job title</Label><Input id="job-title" name="title" required maxLength={200} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="job-location">Location</Label><Input id="job-location" name="location" maxLength={200} placeholder="Remote, or city" /></div><div className="space-y-2"><Label htmlFor="job-type">Employment type</Label><select id="job-type" name="employment_type" className="w-full h-10 border border-input rounded-md bg-background px-3"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></div></div>
      <div className="space-y-2"><Label htmlFor="job-description">Job description</Label><Textarea id="job-description" name="description" required minLength={20} maxLength={20000} rows={6} /></div>
      <div className="space-y-2"><Label htmlFor="job-keywords">Required skills (comma-separated)</Label><Input id="job-keywords" name="keywords" maxLength={2000} placeholder="Python, SQL, stakeholder communication" /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Posting…" : "Publish job"}<Plus /></Button>
    </form></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.candidate_name}</DialogTitle></DialogHeader>{selected && <div className="space-y-5">
      <a href={`mailto:${selected.candidate_email}`} className="text-sm text-muted-foreground break-all">{selected.candidate_email}</a>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{selected.match_score === null ? "No required skills specified" : `${selected.match_score}% keyword match`}</p><select aria-label="Application status" disabled={busy} value={selected.status} onChange={e => updateStatus(e.target.value)} className="border border-input rounded-md bg-background p-2"><option value="submitted">Submitted</option><option value="shortlisted">Shortlisted</option><option value="interview">Interview</option><option value="rejected">Rejected</option></select></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><h3 className="text-sm font-semibold">Matched skills</h3><p className="text-sm text-muted-foreground mt-1">{selected.matched_keywords.join(", ") || "None"}</p></div><div><h3 className="text-sm font-semibold">Missing skills</h3><p className="text-sm text-muted-foreground mt-1">{selected.missing_keywords.join(", ") || "None"}</p></div></div>
      <section className="border-t border-border pt-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold flex items-center gap-2"><FileText className="size-4" />Submitted resume</h3><Button variant="ghost" size="icon" title="Download submitted resume text" onClick={() => { const url = URL.createObjectURL(new Blob([selected.resume_text], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = "submitted-resume.txt"; a.click(); URL.revokeObjectURL(url); }}><Download /></Button></div><p className="text-xs text-muted-foreground mt-1 break-all">{selected.resume_name}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.resume_text}</p></section>
      <section className="border-t border-border pt-4"><h3 className="font-semibold flex items-center gap-2"><Mail className="size-4" />Submitted cover letter</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.cover_letter_text || "No cover letter submitted"}</p></section>
    </div>}</DialogContent></Dialog>
  </div>;
}