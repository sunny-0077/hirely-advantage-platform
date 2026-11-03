import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { Briefcase, FileText, Mail, Trash2, Eye, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function useEmployerRedirect() {
  const ws = useWorkspace();
  return ws.data?.account_type === "employer" ? <Navigate to="/app/hiring" replace /> : null;
}

export function MyApplications() {
  const { user } = useAuth();
  const redirect = useEmployerRedirect();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["my-applications", user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.from("job_submissions").select("*, job_listings(title,company_name,location,status)").eq("candidate_id", user!.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  if (redirect) return redirect;
  const sel = q.data?.find(a => a.id === open);
  return <div className="max-w-5xl mx-auto">
    <PageHeader eyebrow="Candidate portal" title="My applications" />
    {q.error && <p role="alert" className="text-destructive mb-5">Couldn't load applications. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
    {q.isPending ? <p role="status">Loading applications…</p> : q.data?.length ? <div className="divide-y divide-border border border-border rounded-lg bg-card">
      {q.data.map(a => <div key={a.id} className="p-5 flex flex-wrap items-center gap-4">
        <Briefcase className="size-5 text-muted-foreground" />
        <div className="flex-1 min-w-0"><p className="font-semibold break-words">{a.job_listings?.title ?? "Job no longer listed"}</p><p className="text-sm text-muted-foreground">{a.job_listings?.company_name ?? ""} · Applied {fmt(a.created_at)}</p></div>
        {a.match_score != null && <span className="text-sm font-medium">{a.match_score}% match</span>}
        <Badge variant="secondary" className="capitalize">{a.status}</Badge>
        <Button variant="outline" size="sm" onClick={() => setOpen(a.id)}><Eye />Details</Button>
      </div>)}
    </div> : <div className="py-16 text-center"><Briefcase className="size-8 text-muted-foreground mx-auto mb-4" /><h2 className="text-xl font-semibold">No applications yet</h2><Button asChild variant="link"><Link to="/app/jobs">Browse jobs<ArrowRight /></Link></Button></div>}
    <Dialog open={Boolean(sel)} onOpenChange={o => !o && setOpen(null)}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{sel?.job_listings?.title ?? "Application"}</DialogTitle></DialogHeader>{sel && <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">Status: <span className="capitalize font-medium text-foreground">{sel.status}</span> · Resume sent: {sel.resume_name}</p>
      {sel.matched_keywords.length > 0 && <p><span className="font-semibold">Matched skills:</span> {sel.matched_keywords.join(", ")}</p>}
      {sel.missing_keywords.length > 0 && <p><span className="font-semibold">Missing skills:</span> {sel.missing_keywords.join(", ")}</p>}
      {sel.cover_letter_text && <div><h3 className="font-semibold mb-1">Cover letter sent</h3><p className="whitespace-pre-wrap border border-border rounded-md p-3 bg-muted/40">{sel.cover_letter_text}</p></div>}
    </div>}</DialogContent></Dialog>
  </div>;
}

export function MyDocuments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const redirect = useEmployerRedirect();
  const [letter, setLetter] = useState<{ company: string; role: string; full_letter: string } | null>(null);
  const q = useQuery({ queryKey: ["my-documents", user?.id], enabled: Boolean(user), queryFn: async () => {
    const [r, c] = await Promise.all([
      supabase.from("resumes").select("id,file_name,file_path,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("cover_letters").select("id,company,role,full_letter,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (r.error || c.error) throw r.error ?? c.error;
    return { resumes: r.data, letters: c.data };
  } });
  if (redirect) return redirect;
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

export function MyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const redirect = useEmployerRedirect();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["my-profile", user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("display_name,plan").eq("user_id", user!.id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  useEffect(() => { if (q.data) setName(q.data.display_name ?? ""); }, [q.data]);
  if (redirect) return redirect;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().slice(0, 100);
    if (!clean || !user) return;
    setBusy(true);
    const { error } = q.data
      ? await supabase.from("profiles").update({ display_name: clean }).eq("user_id", user.id)
      : await supabase.from("profiles").insert({ user_id: user.id, display_name: clean });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  }
  return <div className="max-w-xl mx-auto">
    <PageHeader eyebrow="Candidate portal" title="My profile" />
    {q.isPending ? <p role="status">Loading profile…</p> : <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="space-y-2"><Label htmlFor="pf-name">Full name</Label><Input id="pf-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="pf-email">Email</Label><Input id="pf-email" value={user?.email ?? ""} disabled /></div>
      <div className="space-y-2"><Label>Plan</Label><p className="text-sm capitalize">{q.data?.plan ?? "free"}</p></div>
      <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save changes"}</Button>
    </form>}
  </div>;
}
