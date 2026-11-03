import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Search, Send, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Jobs() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tables<"job_listings"> | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [letterId, setLetterId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const jobs = useQuery({ queryKey: ["open-jobs"], queryFn: async () => { const { data, error } = await supabase.from("job_listings").select("*").eq("status", "open").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const documents = useQuery({ queryKey: ["application-documents", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return { resumes: [], letters: [], submissions: [] };
    const [r, c, s] = await Promise.all([supabase.from("resumes").select("id,file_name,raw_text").eq("user_id", user.id), supabase.from("cover_letters").select("id,company,role,full_letter").eq("user_id", user.id), supabase.from("job_submissions").select("id,job_id,status,created_at").eq("candidate_id", user.id)]);
    if (r.error || c.error || s.error) throw r.error ?? c.error ?? s.error;
    return { resumes: r.data ?? [], letters: c.data ?? [], submissions: s.data ?? [] };
  } });
  async function apply(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !resumeId || !consent || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_job_application", { p_job_id: selected.id, p_resume_id: resumeId, p_cover_letter_id: letterId || undefined });
    if (error) toast.error(error.message);
    else { await qc.invalidateQueries({ queryKey: ["application-documents"] }); toast.success("Application submitted"); setSelected(null); }
    setBusy(false);
  }
  const filtered = (jobs.data ?? []).filter(j => `${j.title} ${j.company_name} ${j.location}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="max-w-6xl mx-auto"><PageHeader eyebrow="Opportunities" title="Find your next role" />
    <div className="relative mb-8"><Search className="size-4 absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Search jobs" placeholder="Search role, company, or location" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {(jobs.error || documents.error) && <p role="alert" className="text-destructive mb-5">Couldn't load jobs or your documents. <Button variant="link" onClick={() => { void jobs.refetch(); void documents.refetch(); }}>Retry</Button></p>}
    {jobs.isPending ? <p role="status">Loading jobs…</p> : filtered.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map(job => { const application = documents.data?.submissions.find(s => s.job_id === job.id); return <article key={job.id} className="bg-card border border-border rounded-lg p-6 flex flex-col"><div className="flex justify-between gap-3"><Briefcase className="size-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{job.employment_type}</span></div><h2 className="text-xl font-semibold mt-4 break-words">{job.title}</h2><p className="text-sm text-muted-foreground mt-1">{job.company_name} · {job.location || "Location not specified"}</p><p className="text-sm line-clamp-3 mt-4 mb-5">{job.description}</p><div className="mt-auto flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground capitalize">{application ? application.status : `${job.keywords.length} required skills`}</span><Button variant="outline" onClick={() => { setSelected(job); setResumeId(""); setLetterId(""); setConsent(false); }}>View job</Button></div></article>; })}</div> : <div className="py-16 text-center"><Briefcase className="size-8 text-muted-foreground mx-auto mb-4" /><h2 className="text-xl font-semibold">No open jobs found</h2></div>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>{selected && <div className="space-y-5"><p className="text-sm text-muted-foreground">{selected.company_name} · {selected.location} · {selected.employment_type}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.description}</p>{selected.keywords.length > 0 && <div><h3 className="font-semibold text-sm">Required skills</h3><p className="text-sm text-muted-foreground mt-1">{selected.keywords.join(", ")}</p></div>}
      {documents.data?.submissions.some(s => s.job_id === selected.id) ? <p role="status" className="border-t border-border pt-4 font-medium">Application submitted</p> : workspace.data?.account_type === "candidate" ? <form onSubmit={apply} className="border-t border-border pt-5 space-y-4">
        <div className="space-y-2"><Label htmlFor="apply-resume">Resume</Label><select id="apply-resume" required className="w-full h-10 border border-input rounded-md bg-background px-3" value={resumeId} onChange={e => setResumeId(e.target.value)}><option value="">Choose a resume</option>{documents.data?.resumes.filter(r => r.raw_text?.trim()).map(r => <option key={r.id} value={r.id}>{r.file_name}</option>)}</select><Button asChild variant="link" className="px-0"><Link to="/app/resume"><FileText />Upload a resume</Link></Button></div>
        <div className="space-y-2"><Label htmlFor="apply-letter">Cover letter (optional)</Label><select id="apply-letter" className="w-full h-10 border border-input rounded-md bg-background px-3" value={letterId} onChange={e => setLetterId(e.target.value)}><option value="">No cover letter</option>{documents.data?.letters.map(c => <option key={c.id} value={c.id}>{c.role} — {c.company}</option>)}</select></div>
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /><span>I agree to share my name, email, and copies of these selected documents with {selected.company_name}.</span></label>
        <Button type="submit" disabled={!resumeId || !consent || busy || Boolean(documents.error)} className="w-full"><Send />{busy ? "Submitting…" : "Submit application"}</Button>
      </form> : null}
    </div>}</DialogContent></Dialog>
  </div>;
}